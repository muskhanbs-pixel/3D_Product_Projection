// ==========================================================
// FIRST SCENE
// The 5 ingredients of every Three.js project, in one place:
// Scene → Camera → Renderer → Object → Lights (+ an animation loop)
// ==========================================================

import * as THREE from "three";

export function createFirstScene(container) {
  // How big is the box we're drawing into?
  const width = container.clientWidth;
  const height = container.clientHeight;

  // ---------------------------------------------------------
  // 1. SCENE — the studio room that holds everything
  // ---------------------------------------------------------
  const scene = new THREE.Scene();

  // ---------------------------------------------------------
  // 2. CAMERA — our "eye" into the scene
  //    PerspectiveCamera(fov, aspect, near, far)
  //    fov    = how wide the eye sees, in degrees (50 = natural)
  //    aspect = width ÷ height, so the image doesn't squash
  //    near / far = closest and farthest distance it can see
  // ---------------------------------------------------------
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);

  // Position: x = right, y = up, z = towards you
  camera.position.set(3, 2, 4);
  camera.lookAt(0, 0, 0); // point the camera at the center of the scene

  // ---------------------------------------------------------
  // 3. RENDERER — the "printer" that draws onto a <canvas>
  // ---------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    antialias: true, // smooth edges instead of jagged pixels
    alpha: true,     // transparent background, so our CSS shows through
  });
  renderer.setClearColor(0x000000, 0); // fully transparent background
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // sharp, but not too heavy
  renderer.setSize(width, height, false); // false = let CSS handle the display size
  container.appendChild(renderer.domElement); // put the <canvas> on the page

  // ---------------------------------------------------------
  // 4. OBJECT — a Mesh = Geometry (shape) + Material (skin)
  // ---------------------------------------------------------
  const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);

  const material = new THREE.MeshStandardMaterial({
    color: 0xedeef0, // our --text off-white
    roughness: 0.35, // 0 = mirror, 1 = chalk
    metalness: 0.1,  // 0 = plastic, 1 = metal
  });

  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Bonus: thin glowing edge lines for a "technical" look
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
  );
  cube.add(edges); // added to the cube, so it rotates WITH the cube

  // ---------------------------------------------------------
  // 5. LIGHTS — no lights = a black silhouette
  // ---------------------------------------------------------

  // Soft overall light: sky color from above, dark from below
  const ambient = new THREE.HemisphereLight(0xffffff, 0x08090b, 0.6);
  scene.add(ambient);

  // Main "key" light: bright white from top-right-front
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(5, 5, 5);
  scene.add(keyLight);

  // Warm rim light (perspective orange) from the left-back
  const warmRim = new THREE.DirectionalLight(0xff8a3d, 1.6);
  warmRim.position.set(-5, 2, -3);
  scene.add(warmRim);

  // Cool rim light (orthographic cyan) from the right-bottom-back
  const coolRim = new THREE.DirectionalLight(0x4fe3d0, 1.4);
  coolRim.position.set(4, -2, -5);
  scene.add(coolRim);

  // ---------------------------------------------------------
  // ANIMATION LOOP — a flipbook, ~60 new pictures per second
  // `time` is milliseconds since the page started
  // ---------------------------------------------------------
  renderer.setAnimationLoop((time) => {
    const t = time / 1000; // convert to seconds

    cube.rotation.y = t * 0.5;                   // steady spin
    cube.rotation.x = Math.sin(t * 0.6) * 0.25;  // gentle tilt back and forth
    cube.position.y = Math.sin(t * 1.2) * 0.08;  // soft floating

    renderer.render(scene, camera); // take the picture!
  });

  // ---------------------------------------------------------
  // RESIZE — keep things sharp and un-squashed when the box changes size
  // ---------------------------------------------------------
  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return; // box is hidden, skip

    camera.aspect = w / h;
    camera.updateProjectionMatrix(); // REQUIRED after changing camera settings
    renderer.setSize(w, h, false);
  });
  resizeObserver.observe(container);

  // Hand back the important pieces, in case other code needs them later
  return { scene, camera, renderer, cube };
}