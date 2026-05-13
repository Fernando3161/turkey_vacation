(function () {
  const DEFAULT_CENTER = [39.0, 35.0];
  const DEFAULT_ZOOM = 6;
  const MANIFEST_URL = "public/data/photo-manifest.json";
  const MARKER_HINT_STORAGE_KEY = "turkeyLoopMarkerHintSeen";

  function isValidCoordinatePair(value) {
    if (!Array.isArray(value) || value.length !== 2) {
      return false;
    }

    const [lat, lng] = value;
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  async function loadPhotoManifest() {
    try {
      const response = await fetch(MANIFEST_URL);
      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  function photoCountForDay(photoManifest, slug) {
    return photoManifest?.days?.[slug]?.totalCount;
  }

  function popupHtml(day, photoCount) {
    const photoLine = Number.isFinite(photoCount)
      ? `<p class="map-popup__meta">${photoCount} photos</p>`
      : "";

    return `
      <div class="map-popup">
        <p class="map-popup__eyebrow">Day ${escapeHtml(day.day)}</p>
        <h3>${escapeHtml(day.title)}</h3>
        <p class="map-popup__meta">${escapeHtml(day.locationName)}</p>
        <p class="map-popup__meta">${escapeHtml(formatDate(day.date))}</p>
        ${photoLine}
      </div>
    `;
  }

  function dayMarkerIcon(day) {
    return L.divIcon({
      className: "turkey-day-marker",
      html: `<span><b>${escapeHtml(day.day)}</b></span>`,
      iconSize: [30, 36],
      iconAnchor: [15, 34],
      popupAnchor: [0, -30]
    });
  }

  function openDay(slug) {
    if (window.TurkeyLoopModal && typeof window.TurkeyLoopModal.openDay === "function") {
      window.TurkeyLoopModal.openDay(slug);
    }
  }

  function storageValue(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function setStorageValue(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      return;
    }
  }

  function setupMarkerHint() {
    const hint = document.getElementById("map-marker-hint");
    if (!hint) {
      return () => {};
    }

    const closeButton = hint.querySelector("[data-map-marker-hint-close]");
    const dismiss = () => {
      hint.hidden = true;
      setStorageValue(MARKER_HINT_STORAGE_KEY, "true");
    };

    if (closeButton) {
      closeButton.addEventListener("click", dismiss);
    }

    if (storageValue(MARKER_HINT_STORAGE_KEY) !== "true") {
      hint.hidden = false;
    }

    return dismiss;
  }

  async function initMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement || typeof L === "undefined") {
      return;
    }

    if (mapElement.dataset.mapInitialized === "true") {
      return;
    }
    mapElement.dataset.mapInitialized = "true";

    const days = Array.isArray(window.TURKEY_LOOP_DAYS) ? window.TURKEY_LOOP_DAYS : [];
    const photoManifest = await loadPhotoManifest();
    const map = L.map(mapElement, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    mapElement.classList.add("is-leaflet-ready");
    mapElement.dataset.mapShell = "leaflet";
    const dismissMarkerHint = setupMarkerHint();

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const bounds = [];

    days.forEach((day) => {
      if (!isValidCoordinatePair(day.coordinates)) {
        return;
      }

      const photoCount = photoCountForDay(photoManifest, day.slug);
      const marker = L.marker(day.coordinates, {
        icon: dayMarkerIcon(day),
        title: `Day ${day.day}: ${day.title}`
      }).addTo(map);

      marker.bindPopup(popupHtml(day, photoCount));
      marker.on("click", () => {
        dismissMarkerHint();
        openDay(day.slug);
      });
      bounds.push(day.coordinates);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [36, 36],
        maxZoom: 9
      });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    window.addEventListener(
      "load",
      () => {
        map.invalidateSize();
      },
      { once: true }
    );

    window.TurkeyLoopMap = {
      map,
      markerCount: bounds.length
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMap, { once: true });
  } else {
    initMap();
  }
})();
