const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");
const { chromium } = require("@playwright/test");

const REPO_ROOT = path.join(__dirname, "..");
const DATA_FILE = path.join(REPO_ROOT, "assets", "js", "data.js");
const PHOTOS_ROOT = path.join(REPO_ROOT, "public", "photos");
const CATEGORIES = ["people", "places", "animals"];

const MIME_TYPES = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".webp", "image/webp"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"]
]);

function categoryLabel(category) {
  if (category === "animals") {
    return "Cats";
  }

  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

function loadDays() {
  const source = fs.readFileSync(DATA_FILE, "utf8");
  const sandbox = { window: {} };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {
    filename: DATA_FILE,
    timeout: 1000
  });

  const days = sandbox.window.TURKEY_LOOP_DAYS;
  if (!Array.isArray(days)) {
    throw new Error("window.TURKEY_LOOP_DAYS must be an array.");
  }

  return days;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function manifestForDay(daySlug) {
  return readJson(path.join(PHOTOS_ROOT, daySlug, "manifest.json"));
}

function sendResponse(response, statusCode, body, contentType) {
  response.writeHead(statusCode, {
    "content-type": contentType || "text/plain; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(body);
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = path.resolve(REPO_ROOT, `.${requestedPath}`);

  if (!filePath.startsWith(REPO_ROOT)) {
    return null;
  }

  return filePath;
}

function createStaticServer() {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    const filePath = resolveRequestPath(requestUrl.pathname);

    if (!filePath) {
      sendResponse(response, 403, "Forbidden");
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        sendResponse(response, error.code === "ENOENT" ? 404 : 500, error.code || "Server error");
        return;
      }

      const contentType = MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
      sendResponse(response, 200, content, contentType);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({
        server,
        origin: `http://127.0.0.1:${address.port}`
      });
    });
  });
}

async function countRenderedPhotos(page) {
  return page.locator("#day-gallery-grid .day-gallery__photo").count();
}

async function clickFilterAndAssert(page, category, expectedCount) {
  const filter = page.locator(`#day-gallery-filters [data-category="${category}"]`);
  await filter.click();
  await page.waitForFunction(
    ({ categoryName }) => {
      const button = document.querySelector(`#day-gallery-filters [data-category="${categoryName}"]`);
      return button && button.getAttribute("aria-pressed") === "true";
    },
    { categoryName: category }
  );

  const actualCount = await countRenderedPhotos(page);
  if (actualCount !== expectedCount) {
    throw new Error(`${category} filter rendered ${actualCount} photos, expected ${expectedCount}.`);
  }

  if (expectedCount === 0) {
    const emptyVisible = await page.locator("#day-gallery-grid .day-gallery__empty").isVisible();
    if (!emptyVisible) {
      throw new Error(`${category} filter expected an empty state.`);
    }
  }
}

async function assertFilterLabels(page, manifest) {
  const expectedCounts = {
    all: manifest.totalCount,
    people: manifest.categories.people.count,
    places: manifest.categories.places.count,
    animals: manifest.categories.animals.count
  };

  for (const [category, count] of Object.entries(expectedCounts)) {
    const text = await page.locator(`#day-gallery-filters [data-category="${category}"]`).textContent();
    const expectedText = category === "all" ? `All (${count})` : `${categoryLabel(category)} (${count})`;

    if (text !== expectedText) {
      throw new Error(`${category} filter label is "${text}", expected "${expectedText}".`);
    }
  }
}

async function assertLightbox(page) {
  const firstPhoto = page.locator("#day-gallery-grid .day-gallery__photo").first();
  await firstPhoto.click();
  await page.waitForSelector("#lightbox:not([hidden])");
  await page.waitForFunction(() => {
    const image = document.getElementById("lightbox-image");
    return image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  });

  const lightboxState = await page.evaluate(() => {
    const image = document.getElementById("lightbox-image");
    return {
      src: image?.getAttribute("src") || "",
      absoluteSrc: image?.src || "",
      width: image?.naturalWidth || 0,
      height: image?.naturalHeight || 0
    };
  });

  if (!lightboxState.src.includes("/full/")) {
    throw new Error(`Lightbox image did not use a full image path: ${lightboxState.src}`);
  }

  if (!lightboxState.absoluteSrc.includes("/public/photos/")) {
    throw new Error(`Lightbox image did not load from public/photos: ${lightboxState.absoluteSrc}`);
  }

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => {
    const lightbox = document.getElementById("lightbox");
    return lightbox && lightbox.hidden;
  });
}

async function assertImageLoaded(page, selector, expectedPath) {
  await page.waitForFunction(
    ({ imageSelector, pathPart }) => {
      const image = document.querySelector(imageSelector);
      return (
        image &&
        image.complete &&
        image.naturalWidth > 0 &&
        image.naturalHeight > 0 &&
        image.src.includes(pathPart)
      );
    },
    { imageSelector: selector, pathPart: expectedPath }
  );
}

