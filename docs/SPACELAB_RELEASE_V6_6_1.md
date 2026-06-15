# Copernix SpaceLab V6.6.1 Release Checkpoint

## Release Scope

This checkpoint describes the current stable state of Copernix SpaceLab after V6.6.1.

Current main includes:
- V6.4 Real World Bridge Research
- V6.4.1 Dominik UX Hotfix
- V6.5 Cinematic FX Pack I
- V6.6 to3D Asset Pipeline LAB
- V6.6.1 Safe GLB Preview Loader

## Current Merged PRs

- PR #1 Real World Bridge Research
- PR #2 Dominik UX Hotfix
- PR #3 Cinematic FX Pack I
- PR #6 to3D Asset Pipeline LAB
- PR #7 Safe GLB Preview Loader

## Current Active Modules

- Solar System
- Dominik Guided Demo
- Probe missions
- Pluto and Sirius discovery
- Copernix-1 satellite scan
- Aurora mission
- Terra Mode / Olsztyn Mission Hub
- Terra fullscreen image viewer
- Luna narration
- Badge Gallery
- City Builder Lite
- Asset LAB
- Safe GLB Preview Loader
- Debug Panel

## Asset LAB Status

- Folder: `public/assets3d/lab/`
- Current committed content: `.gitkeep` only
- No real GLB assets are committed
- Safe GLB Preview Loader is prepared
- First GLB must be small and tested separately

Recommended first GLB constraints:
- Under 3 MB
- Textures max 1024 px
- Low-poly preferred
- One model tested at a time
- Remove or clear the manifest entry first if performance breaks

## Mobile Validation Checklist

- App loads on phone
- Mission start is visible
- Dock buttons are reachable
- Terra overlay scrolls
- Image viewer closes
- Asset LAB opens and closes
- No crash without GLB
- No white or black screen

## Known Warnings

- Vite large bundle warning
- No CI workflows configured
- No real GLB model yet
- MapLibre/Cesium not implemented
- Knowledge Constellation LAB not implemented

## Next Recommended Tasks

- Close superseded PR #4 and PR #5
- Clean old remote branches
- V6.6.2 first micro GLB test asset
- V6.6.3 mobile UX polish
- V6.7 MapLibre Olsztyn LAB
- V7 Knowledge Constellation LAB

## Release Notes

This release keeps Asset LAB isolated from the main gameplay. The GLB preview path is ready for controlled tests, but SpaceLab should not commit heavy models or add large 3D assets directly to the active game scene.

No backend, Cesium, MapLibre, Google Maps, new dependencies, or real GLB assets are part of this checkpoint.
