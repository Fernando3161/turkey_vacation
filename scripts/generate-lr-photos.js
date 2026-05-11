const fs = require("fs");
const path = require("path");
const vm = require("vm");
const sharp = require("sharp");

const SOURCE_ROOT = path.join(__dirname, "..", "pictures", "4_days_HR");
const OUTPUT_ROOT = path.join(__dirname, "..", "public", "photos");
const DATA_FILE = path.join(__dirname, "..", "assets", "js", "data.js");
const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const CATEGORIES = ["people", "places", "animals"];
const FULL_SETTINGS = { width: 1600, quality: 78 };
const THUMB_SETTINGS = { width: 420, quality: 70 };
const MAIN_SITE_IMAGES = [
  { source: "header.jpg", stem: "header" },
  { source: "about_me.jpeg", stem: "about_me" }
];

function relativePath(filePath) {
  return path.relative(process.cwd(), filePath);
}

function safeStem(fileName) {
  const parsed = path.parse(fileName);
  return parsed.name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._()-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "") || "image";
}

function loadDaySlugs() {
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

  return days.map((day) => day.slug).filter(Boolean);
}

async function pathExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root) {
  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await fs.promises.readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function outputsAreCurrent(sourcePath, fullPath, thumbPath) {
  if (!(await pathExists(fullPath)) || !(await pathExists(thumbPath))) {
    return false;
  }

  const [sourceStats, fullStats, thumbStats] = await Promise.all([
    fs.promises.stat(sourcePath),
    fs.promises.stat(fullPath),
    fs.promises.stat(thumbPath)
  ]);

  return fullStats.mtimeMs >= sourceStats.mtimeMs && thumbStats.mtimeMs >= sourceStats.mtimeMs;
}

async function outputSize(root) {
  if (!(await pathExists(root))) {
    return 0;
  }

  let total = 0;
  const entries = await fs.promises.readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      total += await outputSize(entryPath);
    } else if (entry.isFile()) {
      total += (await fs.promises.stat(entryPath)).size;
    }
  }

  return total;
}

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

async function generateVariant(sourcePath, outputPath, settings) {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: settings.width,
      withoutEnlargement: true
    })
    .webp({ quality: settings.quality })
    .toFile(outputPath);
}

async function processImage(sourcePath, outputDir, outputStem) {
  const stem = outputStem || safeStem(path.basename(sourcePath));
  const fullPath = path.join(outputDir, "full", `${stem}.webp`);
  const thumbPath = path.join(outputDir, "thumbs", `${stem}.webp`);

  if (await outputsAreCurrent(sourcePath, fullPath, thumbPath)) {
    return "skipped";
  }

  await Promise.all([
    generateVariant(sourcePath, fullPath, FULL_SETTINGS),
    generateVariant(sourcePath, thumbPath, THUMB_SETTINGS)
  ]);

  return "processed";
}

function registerOutput(outputNames, outputName, sourcePath) {
  const previousSource = outputNames.get(outputName);
  if (previousSource) {
    throw new Error(
      `Output filename collision for ${outputName}: ${relativePath(previousSource)} and ${relativePath(sourcePath)}`
    );
  }
  outputNames.set(outputName, sourcePath);
}

async function processGalleryDay(daySlug, stats) {
  const daySourceDir = path.join(SOURCE_ROOT, daySlug);

  if (!(await pathExists(daySourceDir))) {
    stats.missingFolders += 1;
    console.log(`Day source folder not found: ${relativePath(daySourceDir)}`);
    return;
  }

  for (const category of CATEGORIES) {
    const categorySourceDir = path.join(daySourceDir, category);
    const categoryOutputDir = path.join(OUTPUT_ROOT, daySlug, category);
    const files = await listFiles(categorySourceDir);
    const outputNames = new Map();

    for (const fileName of files) {
      const extension = path.extname(fileName).toLowerCase();
      const sourcePath = path.join(categorySourceDir, fileName);

      if (!SUPPORTED_EXTENSIONS.has(extension)) {
        stats.unsupported += 1;
        console.log(`Unsupported file skipped: ${relativePath(sourcePath)}`);
        continue;
      }

      try {
        const outputName = `${safeStem(fileName)}.webp`;
        registerOutput(outputNames, outputName, sourcePath);
        const result = await processImage(sourcePath, categoryOutputDir);
        stats[result] += 1;
        console.log(`${result === "processed" ? "Processed" : "Skipped"}: ${relativePath(sourcePath)}`);
      } catch (error) {
        stats.failed += 1;
        console.error(`Failed: ${relativePath(sourcePath)}`);
        console.error(`  ${error.message}`);
      }
    }
  }
}

async function processMainSiteImages(stats) {
  const mainSiteSourceDir = path.join(SOURCE_ROOT, "main_site");
  const mainSiteOutputDir = path.join(OUTPUT_ROOT, "main_site");

  for (const image of MAIN_SITE_IMAGES) {
    const sourcePath = path.join(mainSiteSourceDir, image.source);

    if (!(await pathExists(sourcePath))) {
      stats.failed += 1;
      console.error(`Missing required main_site image: ${relativePath(sourcePath)}`);
      continue;
    }

    try {
      const result = await processImage(sourcePath, mainSiteOutputDir, image.stem);
      stats[result] += 1;
      console.log(`${result === "processed" ? "Processed" : "Skipped"}: ${relativePath(sourcePath)}`);
    } catch (error) {
      stats.failed += 1;
      console.error(`Failed: ${relativePath(sourcePath)}`);
      console.error(`  ${error.message}`);
    }
  }
}

async function main() {
  const stats = {
    processed: 0,
    skipped: 0,
    unsupported: 0,
    missingFolders: 0,
    failed: 0
  };

  if (!(await pathExists(SOURCE_ROOT))) {
    stats.missingFolders += 1;
    console.log(`Source folder not found: ${relativePath(SOURCE_ROOT)}`);
    console.log("Photo generation skipped.");
    process.exit(1);
  }

  await fs.promises.mkdir(OUTPUT_ROOT, { recursive: true });

  const daySlugs = loadDaySlugs();
  for (const daySlug of daySlugs) {
    await processGalleryDay(daySlug, stats);
  }
  await processMainSiteImages(stats);

  const totalOutputSize = await outputSize(OUTPUT_ROOT);

  console.log("");
  console.log("Photo generation summary");
  console.log(`Processed images: ${stats.processed}`);
  console.log(`Skipped images: ${stats.skipped}`);
  console.log(`Unsupported files: ${stats.unsupported}`);
  console.log(`Missing folders: ${stats.missingFolders}`);
  console.log(`Failed images: ${stats.failed}`);
  console.log(`Total output size: ${formatBytes(totalOutputSize)}`);

  if (stats.failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
