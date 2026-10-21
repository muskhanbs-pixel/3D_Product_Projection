// ==========================================================
// CREATE SCENE
// Builds the lab "stage": background, fog, lights, grid floor, shadow.
// Also exports helpers (lights, shadow, presets) other code reuses.
// ==========================================================

import * as THREE from "three";

export const FLOOR_Y = -0.8;

// Lighting "recipes": brightness of each light per preset
export const LIGHT_PRESETS = {
  studio:    { hemi: 0.6,  key: 2.2, warm: 1.6, cool: 1.4 }, // balanced, product-shot look
  dramatic:  { hemi: 0.05, key: 3.4, warm: 3.2, cool: 2.8 }, // dark, strong colored rims
  technical: { hemi: 1.6,  key: 1.2, warm: 0,   cool: 0   }, // flat and neutral, CAD-style
};

export function createScene() {
  const scene = new THREE.Scene();

  // ---------- Background + fog ----------
  const bgColor = new THREE.Color(0x0b0c0f);
  scene.background = bgColor;
  scene.fog = new THREE.Fog(bgColor, 9, 22);

  // ---------- Lights (saved so presets can change them) ----------
  scene.userData.lights = addStudioLights(scene);

  // ---------- Grid floor ----------
  const grid = new THREE.GridHelper(40, 80, 0x3a3f47, 0x1c1f25);
  grid.position.y = FLOOR_Y;
  grid.material.transparent = true; // so we can fade it in and out
  scene.add(grid);

  // ---------- Soft contact shadow ----------
  const shadow = createContactShadow(3, 0.7);
  shadow.position.y = FLOOR_Y + 0.01;
  scene.add(shadow);

  scene.userData.grid = grid;
  return scene;
}

// Our studio lighting. Returns the lights by name so others can adjust them.
export function addStudioLights(scene) {
  const preset = LIGHT_PRESETS.studio;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x08090b, preset.hemi);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, preset.key);
  key.position.set(5, 5, 5);
  scene.add(key);

  const warm = new THREE.DirectionalLight(0xff8a3d, preset.warm);
  warm.position.set(-5, 2, -3);
  scene.add(warm);

  const cool = new THREE.DirectionalLight(0x4fe3d0, preset.cool);
  cool.position.set(4, -2, -5);
  scene.add(cool);

  return { hemi, key, warm, cool };
}

// A fake soft shadow: a blurry dark circle on a flat plane.
export function createContactShadow(size = 3, opacity = 0.7) {
  const res = 256;
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(res / 2, res / 2, 0, res / 2, res / 2, res / 2);
  gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, res, res);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
    })
  );

  shadow.rotation.x = -Math.PI / 2;
  return shadow;
}