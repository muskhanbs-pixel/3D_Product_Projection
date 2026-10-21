# FRUSTUM — A Projection Lab

**An interactive 3D visualization that compares Perspective and Orthographic projection on the same object, side by side.**

College mini project: *3D Product Projection Comparison System*
Built with HTML, CSS, JavaScript and Three.js — no frameworks, no build tools.

---

## ✨ Features

- **Hero dolly-zoom:** a camera that smoothly morphs from perspective into orthographic (the "Vertigo effect")
- **Projection Lab:** two synchronized 3D viewports rendering the *same* scene through `PerspectiveCamera` and `OrthographicCamera`
  - Leader/follower camera sync, with optional size matching using `h = 2 · d · tan(FOV/2)`
  - 6 objects (cube, sphere, cylinder, cone, torus, speaker product) with animated swapping
  - Camera Control Center: FOV, distance and ortho zoom sliders (two-way bound), grid, wireframe, auto-rotate, 3 lighting presets, smooth reset, fullscreen
- **Explainer:** live SVG side-view diagrams running the projection formulas `y′ = f·y/z` vs `y′ = y`
- **Experiment:** one distance slider drives both cameras; meters *measure* apparent size from the real render
- **Technical comparison** spec sheet and **real-world applications** bento grid
- Polish: loader, scroll reveals, scrollspy nav, keyboard shortcuts, reduced-motion support, WebGL fallback

## ⌨️ Keyboard shortcuts (Projection Lab)

| Key | Action |
|-----|--------|
| `1`–`6` | Switch object |
| `R` | Reset view (smooth) |
| `G` | Toggle grid |
| `W` | Toggle wireframe |
| `A` | Toggle auto-rotate |
| `L` | Cycle lighting preset |
| `F` | Fullscreen lab |

## 🚀 Run locally

The site uses JavaScript modules, so it must be served (not opened as a file).

1. Open the folder in VS Code
2. Install the **Live Server** extension
3. Right-click `index.html` → **Open with Live Server**

An internet connection is needed (Three.js and fonts load from CDNs).

## 🗂️ Project structure
frustum/
├── index.html
├── css/
│ ├── tokens.css # design tokens: colors, type, spacing, motion
│ ├── base.css # reset, typography, layout, nav, hero
│ ├── components.css # buttons, chips, labels
│ ├── sections.css # section layout, lab, object picker
│ ├── three.css # hero stage, viewports, HUD
│ ├── controls.css # control center, sliders, segmented, fullscreen
│ ├── explainer.css # diagram cards
│ ├── experiment.css # experiment, meters, big slider
│ ├── compare.css # spec sheet, bento grid, footer
│ └── polish.css # loader, reveals, nav states, micro-interactions
└── js/
├── main.js # entry point: wires everything together
├── three/
│ ├── createScene.js # stage: lights, grid, shadow, lighting presets
│ ├── cameras.js # camera factories + ortho frustum sizing
│ ├── objects.js # object registry (incl. the speaker product)
│ ├── ObjectSwitcher.js # animated object swaps, wireframe, cleanup
│ ├── Viewport.js # renderer + orbit controls + resize + reset
│ └── CameraSync.js # leader/follower sync + matching math
├── sections/
│ ├── hero.js # dolly-zoom projection morph
│ ├── explainer.js # live SVG projection diagrams
│ ├── experiment.js # distance experiment + apparent-size meters
│ └── applications.js # bento filter + spotlight
└── ui/
├── controls.js # control center + shortcuts
├── tween.js # tiny animation system
└── polish.js # loader, reveals, nav, progress, magnetic CTA
## 🧠 How it works (key ideas)

- **One scene, two cameras.** The lab passes a single `THREE.Scene` to two viewports, each with a different camera. The object exists once in memory.
- **Perspective:** `y′ = f · y / z` — dividing by distance makes far things smaller.
- **Orthographic:** `y′ = y` — no division by distance, so size never changes.
- **Matching sizes:** a perspective camera at distance `d` sees a height of `h = 2·d·tan(FOV/2)`. Setting the ortho zoom to `viewSize ÷ h` makes both views show the object at the same size, so only the projection differs.
- **Ortho as a limit:** the hero shows that perspective with a tiny FOV from very far away becomes orthographic.

## 🔭 Future scope

- Load custom `.glb` / `.gltf` product models
- Oblique and isometric projection presets
- Split-screen "difference" overlay between both renders
- Export screenshots of both views

## 👤 Author

**MUSKHAN B S** — [GitHub](https://github.com/muskhanbs-pixel)