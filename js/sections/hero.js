// ==========================================================
// HERO
// Three cubes in a row + a camera that morphs between
// perspective and orthographic using a dolly zoom.
// ==========================================================

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { addStudioLights, createContactShadow } from "../three/createScene.js";
import { updateOrthoFrustum } from "../three/cameras.js";

// ---------- Tweakable settings ----------
const SETTINGS = {
  viewHeight: 5.2,  // how many world units tall the view is at the target
  startFov: 40,     // perspective FOV at the start of the morph
  endFov: 1.5,      // tiny FOV = basically orthographic
  holdTime: 2.6,    // seconds to pause on each projection
  morphTime: 1.8,   // seconds each morph takes
  direction: new THREE.Vector3(0.5, 0.35, 1).normalize(), // where the camera looks from
};

const FLOOR = -0.45;                      // cubes are 0.9 tall, centered at 0
const TARGET = new THREE.Vector3(0, 0, 0); // the point both cameras look at

// ---------- Easing helpers (make motion feel natural) ----------
const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

export function createHero(container) {
  const labelEl = container.querySelector("[data-hero-label]");
  const labelText = container.querySelector("[data-hero-label-text]");
  const thumbEl = container.querySelector("[data-hero-thumb]");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // =========================================================
  // SCENE
  // =========================================================
  const scene = new THREE.Scene();
  addStudioLights(scene);

  // A "rig" holds everything that tilts with the mouse
  const rig = new THREE.Group();
  scene.add(rig);

  const grid = new THREE.GridHelper(14, 28, 0x3a3f47, 0x1c1f25);
  grid.position.y = FLOOR;
  rig.add(grid);

  // Three identical rounded cubes in a row, going back in depth
  const geometry = new RoundedBoxGeometry(0.9, 0.9, 0.9, 4, 0.12);
  const material = new THREE.MeshStandardMaterial({
    color: 0xedeef0,
    roughness: 0.35,
    metalness: 0.1,
  });

  const cubes = [2.4, 0, -2.4].map((z) => {
    const cube = new THREE.Mesh(geometry, material);
    cube.position.z = z;
    rig.add(cube);

    const shadow = createContactShadow(1.8, 0.6);
    shadow.position.set(0, FLOOR + 0.01, z);
    rig.add(shadow);

    return cube;
  });

  // =========================================================
  // CAMERAS
  // =========================================================
  const perspCam = new THREE.PerspectiveCamera(SETTINGS.startFov, 1, 0.1, 100);

  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  orthoCam.userData.viewSize = SETTINGS.viewHeight; // same visible height as persp
  orthoCam.position.copy(TARGET).addScaledVector(SETTINGS.direction, 10);
  orthoCam.lookAt(TARGET);

  // =========================================================
  // RENDERER
  // =========================================================
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    perspCam.aspect = w / h;
    perspCam.updateProjectionMatrix();

    updateOrthoFrustum(orthoCam, w / h);
    orthoCam.updateProjectionMatrix();

    renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // =========================================================
  // THE DOLLY ZOOM
  // p = 0 → normal perspective, p = 1 → (almost) orthographic
  // =========================================================

  // We blend "how strong the perspective is" = tan(FOV / 2)
  const startStrength = Math.tan(THREE.MathUtils.degToRad(SETTINGS.startFov) / 2);
  const endStrength = Math.tan(THREE.MathUtils.degToRad(SETTINGS.endFov) / 2);

  function applyMorph(p) {
    const strength = THREE.MathUtils.lerp(startStrength, endStrength, p);

    // Narrower lens → move farther back, so the target stays the same size
    // d = H ÷ (2 × tan(FOV/2))
    const distance = SETTINGS.viewHeight / (2 * strength);

    perspCam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(strength));
    perspCam.position.copy(TARGET).addScaledVector(SETTINGS.direction, distance);
    perspCam.lookAt(TARGET);

    // Keep near/far tight around the scene, even when the camera is very far away
    perspCam.near = Math.max(0.1, distance - 15);
    perspCam.far = distance + 30;
    perspCam.updateProjectionMatrix();
  }

  // The loop: hold persp → morph → hold ortho → morph back → repeat
  function morphAmountAt(t) {
    const { holdTime: h, morphTime: m } = SETTINGS;
    const cycle = 2 * h + 2 * m;
    const x = t % cycle;

    if (x < h) return 0;
    if (x < h + m) return easeInOutCubic((x - h) / m);
    if (x < 2 * h + m) return 1;
    return 1 - easeInOutCubic((x - 2 * h - m) / m);
  }

  // =========================================================
  // MOUSE TILT
  // =========================================================
  const pointer = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;  // -1 (left) to 1 (right)
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1; // -1 (top) to 1 (bottom)
  });

  // =========================================================
  // LABEL + METER
  // =========================================================
  let lastLabel = "";

  function updateHud(p, usingOrtho) {
    const text = usingOrtho
      ? "ORTHOGRAPHICCAMERA · ZOOM 1.00×"
      : `PERSPECTIVECAMERA · FOV ${perspCam.fov.toFixed(1)}°`;

    if (text !== lastLabel) {
      labelText.textContent = text;
      lastLabel = text;
    }

    labelEl.classList.toggle("is-ortho", p > 0.5);
    thumbEl.style.left = `${p * 100}%`;
  }

  // =========================================================
  // ANIMATION LOOP
  // =========================================================
  const startTime = performance.now();
  applyMorph(0);

  function loop() {
    const t = (performance.now() - startTime) / 1000;

    // 1. Morph amount for this moment
    const p = reduceMotion ? 0 : morphAmountAt(t);
    const usingOrtho = p >= 0.999; // fully morphed → swap in the real ortho camera
    if (!usingOrtho) applyMorph(p);

    // 2. Mouse tilt (smoothly "chase" the pointer) + a slow idle sway
    const sway = reduceMotion ? 0 : Math.sin(t * 0.3) * 0.12;
    rig.rotation.y += (pointer.x * 0.25 + sway - rig.rotation.y) * 0.05;
    rig.rotation.x += (pointer.y * 0.06 - rig.rotation.x) * 0.05;

    // 3. Cubes: rise in one by one, then gently float and turn
    cubes.forEach((cube, i) => {
      const intro = reduceMotion ? 1 : easeOutCubic(clamp01((t - 0.2 - i * 0.15) / 1.0));
      cube.scale.setScalar(Math.max(intro, 0.001));
      cube.position.y = (1 - intro) * -0.6 + Math.sin(t * 1.2 + i) * 0.04;
      cube.rotation.y = t * 0.2 + i * 0.6;
    });

    // 4. Draw with whichever camera is active
    renderer.render(scene, usingOrtho ? orthoCam : perspCam);
    updateHud(p, usingOrtho);
  }

  // Only animate while the hero is on screen
  new IntersectionObserver(([entry]) => {
    renderer.setAnimationLoop(entry.isIntersecting ? loop : null);
  }).observe(container);
}