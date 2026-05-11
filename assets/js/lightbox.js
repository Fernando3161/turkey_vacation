(function () {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) {
    return;
  }

  const closeButton = lightbox.querySelector(".overlay-close");
  const previousButton = lightbox.querySelector(".lightbox-nav--prev");
  const nextButton = lightbox.querySelector(".lightbox-nav--next");
  const image = document.getElementById("lightbox-image");
  const title = document.getElementById("lightbox-title");
  const category = document.getElementById("lightbox-category");
  const counter = document.getElementById("lightbox-counter");

  let photos = [];
  let currentIndex = 0;
  let returnFocusTo = null;

  function titleCase(value) {
    return String(value || "photo").charAt(0).toUpperCase() + String(value || "photo").slice(1);
  }

  function setBodyLocked(isLocked) {
    document.body.classList.toggle("is-lightbox-open", isLocked);
  }

  function activePhoto() {
    return photos[currentIndex] || null;
  }

  function render() {
    const photo = activePhoto();
    if (!photo || !image) {
      return;
    }

    const label = titleCase(photo.category || "photo");
    image.src = photo.full || photo.thumb || "";
    image.alt = `${label} photograph ${photo.filename || ""}`.trim();

    if (title) {
      title.textContent = photo.filename || "Photograph view";
    }

    if (category) {
      category.textContent = label;
    }

    if (counter) {
      counter.textContent = `${currentIndex + 1} of ${photos.length}`;
    }
  }

  function moveBy(delta) {
    if (photos.length === 0) {
      return;
    }

    // Navigation wraps around so a filtered set can be browsed continuously.
    currentIndex = (currentIndex + delta + photos.length) % photos.length;
    render();
  }

  function close() {
    lightbox.hidden = true;
    setBodyLocked(false);

    if (image) {
      image.removeAttribute("src");
      image.alt = "";
    }

    if (returnFocusTo && typeof returnFocusTo.focus === "function") {
      returnFocusTo.focus();
    }

    returnFocusTo = null;
  }

  function open(photoSet, startIndex, focusSource) {
    const nextPhotos = Array.isArray(photoSet)
      ? photoSet.filter((photo) => photo && (photo.full || photo.thumb))
      : [];

    if (nextPhotos.length === 0) {
      return;
    }

    photos = nextPhotos;
    currentIndex = Math.min(Math.max(Number(startIndex) || 0, 0), photos.length - 1);
    returnFocusTo = focusSource || document.activeElement;

    render();
    lightbox.hidden = false;
    setBodyLocked(true);

    if (closeButton) {
      closeButton.focus();
    }
  }

  if (closeButton) {
    closeButton.addEventListener("click", close);
  }

  if (previousButton) {
    previousButton.addEventListener("click", () => moveBy(-1));
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => moveBy(1));
  }

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) {
      return;
    }

    if (event.key === "Escape") {
      close();
    } else if (event.key === "ArrowLeft") {
      moveBy(-1);
    } else if (event.key === "ArrowRight") {
      moveBy(1);
    }
  });

  window.TurkeyLoopLightbox = {
    open,
    close
  };

  lightbox.dataset.lightboxShell = "ready";
})();