async function closeInfoPanel(page, panelId) {
  await page.keyboard.press("Escape");
  await page.waitForFunction((id) => {
    const panel = document.getElementById(id);
    return panel && panel.hidden;
  }, panelId);
}

async function assertHeaderPanels(page, days) {
  const photosButtonCount = await page.locator(".site-header__nav button", { hasText: "Photos" }).count();
  if (photosButtonCount !== 0) {
    throw new Error("Photos nav button should not be present.");
  }

  await page.locator('[data-panel-target="about-panel"]').click();
  await page.waitForSelector("#about-panel:not([hidden])");

  const aboutTitle = await page.locator("#about-panel-title").textContent();
  if (aboutTitle !== "About Me") {
    throw new Error(`About panel title is "${aboutTitle}".`);
  }

  await page.locator("#about-panel", { hasText: "Dr.-Ing. Fernando Peñaherrera V." }).waitFor();
  await assertImageLoaded(page, "#about-panel .info-panel__media img", "/public/photos/main_site/full/about_me.webp");

  const expectedLinks = new Map([
    ["@fernando.3161", "https://www.instagram.com/fernando.3161"],
    ["fer-pv", "https://www.linkedin.com/in/fer-pv/"],
    ["@Fernando31611", "https://www.youtube.com/@Fernando31611"],
    ["fernandopenaherrera@gmail.com", "mailto:fernandopenaherrera@gmail.com"]
  ]);

  for (const [label, href] of expectedLinks) {
    const actualHref = await page.locator("#about-panel a", { hasText: label }).getAttribute("href");
    if (actualHref !== href) {
      throw new Error(`About link ${label} points to ${actualHref}, expected ${href}.`);
    }
  }

  for (const iconName of ["instagram", "linkedin", "youtube", "gmail"]) {
    await assertImageLoaded(
      page,
      `#about-panel .profile-links__icon[src$="${iconName}.png"]`,
      `/public/photos/main_site/icons/${iconName}.png`
    );
  }

  await closeInfoPanel(page, "about-panel");

  await page.locator('[data-panel-target="days-panel"]').click();
  await page.waitForSelector("#days-panel:not([hidden])");

  const routeHref = await page.locator("#days-panel a", { hasText: "Intrepid Travel: Best of Turkey" }).getAttribute("href");
  if (routeHref !== "https://www.intrepidtravel.com/eu/turkey/best-turkey-166880") {
    throw new Error(`Intrepid route link points to ${routeHref}.`);
  }

  await page.locator("#days-panel", { hasText: "This was the route followed." }).waitFor();
  await assertImageLoaded(page, "#days-panel .route-figure img", "/public/photos/main_site/full/intrepid_route.webp");

  const rowCount = await page.locator("#itinerary-table-body tr").count();
  if (rowCount !== days.length) {
    throw new Error(`Itinerary table rendered ${rowCount} rows, expected ${days.length}.`);
  }

  await closeInfoPanel(page, "days-panel");
}

async function assertDay(page, day) {
  const manifest = manifestForDay(day.slug);

  await page.evaluate((slug) => {
    window.TurkeyLoopModal.openDay(slug);
  }, day.slug);
  await page.waitForSelector("#day-modal:not([hidden])");
  await page.waitForFunction(() => {
    const status = document.getElementById("day-gallery-status");
    return status && status.dataset.state !== "loading";
  });

  const statusState = await page.locator("#day-gallery-status").getAttribute("data-state");
  if (manifest.totalCount > 0 && statusState !== "ready") {
    throw new Error(`${day.slug}: gallery status is ${statusState}, expected ready.`);
  }

  await assertFilterLabels(page, manifest);

  const allCount = await countRenderedPhotos(page);
  if (allCount !== manifest.totalCount) {
    throw new Error(`${day.slug}: All rendered ${allCount} photos, expected ${manifest.totalCount}.`);
  }

  await clickFilterAndAssert(page, "people", manifest.categories.people.count);
  await clickFilterAndAssert(page, "places", manifest.categories.places.count);
  await clickFilterAndAssert(page, "animals", manifest.categories.animals.count);
  await clickFilterAndAssert(page, "all", manifest.totalCount);

  if (manifest.totalCount > 0) {
    await assertLightbox(page);
  }
}

async function main() {
  const days = loadDays();
  const { server, origin } = await createStaticServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    await page.goto(`${origin}/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      return (
        document.documentElement.dataset.shell === "ready" &&
        window.TurkeyLoopModal &&
        window.TurkeyLoopGallery &&
        window.TurkeyLoopLightbox
      );
    });

    const title = await page.title();
    if (title !== "Turkey Loop") {
      throw new Error(`Unexpected page title: ${title}`);
    }

    await assertHeaderPanels(page, days);

    for (const day of days) {
      await assertDay(page, day);
      console.log(`Smoke checked ${day.slug}`);
    }

    if (pageErrors.length > 0) {
      throw new Error(`Browser page errors:\n${pageErrors.map((error) => `- ${error}`).join("\n")}`);
    }

    console.log(`Website smoke test passed: ${days.length} day galleries checked.`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
