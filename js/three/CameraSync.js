// ==========================================================
// CAMERA SYNC
// Keeps the perspective and orthographic views moving together.
//
// Leader/follower: whichever view the user touches LEADS.
// Every frame, the follower copies the leader's camera.
// ==========================================================

import * as THREE from "three";

export class CameraSync {
  constructor(perspView, orthoView) {
    this.persp = perspView;
    this.ortho = orthoView;

    this.enabled = true;
    this.matchSize = true;
    this.leader = perspView;

    this._direction = new THREE.Vector3();

    for (const view of [perspView, orthoView]) {
      view.controls.addEventListener("start", () => {
        this.leader = view;
        perspView.controls.autoRotate = false;
        orthoView.controls.autoRotate = false;
      });
    }

    this.applyZoomLimits();
  }

  get follower() {
    return this.leader === this.persp ? this.ortho : this.persp;
  }

  // ---------- The trigonometry ----------
  halfFovTan() {
    const fovInRadians = THREE.MathUtils.degToRad(this.persp.camera.fov);
    return Math.tan(fovInRadians / 2);
  }

  // h = 2 × d × tan(FOV/2), zoom = viewSize ÷ h
  zoomForDistance(distance) {
    const visibleHeight = 2 * distance * this.halfFovTan();
    return this.ortho.camera.userData.viewSize / visibleHeight;
  }

  distanceForZoom(zoom) {
    const visibleHeight = this.ortho.camera.userData.viewSize / zoom;
    return visibleHeight / (2 * this.halfFovTan());
  }

  // Must be called again whenever the FOV changes
  applyZoomLimits() {
    const { minDistance, maxDistance } = this.persp.controls;
    this.ortho.controls.maxZoom = this.zoomForDistance(minDistance);
    this.ortho.controls.minZoom = this.zoomForDistance(maxDistance);
  }

  // ---------- Every frame ----------
  update() {
    if (!this.enabled) {
      this.persp.render();
      this.ortho.render();
      return;
    }

    this.leader.render();
    this.copyLeaderToFollower();
    this.follower.render(false);
  }

  copyLeaderToFollower() {
    const target = this.leader.controls.target;
    this.follower.controls.target.copy(target);

    if (this.leader === this.persp) {
      this.ortho.camera.position.copy(this.persp.camera.position);

      if (this.matchSize) {
        this.ortho.camera.zoom = this.zoomForDistance(this.persp.getDistance());
      }
    } else {
      this._direction.copy(this.ortho.camera.position).sub(target).normalize();

      const distance = this.matchSize
        ? this.distanceForZoom(this.ortho.camera.zoom)
        : this.ortho.getDistance();

      this.persp.camera.position.copy(target).addScaledVector(this._direction, distance);
    }

    this.follower.camera.lookAt(target);
    this.follower.camera.updateProjectionMatrix();
  }

  // Glide both views home. Perspective leads, so with Match size on,
  // the ortho view follows it smoothly for free.
  reset() {
    this.leader = this.persp;
    this.persp.smoothReset();
    this.ortho.smoothReset();
  }
}