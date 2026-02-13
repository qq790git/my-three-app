# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Three.js learning/demo project with multiple isolated 3D visualization demos. Pure vanilla JavaScript (no TypeScript, no framework) using Parcel as a zero-config bundler.

## Commands

- **Dev server**: `npm run dev` — starts Parcel dev server with hot reload (currently points at Primitives demo)
- **Build**: `npm run build` — production build (currently points at Text demo)

To run a different demo during development, change the entry HTML path in the `dev` script in package.json (e.g., `parcel src/main/Lines/index.html`).

## Architecture

Each subdirectory under `src/main/` is an independent demo module with its own `index.html` entry point. Demos do not import from each other.

| Module | Purpose |
|---|---|
| `Primitives/` | Interactive viewer for 20+ Three.js built-in geometries with sidebar menu |
| `Text/` | 3D text rendering using FontLoader and TextGeometry |
| `Text/DOM/` | Text with DOM overlay integration |
| `Geometries/` | Custom BoxGeometry class extending THREE.BufferGeometry (vertices, normals, UVs, indices) |
| `Perspective/` | ResponsiveCamera class with viewport-aware positioning (`fitCameraToObjects`, `getVisibleRange`) |
| `Lines/` | Basic line drawing with THREE.Line |
| `index.js` (root of main/) | Minimal rotating cube demo |

All modules follow the same Three.js lifecycle pattern: create Scene → Camera → Renderer → add objects/lights → requestAnimationFrame loop → handle window resize.

## Key Dependencies

- **three** (v0.182.0) — 3D rendering library
- **parcel** (v2.12.0) — bundler (dev dependency)
- Three.js extras imported from `three/examples/jsm/` (FontLoader, TextGeometry, ParametricGeometry)

## Assets

- `src/assets/font/helvetiker_bold.typeface.json` — font file used by Text and Primitives modules
- `src/assets/css/style.css` — shared base styles
