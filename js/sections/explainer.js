// ==========================================================
// EXPLAINER
// Two side-view SVG diagrams that show WHY the projections differ.
// Same two objects in both. The far one keeps moving away.
// ==========================================================

const SVG_NS = "http://www.w3.org/2000/svg";

// ---------- Diagram layout (in SVG units) ----------
const W = 560;          // diagram width
const H = 320;          // diagram height
const AXIS_Y = 160;     // the camera's center line
const CAMERA_X = 48;    // where the eye / camera plane is
const SCREEN_X = 168;   // where the screen is (so f = 120)
const SIZE = 70;        // both objects are this tall (identical!)
const GAP = 15;         // gap between each object and the center line
const NEAR_X = 250;     // the near object stays here
const FAR_MIN = 270;    // the far object moves between these two
const FAR_MAX = 490;

const NEAR = { top: AXIS_Y - GAP - SIZE, bottom: AXIS_Y - GAP }; // above the line
const FAR = { top: AXIS_Y + GAP, bottom: AXIS_Y + GAP + SIZE };  // below the line

// Little helper: create an SVG element with attributes
function svgEl(tag, attrs = {}, parent = null) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  if (parent) parent.appendChild(node);
  return node;
}

function setAttrs(node, attrs) {
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
}

// ==========================================================
// One diagram
// ==========================================================
class ProjectionDiagram {
  constructor(container, mode) {
    this.isPersp = mode === "perspective";

    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "diagram__svg", "aria-hidden": "true" }, container);
    this.svg = svg;

    // Drawn back-to-front: later elements appear on top

    // 1. View volume: a pyramid (perspective) or a box (orthographic)
    if (this.isPersp) {
      svgEl("polygon", { points: `${CAMERA_X},${AXIS_Y} 530,28 530,292`, class: "dg-volume" }, svg);
    } else {
      svgEl("rect", { x: CAMERA_X, y: 52, width: 530 - CAMERA_X, height: 216, class: "dg-volume" }, svg);
    }

    // 2. Center line
    svgEl("line", { x1: CAMERA_X, y1: AXIS_Y, x2: 530, y2: AXIS_Y, class: "dg-axis" }, svg);

    // 3. Rays (4 of them: top + bottom of each object). pathLength=1 lets CSS "draw" them.
    this.rays = [0, 1, 2, 3].map(() => svgEl("line", { class: "dg-ray", pathLength: 1 }, svg));

    // 4. Screen
    svgEl("line", { x1: SCREEN_X, y1: 40, x2: SCREEN_X, y2: 280, class: "dg-screen" }, svg);
    this.label("SCREEN", SCREEN_X, 30, "middle");

    // 5. Camera: a single point (eye) or a flat plane
    if (this.isPersp) {
      svgEl("circle", { cx: CAMERA_X, cy: AXIS_Y, r: 6, class: "dg-camera" }, svg);
      this.label("EYE", CAMERA_X, AXIS_Y + 26, "middle");
    } else {
      svgEl("line", { x1: CAMERA_X, y1: 52, x2: CAMERA_X, y2: 268, class: "dg-camera-plane" }, svg);
      this.label("CAMERA PLANE", CAMERA_X - 6, 296, "start");
    }

    // 6. The two identical objects
    svgEl("rect", { x: NEAR_X, y: NEAR.top, width: SIZE, height: SIZE, rx: 6, class: "dg-object" }, svg);
    this.label("NEAR", NEAR_X + SIZE / 2, NEAR.top - 10, "middle");

    this.farRect = svgEl("rect", { y: FAR.top, width: SIZE, height: SIZE, rx: 6, class: "dg-object" }, svg);
    this.farLabel = this.label("FAR", 0, FAR.bottom + 20, "middle");

    // 7. What lands on the screen
    this.nearBar = svgEl("line", { class: "dg-bar" }, svg);
    this.farBar = svgEl("line", { class: "dg-bar" }, svg);
  }

  label(text, x, y, anchor) {
    const node = svgEl("text", { x, y, "text-anchor": anchor, class: "dg-label" }, this.svg);
    node.textContent = text;
    return node;
  }

  // Where does a point (x, y) land on the screen?
  project(x, y) {
    if (this.isPersp) {
      // Similar triangles: y′ = f · y / z   (measured from the center line)
      const f = SCREEN_X - CAMERA_X;
      const z = x - CAMERA_X;
      return AXIS_Y + ((y - AXIS_Y) * f) / z;
    }
    // Orthographic: rays are parallel, height doesn't change
    return y;
  }

  // Redraw everything for a given far-object position. Returns the size ratio.
  update(farX) {
    setAttrs(this.farRect, { x: farX });
    setAttrs(this.farLabel, { x: farX + SIZE / 2 });

    // Rays go from the camera to each object's front corners
    const corners = [
      [NEAR_X, NEAR.top],
      [NEAR_X, NEAR.bottom],
      [farX, FAR.top],
      [farX, FAR.bottom],
    ];

    corners.forEach(([x, y], i) => {
      setAttrs(this.rays[i], {
        x1: CAMERA_X,
        y1: this.isPersp ? AXIS_Y : y, // persp: all start at the eye; ortho: straight across
        x2: x,
        y2: y,
      });
    });

    // Bars on the screen
    const nearTop = this.project(NEAR_X, NEAR.top);
    const nearBottom = this.project(NEAR_X, NEAR.bottom);
    const farTop = this.project(farX, FAR.top);
    const farBottom = this.project(farX, FAR.bottom);

    setAttrs(this.nearBar, { x1: SCREEN_X, y1: nearTop, x2: SCREEN_X, y2: nearBottom });
    setAttrs(this.farBar, { x1: SCREEN_X, y1: farTop, x2: SCREEN_X, y2: farBottom });

    return (farBottom - farTop) / (nearBottom - nearTop);
  }
}

