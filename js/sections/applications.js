// ==========================================================
// APPLICATIONS
// - Filter: dims cards of the other projection
// - Spotlight: a soft glow that follows the cursor on each card
// ==========================================================

export function initApplications() {
  const section = document.getElementById("applications");
  if (!section) return;

  const cards = section.querySelectorAll(".bento-card");

  // ---------- Filter ----------
  const filterEl = document.getElementById("apps-filter");
  const options = [...filterEl.querySelectorAll("[data-filter]")];

  options.forEach((option, index) => {
    option.addEventListener("click", () => {
      const filter = option.dataset.filter; // "all", "persp" or "ortho"

      cards.forEach((card) => {
        const isHidden = filter !== "all" && card.dataset.projection !== filter;
        card.classList.toggle("is-dimmed", isHidden);
      });

      // Move the sliding pill + update states
      filterEl.style.setProperty("--index", index);
      options.forEach((o, i) => {
        o.classList.toggle("is-active", i === index);
        o.setAttribute("aria-checked", String(i === index));
      });
    });
  });

  // ---------- Spotlight ----------
  // JS only reports WHERE the cursor is. CSS draws the glow there.
  cards.forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    });
  });
}