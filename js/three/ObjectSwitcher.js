// ==========================================================
// OBJECT SWITCHER
// Swaps the object on stage with an animation:
//   old object shrinks away → new object pops in with a bounce.
// Also cleans old objects out of GPU memory.
// ==========================================================

import * as THREE from "three";
import { createObject } from "./objects.js";

const DURATION = 0.75; // seconds for the whole swap

// ---------- Easing ----------
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);
const easeInCubic = (x) => x * x * x;
const easeOutBack = (x) => {
  // Overshoots slightly past 1, then settles = a little "bounce"
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export class ObjectSwitcher {
  constructor(scene, initialId) {
    // A holder group: we move/float the holder, not each object
    this.holder = new THREE.Group();
    scene.add(this.holder);

    this.currentId = initialId;
    this.current = createObject(initialId);
    this.holder.add(this.current);

    this.outgoing = null; // the object currently leaving
    this.progress = 1;    // 1 = no animation running
  }

  // Ask for a new object. Returns false if it's already showing.
  show(id) {
    if (id === this.currentId) return false;

    // If a swap is already mid-animation, remove the leaving object right away
    if (this.outgoing) this.removeOutgoing();

    this.outgoing = this.current;
    this.currentId = id;
    this.current = createObject(id);
    this.current.scale.setScalar(0.001); // start invisible (tiny)
    this.holder.add(this.current);

    this.progress = 0; // start the animation
    return true;
  }

  // Call every frame. delta = seconds since the last frame.
  update(delta) {
    if (this.progress >= 1) return; // nothing to animate

    this.progress = Math.min(1, this.progress + delta / DURATION);
    const p = this.progress;

    // Old object: shrinks out during the first 45% of the animation
    if (this.outgoing) {
      const out = clamp01(p / 0.45);
      this.outgoing.scale.setScalar(Math.max(1 - easeInCubic(out), 0.001));
      this.outgoing.rotation.y = out * 0.6; // twist as it leaves
      if (out >= 1) this.removeOutgoing();
    }

    // New object: pops in from 30% to 100% (overlapping slightly = smoother)
    const inn = clamp01((p - 0.3) / 0.7);
    this.current.scale.setScalar(Math.max(easeOutBack(inn), 0.001));
    this.current.rotation.y = (1 - inn) * -0.6; // untwist as it arrives
  }

  removeOutgoing() {
    this.holder.remove(this.outgoing);
    disposeObject(this.outgoing);
    this.outgoing = null;
  }
}

// Free the GPU memory used by an object and everything inside it
function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) child.material.dispose();
  });
}