# Weather Frontend

A React + TypeScript weather UI targeting Chrome 79+ / Android WebView 79+ on Android 9+.

---

## Setup

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

The dev server runs at `http://localhost:5173`.

---

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE` | Base URL for the weather backend API | `http://localhost:8080` |

Set these in `app/.env.development` (already preconfigured for local development):

```
VITE_API_BASE=http://localhost:8080
```

---

## URL parameter contract

The host (Android WebView) passes parameters via the query string before navigation.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `lat` | float | `37.322998` | Latitude (−90 to 90) |
| `lon` | float | `−122.032181` | Longitude (−180 to 180) |
| `orientation` | `landscape` \| `portrait` | auto (matchMedia) | Force a layout orientation |
| `preview` | string | — | Dev-only: load a fixture instead of fetching (see below) |

Invalid values are rejected with a `console.warn` and replaced by defaults.

Example:
```
http://localhost:5173/?lat=40.71&lon=-74.01&orientation=landscape
```

---

## Preview routes (design QA)

Preview routes skip the API fetch and render hard-coded fixture data. They are only active in development builds (`import.meta.env.DEV`).

| Key | Description |
|---|---|
| `day-clear` | Portrait, day, clear sky |
| `day-clear-landscape` | Landscape, day, clear sky |
| `night-clear` | Portrait, night, clear sky |
| `day-rain` | Portrait, day, rain |
| `day-rain-alert` | Portrait, day, rain + NWS severe thunderstorm alert |
| `night-rain-alert` | Portrait, night, rain + NWS alert |
| `landscape-day-alert` | Landscape, day, NWS alert banner |
| `portrait-quake` | Portrait, earthquake banner |

Usage:
```
http://localhost:5173/?preview=portrait-quake
```

---

## Build & preview production bundle

```bash
# Build
npm run build

# Serve the production bundle locally
npm run preview
```

The production bundle is written to `dist/`. Target bundle size: ≤ 250 KB gzipped.

---

## Lint, typecheck, and tests

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest (run once)
npm run test:watch  # Vitest (watch mode)
npm run test:coverage  # Vitest + v8 coverage report
```

---

## Browser support

**Target:** Chrome 79+ (December 2019) and Android WebView 79+ on Android 9+.

- No CSS `gap` in flexbox — margin-based spacing is used instead.
- No `aspect-ratio`, `dvh/svh/lvh`, native CSS nesting, or `@layer`.
- Viewport height: `--app-vh` CSS variable (updated via JS) instead of `100vh`.
- All animations use CSS keyframes; no Framer Motion.
- Fonts: Plus Jakarta Sans, self-hosted from `public/fonts/`.

See [`../plans/AGENTS.md`](../plans/AGENTS.md) for the full compatibility constraint list.

---

## Architecture

See [`../plans/ARCHITECTURE.md`](../plans/ARCHITECTURE.md) for component hierarchy, theme tokens, API layer, and ViewModel mapping.
