const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DATA_FILE = path.join(__dirname, "..", "assets", "js", "data.js");
const REQUIRED_FIELDS = [
  "day",
  "slug",
  "title",
  "date",
  "locationName",
  "coordinates",
  "summary",
  "description",
  "categories"
];
const ALLOWED_CATEGORIES = new Set(["people", "places", "animals"]);

function loadDays() {
  const source = fs.readFileSync(DATA_FILE, "utf8");
  const sandbox = { window: {} };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {
    filename: DATA_FILE,
    timeout: 1000
  });

  return sandbox.window.TURKEY_LOOP_DAYS;
}

function validateDays(days) {
  const errors = [];

  if (!Array.isArray(days)) {
    return ["window.TURKEY_LOOP_DAYS must exist and be an array."];
  }

  const slugs = new Set();
  let previousDay = -Infinity;

  days.forEach((entry, index) => {
    const label = `Entry ${index}`;

    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${label}: day entry must be an object.`);
      return;
    }

    REQUIRED_FIELDS.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(entry, field)) {
        errors.push(`${label}: missing required field "${field}".`);
      }
    });

    if (typeof entry.day !== "number" || !Number.isInteger(entry.day)) {
      errors.push(`${label}: "day" must be an integer.`);
    } else if (entry.day <= previousDay) {
      errors.push(`${label}: days must be in strictly ascending order.`);
    } else {
      previousDay = entry.day;
    }

    if (typeof entry.slug !== "string" || entry.slug.trim() === "") {
      errors.push(`${label}: "slug" must be a non-empty string.`);
    } else if (slugs.has(entry.slug)) {
      errors.push(`${label}: duplicate slug "${entry.slug}".`);
    } else {
      slugs.add(entry.slug);
    }

    ["title", "date", "locationName", "summary", "description"].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(entry, field) && typeof entry[field] !== "string") {
        errors.push(`${label}: "${field}" must be a string.`);
      }
    });

    if (entry.coordinates !== null) {
      if (!Array.isArray(entry.coordinates) || entry.coordinates.length !== 2) {
        errors.push(`${label}: "coordinates" must be null or [lat, lng].`);
      } else {
        const [lat, lng] = entry.coordinates;

        if (typeof lat !== "number" || !Number.isFinite(lat)) {
          errors.push(`${label}: latitude must be a finite number.`);
        } else if (lat < -90 || lat > 90) {
          errors.push(`${label}: latitude ${lat} is outside -90 to 90.`);
        }

        if (typeof lng !== "number" || !Number.isFinite(lng)) {
          errors.push(`${label}: longitude must be a finite number.`);
        } else if (lng < -180 || lng > 180) {
          errors.push(`${label}: longitude ${lng} is outside -180 to 180.`);
        }
      }
    }

    if (!Array.isArray(entry.categories)) {
      errors.push(`${label}: "categories" must be an array.`);
    } else {
      entry.categories.forEach((category) => {
        if (!ALLOWED_CATEGORIES.has(category)) {
          errors.push(`${label}: invalid category "${category}". Allowed categories are people, places, animals.`);
        }
      });
    }
  });

  return errors;
}

function main() {
  let days;

  try {
    days = loadDays();
  } catch (error) {
    console.error(`Failed to load ${path.relative(process.cwd(), DATA_FILE)}:`);
    console.error(error.message);
    process.exit(1);
  }

  const errors = validateDays(days);

  if (errors.length > 0) {
    console.error("Data validation failed:");
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log(`Data validation passed: ${days.length} day entries checked.`);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateDays
};
