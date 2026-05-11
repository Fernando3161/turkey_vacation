(function () {
  const modal = document.getElementById("day-modal");
  if (!modal) {
    return;
  }

  const title = document.getElementById("day-modal-title");
  const meta = document.getElementById("day-modal-meta");
  const summary = document.getElementById("day-modal-summary");
  const description = document.getElementById("day-modal-description");
  const takeaway = document.getElementById("day-modal-takeaway");
  const takeawayText = takeaway ? takeaway.querySelector("p") : null;
  const expandedPanel = document.getElementById("day-modal-expanded");
  const expandedTitle = document.getElementById("day-modal-expanded-title");
  const expandedContent = document.getElementById("day-modal-expanded-content");
  const closeButton = modal.querySelector(".overlay-close");

  function findDay(slug) {
    const days = Array.isArray(window.TURKEY_LOOP_DAYS) ? window.TURKEY_LOOP_DAYS : [];
    return days.find((day) => day.slug === slug) || null;
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
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function setText(element, value) {
    if (element) {
      element.textContent = value || "";
    }
  }

  function setExpandedText(day) {
    if (!expandedPanel || !expandedTitle || !expandedContent) {
      return;
    }

    expandedContent.replaceChildren();
    const text = day?.expandedDescription || "";
    expandedPanel.hidden = text.trim() === "";

    if (expandedPanel.hidden) {
      setText(expandedTitle, "");
      return;
    }

    setText(expandedTitle, `Day ${day.day}: ${day.title}`);
    text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .forEach((paragraphText) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = paragraphText;
        expandedContent.append(paragraph);
      });
  }

  function populateDay(day, slug) {
    if (!day) {
      setText(title, "Day archive");
      setText(meta, "Selected day could not be found.");
      setText(summary, "");
      if (description) {
        description.replaceChildren();
      }
      if (takeaway) {
        takeaway.hidden = true;
      }
      setExpandedText(null);
      return;
    }

    setText(title, `Day ${day.day}: ${day.title}`);
    setText(meta, [formatDate(day.date), day.locationName].filter(Boolean).join(" - "));
    setText(summary, day.summary);

    if (description) {
      description.replaceChildren();
      const paragraph = document.createElement("p");
      paragraph.textContent = day.description || "No day description has been added yet.";
      description.append(paragraph);
    }

    if (takeaway && takeawayText) {
      const note = day.historicalTakeaway || "";
      takeaway.hidden = note.trim() === "";
      takeawayText.textContent = note;
    }

    setExpandedText(day);
    modal.dataset.activeSlug = slug;
  }

  function openDay(slug) {
    const day = findDay(slug);
    populateDay(day, slug);
    modal.hidden = false;

    if (window.TurkeyLoopGallery && typeof window.TurkeyLoopGallery.renderDay === "function") {
      window.TurkeyLoopGallery.renderDay(slug);
    }

    if (closeButton) {
      closeButton.focus();
    }
  }

  function close() {
    modal.hidden = true;
    delete modal.dataset.activeSlug;
  }

  if (closeButton) {
    closeButton.addEventListener("click", close);
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    const lightbox = document.getElementById("lightbox");
    if (lightbox && !lightbox.hidden) {
      return;
    }

    if (event.key === "Escape" && !modal.hidden) {
      close();
    }
  });

  window.TurkeyLoopModal = {
    openDay,
    close
  };

  modal.dataset.modalShell = "ready";
})();
