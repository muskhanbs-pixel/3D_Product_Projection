// ==========================================================
// CONTROLS
// Connects the Control Center (sliders, buttons, keys) to the cameras.
// Sliders are two-way: slider → camera, AND camera → slider.
// ==========================================================

import * as THREE from "three";

// ---------- A reusable slider helper ----------
class Slider {
  constructor(id, { format, defaultValue, onChange }) {
    this.input = document.getElementById(`${id}-slider`);
    this.output = document.getElementById(`${id}-value`);
    this.format = format;
    this.isDragging = false;
    this.lastText = "";

    // While the user holds the slider, the camera must not push values back
    this.input.addEventListener("pointerdown", () => (this.isDragging = true));
    window.addEventListener("pointerup", () => (this.isDragging = false));

    // Slider → camera
    this.input.addEventListener("input", () => {
      const value = Number(this.input.value);
      this.paint(value);
      onChange(value);
    });

    // Double-click the number → back to default
    this.output.addEventListener("dblclick", () => {
      this.input.value = defaultValue;
      this.paint(defaultValue);
      onChange(defaultValue);
    });

    this.paint(Number(this.input.value));
  }

  setRange(min, max) {
    this.input.min = min;
    this.input.max = max;
    this.paint(Number(this.input.value));
  }

  // Camera → slider (called every frame)
  setValue(value) {
    if (this.isDragging) return;
    if (this.format(value) === this.lastText) return; // nothing visibly changed
    this.input.value = value;
    this.paint(value);
  }

  // Update the colored fill + the number
  paint(value) {
    const min = Number(this.input.min);
    const max = Number(this.input.max);
    const percent = THREE.MathUtils.clamp(((value - min) / (max - min)) * 100, 0, 100);
    this.input.style.setProperty("--fill", `${percent}%`);

    const text = this.format(value);
    if (text !== this.lastText) {
      this.output.textContent = text;
      this.lastText = text;
    }
  }
}

// ---------- Wire everything up ----------
export function initControls({ sync, perspView, orthoView }) {
  const direction = new THREE.Vector3(); // reused

  // Field of view (perspective only)
  const fovSlider = new Slider("fov", {
    format: (v) => `${Math.round(v)}°`,
    defaultValue: 50,
    onChange: (value) => {
      perspView.camera.fov = value;
      perspView.camera.updateProjectionMatrix();

      // FOV changed → the matching ortho zoom range changes too
      sync.applyZoomLimits();
      zoomSlider.setRange(orthoView.controls.minZoom, orthoView.controls.maxZoom);
    },
  });

  // Camera distance (perspective only)
  const distanceSlider = new Slider("distance", {
    format: (v) => v.toFixed(2),
    defaultValue: perspView.startPosition.distanceTo(perspView.startTarget),
    onChange: (value) => {
      perspView.stopAnimation();
      const target = perspView.controls.target;
      direction.copy(perspView.camera.position).sub(target).normalize();
      perspView.camera.position.copy(target).addScaledVector(direction, value);
      sync.leader = perspView; // the slider "grabs" the perspective camera
    },
  });

  // Ortho zoom (orthographic only)
  const zoomSlider = new Slider("zoom", {
    format: (v) => `${v.toFixed(2)}×`,
    defaultValue: 1,
    onChange: (value) => {
      orthoView.stopAnimation();
      orthoView.camera.zoom = value;
      orthoView.camera.updateProjectionMatrix();
      sync.leader = orthoView; // the slider "grabs" the ortho camera
    },
  });

  // Match the sliders' ranges to the real camera limits
  distanceSlider.setRange(perspView.controls.minDistance, perspView.controls.maxDistance);
  zoomSlider.setRange(orthoView.controls.minZoom, orthoView.controls.maxZoom);

  // ---------- Reset ----------
  function resetAll() {
    if (sync.enabled) {
      sync.reset();
    } else {
      perspView.smoothReset();
      orthoView.smoothReset();
    }
  }

  document.getElementById("reset-all").addEventListener("click", resetAll);

  // ---------- Keyboard ----------
  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.matches("input[type='text'], textarea, select")) return;

    if (e.key.toLowerCase() === "r") resetAll();
  });

  // ---------- Camera → sliders, every frame ----------
  return {
    update() {
      fovSlider.setValue(perspView.camera.fov);
      distanceSlider.setValue(perspView.getDistance());
      zoomSlider.setValue(orthoView.getZoom());
    },
  };
}