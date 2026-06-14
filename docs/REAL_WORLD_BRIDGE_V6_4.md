# Real World Bridge V6.4 Research

> Status: **Research & architecture only.** This document does **not** add
> Cesium or MapLibre to the app, and does **not** change runtime code.
> It defines the direction, candidate technologies, and a safe, staged path
> for connecting the current SpaceLab space sandbox to real-world maps and
> geospatial exploration (Olsztyn / Warmia-Mazury).

---

## 1. Current SpaceLab architecture

SpaceLab is currently a fully client-side, single-page experience:

- **React / Vite** — React 19 application bundled and served by Vite. No
  server-side rendering, no routing framework; the app boots from
  `src/main.jsx` into `src/App.jsx`.
- **Three.js / React Three Fiber** — 3D rendering is done with `three`,
  `@react-three/fiber`, `@react-three/drei`, and post-processing via
  `@react-three/postprocessing` + `postprocessing`. All visuals are
  procedural / scene-graph based.
- **Space scene as the core experience** — the main solar-system scene
  (`src/CopernixSpaceLab3D_v4.jsx`) is the heart of the app: planets,
  cinematic atmosphere pass, aurora space-weather mission, and guided
  Dominik demo mode.
- **Terra Mode / AndromedaBridge as an overlay** — `src/AndromedaBridge.jsx`
  acts as an overlay/bridge layer on top of the core space scene rather than
  a separate application. The "real world / Earth" feeling today is symbolic
  and illustrative, not a true map.
- **Companion modules** — `src/CityBuilderLite.jsx` (Copernix City Builder
  Lite) and `src/BadgeGallery.jsx` (Badge Gallery & Progress World) extend
  the experience without leaving the single React app.
- **localStorage-based progress** — mission completion, badges, and progress
  state are persisted in the browser's `localStorage`. There is no
  synchronization between devices.
- **No backend** — there is no API server, database, or hosted service. The
  app is fully static and deployable as plain files.
- **No accounts** — there is no login, sign-up, or user identity. This is a
  deliberate choice that keeps the experience child-friendly and privacy-safe.
- **No external map engine yet** — there is currently no MapLibre, Cesium,
  Leaflet, Google Maps, or tile provider in the dependency tree. Earth and
  Olsztyn are represented symbolically inside Three.js.

This architecture is intentionally simple, stable, and self-contained. Any
real-world bridge work must protect those properties.

---

## 2. Product goal

The target direction for the Real World Bridge is to:

- **Move from a symbolic educational map toward immersive virtual
  exploration.** Today Olsztyn / Earth are illustrative; the goal is to let a
  child actually "visit" real places (Katedra, the Łyna river, parks,
  bridges) in a guided, game-like way.
- **Keep child-friendly UX.** Large tap targets, simple language (Polish-first
  for local content), friendly cards, no clutter, no ads, no tracking.
- **Keep SpaceLab stable.** The space sandbox is the proven core. Real-world
  features must not regress performance, load time, or reliability of the
  main scene.
- **Add the real-world layer gradually.** Introduce geospatial capability in
  small, isolated, reversible steps rather than one large integration.
- **Avoid overloading the app too early.** Heavy 3D globe engines, tile
  providers, API keys, and large bundles should be deferred until there is a
  proven need and a manual-test sign-off.

In short: evolve toward "from orbit to Olsztyn" exploration, but earn each
step and never put the stable demo at risk.

---

## 3. Candidate technologies

### Option A — MapLibre

**Description:** MapLibre GL JS is an open-source 2D / 2.5D vector map engine
(a community fork of Mapbox GL). It renders streets, rivers, parks, and
buildings from vector tiles, supports markers, popups, simple layers, and
gentle tilt/pitch (2.5D). It is well suited to city-scale maps, routes,
markers, and local exploration. It is **lighter than Cesium** and is the
better fit for an Olsztyn Mission Hub, trails, and points of interest, with
**easier mobile performance**.

**Pros:**