// ==========================================================
// The section: both diagrams share one far-object position
// ==========================================================
export function initExplainer() {
  const section = document.getElementById("explainer");
  if (!section) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const items = [...section.querySelectorAll("[data-diagram]")].map((container) => ({
    diagram: new ProjectionDiagram(container, container.dataset.diagram),
    ratioEl: container.closest(".diagram-card").querySelector("[data-ratio]"),
    lastText: "",
  }));

  let current = (FAR_MIN + FAR_MAX) / 2; // where the far object is right now
  let manual = null;                     // set while the user hovers a diagram
  let running = false;
  const startTime = performance.now();

  // ---------- Hover to move the far object ----------
  items.forEach(({ diagram }) => {
    diagram.svg.addEventListener("pointermove", (e) => {
      const rect = diagram.svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * W - SIZE / 2; // screen px → SVG units
      manual = Math.min(Math.max(x, FAR_MIN), FAR_MAX);
    });
    diagram.svg.addEventListener("pointerleave", () => (manual = null));
  });

  // ---------- Draw one frame ----------
  function draw() {
    for (const item of items) {
      const ratio = item.diagram.update(current);
      const text = `${Math.round(ratio * 100)}%`;
      if (text !== item.lastText) {
        item.ratioEl.textContent = text;
        item.lastText = text;
      }
    }
  }

  function frame() {
    if (!running) return;

    const t = (performance.now() - startTime) / 1000;

    // Auto mode: glide back and forth (cosine = smooth at both ends)
    const auto = reduceMotion
      ? FAR_MAX
      : FAR_MIN + (FAR_MAX - FAR_MIN) * (0.5 - 0.5 * Math.cos(t * 0.9));

    const goal = manual ?? auto; // "??" = use manual if it exists, otherwise auto
    current += (goal - current) * 0.12; // smooth chase

    draw();
    requestAnimationFrame(frame);
  }

  draw(); // draw once immediately, so the diagrams are never empty

  // ---------- Only run while visible ----------
  new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        section.classList.add("is-visible"); // triggers the CSS entrance
        if (!running) {
          running = true;
          requestAnimationFrame(frame);
        }
      } else {
        running = false;
      }
    },
    { threshold: 0.2 } // "visible" = at least 20% on screen
  ).observe(section);
}