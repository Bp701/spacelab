# Copernix Space Lab - Terra v1 Checkpoint

Date: 2026-06-13
Project path: `C:\Copernix\SpaceLab`

## Current Entry Point

- `src/App.jsx` imports the active space lab component from `./CopernixSpaceLab3D_v4`.
- `src/App.jsx` also imports `./AndromedaBridge`.
- The global `terraMode` state controls the transition between SpaceLab v4 and AndromedaBridge Terra Mode.
- The visible entry action is `🌍 Ląduj na Ziemi`.

## Terra v1

- Terra v1 is implemented in `src/AndromedaBridge.jsx`.
- It provides `AndromedaBridge: Terra Mode`.
- It shows the landing route:
  `Kosmos -> Ziemia -> Polska -> Warmia i Mazury -> Olsztyn -> Wyspa Tumska`.
- It includes the animated landing sequence:
  `Kosmos -> Ziemia -> Polska -> Warmia -> Olsztyn`.
- After landing, it shows `Olsztyn Mission Hub`.
- The mission hub contains three local target cards:
  - `Katedra św. Jakuba`
  - `Rzeka Łyna`
  - `Most / Park nad Łyną`
- Each card has a local placeholder illustration, an `Odkryj` action, and a Luna narration panel.
- No Cesium, external maps, backend, authentication, payments, or new libraries were added.

## SpaceLab v4

- `src/CopernixSpaceLab3D_v4.jsx` remains the active 3D space module.
- SpaceLab v4 includes:
  - Solar System planets
  - asteroids
  - comets
  - missions
  - Olsztyn landing flow
  - HUD and current mission controls
  - landing button / Terra entry path through `src/App.jsx`

## Build

Build command:

```powershell
npm.cmd run build
```

Expected result:

- Vite production build completes successfully.
- A large bundle warning can appear because the app uses Three.js and React Three Fiber.

## Known Warnings

- NASA `DEMO_KEY` can return HTTP `429` when the public API rate limit is reached.
  The app should continue using local/mock asteroid data.
- Three.js can print a `THREE.Clock` deprecation warning.
- In the sandboxed environment, `npm.cmd run build` can fail with `EPERM` while Vite writes to:
  `node_modules\.vite-temp`.
  Running the same build outside the sandbox has passed.

## Repository State

- `C:\Copernix\SpaceLab` is currently not a Git repository.
- This checkpoint is documented in `docs\CHECKPOINT_TERRA_V1.md` instead of a Git commit.
