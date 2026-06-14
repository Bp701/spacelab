# SpaceLab V5.7 Checkpoint

## 1. Current public deployment

* Render URL:
  https://spacelab-bk13.onrender.com
* Repository:
  https://github.com/Bp701/spacelab
* Branch:
  main

## 2. Latest confirmed commit

```
4275742 feat: add terra landing beacons
```

Build status at checkpoint: ✅ `npm run build` succeeds (Vite, ~0.7s). Only warning is the pre-existing single-chunk size notice (>500 kB) — not an error.

## 3. Implemented features

### Space / Solar System

* cinematic starfield (3 layered `Stars` for depth + size/color variation, mobile-scaled)
* improved Sun halo (soft additive halo + subtle breathing pulse, mobile-toned)
* selected planet glow (pulsing emissive + soft additive halo + selection ring)
* planet discovery progress:
  localStorage key: `spacelab_discovered_planets`
* badge:
  🪐 Pilot Układu Słonecznego
* probe sandbox action:
  localStorage key: `spacelab_probe_missions` (shape: `{ "mars": 2, "earth": 1 }`)
* badges:
  🚀 Operator Sondy (first probe sent)
  🛰️ Badacz Planet (probes sent to ≥3 different planets)

### Anomaly Mission

* procedural Anomalia Copernix (core sphere + rotating rings + ~60 points + additive glow, placed beyond Jupiter / before Saturn)
* scan action (~2 s "Skanowanie..." → "Sygnał zapisany")
* localStorage key:
  `spacelab_anomaly_discovered`
* badge:
  ✨ Badacz Anomalii

### Terra / Olsztyn

* Terra Mode / Olsztyn Mission Hub (AndromedaBridge.jsx)
* local images:
  `/terra/katedra.jpg`
  `/terra/lyna.jpg`
  `/terra/most.jpg`
* weather badge (live Open-Meteo for Olsztyn, with fallback)
* Discover interaction:
  highlight
  narration panel
  focus/scroll
  Czytaj / Stop
* localStorage key:
  `spacelab_discovered_terra`
* mission progress:
  Misja Olsztyn: X/3
* badge:
  🏠 Strażnik Olsztyna
* landing beacons:
  localStorage key:
  `spacelab_terra_beacons` (shape: `["katedra", "lyna", "most"]`)
* badge:
  📍 Kartograf Olsztyna
* shared badge key:
  `spacelab_badges`

## 4. Child-friendly gameplay loop

1. Click a planet.
2. Hear/read information (Luna narration via Web Speech API).
3. Discover progress (`Planety: X/8`, unlocks 🪐 Pilot Układu Słonecznego).
4. Send a probe (`🚀 Wyślij sondę` → probe flies to the planet, count persists, unlocks 🚀 / 🛰️ badges).
5. Scan anomaly (find Anomalia Copernix, `🔍 Skanuj` → ✨ Badacz Anomalii).
6. Land on Earth (`🌍 LĄDUJ NA ZIEMI` → Terra Mode landing sequence).
7. Discover Olsztyn points (Katedra, Łyna, Most → `Misja Olsztyn: X/3`, 🏠 Strażnik Olsztyna).
8. Place mission beacons (`📍 Postaw znacznik misji` → `Znaczniki: X/3`, 📍 Kartograf Olsztyna).
9. Earn badges (collected in the 🏅 badge panel; persisted in localStorage).

## 5. Known limitations

* Web Speech API voice quality depends on browser/system.
* Render free instance can sleep (first load after idle is slow).
* NASA DEMO_KEY can hit 429 (rate limit) — app falls back to training data.
* No backend yet.
* No real user accounts yet.
* No Cesium / MapLibre yet.
* localStorage is device/browser specific (progress does not sync across devices).
* Visual validation still required on mobile after each deploy.
* Starfield / mobile density is calculated on page load (orientation/resize does not recompute until refresh).
* Probe starts from the camera perspective, not physically from Earth.
* Terra beacons cannot currently be removed.

## 6. Manual QA checklist

### Desktop

* [ ] App loads without black screen.
* [ ] Planets are visible.
* [ ] Earth click opens card.
* [ ] Planet discovery counter updates.
* [ ] Probe flies to selected planet.
* [ ] Probe count persists after refresh.
* [ ] Anomaly can be clicked.
* [ ] Anomaly scan unlocks badge.
* [ ] Terra Mode opens.
* [ ] Terra Discover works.
* [ ] Luna Czytaj / Stop works.
* [ ] Olsztyn progress reaches 3/3.
* [ ] Beacon progress reaches 3/3.
* [ ] Badges persist after refresh.

### Mobile around 390px width

* [ ] App loads.
* [ ] HUD is usable.
* [ ] Planet card is readable.
* [ ] Terra cards are readable.
* [ ] Labels do not cover overlays.
* [ ] Audio buttons are usable.
* [ ] No horizontal layout disaster.

## 7. Next roadmap

### V5.8 — Polish and reliability (reset progress / panel testowy / galeria odznak)

* reset progress / debug panel for testing
* clearer badge gallery
* better mobile overlay spacing
* small sound / vibration feedback if browser supports it
* optional parent / teacher mode

### V5.9 — Dominik Demo Mode

* one-button guided mission:
  Start Misja Dominika
* simplified path:
  Earth → Olsztyn → Katedra → Łyna → Most → badge

### V6.0 — Real Map / Sandbox Research (MapLibre vs Cesium decision)

* evaluate MapLibre vs Cesium
* decide whether Olsztyn map stays illustrative or becomes a real geospatial mode
* avoid heavy 3D terrain until UX is stable
