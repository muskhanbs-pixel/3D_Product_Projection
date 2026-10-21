// ==========================================================
// OBJECTS
// The "menu" (registry) of everything we can put on stage.
// Every object is ~1.4 units tall and centered at (0, 0, 0),
// so they all sit nicely above the floor and fill the view similarly.
// ==========================================================

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// ---------- Materials ----------
// Each object gets its OWN materials (not shared), so we can
// safely dispose of them when the object is removed.

function surfaceMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0xedeef0, roughness: 0.35, metalness: 0.1 });
}

function edgeMaterial() {
  return new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 });
}

// Build a simple shape: a solid mesh + optional edge outline.
// edgeAngle: only draw edges where faces meet at more than this angle.
// (Curved shapes need a big angle, or they'd be covered in lines.)
function solid(geometry, { edges = true, edgeAngle = 1 } = {}) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, surfaceMaterial()));

  if (edges) {
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, edgeAngle), edgeMaterial()));
  }
  return group;
}

// ---------- The shapes ----------

function createCube() {
  return solid(new THREE.BoxGeometry(1.4, 1.4, 1.4));
}

function createSphere() {
  return solid(new THREE.SphereGeometry(0.72, 64, 32), { edges: false });
}

function createCylinder() {
  // (radiusTop, radiusBottom, height, segments)
  return solid(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 64), { edgeAngle: 30 });
}

function createCone() {
  // (radius, height, segments)
  return solid(new THREE.ConeGeometry(0.7, 1.4, 64), { edgeAngle: 30 });
}

function createTorus() {
  // (ring radius, tube thickness, tube segments, ring segments)
  return solid(new THREE.TorusGeometry(0.52, 0.2, 48, 128), { edges: false });
}

// ---------- The product: a minimal smart speaker ----------
// Built entirely from basic shapes, like LEGO.
function createSpeaker() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdfe2e6, roughness: 0.45, metalness: 0.05 });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.8 });
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xc9cdd3, roughness: 0.3, metalness: 0.3 });
  const ledMat = new THREE.MeshBasicMaterial({ color: 0x4fe3d0 }); // Basic = glows, ignores light

  // Body: a rounded box, 1.4 tall
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.95, 1.4, 0.95, 4, 0.14), bodyMat);
  group.add(body);

  const front = 0.475; // the front face of the body (half its depth)

  // Big speaker cone (woofer): a flat cylinder turned to face forward
  const woofer = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 48), coneMat);
  woofer.rotation.x = Math.PI / 2;
  woofer.position.set(0, -0.22, front);
  group.add(woofer);

  const wooferRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.022, 16, 64), ringMat);
  wooferRing.position.set(0, -0.22, front + 0.01);
  group.add(wooferRing);

  const dustCap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), ringMat);
  dustCap.scale.z = 0.5; // squash it into a dome
  dustCap.position.set(0, -0.22, front + 0.02);
  group.add(dustCap);

  // Small speaker cone (tweeter)
  const tweeter = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 32), coneMat);
  tweeter.rotation.x = Math.PI / 2;
  tweeter.position.set(0, 0.3, front);
  group.add(tweeter);

  const tweeterRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 12, 48), ringMat);
  tweeterRing.position.set(0, 0.3, front + 0.01);
  group.add(tweeterRing);

  // A tiny status light, in our orthographic cyan
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), ledMat);
  led.position.set(0, 0.58, front + 0.005);
  group.add(led);

  return group;
}

// ---------- The registry ("menu") ----------
export const OBJECTS = {
  cube: { label: "Cube", create: createCube },
  sphere: { label: "Sphere", create: createSphere },
  cylinder: { label: "Cylinder", create: createCylinder },
  cone: { label: "Cone", create: createCone },
  torus: { label: "Torus", create: createTorus },
  speaker: { label: "Speaker", create: createSpeaker },
};

// Order by name, get a fresh object back
export function createObject(id) {
  const entry = OBJECTS[id];
  if (!entry) throw new Error(`Unknown object: "${id}"`);

  const object = entry.create();
  object.name = id;
  return object;
}