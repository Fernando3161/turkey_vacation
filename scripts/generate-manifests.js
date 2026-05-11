const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PHOTOS_ROOT = path.join(__dirname, "..", "public", "photos");
const DATA_ROOT = path.join(__dirname, "..", "public", "data");
const DATA_FILE = path.join(__dirname, "..", "assets", "js", "data.js");
const GLOBAL_MANIFEST_PATH = path.join(DATA_ROOT, "photo-manifest.json");
const CATEGORIES = ["people", "places", "animals"];

function toBrowserPath(...parts) {
  return path.posix.join(...parts);
}

function photoId(category, filename) {
  const stem = path.parse(filename).name;
  const safeStem = stem
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._()-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");

  return `${category}-${safeStem || "photo"}`;
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

async function pathExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listWebpFiles(root) {
  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await fs.promises.readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".webp")
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function writeJson(filePath, data) {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function buildCategoryManifest(daySlug, category) {
  const fullDir = path.join(PHOTOS_ROOT, daySlug, category, "full");
  const thumbsDir = path.join(PHOTOS_ROOT, daySlug, category, "thumbs");
  const [fullFiles, thumbFiles] = await Promise.all([
    listWebpFiles(fullDir),
    listWebpFiles(thumbsDir)
  ]);

  const thumbSet = new Set(thumbFiles);
  const photos = fullFiles
    .filter((filename) => thumbSet.has(filename))
    .map((filename) => ({
      id: photoId(category, filename),
      category,
      full: toBrowserPath("public", "photos", daySlug, category, "full", filename),
      thumb: toBrowserPath("public", "photos", daySlug, category, "thumbs", filename),
      filename
    }));

  return {
    count: photos.length,
    photos
  };
}

async function buildDayManifest(daySlug) {
  const categories = {};
  let totalCount = 0;

  for (const category of CATEGORIES) {
    categories[category] = await buildCategoryManifest(daySlug, category);
    totalCount += categories[category].count;
  }

  return {
    slug: daySlug,
    totalCount,
    categories
  };
}

function categoryCounts(dayManifest) {
  return Object.fromEntries(
    CATEGORIES.map((category) => [category, dayManifest.categories[category].count])
  );
}

async function main() {
  await fs.promises.mkdir(PHOTOS_ROOT, { recursive: true });

  const days = loadDays();
  const globalManifest = {
    generatedAt: new Date().toISOString(),
    days: {}
  };

  let totalPhotos = 0;

  for (const day of days) {
    const daySlug = day.slug;
    const dayManifest = await buildDayManifest(daySlug);
    const manifestPath = path.join(PHOTOS_ROOT, daySlug, "manifest.json");

    await writeJson(manifestPath, dayManifest);

    globalManifest.days[daySlug] = {
      manifest: toBrowserPath("public", "photos", daySlug, "manifest.json"),
      totalCount: dayManifest.totalCount,
      categoryCounts: categoryCounts(dayManifest)
    };

    totalPhotos += dayManifest.totalCount;
    console.log(`Wrote ${toBrowserPath("public", "photos", daySlug, "manifest.json")} (${dayManifest.totalCount} photos)`);
  }

  await writeJson(GLOBAL_MANIFEST_PATH, globalManifest);

  console.log("");
  console.log("Photo manifest summary");
  console.log(`Day manifests: ${days.length}`);
  console.log(`Total photos: ${totalPhotos}`);
  console.log(`Global manifest: ${toBrowserPath("public", "data", "photo-manifest.json")}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
