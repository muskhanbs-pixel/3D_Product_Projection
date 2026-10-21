// ==========================================================
// FRUSTUM — main entry point (the "director")
// ==========================================================

import * as THREE from "three";
import { initPolish } from "./ui/polish.js";
import { createHero } from "./sections/hero.js";
import { initExplainer } from "./sections/explainer.js";
import { initExperiment } from "./sections/experiment.js";
import { initApplications } from "./sections/applications.js";
import { createScene } from "./three/createScene.js";
import { createPerspectiveCamera, createOrthographicCamera } from "./three/cameras.js";
import { Viewport } from "./three/Viewport.js";
import { CameraSync } from "./three/CameraSync.js";
import { ObjectSwitcher } from "./three/ObjectSwitcher.js";
import { updateTweens } from "./ui/tween.js";
import { initControls } from "./ui/controls.js";

// ---------- 1. Polish first (loader, reveals, nav) ----------
initPolish();

// ---------- 2. Can this browser do 3D? ----------
function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch {
    return false;
  }
}

const webglOK = hasWebGL();

const statusEl = document.getElementById("three-status");
const statusText = statusEl.querySelector(".status__text");

if (webglOK) {
  statusText.textContent = `Three.js r${THREE.REVISION} · ready`;
  statusEl.classList.add("is-ready");
} else {
  statusText.textContent = "WebGL unavailable · 3D disabled";
  document.documentElement.classList.add("no-webgl");
}

// ---------- 3. Sections that don't need WebGL ----------
initExplainer();
initApplications();

// ---------- 4. Sections that need WebGL ----------
if (webglOK) {
  const heroStage = document.getElementById("hero-stage");
  createHero(heroStage);
  heroStage.classList.add("is-live");

  initExperiment();
  initLab();
}

// ==========================================================
// PROJECTION LAB
// ==========================================================
function initLab() {
  // 1. One shared stage + an object switcher
  const labScene = createScene();
  const objects = new ObjectSwitcher(labScene, "cube");

  // 2. Two viewports, same scene, different cameras
  const perspContainer = document.getElementById("viewport-persp");
  const orthoContainer = document.getElementById("viewport-ortho");

  const perspView = new Viewport({
    container: perspContainer,
    scene: labScene,
    camera: createPerspectiveCamera(),
  });

  const orthoView = new Viewport({
    container: orthoContainer,
    scene: labScene,
    camera: createOrthographicCamera(),
  });

  // 3. Link them together
  const sync = new CameraSync(perspView, orthoView);

  // 4. Control Center
  const controls = initControls({ sync, perspView, orthoView, scene: labScene, objects });

  // 5. HUD elements
  const hud = {
    perspFov: perspContainer.querySelector("[data-fov]"),
    perspDist: perspContainer.querySelector("[data-dist]"),
    orthoZoom: orthoContainer.querySelector("[data-zoom]"),
    orthoDist: orthoContainer.querySelector("[data-dist]"),
    syncStatus: document.getElementById("sync-status"),
  };

  // 6. Object picker
  const tiles = document.querySelectorAll("[data-object]");

  function selectObject(id) {
    objects.show(id);

    tiles.forEach((tile) => {
      const isActive = tile.dataset.object === id;
      tile.classList.toggle("is-active", isActive);
      tile.setAttribute("aria-pressed", String(isActive));
    });
  }

  tiles.forEach((tile) => {
    tile.addEventListener("click", () => selectObject(tile.dataset.object));
  });

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.matches("input[type='text'], textarea, select")) return;

    const index = Number(e.key) - 1;
    if (index >= 0 && index < tiles.length) {
      selectObject(tiles[index].dataset.object);
    }
  });

  // 7. Toolbar toggles
  const syncBtn = document.getElementById("toggle-sync");
  const matchBtn = document.getElementById("toggle-match");

  function setChip(button, isOn) {
    button.classList.toggle("is-active", isOn);
    button.setAttribute("aria-pressed", String(isOn));
  }

  syncBtn.addEventListener("click", () => {
    sync.enabled = !sync.enabled;
    setChip(syncBtn, sync.enabled);
    matchBtn.disabled = !sync.enabled;
  });

  matchBtn.addEventListener("click", () => {
    sync.matchSize = !sync.matchSize;
    setChip(matchBtn, sync.matchSize);
  });

  // 8. HUD reset buttons
  document.getElementById("reset-persp").addEventListener("click", () => {
    sync.enabled ? sync.reset() : perspView.smoothReset();
  });
  document.getElementById("reset-ortho").addEventListener("click", () => {
    sync.enabled ? sync.reset() : orthoView.smoothReset();
  });

  // 9. Only render the lab while it's on screen (or in fullscreen)
  let labVisible = true;
  new IntersectionObserver(([entry]) => {
    labVisible = entry.isIntersecting;
  }).observe(document.getElementById("lab"));

  // 10. Animation loop
  let lastStatus = "";
  let lastTime = 0;

  function animate(time) {
    const delta = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;
    const t = time / 1000;

    updateTweens(delta);
    objects.update(delta);
    objects.holder.position.y = Math.sin(t * 1.2) * 0.05;

    if (labVisible || document.fullscreenElement) {
      sync.update();
      controls.update();

      hud.perspFov.textContent = `${Math.round(perspView.camera.fov)}°`;
      hud.perspDist.textContent = perspView.getDistance().toFixed(2);
      hud.orthoZoom.textContent = `${orthoView.getZoom().toFixed(2)}×`;
      hud.orthoDist.textContent = orthoView.getDistance().toFixed(2);

      const status = sync.enabled
        ? `LEADER · ${sync.leader === perspView ? "PERSPECTIVE" : "ORTHOGRAPHIC"}`
        : "INDEPENDENT VIEWS";

      if (status !== lastStatus) {
        hud.syncStatus.textContent = status;
        lastStatus = status;

        // Soft ring around whichever view is leading
        perspContainer.classList.toggle("is-leader", sync.enabled && sync.leader === perspView);
        orthoContainer.classList.toggle("is-leader", sync.enabled && sync.leader === orthoView);
      }
    }

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}