(function () {
  const root = document.documentElement;
  if (!root) {
    return;
  }

  const panelTriggers = Array.from(document.querySelectorAll("[data-panel-target]"));
  const panels = Array.from(document.querySelectorAll(".overlay--info-panel"));
  let returnFocusTo = null;

  function formatShortDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("en", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function closePanel(panel) {
    if (!panel || panel.hidden) {
      return;
    }

    panel.hidden = true;

    if (returnFocusTo && typeof returnFocusTo.focus === "function") {
      returnFocusTo.focus();
    }

    returnFocusTo = null;
  }

  function closeOpenPanel() {
    const openPanel = panels.find((panel) => !panel.hidden);
    closePanel(openPanel);
  }

  function openPanel(panelId, focusSource) {
    const panel = document.getElementById(panelId);
    if (!panel) {
      return;
    }

    panels.forEach((candidate) => {
      if (candidate !== panel) {
        candidate.hidden = true;
      }
    });

    returnFocusTo = focusSource || document.activeElement;
    panel.hidden = false;

    const closeButton = panel.querySelector("[data-panel-close]");
    if (closeButton) {
      closeButton.focus();
    }
  }

  function populateItineraryTable() {
    const tableBody = document.getElementById("itinerary-table-body");
    const days = Array.isArray(window.TURKEY_LOOP_DAYS) ? window.TURKEY_LOOP_DAYS : [];

    if (!tableBody) {
      return;
    }

    const rows = days.map((day) => {
      const row = document.createElement("tr");
      const dayCell = document.createElement("th");
      const dateCell = document.createElement("td");
      const titleCell = document.createElement("td");
      const summaryCell = document.createElement("td");

      dayCell.scope = "row";
      dayCell.textContent = `Day ${day.day}`;
      dateCell.textContent = formatShortDate(day.date);
      titleCell.textContent = day.title || "";
      summaryCell.textContent = day.summary || "";

      row.append(dayCell, dateCell, titleCell, summaryCell);
      return row;
    });

    tableBody.replaceChildren(...rows);
  }

  panelTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
      openPanel(trigger.dataset.panelTarget, trigger);
    });
  });

  panels.forEach((panel) => {
    const closeButton = panel.querySelector("[data-panel-close]");
    if (closeButton) {
      closeButton.addEventListener("click", () => closePanel(panel));
    }

    panel.addEventListener("click", (event) => {
      if (event.target === panel) {
        closePanel(panel);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOpenPanel();
    }
  });

  populateItineraryTable();
  root.dataset.shell = "ready";

  window.TurkeyLoopPanels = {
    openPanel,
    closeOpenPanel
  };
})();
