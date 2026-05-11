(function () {
  const filterContainer = document.getElementById("day-gallery-filters");
  const grid = document.getElementById("day-gallery-grid");
  const status = document.getElementById("day-gallery-status");

  if (!filterContainer || !grid || !status) {
    return;
  }

  const CATEGORIES = ["people", "places", "animals"];
  const FILTERS = ["all", ...CATEGORIES];
  let activeManifest = null;
  let activeCategory = "all";

  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function categoryLabel(category) {
    return category === "animals" ? "Cats" : titleCase(category || "photo");
  }

  function manifestUrl(slug) {
    return `public/photos/${encodeURIComponent(slug)}/manifest.json`;
  }

  function setStatus(message, type) {
    status.textContent = message || "";
    status.dataset.state = type || "";
  }

  function photosForCategory(manifest, category) {
    if (!manifest || !manifest.categories) {
      return [];
    }

    if (category === "all") {
      return CATEGORIES.flatMap((name) => manifest.categories?.[name]?.photos || []);
    }

    return manifest.categories?.[category]?.photos || [];
  }

  function countForCategory(manifest, category) {
    return photosForCategory(manifest, category).length;
  }

  function renderFilters(manifest) {
    filterContainer.replaceChildren();

    FILTERS.forEach((category) => {
      const button = document.createElement("button");
      const count = countForCategory(manifest, category);
      button.type = "button";
      button.className = "day-gallery__filter";
      button.dataset.category = category;
      button.setAttribute("aria-pressed", category === activeCategory ? "true" : "false");
      button.textContent = `${category === "all" ? "All" : categoryLabel(category)} (${count})`;
      button.addEventListener("click", () => {
        activeCategory = category;
        renderFilters(manifest);
        renderPhotos(manifest, category);
      });
      filterContainer.append(button);
    });
  }

  function renderEmpty(category) {
    const empty = document.createElement("p");
    empty.className = "day-gallery__empty";
    empty.textContent =
      category === "all"
        ? "No photographs are available for this day yet."
        : `No ${categoryLabel(category).toLowerCase()} photographs are available for this day yet.`;
    grid.replaceChildren(empty);
  }

  function renderPhotos(manifest, category) {
    const photos = photosForCategory(manifest, category);
    grid.replaceChildren();

    if (photos.length === 0) {
      renderEmpty(category);
      setStatus("No photographs in this selection.", "empty");
      return;
    }

    const fragment = document.createDocumentFragment();
    photos.forEach((photo, index) => {
      const button = document.createElement("button");
      const image = document.createElement("img");
      const caption = document.createElement("span");

      button.type = "button";
      button.className = "day-gallery__photo";
      button.dataset.full = photo.full || "";
      button.dataset.thumb = photo.thumb || "";
      button.dataset.category = photo.category || "";
      button.dataset.photoId = photo.id || "";
      button.dataset.index = String(index);
      button.setAttribute("aria-label", `Open ${categoryLabel(photo.category)} photograph`);
      button.addEventListener("click", () => {
        if (window.TurkeyLoopLightbox && typeof window.TurkeyLoopLightbox.open === "function") {
          window.TurkeyLoopLightbox.open(photos, index, button);
        }
      });

      image.src = photo.thumb;
      image.alt = `${categoryLabel(photo.category)} photograph`;
      image.loading = "lazy";
      image.decoding = "async";

      caption.textContent = categoryLabel(photo.category);

      button.append(image, caption);
      fragment.append(button);
    });

    grid.append(fragment);
    setStatus(`${photos.length} photograph${photos.length === 1 ? "" : "s"} shown.`, "ready");
  }

  function normalizeManifest(manifest) {
    const normalized = manifest && typeof manifest === "object" ? manifest : {};
    normalized.categories = normalized.categories && typeof normalized.categories === "object" ? normalized.categories : {};

    CATEGORIES.forEach((category) => {
      const current = normalized.categories[category];
      if (!current || !Array.isArray(current.photos)) {
        normalized.categories[category] = {
          count: 0,
          photos: []
        };
      }
    });

    return normalized;
  }

  async function loadManifest(slug) {
    const response = await fetch(manifestUrl(slug));
    if (!response.ok) {
      throw new Error(`Manifest not found for ${slug}.`);
    }

    return normalizeManifest(await response.json());
  }

  async function renderDay(slug) {
    activeCategory = "all";
    activeManifest = null;
    filterContainer.replaceChildren();
    grid.replaceChildren();
    setStatus("Loading photographs...", "loading");

    try {
      activeManifest = await loadManifest(slug);
      renderFilters(activeManifest);
      renderPhotos(activeManifest, activeCategory);
    } catch {
      setStatus("Photographs could not be loaded for this day.", "error");
      renderEmpty("all");
    }
  }

  window.TurkeyLoopGallery = {
    renderDay
  };

  filterContainer.dataset.galleryShell = "ready";
})();
