// ==========================================================
// POLISH
// Loader, scroll reveals, smart nav, progress bar, magnetic button.
// None of this is required for the site to work — it just feels better.
// ==========================================================

export function initPolish() {
  hideLoaderWhenReady();
  setupReveals();
  setupNavAndProgress();
  setupMagnetic();
}

// ---------- Loader ----------
function hideLoaderWhenReady() {
  const pageLoaded = new Promise((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", resolve, { once: true });
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  Promise.all([pageLoaded, fontsReady]).then(() => {
    // Show the loader for at least 0.8s, so it doesn't just "flash"
    const wait = Math.max(0, 800 - performance.now());
    setTimeout(() => document.documentElement.classList.add("is-loaded"), wait);
  });
}

// ---------- Scroll reveals ----------
const REVEAL_TARGETS = [
  ".section-head",
  ".object-picker",
  ".lab-toolbar",
  ".lab-grid",
  ".lab-notes",
  ".control-center",
  ".explainer-hint",
  ".experiment-toolbar",
  ".experiment-grid",
  ".distance-control",
  ".spec",
  ".apps-toolbar",
  ".bento-card",
  ".footer__inner",
].join(",");

function setupReveals() {
  if (!("IntersectionObserver" in window)) return; // very old browser: just show everything

  const targets = [...document.querySelectorAll(REVEAL_TARGETS)];

  targets.forEach((el) => {
    el.setAttribute("data-reveal", "");

    // Bento cards ripple in, one after another (per row of 4)
    if (el.classList.contains("bento-card")) {
      const index = [...el.parentElement.children].indexOf(el);
      el.style.setProperty("--reveal-delay", `${(index % 4) * 70}ms`);
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        const el = entry.target;
        el.classList.add("is-revealed");
        observer.unobserve(el); // reveal once only

        // When finished, remove the reveal styles completely,
        // so the element's own hover/transition styles work normally
        const delay = parseFloat(el.style.getPropertyValue("--reveal-delay")) || 0;
        setTimeout(() => {
          el.removeAttribute("data-reveal");
          el.classList.remove("is-revealed");
          el.style.removeProperty("--reveal-delay");
        }, 1000 + delay);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  targets.forEach((el) => observer.observe(el));

  // Only now is it safe to hide things (we know we can reveal them)
  document.documentElement.classList.add("reveals-ready");
}

// ---------- Smart nav + scroll progress ----------
function setupNavAndProgress() {
  const nav = document.querySelector(".nav");
  if (!nav) return;

  // Scrollspy: highlight the link of the section in the middle of the screen
  const links = [...nav.querySelectorAll('.nav__links a[href^="#"]')];
  const linkById = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));

  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const active = linkById.get(entry.target.id); // undefined for the hero = nothing active
        links.forEach((a) => a.classList.toggle("is-active", a === active));
      }
    },
    { rootMargin: "-45% 0px -50% 0px" } // a thin band across the middle of the screen
  );

  ["top", ...linkById.keys()].forEach((id) => {
    const section = document.getElementById(id);
    if (section) spy.observe(section);
  });

  // Progress bar (created here, since it's pure decoration)
  const progress = document.createElement("div");
  progress.className = "scroll-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.innerHTML = "<span></span>";
  document.body.appendChild(progress);
  const bar = progress.firstElementChild;

  // Hide nav on scroll down, show on scroll up
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;

    nav.classList.toggle("is-scrolled", y > 8);

    if (y > lastY + 4 && y > 160) nav.classList.add("is-hidden");
    else if (y < lastY - 4) nav.classList.remove("is-hidden");

    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    lastY = y;
    ticking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll); // at most once per frame
      }
    },
    { passive: true }
  );

  // Keyboard users tabbing into the nav should always see it
  nav.addEventListener("focusin", () => nav.classList.remove("is-hidden"));

  onScroll();
}

// ---------- Magnetic button ----------
function setupMagnetic() {
  if (window.matchMedia("(pointer: coarse)").matches) return; // no hover on touch screens

  document.querySelectorAll("[data-magnetic]").forEach((button) => {
    button.addEventListener("pointermove", (e) => {
      const rect = button.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      button.style.translate = `${x * 0.2}px ${y * 0.3}px`;
    });

    button.addEventListener("pointerleave", () => {
      button.style.translate = "";
    });
  });
}