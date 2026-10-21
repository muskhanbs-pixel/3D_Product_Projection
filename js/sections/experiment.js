// ==========================================================
// EXPERIMENT
// One distance slider moves BOTH cameras. Ortho zoom is locked.
// Meters measure how much of the screen the object really fills.
// ==========================================================

import * as THREE from "three";
import { Viewport } from "../three/Viewport.js";
import { createOrthographicCamera } from "../three/cameras.js";
import { FLOOR_Y, addStudioLights, createContactShadow } from "../three/createScene.js";

// ---------- Settings ----------
const FOV = 50;
const START_DISTANCE = 7;
const MIN_DISTANCE = 2.5;
const MAX_DISTANCE = 16;

// Where each mode's camera looks from, and at
const RIGS = {
  single: {
    target: new THREE.Vector3(0, 0, 0),
    direction: new THREE.Vector3(0.45, 0.35, 1).normalize(),
  },
  pillars: {
    target: new THREE.Vector3(0, FLOOR_Y + 1.1, 0), // center of the first pillar
    direction: new THREE.Vector3(0.4, 0.22, 1).normalize(),
  },
};

// ---------- Building blocks ----------
function makeSolid(geometry, edgeAngle = 1) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xedeef0, roughness: 0.35, metalness: 0.1 })
  ));
  group.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, edgeAngle),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
  ));
  return group;
}

function addShadow(parent, x, z, size) {
  const shadow = createContactShadow(size, 0.6);
  shadow.position.set(x, FLOOR_Y + 0.01, z);
  parent.add(shadow);
}

function buildScene() {
  const scene = new THREE.Scene();
  const bg = new THREE.Color(0x0b0c0f);
  scene.background = bg;
  scene.fog = new THREE.Fog(bg, 18, 42); // farther fog: the camera travels far here

  addStudioLights(scene);

  const grid = new THREE.GridHelper(80, 160, 0x3a3f47, 0x1c1f25);
  grid.position.y = FLOOR_Y;
  scene.add(grid);

  // Mode 1: a single cube
  const single = new THREE.Group();
  const cube = makeSolid(new THREE.BoxGeometry(1.4, 1.4, 1.4));
  single.add(cube);
  addShadow(single, 0, 0, 3);

  // Mode 2: six identical pillars in a row, going away from the camera
  const pillars = new THREE.Group();
  const pillarGeometry = new THREE.CylinderGeometry(0.24, 0.24, 2.2, 32);
  const pillarList = [];

  for (let i = 0; i < 6; i++) {
    const pillar = makeSolid(pillarGeometry, 30);
    pillar.position.set(0, FLOOR_Y + 1.1, -i * 2.6); // standing on the floor, 2.6 apart
    pillars.add(pillar);
    pillarList.push(pillar);
    addShadow(pillars, 0, -i * 2.6, 1.2);
  }
  pillars.visible = false;

  scene.add(single, pillars);

  // "references" = the object each mode measures
  return { scene, groups: { single, pillars }, references: { single: cube, pillars: pillarList[0] } };
}

// ---------- Measuring apparent size ----------
const box = new THREE.Box3();
const corner = new THREE.Vector3();

// Returns the fraction (0–1) of the screen HEIGHT the object fills
function apparentHeight(object, camera) {
  box.setFromObject(object);

  let minY = Infinity;
  let maxY = -Infinity;

  // The bounding box has 8 corners. The bits of i (0–7) pick min or max on each axis.
  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? box.max.x : box.min.x,
      i & 2 ? box.max.y : box.min.y,
      i & 4 ? box.max.z : box.min.z
    );
    corner.project(camera); // 3D world → screen, y from -1 (bottom) to +1 (top)
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
  }

  return (maxY - minY) / 2; // the full screen is 2 units tall
}

