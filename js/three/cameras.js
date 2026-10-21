// ==========================================================
// CAMERAS
// Creates our two "eyes" and keeps the orthographic box sized correctly.
// ==========================================================

import * as THREE from "three";

// Both cameras start from the same spot, looking at the center
export const START_POSITION = new THREE.Vector3(4, 3, 5);

// ---------- Perspective: the "pyramid" camera ----------
export function createPerspectiveCamera() {
  // (fov, aspect, near, far). Aspect is fixed later by the Viewport.
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.copy(START_POSITION);
  return camera;
}

// ---------- Orthographic: the "box" camera ----------
// viewSize = how many world units TALL the camera's window is.
//
// Why 6.6? At the start, the perspective camera is ~7.07 units away
// with a 50° FOV, and at that distance it sees about 6.6 units tall.
// Using the same height makes the cube look the same size in both views,
// so the comparison is fair. (Phase 5 will calculate this automatically.)
export function createOrthographicCamera(viewSize = 6.6) {
  // Placeholder edges (-1, 1, 1, -1); real values are set on resize
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  camera.userData.viewSize = viewSize; // userData = a free "notes" pocket
  camera.position.copy(START_POSITION);
  return camera;
}

// Recalculate the box edges so the view doesn't stretch.
// Height stays fixed; width follows the viewport's shape.
export function updateOrthoFrustum(camera, aspect) {
  const height = camera.userData.viewSize;
  const width = height * aspect;

  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
}