- Lightweight compared to a full 3D globe engine.
- Good for real streets / parks / rivers at city scale.
- Suitable for Olsztyn missions and walking-trail style content.
- Can use custom markers and simple layers (mission pins, routes, areas).

**Cons:**

- Not a true space-to-Earth cinematic globe.
- Limited 3D terrain feeling compared to Cesium.
- Requires map tile / provider decisions (style URL, tile source, license,
  possibly an API key depending on provider).

**Best use:**

- Olsztyn exploration mode.
- Mission map / mission hub.
- A route from Katedra → Łyna → Park / Most.
- Local education / tourism / child-safe exploration.

### Option B — Cesium

**Description:** CesiumJS is a real 3D globe / geospatial engine built for
Earth-scale visualization. It supports terrain, 3D tiles, imagery layers, and
satellite-like views, and is the strongest option for a true "space to Earth"
cinematic bridge (orbit → atmosphere → ground).

**Pros:**

- A real, accurate globe.
- 3D terrain and 3D-tiles potential.
- Strong NASA-like / satellite feeling.
- Good for orbital → Earth transition storytelling.

**Cons:**

- Heavier (large bundle, more GPU/CPU cost).
- More complex to integrate and tune.
- Mobile performance risk on low-end devices.
- Token / API / provider concerns depending on the data source (e.g. Cesium
  ion or another imagery/terrain provider).
- May be too much for the current MVP.

**Best use:**

- A future V7 / V8 experiment.
- Cinematic Earth view.
- An advanced "globe mode."
- The "from orbit to Olsztyn" experience.

### Option C — Keep Three.js only for now

**Description:** Continue using a symbolic / illustrative Earth and Olsztyn
built inside the existing Three.js scene. Build a "fake real world" from
curated POIs and images, with procedural visuals and guided missions, rather
than a live map.

**Pros:**

- Stable (no new heavy dependencies).
- Fastest to iterate.
- Child-friendly and fully controllable.
- No map provider / API / license risk.
- Keeps performance controlled and predictable.

**Cons:**

- Not a true map.
- Less realistic.
- Requires manual content creation for every place.

**Best use:**

- The current MVP.
- The Dominik demo.
- Educational storytelling.
- Safe iteration before taking on geospatial complexity.

---

## 4. Recommended strategy

- **Keep the current SpaceLab core in Three.js / R3F.** It is proven and is
  the experience users actually come for.
- **Do not integrate Cesium directly into the main app yet.** The bundle,
  complexity, and mobile risk are not justified at this stage.
- **Add the Real World Bridge as an isolated experiment first**, fully
  separated from the space scene so it cannot destabilize it.
- **Recommended next practical step:** a **V6.5 MapLibre mini PoC** as a
  separate route or component — *not* inside the main space scene.
- **Keep Cesium as a later high-end research path** (V7), explored on its own
  branch/route once the MapLibre PoC has proven the data model and UX.

---

## 5. Proposed architecture

**Current:**

```
SpaceLab Core
 → Three.js Solar System
 → Terra overlay (AndromedaBridge)
 → City Builder (CityBuilderLite)
 → Badge Gallery (BadgeGallery)
 → localStorage progress
```

**Future:**

```
SpaceLab Core
 → Real World Bridge module
     → MapLibre PoC first
     → Cesium PoC later
     → Shared mission data
     → Shared progress / badges (localStorage)
```

The Real World Bridge should be a **sibling module** to the existing
features, not a fork of the space scene. It reuses the shared mission data
and the existing localStorage-based progress/badge system, so a place visited
on the map can later award the same kinds of badges as a space mission.

**Recommended folder structure:**

```
src/realworld/
  RealWorldBridge.jsx   # isolated entry component for the bridge module
  mapData.js            # map config: style URL, default center/zoom, layers
  olsztynPois.js        # curated Olsztyn points of interest (data only)
  README.md             # module notes, setup, provider/license decisions
```

Keeping everything under `src/realworld/` makes the experiment easy to
reason about, easy to lazy-load, and easy to remove or replace without
touching the core scene files.

---

## 6. Data model proposal