// ==========================================================
// The section
// ==========================================================
export function initExperiment() {
  const section = document.getElementById("experiment");
  if (!section) return;

  const { scene, groups, references } = buildScene();
  let mode = "single";

  // ---------- Cameras ----------
  const perspCam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

  // Ortho box sized so both views match AT THE START — then zoom stays locked
  const orthoViewSize = 2 * START_DISTANCE * Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
  const orthoCam = createOrthographicCamera(orthoViewSize);

  // Both cameras are puppets: same position, same direction, same target
  function placeCameras(distance) {
    const rig = RIGS[mode];
    for (const camera of [perspCam, orthoCam]) {
      camera.position.copy(rig.target).addScaledVector(rig.direction, distance);
      camera.lookAt(rig.target);
      camera.updateMatrixWorld(); // needed before measuring with .project()
    }
  }

  placeCameras(START_DISTANCE); // place them BEFORE the viewports are built

  // ---------- Viewports (mouse controls switched off) ----------
  const perspView = new Viewport({ container: document.getElementById("exp-persp"), scene, camera: perspCam });
  const orthoView = new Viewport({ container: document.getElementById("exp-ortho"), scene, camera: orthoCam });

  for (const view of [perspView, orthoView]) {
    view.controls.enabled = false;
    view.controls.autoRotate = false;
  }

  // ---------- Baselines: each mode's size at the starting distance ----------
  const baselines = { persp: {}, ortho: {} };
  for (const name of Object.keys(RIGS)) {
    mode = name;
    placeCameras(START_DISTANCE);
    baselines.persp[name] = apparentHeight(references[name], perspCam);
    baselines.ortho[name] = apparentHeight(references[name], orthoCam);
  }
  mode = "single";

  // ---------- Meter panels ----------
  function makePanel(key, camera, isPersp) {
    const el = section.querySelector(`[data-panel="${key}"]`);
    return {
      key, camera, isPersp, el,
      size: el.querySelector("[data-size]"),
      fill: el.querySelector("[data-fill]"),
      marker: el.querySelector("[data-marker]"),
      feedback: el.querySelector("[data-feedback]"),
      multiplier: el.querySelector("[data-multiplier]"),
      dist: el.querySelector("[data-exp-dist]"),
      last: {},
    };
  }

  const panels = [makePanel("persp", perspCam, true), makePanel("ortho", orthoCam, false)];

  // Only touch the page when a value actually changes
  function setText(panel, field, text) {
    if (panel.last[field] !== text) {
      panel[field].textContent = text;
      panel.last[field] = text;
    }
  }

  function updateMeters(distance) {
    const reference = references[mode];

    for (const panel of panels) {
      const size = apparentHeight(reference, panel.camera);
      const baseline = baselines[panel.key][mode];
      const ratio = size / baseline;
      const changed = Math.abs(ratio - 1) >= 0.02; // more than 2% different

      panel.fill.style.width = `${Math.min(size, 1) * 100}%`;
      panel.marker.style.left = `${Math.min(baseline, 1) * 100}%`;

      setText(panel, "size", `${Math.round(size * 100)}%`);
      setText(panel, "multiplier", `×${ratio.toFixed(2)}`);
      setText(panel, "dist", distance.toFixed(2));

      const message = panel.isPersp
        ? changed ? "Apparent size changes" : "Move the camera to compare"
        : "Apparent size remains constant";
      setText(panel, "feedback", message);

      panel.el.classList.toggle("is-changing", changed);
    }
  }

  // ---------- Big slider ----------
  const slider = document.getElementById("exp-distance");
  const distanceValue = document.getElementById("exp-distance-value");
  let goal = START_DISTANCE;    // where the slider says to go
  let current = START_DISTANCE; // where the cameras actually are (chases the goal)

  function paintSlider(value) {
    const percent = ((value - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE)) * 100;
    slider.style.setProperty("--fill", `${percent}%`);
  }

  slider.addEventListener("input", () => {
    goal = Number(slider.value);
    paintSlider(goal);
    setAutoplay(false); // the user's hand wins
  });
  paintSlider(goal);

  // ---------- Auto sweep ----------
  const playBtn = document.getElementById("experiment-play");
  let autoplay = false;
  let sweepStart = 0;

  function setAutoplay(isOn) {
    autoplay = isOn;
    playBtn.classList.toggle("is-active", isOn);
    playBtn.setAttribute("aria-pressed", String(isOn));
    if (isOn) sweepStart = performance.now();
  }

  playBtn.addEventListener("click", () => setAutoplay(!autoplay));

  // ---------- Mode switch ----------
  const modeEl = document.getElementById("experiment-mode");
  const modeOptions = [...modeEl.querySelectorAll("[data-mode]")];

  modeOptions.forEach((option, index) => {
    option.addEventListener("click", () => {
      mode = option.dataset.mode;
      groups.single.visible = mode === "single";
      groups.pillars.visible = mode === "pillars";

      modeEl.style.setProperty("--index", index);
      modeOptions.forEach((o, i) => {
        o.classList.toggle("is-active", i === index);
        o.setAttribute("aria-checked", String(i === index));
      });
    });
  });

  // ---------- Loop (only while visible) ----------
  let running = false;
  let lastDistanceText = "";

  function frame() {
    if (!running) return;

    if (autoplay) {
      // Slow dolly in and out, starting from the far end
      const t = (performance.now() - sweepStart) / 1000;
      goal = MIN_DISTANCE + (MAX_DISTANCE - MIN_DISTANCE) * (0.5 + 0.5 * Math.cos(t * 0.6));
      slider.value = goal;
      paintSlider(goal);
    }

    current += (goal - current) * 0.15; // smooth chase = silky camera motion

    placeCameras(current);
    perspView.render(false); // false = don't let orbit controls touch the camera
    orthoView.render(false);
    updateMeters(current);

    const distanceText = current.toFixed(2);
    if (distanceText !== lastDistanceText) {
      distanceValue.textContent = distanceText;
      lastDistanceText = distanceText;
    }

    requestAnimationFrame(frame);
  }

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      requestAnimationFrame(frame);
    } else if (!entry.isIntersecting) {
      running = false;
    }
  }, { threshold: 0.1 }).observe(section);
}