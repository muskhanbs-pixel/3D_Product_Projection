// ==========================================================
// VIEWPORT
// One "window" into a scene. You give it:
//   - a container (the <div> on the page)
//   - a scene (what to show)
//   - a camera (perspective OR orthographic)
// It handles: renderer, orbit controls, resizing, reset, drawing,
// and a scroll guard so page scrolling never gets hijacked.
// ==========================================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { updateOrthoFrustum } from "./cameras.js";
import { tween } from "../ui/tween.js";

export class Viewport {
  constructor({ container, scene, camera }) {
    this.container = container;
    this.scene = scene;
    this.camera = camera;
    this.activeTween = null;

    // ---------- Renderer ----------
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    const canvas = this.renderer.domElement;

    // ---------- Orbit controls ----------
    this.controls = new OrbitControls(camera, canvas);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;

    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 12;
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 4;

    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.8;
    this.controls.update();

    this.controls.addEventListener("start", () => {
      this.stopAnimation();
      this.controls.autoRotate = false;
      container.classList.add("is-dragging");
    });
    this.controls.addEventListener("end", () => {
      container.classList.remove("is-dragging");
    });

    // ---------- Scroll guard ----------
    // Scrolling the page over a viewport should SCROLL THE PAGE.
    // Zoom only turns on after you click the view, and off when you leave it.
    this.zoomUnlocked = false;
    this.controls.enableZoom = false;

    this.hint = document.createElement("div");
    this.hint.className = "viewport__hint mono-label";
    this.hint.textContent = "Click the view to enable zoom";
    container.appendChild(this.hint);

    canvas.addEventListener("pointerdown", () => this.setZoomUnlocked(true));
    container.addEventListener("pointerleave", () => this.setZoomUnlocked(false));
    canvas.addEventListener(
      "wheel",
      () => {
        if (this.controls.enabled && !this.zoomUnlocked) this.flashHint();
      },
      { passive: true }
    );

    // On touch screens: vertical swipes scroll the page, horizontal swipes orbit
    if (window.matchMedia("(pointer: coarse)").matches) {
      canvas.style.touchAction = "pan-y";
    }

    // ---------- Remember the starting view ----------
    this.startPosition = camera.position.clone();
    this.startTarget = this.controls.target.clone();
    this.startZoom = camera.zoom;

    // ---------- Resize ----------
    this.resize = this.resize.bind(this);
    new ResizeObserver(this.resize).observe(container);
    this.resize();
  }

  // ---------- Scroll guard helpers ----------
  setZoomUnlocked(isOn) {
    this.zoomUnlocked = isOn;
    this.controls.enableZoom = isOn;
    if (isOn) this.hint.classList.remove("is-visible");
  }

  flashHint() {
    this.hint.classList.add("is-visible");
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => this.hint.classList.remove("is-visible"), 1400);
  }

  // ---------- Size ----------
  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    const aspect = width / height;

    if (this.camera.isPerspectiveCamera) {
      this.camera.aspect = aspect;
    } else if (this.camera.isOrthographicCamera) {
      updateOrthoFrustum(this.camera, aspect);
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  // ---------- Reset ----------
  reset() {
    this.stopAnimation();
    this.camera.position.copy(this.startPosition);
    this.controls.target.copy(this.startTarget);
    this.camera.zoom = this.startZoom;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  smoothReset(duration = 0.9) {
    this.stopAnimation();

    const fromTarget = this.controls.target.clone();
    const fromDir = this.camera.position.clone().sub(fromTarget);
    const fromDistance = fromDir.length();
    fromDir.normalize();

    const toDir = this.startPosition.clone().sub(this.startTarget);
    const toDistance = toDir.length();
    toDir.normalize();

    const fromZoom = this.camera.zoom;
    const dir = new THREE.Vector3();

    this.activeTween = tween({
      duration,
      onUpdate: (k) => {
        this.controls.target.lerpVectors(fromTarget, this.startTarget, k);
        dir.lerpVectors(fromDir, toDir, k).normalize();
        const distance = THREE.MathUtils.lerp(fromDistance, toDistance, k);

        this.camera.position.copy(this.controls.target).addScaledVector(dir, distance);
        this.camera.zoom = THREE.MathUtils.lerp(fromZoom, this.startZoom, k);
        this.camera.updateProjectionMatrix();
      },
      onComplete: () => {
        this.activeTween = null;
      },
    });
  }

  stopAnimation() {
    if (this.activeTween) {
      this.activeTween.cancel();
      this.activeTween = null;
    }
  }

  // ---------- Info ----------
  getDistance() {
    return this.camera.position.distanceTo(this.controls.target);
  }

  getZoom() {
    return this.camera.zoom;
  }

  // ---------- Draw ----------
  render(updateControls = true) {
    if (updateControls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}