A simple, flat, JSON-friendly data model for Olsztyn POIs. It is engine-
agnostic (works for both MapLibre and Cesium) and reuses the existing
badge concept via `badgeTag`.

```js
export const OLSZTYN_POIS = [
  {
    id: "katedra",
    name: "Katedra św. Jakuba",
    type: "landmark",
    lat: 53.778,
    lng: 20.480,
    missionText: "Odwiedź gotycką katedrę w sercu starówki Olsztyna.",
    badgeTag: "terra"
  },
  {
    id: "lyna",
    name: "Rzeka Łyna",
    type: "river",
    lat: 53.776,
    lng: 20.486,
    missionText: "Podążaj wzdłuż rzeki Łyny przez miasto.",
    badgeTag: "terra"
  },
  {
    id: "park-most",
    name: "Park / Most nad Łyną",
    type: "park",
    lat: 53.781,
    lng: 20.490,
    missionText: "Znajdź most i park nad rzeką.",
    badgeTag: "terra"
  }
];
```

**Categories (`type`):**

- `landmark` — buildings / monuments (e.g. Katedra św. Jakuba).
- `river` — water features (e.g. Łyna).
- `park` — green areas.
- `bridge` — bridges / crossings (e.g. Most nad Łyną).
- `school` — schools / educational sites.
- `mission-base` — the Olsztyn mission hub / starting point.

Each POI is pure data: it carries an id, a display name, a category, real
coordinates, child-friendly mission text, and a `badgeTag` linking it to the
shared progress/badge system. No rendering logic lives in the data.

---

## 7. V6.5 MapLibre PoC plan

Future tasks (not part of V6.4):

1. Create an isolated component `RealWorldBridge.jsx` under `src/realworld/`.
2. Add static Olsztyn POI data (`olsztynPois.js`).
3. Show a map with 3 markers:
   - Katedra
   - Łyna
   - Park / Most
4. Clicking a marker opens a child-friendly card (name + mission text).
5. No login.
6. No backend.
7. No progress mutation at first (read-only PoC).
8. Keep it behind a button: **"🗺️ Mapa Olsztyna LAB"**.

The PoC's only goal is to validate the map engine, the data model, and the
card UX in isolation — without touching the space scene or progress state.

---

## 8. V7 Cesium research path

Future tasks (later, high-end research):

1. Create a separate experimental branch or route for Cesium.
2. Test Cesium globe load time and runtime performance.
3. Test a camera move from orbit down to Olsztyn.
4. Test mobile performance on low/mid-range devices.
5. Decide whether it belongs in the main app or stays a separate demo.

Cesium is only justified once the "from orbit to Olsztyn" cinematic
experience is a confirmed product goal and the MapLibre PoC has proven the
underlying mission/data structure.

---

## 9. Risks

- **Performance on mobile** — map and especially globe engines are heavy;
  low-end phones are the primary risk.
- **Map tile provider / license** — tile styles and data carry licensing
  terms and attribution requirements that must be respected.
- **API keys** — some providers require keys/tokens, which means secret
  handling, quotas, and potential cost.
- **App complexity** — adding a geospatial engine increases bundle size,
  build complexity, and maintenance surface.
- **Child safety / location privacy** — must avoid requesting or storing the
  user's real location; keep exploration to curated POIs only. No tracking.
- **Too much realism too early** — over-investing in realism before the UX
  and content are validated wastes effort and can hurt the child-friendly
  feel.
- **Breaking the current stable demo** — the largest risk; any integration
  must be isolated so it cannot regress the proven space sandbox.

---

## 10. Decision

**For now:**

- SpaceLab's main app **stays Three.js / R3F**.
- Real-world map work **starts as a separate LAB module** (`src/realworld/`),
  isolated from the core scene.
- **MapLibre is the first practical candidate** (V6.5 mini PoC).
- **Cesium remains a later high-end research path** (V7), explored on its own
  branch/route.
- **No heavy geospatial engine should be merged into main gameplay until
  after manual testing** confirms performance, UX, and licensing are
  acceptable.
