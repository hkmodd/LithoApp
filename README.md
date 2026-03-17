<div align="center">

# LithoApp

**Neural Surface Generator — Transform photos into 3D lithophanes and extruded surfaces, entirely in your browser.**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-000?logo=threedotjs&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-BSL_1.1-red)
![Rust](https://img.shields.io/badge/WASM-654FF0?logo=webassembly&logoColor=white)

</div>

---

## ✨ Features

- 🖼️ **Image to 3D** — Upload any image and generate a 3D surface in real-time
- 🔧 **Non-destructive image editor** — Rotate, flip, crop, gamma, and exposure adjustments
- 🧊 **Dual mode** — Lithophane (translucent) or Extrusion (solid relief)
- 📐 **Geometry controls** — Width, depth, resolution, mesh type (flat / cylindrical)
- 🖼️ **Frame options** — Border width, support base, smoothing
- 💾 **STL export** — Download ready-to-print 3D files
- ⚡ **WASM-accelerated** — Rust-compiled mesh generation for speed
- 🌍 **15 languages** — EN, IT, DE, FR, ES, PT, NL, PL, RU, AR, ZH, JA, KO, HI, TR
- 📱 **Responsive** — Desktop sidebar + mobile-optimized layout
- 🎨 **Dark UI** — Sleek glassmorphism design with smooth animations

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/YOUR_USERNAME/LithoApp.git
cd LithoApp
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Build

```bash
# Production build
npm run build

# Single-file HTML (shareable, no server needed)
npm run build:single
```

The single-file build outputs a self-contained `index.html` in `dist-single/` that you can open directly in any browser or send to a friend.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4 |
| **3D Engine** | Three.js via React Three Fiber |
| **Mesh Gen** | Rust → WebAssembly (with JS fallback) |
| **State** | Zustand |
| **Animations** | Motion (Framer Motion) |
| **Build** | Vite 6 |
| **Icons** | Lucide React |

## 📁 Project Structure

```
LithoApp/
├── src/
│   ├── components/     # React components (tabs, editor, preview, etc.)
│   ├── store/          # Zustand stores (app state, history, projects)
│   ├── workers/        # Web Workers for mesh generation
│   ├── i18n/           # Internationalization (15 locales)
│   ├── lib/            # Utilities (image processing, etc.)
│   └── App.tsx         # Main application
├── litho-engine-wasm/  # Rust WASM mesh engine
├── public/             # PWA assets (icons, manifest, service worker)
└── index.html          # Entry point
```

## 📄 License

All rights reserved. This project is private.
