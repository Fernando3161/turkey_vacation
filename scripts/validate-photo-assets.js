const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO_ROOT = path.join(__dirname, "..");
const PHOTOS_ROOT = path.join(REPO_ROOT, "public", "photos");
const DATA_FILE = path.join(REPO_ROOT, "assets", "js", "data.js");
const GLOBAL_MANIFEST_PATH = path.join(REPO_ROOT, "public", "data", "photo-manifest.json");
const CATEGORIES = ["people", "places", "animals"];
const MAIN_SITE_EXPECTED = [
  "public/photos/main_site/full/header.webp",
  "public/photos/main_site/thumbs/header.webp",
  "public/photos/main_site/full/about_me.webp",
  "public/photos/main_site/thumbs/about_me.webp",
  "public/photos/main_site/full/intrepid_route.webp",
  "public/photos/main_site/thumbs/intrepid_route.webp"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function browserPathToFilePath(browserPath) {
  return path.join(REPO_ROOT, ...String(browserPath).split("/"));
}

function listWebpFiles(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".webp")
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function listPublicPaths(root) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const paths = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      paths.push(entryPath, ...listPublicPaths(entryPath));
    } else if (entry.isFile()) {
      paths.push(entryPath);
    }
  }
  return paths;
}

function expect(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

function validateCategory(daySlug, category, categoryManifest, errors) {
  const fullDir = path.join(PHOTOS_ROOT, daySlug, category, "full");
  const thumbsDir = path.join(PHOTOS_ROOT, daySlug, category, "thumbs");
  const fullFiles = listWebpFiles(fullDir);
  const thumbFiles = listWebpFiles(thumbsDir);
  const fullSet = new Set(fullFiles);
  const thumbSet = new Set(thumbFiles);
  const photos = Array.isArray(categoryManifest?.photos) ? categoryManifest.photos : [];
  const manifestNames = new Set(photos.map((photo) => photo.filename));

  expect(categoryManifest && typeof categoryManifest === "object", `${daySlug}/${category}: category manifest is missing.`, errors);
  expect(categoryManifest?.count === photos.length, `${daySlug}/${category}: category count does not match manifest photo array length.`, errors);
  expect(fullFiles.length === thumbFiles.length, `${daySlug}/${category}: full/thumb file counts differ.`, errors);
  expect(photos.length === fullFiles.length, `${daySlug}/${category}: manifest count does not match full file count.`, errors);

  for (const fileName of fullFiles) {
    expect(thumbSet.has(fileName), `${daySlug}/${category}: missing thumb for ${fileName}.`, errors);
    expect(manifestNames.has(fileName), `${daySlug}/${category}: ${fileName} exists but is not listed in the manifest.`, errors);
  }

  for (const fileName of thumbFiles) {
    expect(fullSet.has(fileName), `${daySlug}/${category}: missing full image for ${fileName}.`, errors);
    expect(manifestNames.has(fileName), `${daySlug}/${category}: ${fileName} thumb exists but is not listed in the manifest.`, errors);
  }

  for (const photo of photos) {
    expect(photo.category === category, `${daySlug}/${category}: ${photo.filename || "photo"} has wrong category metadata.`, errors);
    expect(!String(photo.full || "").includes("_skip"), `${daySlug}/${category}: full path contains _skip.`, errors);
    expect(!String(photo.thumb || "").includes("_skip"), `${daySlug}/${category}: thumb path contains _skip.`, errors);
    expect(fs.existsSync(browserPathToFilePath(photo.full)), `${daySlug}/${category}: missing full path ${photo.full}.`, errors);
    expect(fs.existsSync(browserPathToFilePath(photo.thumb)), `${daySlug}/${category}: missing thumb path ${photo.thumb}.`, errors);
  }
}

function validateDay(day, globalManifest, errors) {
  const globalEntry = globalManifest.days?.[day.slug];
  const manifestPath = path.join(PHOTOS_ROOT, day.slug, "manifest.json");

  expect(Boolean(globalEntry), `${day.slug}: missing from global photo manifest.`, errors);
  expect(fs.existsSync(manifestPath), `${day.slug}: missing day manifest.`, errors);
  if (!fs.existsSync(manifestPath)) {
    return;
  }

  const dayManifest = readJson(manifestPath);
  expect(dayManifest.slug === day.slug, `${day.slug}: day manifest slug mismatch.`, errors);

  let computedTotal = 0;
  const computedCategoryCounts = {};
  for (const category of CATEGORIES) {
    const categoryManifest = dayManifest.categories?.[category];
    validateCategory(day.slug, category, categoryManifest, errors);
    const count = categoryManifest?.count || 0;
    computedCategoryCounts[category] = count;
    computedTotal += count;
  }

  expect(dayManifest.totalCount === computedTotal, `${day.slug}: totalCount does not equal category counts.`, errors);
  expect(globalEntry?.totalCount === dayManifest.totalCount, `${day.slug}: global totalCount does not match day manifest.`, errors);

  for (const category of CATEGORIES) {
    expect(
      globalEntry?.categoryCounts?.[category] === computedCategoryCounts[category],
      `${day.slug}: global ${category} count does not match day manifest.`,
      errors
    );
  }
}

function main() {
  const errors = [];
  const days = loadDays();

  expect(fs.existsSync(PHOTOS_ROOT), "public/photos does not exist.", errors);
  expect(fs.existsSync(GLOBAL_MANIFEST_PATH), "public/data/photo-manifest.json does not exist.", errors);

  if (!fs.existsSync(GLOBAL_MANIFEST_PATH)) {
    console.error("Photo asset validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  const globalManifest = readJson(GLOBAL_MANIFEST_PATH);
  const daySlugs = new Set(days.map((day) => day.slug));

  for (const day of days) {
    validateDay(day, globalManifest, errors);
  }

  for (const slug of Object.keys(globalManifest.days || {})) {
    expect(daySlugs.has(slug), `${slug}: unexpected slug in global photo manifest.`, errors);
    expect(slug !== "main_site", "main_site must not be included in global day manifest.", errors);
    expect(slug !== "day_no_category", "day_no_category must not be included in global day manifest.", errors);
  }

  for (const browserPath of MAIN_SITE_EXPECTED) {
    expect(fs.existsSync(browserPathToFilePath(browserPath)), `Missing main_site resource ${browserPath}.`, errors);
  }

  for (const publicPath of listPublicPaths(PHOTOS_ROOT)) {
    expect(!publicPath.split(path.sep).includes("_skip"), `Public photo output contains _skip path: ${publicPath}.`, errors);
  }

  if (errors.length > 0) {
    console.error("Photo asset validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Photo asset validation passed: ${days.length} day manifests checked.`);
}

main();
