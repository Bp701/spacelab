import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

/* ============================================================
   COPERNIX SPACE LAB 3D — v4 "ŻYWY KOSMOS"
   Nowości względem v3:
     ☄️ Dynamiczne ogony komet — długość ∝ prędkość, falowanie, zanik
     🔥 Wejście w atmosferę — pomarańczowa poświata + iskry blisko Ziemi
     💫 Losowe przeloty komet co 30–60 s (WOOOSH, nieklikalne)
     🎯 Kamera reaktywna — zoom + puls FOV + NAMIERZANIE przy wykryciu
     🏠 SKALA: Ziemia → Polska → Warmia → Olsztyn → Dom Dominika
        (nowa misja "Strażnik Olsztyna" — most do Copernix World)

   Instalacja (Vite):
     npm i three @react-three/fiber @react-three/drei @react-three/postprocessing

   Fazy gry:
     intro   — kamera 'nad powierzchnią' Ziemi, tylko przycisk startu
     launch  — filmowy odlot (~6 s), HUD wjeżdża
     play    — misje sekwencyjne + lądowanie w Olsztynie + tryb Strażnika
   ============================================================ */

/* ---------------- Bezpieczny zapis ---------------- */
const STORAGE_KEY = "copernix_space_lab_3d_v4";
const safeStorage = {
  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  save(data) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* bez zapisu */ }
  },
};

/* ---------------- Stałe sceny ---------------- */
const LUNAR_KM = 384400;
const fmt = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const toLunar = (km) => (km / LUNAR_KM).toFixed(1);

const SUN_R = 2.4;
const EARTH_ORBIT_R = 12;
const EARTH_R = 0.95;
const MOON_ORBIT_R = 1.9;
const MOON_R = 0.26;
const SAT_ORBIT_R = 1.45;
const AST_MIN_R = 8.5;
const AST_MAX_R = 17;

const SOLAR_PLANETS = [
  {
    id: "mercury", label: "Merkury", icon: "☿", orbit: 4.2, radius: 0.28,
    speed: 0.13, spin: 0.18, color: "#A99C8A", emissive: "#241C16", inclination: 0.05, phase: 0.4,
  },
  {
    id: "venus", label: "Wenus", icon: "♀", orbit: 7.1, radius: 0.58,
    speed: 0.085, spin: -0.08, color: "#D8B16F", emissive: "#3A2810", inclination: 0.03, phase: 1.7,
  },
  {
    id: "mars", label: "Mars", icon: "♂", orbit: 15.4, radius: 0.46,
    speed: 0.038, spin: 0.22, color: "#C76343", emissive: "#32120C", inclination: 0.04, phase: 2.5,
  },
  {
    id: "jupiter", label: "Jowisz", icon: "♃", orbit: 22.5, radius: 1.35,
    speed: 0.018, spin: 0.55, color: "#D9B98D", emissive: "#2A1B10", inclination: 0.02, phase: 3.2,
    bands: ["#B7835A", "#F1D4A4", "#9B6A4A"],
  },
  {
    id: "saturn", label: "Saturn", icon: "♄", orbit: 30, radius: 1.08,
    speed: 0.014, spin: 0.42, color: "#D8C287", emissive: "#2A2412", inclination: 0.03, phase: 4.1,
    rings: true,
  },
  {
    id: "uranus", label: "Uran", icon: "♅", orbit: 38, radius: 0.78,
    speed: 0.01, spin: 0.28, color: "#8ED8D8", emissive: "#123436", inclination: 0.05, phase: 5.2,
  },
  {
    id: "neptune", label: "Neptun", icon: "♆", orbit: 46, radius: 0.76,
    speed: 0.008, spin: 0.3, color: "#416DCE", emissive: "#101E48", inclination: 0.04, phase: 0.9,
  },
];

const SOLAR_PLANET_BY_ID = Object.fromEntries(SOLAR_PLANETS.map((planet) => [planet.id, planet]));
const PLANET_FOCUS_IDS = new Set([...SOLAR_PLANETS.map((planet) => planet.id), "earth"]);
const PLANET_QUEST_TARGET = "mars";
const PLANET_AUDIO_FACTS = {
  mercury: "Cześć! Jestem Merkury. Okrążam Słońce w 88 dni.",
  venus: "Cześć! Jestem Wenus. Jestem bardzo gorącą planetą z gęstą atmosferą.",
  earth: "Cześć! Jestem Ziemia. To tutaj mamy oceany, chmury i Olsztyn.",
  mars: "Cześć! Jestem Mars. Mam czerwony pył i wysokie kosmiczne góry.",
  jupiter: "Cześć! Jestem Jowisz. Jestem największą planetą Układu Słonecznego.",
  saturn: "Cześć! Jestem Saturn. Mam wielkie pierścienie z lodu i skał.",
  uranus: "Cześć! Jestem Uran. Obracam się prawie na boku.",
  neptune: "Cześć! Jestem Neptun. Wieją u mnie bardzo szybkie wiatry.",
};

function getPlanetOrbitPosition(planet, t, out) {
  const a = planet.phase + t * planet.speed;
  const x = Math.cos(a) * planet.orbit;
  const z = Math.sin(a) * planet.orbit;
  const y = Math.sin(a * 0.9) * Math.sin(planet.inclination) * planet.orbit * 0.25;
  return out.set(x, y, z);
}

function getPlanetFocusDistance(id) {
  if (id === "earth") return 3.4;
  const planet = SOLAR_PLANET_BY_ID[id];
  if (!planet) return 3.2;
  return Math.max(2.0, planet.radius * 3.3 + (planet.rings ? 1.4 : 0.9));
}

function getPolishSpeechVoice(synthesis) {
  const voices = synthesis.getVoices();
  return voices.find((voice) => voice.lang === "pl-PL") || voices.find((voice) => voice.lang?.toLowerCase().startsWith("pl")) || null;
}

function speakPolish(text) {
  if (typeof window === "undefined" || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    console.warn("SpeechSynthesis unavailable");
    return;
  }

  const synthesis = window.speechSynthesis;
  synthesis.cancel();
  const utterance = new window.SpeechSynthesisUtterance(text);
  const polishVoice = getPolishSpeechVoice(synthesis);
  if (polishVoice) utterance.voice = polishVoice;
  utterance.lang = polishVoice?.lang || "pl-PL";
  utterance.rate = 0.94;
  utterance.pitch = 1.08;
  synthesis.speak(utterance);
}

const TAIL_N = 14;          // segmenty ogona komety
const SPARK_N = 12;         // iskry przy wejściu w atmosferę
const FLYBY_TAIL = 22;      // segmenty ogona losowej komety
const FIRE_COLOR = new THREE.Color("#FF8A3C");
const EASY_PILOT_SPEED = 7.2;
const EASY_MOUSE_BUTTONS = Object.freeze({
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: null,
});

function hash01(str, salt = 0) {
  let h = salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
  return (h % 1000) / 1000;
}
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/* ---------------- Dane mock ---------------- */
const MOCK_ASTEROIDS = [
  { id: "a1", name: "2024 PT5", missKm: 1842000, speedKmh: 29500, diameterM: 11, hazardous: false },
  { id: "a2", name: "2010 XC15", missKm: 5230000, speedKmh: 41200, diameterM: 140, hazardous: true },
  { id: "a3", name: "2017 BM123", missKm: 912000, speedKmh: 24800, diameterM: 28, hazardous: false },
  { id: "a4", name: "2005 LW3", missKm: 3470000, speedKmh: 56300, diameterM: 95, hazardous: false },
  { id: "a5", name: "2021 GT2", missKm: 6890000, speedKmh: 33100, diameterM: 47, hazardous: false },
  { id: "a6", name: "1994 PC1", missKm: 7560000, speedKmh: 70600, diameterM: 760, hazardous: true },
  { id: "a7", name: "2019 VL5", missKm: 2310000, speedKmh: 19400, diameterM: 19, hazardous: false },
  { id: "a8", name: "2008 OS7", missKm: 4120000, speedKmh: 47900, diameterM: 210, hazardous: true },
  { id: "a9", name: "2023 DZ2", missKm: 1560000, speedKmh: 27700, diameterM: 56, hazardous: false },
  { id: "a10", name: "2012 TC4", missKm: 8430000, speedKmh: 38200, diameterM: 13, hazardous: false },
];

/* ---------------- NASA NeoWs ---------------- */
const isoDate = (d) => d.toISOString().slice(0, 10);
async function fetchNASAData() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 7);
  const url =
    `https://api.nasa.gov/neo/rest/v1/feed?start_date=${isoDate(start)}` +
    `&end_date=${isoDate(end)}&api_key=DEMO_KEY`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("NeoWs HTTP " + res.status);
  const json = await res.json();
  const out = [];
  Object.values(json.near_earth_objects || {}).forEach((list) => {
    list.forEach((neo) => {
      const ca = neo.close_approach_data && neo.close_approach_data[0];
      if (!ca) return;
      const dMin = neo.estimated_diameter?.meters?.estimated_diameter_min || 0;
      const dMax = neo.estimated_diameter?.meters?.estimated_diameter_max || 0;
      out.push({
        id: String(neo.id),
        name: neo.name.replace(/[()]/g, ""),
        missKm: parseFloat(ca.miss_distance?.kilometers || "0"),
        speedKmh: parseFloat(ca.relative_velocity?.kilometers_per_hour || "0"),
        diameterM: Math.round((dMin + dMax) / 2),
        hazardous: !!neo.is_potentially_hazardous_asteroid,
      });
    });
  });
  if (out.length === 0) throw new Error("Brak obiektów");
  return out.sort((a, b) => a.missKm - b.missKm).slice(0, 10);
}

/* ---------------- Info o obiektach ---------------- */
const BODY_INFO = {
  sun: {
    name: "Słońce", type: "⭐ Gwiazda",
    distance: "149 600 000 km od Ziemi",
    speed: "Ziemia okrąża je z prędkością 107 000 km/h",
    fact: "Zmieściłoby się w nim ponad MILION Ziemi! 🤯",
  },
  mercury: {
    name: "Merkury", type: "☿ Planeta skalista",
    distance: "Najbliższa planeta Słońca",
    speed: "Okrąża Słońce w 88 dni ziemskich",
    fact: "Ma ogromne skoki temperatury: od lodowatego cienia do palącego dnia.",
  },
  venus: {
    name: "Wenus", type: "♀ Planeta skalista",
    distance: "Druga planeta od Słońca",
    speed: "Okrąża Słońce w 225 dni ziemskich",
    fact: "Jej gęsta atmosfera działa jak kosmiczna szklarnia.",
  },
  earth: {
    name: "Ziemia", type: "🌍 Planeta",
    distance: "Tu jesteśmy! Dom 8 miliardów ludzi",
    speed: "Pędzi wokół Słońca 107 000 km/h — i nic nie czujemy!",
    fact: "Jedyna znana planeta z czekoladą, dinozaurami w muzeach i Olsztynem. 😄",
  },
  mars: {
    name: "Mars", type: "♂ Planeta skalista",
    distance: "Czwarta planeta od Słońca",
    speed: "Okrąża Słońce w 687 dni ziemskich",
    fact: "Czerwony kolor zawdzięcza tlenkom żelaza w pyle i skałach.",
  },
  jupiter: {
    name: "Jowisz", type: "♃ Gazowy olbrzym",
    distance: "Największa planeta Układu Słonecznego",
    speed: "Okrąża Słońce w około 12 lat ziemskich",
    fact: "Jego Wielka Czerwona Plama to burza większa od Ziemi.",
  },
  saturn: {
    name: "Saturn", type: "♄ Gazowy olbrzym z pierścieniami",
    distance: "Szósta planeta od Słońca",
    speed: "Okrąża Słońce w około 29 lat ziemskich",
    fact: "Pierścienie Saturna składają się głównie z lodu i drobnych skał.",
  },
  uranus: {
    name: "Uran", type: "♅ Lodowy olbrzym",
    distance: "Siódma planeta od Słońca",
    speed: "Okrąża Słońce w około 84 lata ziemskie",
    fact: "Obraca się jakby leżał na boku, z osią mocno przechyloną.",
  },
  neptune: {
    name: "Neptun", type: "♆ Lodowy olbrzym",
    distance: "Najdalsza główna planeta od Słońca",
    speed: "Okrąża Słońce w około 165 lat ziemskich",
    fact: "Ma jedne z najszybszych wiatrów w Układzie Słonecznym.",
  },
  moon: {
    name: "Księżyc", type: "🌙 Naturalny satelita Ziemi",
    distance: "384 400 km od Ziemi",
    speed: "Okrąża Ziemię w 27 dni",
    fact: "Było tam 12 osób — ich ślady zostaną na miliony lat, bo nie ma wiatru!",
  },
  satellite: {
    name: "Copernix-1", type: "🛰 Satelita obserwacyjny",
    distance: "Niska orbita okołoziemska (~550 km)",
    speed: "28 000 km/h — okrążenie Ziemi w 90 minut!",
    fact: "Satelity pomagają w prognozie pogody, GPS i internecie. Nad Twoją głową przelatuje ich kilka TYSIĘCY!",
  },
};

/* ---------------- Misje sekwencyjne ---------------- */
const MISSIONS = [
  { id: "find_satellite", objective: "🛰 ZNAJDŹ SATELITĘ — mała maszyna krąży tuż nad Ziemią. Przybliż się i kliknij!", badge: { icon: "🧭", name: "Nawigator Orbity" } },
  { id: "scan_asteroid", objective: "☄ ZESKANUJ WYKRYTY OBIEKT — szukaj pomarańczowego markera 📡 i kliknij asteroidę!", badge: { icon: "🥇", name: "Tropiciel Orbit" } },
  { id: "fly_moon", objective: "🌙 DOLEĆ DO KSIĘŻYCA — kliknij go, a kamera zabierze Cię w podróż!", badge: { icon: "🔭", name: "Pilot Księżycowy" } },
  { id: "descend_olsztyn", objective: "🏠 ZEJDŹ DO OLSZTYNA — kliknij Ziemię i wyląduj w bazie Dominika!", badge: { icon: "🏠", name: "Strażnik Olsztyna" } },
  { id: "guardian", objective: "🛡 TRYB STRAŻNIKA AKTYWNY — skanuj kolejne wykrywane obiekty i pilnuj Ziemi!", badge: { icon: "🛡️", name: "STRAŻNIK ZIEMI" } },
];

/* ============================================================
   PROCEDURALNE TEKSTURY
   ============================================================ */
function makeRadialGlow(colorInner, colorOuter, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, colorInner);
  g.addColorStop(0.4, colorOuter);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function makeEarthTexture() {
  const W = 1024, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, "#0E3F73");
  og.addColorStop(0.5, "#1567B0");
  og.addColorStop(1, "#0E3F73");
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, W, H);
  let seed = 42;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = "#3FA66A";
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W, y = H * 0.18 + rnd() * H * 0.64;
    ctx.beginPath();
    for (let b = 0; b < 9; b++) {
      const bx = x + (rnd() - 0.5) * 140;
      const by = y + (rnd() - 0.5) * 80;
      const r = 14 + rnd() * 46;
      ctx.moveTo(bx + r, by);
      ctx.arc(bx, by, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.fillStyle = "rgba(201,166,75,0.55)";
  for (let i = 0; i < 9; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * W, H * 0.3 + rnd() * H * 0.4, 12 + rnd() * 30, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(240,248,255,0.95)";
  ctx.fillRect(0, 0, W, H * 0.06);
  ctx.fillRect(0, H * 0.94, W, H * 0.06);
  return new THREE.CanvasTexture(c);
}

function makeCloudsTexture() {
  const W = 1024, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 240; i++) {
    const x = rnd() * W, y = rnd() * H;
    const r = 6 + rnd() * 26;
    ctx.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.14})`;
    ctx.beginPath();
    ctx.ellipse(x, y, r * (1.4 + rnd()), r * 0.5, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

/* ============================================================
   SCENA — TŁO
   ============================================================ */

function Nebulae() {
  const sprites = useMemo(() => {
    const defs = [
      { c1: "rgba(130,80,220,0.55)", c2: "rgba(60,20,120,0.18)", pos: [-60, 18, -90], s: 95 },
      { c1: "rgba(47,230,200,0.4)", c2: "rgba(10,80,90,0.14)", pos: [70, -12, -110], s: 110 },
      { c1: "rgba(230,80,160,0.35)", c2: "rgba(90,20,70,0.12)", pos: [20, 35, -130], s: 120 },
      { c1: "rgba(80,140,255,0.35)", c2: "rgba(20,40,110,0.12)", pos: [-85, -28, -70], s: 80 },
      { c1: "rgba(255,170,80,0.22)", c2: "rgba(120,60,10,0.08)", pos: [95, 26, -60], s: 70 },
    ];
    return defs.map((d) => ({ ...d, tex: makeRadialGlow(d.c1, d.c2) }));
  }, []);
  return (
    <group>
      {sprites.map((s, i) => (
        <sprite key={i} position={s.pos} scale={[s.s, s.s, 1]} raycast={() => null}>
          <spriteMaterial map={s.tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
}

/** Pas Drogi Mlecznej — poczucie większej skali świata */
function MilkyWay() {
  const tex = useMemo(() => makeRadialGlow("rgba(190,210,255,0.5)", "rgba(80,110,200,0.12)", 256), []);
  return (
    <sprite position={[20, 55, -220]} scale={[520, 90, 1]} raycast={() => null}>
      <spriteMaterial map={tex} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} rotation={-0.45} />
    </sprite>
  );
}

/** Pył kosmiczny — wjeżdża płynnie po starcie misji (reveal) */
function SpaceDust({ reveal }) {
  const ref = useRef();
  const matRef = useRef();
  const positions = useMemo(() => {
    const N = 1600;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 10 + Math.random() * 60;
      const a = Math.random() * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.004;
    if (matRef.current) matRef.current.opacity = 0.55 * reveal.current.v;
  });
  return (
    <points ref={ref} raycast={() => null}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial ref={matRef} size={0.07} color="#9FD8FF" transparent opacity={0} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function OrbitRing({ radius, inclination = 0, color = "#1E3A5F", opacity = 0.5, reveal }) {
  const matRef = useRef();
  const geom = useMemo(() => {
    const pts = [];
    const N = 128;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  useFrame(() => {
    if (matRef.current && reveal) matRef.current.opacity = opacity * reveal.current.v;
  });
  return (
    <group rotation={[inclination, 0, 0]}>
      <line geometry={geom}>
        <lineBasicMaterial ref={matRef} color={color} transparent opacity={reveal ? 0 : opacity} />
      </line>
    </group>
  );
}

function Sun({ onSelect, selected, showLabels }) {
  const coronaTex = useMemo(() => makeRadialGlow("rgba(255,210,90,0.9)", "rgba(255,120,20,0.25)"), []);
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.04; });
  return (
    <group>
      <pointLight intensity={2.6} distance={200} decay={0.35} color="#FFF3D6" />
      <mesh ref={ref} onClick={(e) => { e.stopPropagation(); onSelect("sun"); }}>
        <sphereGeometry args={[SUN_R, 48, 48]} />
        <meshBasicMaterial color="#FFF6CF" toneMapped={false} />
      </mesh>
      <sprite scale={[SUN_R * 7, SUN_R * 7, 1]} raycast={() => null}>
        <spriteMaterial map={coronaTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {showLabels && (
        <Html position={[0, SUN_R + 1.6, 0]} center distanceFactor={40} style={labelStyle(selected === "sun")}>☀️ Słońce</Html>
      )}
    </group>
  );
}

function SolarPlanets({ clock, onSelect, selected, phase, reveal, planetPositions, showLabels }) {
  return (
    <>
      {SOLAR_PLANETS.map((planet) => (
        <SolarPlanet
          key={planet.id}
          planet={planet}
          clock={clock}
          onSelect={onSelect}
          selected={selected}
          phase={phase}
          reveal={reveal}
          planetPositions={planetPositions}
          showLabels={showLabels}
        />
      ))}
    </>
  );
}

function SolarPlanet({ planet, clock, onSelect, selected, phase, reveal, planetPositions, showLabels }) {
  const group = useRef();
  const mesh = useRef();
  const pos = useMemo(() => new THREE.Vector3(), []);
  const selectedPlanet = selected === planet.id;

  useFrame((_, dt) => {
    getPlanetOrbitPosition(planet, clock.current.t, pos);

    if (group.current) group.current.position.copy(pos);
    if (planetPositions?.current?.[planet.id]) planetPositions.current[planet.id].copy(pos);
    if (mesh.current) mesh.current.rotation.y += dt * planet.spin;
  });

  return (
    <>
      <OrbitRing
        radius={planet.orbit}
        inclination={planet.inclination}
        color={selectedPlanet ? "#2FE6C8" : "#243A62"}
        opacity={selectedPlanet ? 0.85 : 0.34}
        reveal={reveal}
      />
      <group ref={group}>
        <mesh ref={mesh} onClick={(e) => { e.stopPropagation(); onSelect(planet.id); }}>
          <sphereGeometry args={[planet.radius, 40, 40]} />
          <meshStandardMaterial
            color={planet.color}
            roughness={0.82}
            metalness={0.04}
            emissive={planet.emissive}
            emissiveIntensity={selectedPlanet ? 0.16 : 0.04}
          />
        </mesh>

        {planet.bands?.map((color, i) => (
          <mesh key={color} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.08]} raycast={() => null}>
            <torusGeometry args={[planet.radius * (0.72 + i * 0.16), 0.018, 8, 96]} />
            <meshBasicMaterial color={color} transparent opacity={0.42} toneMapped={false} />
          </mesh>
        ))}

        {planet.rings && (
          <mesh rotation={[Math.PI / 2.45, 0.18, 0.2]} raycast={() => null}>
            <torusGeometry args={[planet.radius * 1.62, 0.065, 10, 128]} />
            <meshStandardMaterial color="#D8C287" roughness={0.7} transparent opacity={0.72} side={THREE.DoubleSide} />
          </mesh>
        )}

        {selectedPlanet && <SelectionRing radius={planet.radius + 0.34} />}
        {phase === "play" && showLabels && (
          <Html position={[0, planet.radius + 0.55, 0]} center distanceFactor={34} style={labelStyle(selectedPlanet)}>
            {planet.icon} {planet.label}
          </Html>
        )}
      </group>
    </>
  );
}

/** Ziemia + chmury + atmosfera + Księżyc + satelita Copernix-1 */
function EarthSystem({ clock, earthPos, moonPos, onSelect, selected, guardianActive, reveal, phase, showLabels }) {
  const group = useRef();
  const earthMesh = useRef();
  const cloudsMesh = useRef();
  const moonMesh = useRef();
  const satGroup = useRef();
  const shieldRef = useRef();

  const earthTex = useMemo(() => makeEarthTexture(), []);
  const cloudsTex = useMemo(() => makeCloudsTexture(), []);

  useFrame((_, dt) => {
    const t = clock.current.t;
    const ea = t * 0.05;
    const ex = Math.cos(ea) * EARTH_ORBIT_R;
    const ez = Math.sin(ea) * EARTH_ORBIT_R;
    if (group.current) group.current.position.set(ex, 0, ez);
    earthPos.current.set(ex, 0, ez);

    if (earthMesh.current) earthMesh.current.rotation.y += dt * 0.25;
    if (cloudsMesh.current) cloudsMesh.current.rotation.y += dt * 0.33;

    const ma = t * 0.6;
    const mx = Math.cos(ma) * MOON_ORBIT_R;
    const mz = Math.sin(ma) * MOON_ORBIT_R;
    const my = 0.2 * Math.sin(ma);
    if (moonMesh.current) moonMesh.current.position.set(mx, my, mz);
    moonPos.current.set(ex + mx, my, ez + mz);

    const sa = t * 1.6;
    if (satGroup.current) {
      satGroup.current.position.set(Math.cos(sa) * SAT_ORBIT_R, 0.35 * Math.sin(sa * 0.7), Math.sin(sa) * SAT_ORBIT_R);
      satGroup.current.rotation.y += dt * 0.8;
    }
    if (shieldRef.current) {
      const s = 1 + 0.06 * Math.sin(t * 2.2);
      shieldRef.current.scale.set(s, s, s);
      shieldRef.current.rotation.y += dt * 0.3;
    }
  });

  const showEarthLabels = phase === "play" && showLabels;

  return (
    <>
      <OrbitRing radius={EARTH_ORBIT_R} color="#2F6FB0" opacity={0.6} reveal={reveal} />
      <group ref={group}>
        <mesh ref={earthMesh} onClick={(e) => { e.stopPropagation(); onSelect("earth"); }}>
          <sphereGeometry args={[EARTH_R, 64, 64]} />
          <meshStandardMaterial map={earthTex} roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh ref={cloudsMesh} scale={1.025} raycast={() => null}>
          <sphereGeometry args={[EARTH_R, 48, 48]} />
          <meshStandardMaterial map={cloudsTex} transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <mesh scale={1.12} raycast={() => null}>
          <sphereGeometry args={[EARTH_R, 32, 32]} />
          <meshBasicMaterial color="#5FC6FF" transparent opacity={0.16} side={THREE.BackSide} toneMapped={false} />
        </mesh>
        {selected === "earth" && <SelectionRing radius={EARTH_R + 0.5} />}
        {guardianActive && (
          <mesh ref={shieldRef} raycast={() => null}>
            <sphereGeometry args={[EARTH_R + 0.85, 24, 24]} />
            <meshBasicMaterial color="#2FE6C8" wireframe transparent opacity={0.3} toneMapped={false} />
          </mesh>
        )}
        {showEarthLabels && (
          <Html position={[0, EARTH_R + 1.0, 0]} center distanceFactor={30} style={labelStyle(selected === "earth")}>🌍 Ziemia</Html>
        )}

        {/* SATELITA Copernix-1 */}
        <group ref={satGroup} onClick={(e) => { e.stopPropagation(); onSelect("satellite"); }}>
          <mesh>
            <boxGeometry args={[0.09, 0.09, 0.16]} />
            <meshStandardMaterial color="#D9DEE8" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* panele słoneczne */}
          <mesh position={[0.18, 0, 0]}>
            <boxGeometry args={[0.22, 0.01, 0.1]} />
            <meshStandardMaterial color="#1B4FA0" metalness={0.5} roughness={0.35} emissive="#123A7A" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[-0.18, 0, 0]}>
            <boxGeometry args={[0.22, 0.01, 0.1]} />
            <meshStandardMaterial color="#1B4FA0" metalness={0.5} roughness={0.35} emissive="#123A7A" emissiveIntensity={0.4} />
          </mesh>
          {selected === "satellite" && <SelectionRing radius={0.32} />}
          {showEarthLabels && (
            <Html position={[0, 0.3, 0]} center distanceFactor={16} style={labelStyle(selected === "satellite")}>🛰 Copernix-1</Html>
          )}
        </group>

        <OrbitRing radius={MOON_ORBIT_R} color="#3D6491" opacity={0.4} reveal={reveal} />
        <mesh ref={moonMesh} onClick={(e) => { e.stopPropagation(); onSelect("moon"); }}>
          <sphereGeometry args={[MOON_R, 32, 32]} />
          <meshStandardMaterial color="#B9C2CF" roughness={0.95} />
          {selected === "moon" && <SelectionRing radius={MOON_R + 0.25} />}
        </mesh>
      </group>
    </>
  );
}

function SelectionRing({ radius }) {
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.z += dt * 1.5; });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
      <torusGeometry args={[radius, 0.03, 12, 64]} />
      <meshBasicMaterial color="#2FE6C8" toneMapped={false} />
    </mesh>
  );
}

function ScanMarker({ radius }) {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      const s = 1 + 0.35 * Math.sin(state.clock.elapsedTime * 5);
      ref.current.scale.set(s, s, s);
      ref.current.rotation.z += 0.04;
    }
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
      <torusGeometry args={[radius, 0.045, 10, 48]} />
      <meshBasicMaterial color="#FFB02E" toneMapped={false} />
    </mesh>
  );
}

/** Rozchodzący się "ping" wokół namierzonego celu — jak radar NASA */
function PingRing({ radius }) {
  const ref = useRef();
  const mat = useRef();
  useFrame((state) => {
    const k = (state.clock.elapsedTime % 1.4) / 1.4;
    const s = 1 + k * 2.4;
    if (ref.current) ref.current.scale.set(s, s, s);
    if (mat.current) mat.current.opacity = (1 - k) * 0.7;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
      <torusGeometry args={[radius, 0.025, 8, 48]} />
      <meshBasicMaterial ref={mat} color="#FF8A3C" transparent opacity={0.7} toneMapped={false} />
    </mesh>
  );
}

/* ============================================================
   ASTEROIDY-KOMETY: dynamiczny ogon + wejście w atmosferę
   ============================================================ */
function Asteroid({ data, clock, onSelect, selected, isScanTarget, reveal, phase, earthPos, scanTargetPos, minimal, showLabels }) {
  const ref = useRef();
  const matRef = useRef();
  const glowObj = useRef();
  const glowMat = useRef();
  const tailObjs = useRef([]);
  const tailMats = useRef([]);
  const sparksRef = useRef();
  const sparksMat = useRef();
  const heat = useRef(0);

  const glowTex = useMemo(() => makeRadialGlow("rgba(255,255,255,0.95)", "rgba(140,190,255,0.2)", 128), []);
  const fireTex = useMemo(() => makeRadialGlow("rgba(255,200,120,0.95)", "rgba(255,110,30,0.25)", 128), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  const params = useMemo(() => {
    const t = Math.min(1, data.missKm / 9000000);
    return {
      radius: AST_MIN_R + t * (AST_MAX_R - AST_MIN_R) + hash01(data.id, 7) * 1.2,
      speed: 0.04 + (data.speedKmh / 70000) * 0.07,
      inclination: (hash01(data.id, 13) - 0.5) * 0.6,
      phase: hash01(data.id, 29) * Math.PI * 2,
      size: Math.max(0.16, Math.min(0.6, 0.13 + Math.sqrt(data.diameterM) / 46)),
      tumble: 0.4 + hash01(data.id, 41) * 1.2,
      speedNorm: Math.min(1, data.speedKmh / 70000),
      tailBase: new THREE.Color(data.hazardous ? "#FFC08A" : "#9FD8FF"),
    };
  }, [data]);

  const sparkSeeds = useMemo(
    () => Array.from({ length: SPARK_N }, () => ({
      off: Math.random(),
      r1: Math.random() * 2 - 1,
      r2: Math.random() * 2 - 1,
      sp: 0.5 + Math.random() * 0.9,
    })),
    []
  );
  const sparkPositions = useMemo(() => new Float32Array(SPARK_N * 3), []);

  const baseColor = data.hazardous ? "#C98A4B" : "#8C9BB5";

  useFrame((state, dt) => {
    const t = clock.current.t;
    const a = params.phase + t * params.speed;
    const x = Math.cos(a) * params.radius;
    const z = Math.sin(a) * params.radius;
    const y = Math.sin(a) * Math.sin(params.inclination) * params.radius * 0.35;
    if (!ref.current) return;
    ref.current.position.set(x, y, z);
    ref.current.rotation.x += dt * params.tumble;
    ref.current.rotation.y += dt * params.tumble * 0.7;

    /* pozycja celu dla kamery reaktywnej */
    if (isScanTarget && scanTargetPos) scanTargetPos.current.set(x, y, z);

    /* ciepło atmosferyczne — im bliżej Ziemi, tym mocniej płonie */
    const d = ref.current.position.distanceTo(earthPos.current);
    const heatTarget = clamp01((3.1 - d) / 2.1);
    heat.current += (heatTarget - heat.current) * Math.min(1, dt * 3);
    const h = heat.current;
    const revealV = reveal.current.v;
    const now = state.clock.elapsedTime;

    /* emisja materiału: selekcja > marker > ogień */
    const sel = selected === data.id;
    const m = matRef.current;
    if (m) {
      if (sel) {
        m.color.set("#2FE6C8");
        m.emissive.set("#2FE6C8");
        m.emissiveIntensity = 0.6;
      } else {
        m.color.set(baseColor);
        if (isScanTarget) {
          m.emissive.set("#FF8A3C");
          m.emissiveIntensity = 0.8 + 0.3 * Math.sin(now * 5);
        } else if (h > 0.02) {
          m.emissive.set("#FF7A2E");
          m.emissiveIntensity = h * 1.4;
        } else {
          m.emissiveIntensity = 0;
        }
      }
    }

    /* poświata atmosferyczna na głowie */
    if (glowObj.current && glowMat.current) {
      const gs = params.size * (3.6 + 0.5 * Math.sin(now * 7));
      glowObj.current.scale.set(gs, gs, 1);
      glowMat.current.opacity = h * 0.85 * revealV;
    }

    /* OGON — analityczny ślad po orbicie; długość ∝ prędkość, falowanie, zanik */
    const spacing = 0.022 + params.speedNorm * 0.055 + h * 0.012;
    for (let i = 0; i < TAIL_N; i++) {
      const o = tailObjs.current[i];
      const tm = tailMats.current[i];
      if (!o || !tm) continue;
      const ai = a - (i + 1) * spacing;
      const f = 1 - i / TAIL_N;
      const wobble = Math.sin(now * 2.4 + i * 0.6) * 0.035 * (i / TAIL_N) * (1 + params.speedNorm);
      o.position.set(
        Math.cos(ai) * params.radius,
        Math.sin(ai) * Math.sin(params.inclination) * params.radius * 0.35 + wobble,
        Math.sin(ai) * params.radius
      );
      const sc = params.size * (2.4 * f * f + 0.5) * (1 + h * 0.7);
      o.scale.set(sc, sc, 1);
      tm.opacity = (0.05 + 0.5 * f * f) * (0.5 + params.speedNorm) * revealV * (0.65 + h * 0.8);
      tmpColor.copy(params.tailBase).lerp(FIRE_COLOR, h);
      tm.color.copy(tmpColor);
    }

    /* ISKRY — sypią się za kometą tylko przy wejściu w atmosferę */
    if (sparksRef.current && sparksMat.current) {
      const attr = sparksRef.current.geometry.attributes.position;
      const tdx = -Math.sin(a);
      const tdz = Math.cos(a);
      for (let i = 0; i < SPARK_N; i++) {
        const sd = sparkSeeds[i];
        const life = (now * sd.sp + sd.off * 3) % 1;
        const back = life * (0.45 + params.speedNorm * 0.5);
        attr.array[i * 3] = x - tdx * back + sd.r1 * 0.09 * life;
        attr.array[i * 3 + 1] = y + sd.r2 * 0.12 * life + life * life * 0.06;
        attr.array[i * 3 + 2] = z - tdz * back + sd.r2 * 0.07 * life;
      }
      attr.needsUpdate = true;
      sparksMat.current.opacity = h * 0.85 * revealV;
    }
  });

  const sel = selected === data.id;

  // If this asteroid is very near Earth and not selected/target, render a simplified, low-visuals placeholder
  if (minimal) {
    return (
      <group position={[0, 0, 0]}>
        <mesh onClick={(e) => { e.stopPropagation(); onSelect(data.id); }} scale={0.86}>
          <icosahedronGeometry args={[params.size * 0.78, 0]} />
          <meshStandardMaterial color={baseColor} roughness={0.95} metalness={0.02} emissive={"#000000"} />
        </mesh>
      </group>
    );
  }

  return (
    <>
      <OrbitRing
        radius={params.radius}
        inclination={params.inclination}
        color={isScanTarget ? "#FFB02E" : sel ? "#2FE6C8" : "#16294A"}
        opacity={isScanTarget ? 0.9 : sel ? 0.9 : 0.45}
        reveal={reveal}
      />
      <group ref={ref}>
        <mesh onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}>
          <icosahedronGeometry args={[params.size, 0]} />
          <meshStandardMaterial ref={matRef} color={baseColor} flatShading roughness={0.9} />
        </mesh>
        {/* poświata wejścia w atmosferę */}
        <sprite ref={glowObj} raycast={() => null}>
          <spriteMaterial ref={glowMat} map={fireTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        {sel && <SelectionRing radius={params.size + 0.35} />}
        {isScanTarget && <ScanMarker radius={params.size + 0.5} />}
        {isScanTarget && <PingRing radius={params.size + 0.55} />}
        {phase === "play" && showLabels && (sel || isScanTarget) && (
          <Html position={[0, params.size + 0.55, 0]} center distanceFactor={36} style={labelStyle(true)}>
            {isScanTarget ? "📡 " : "☄️ "}{data.name}
          </Html>
        )}
      </group>

      {/* OGON + ISKRY (współrzędne świata — poza grupą głowy) */}
      <group>
        {Array.from({ length: TAIL_N }).map((_, i) => (
          <sprite key={i} raycast={() => null} ref={(el) => { tailObjs.current[i] = el; }}>
            <spriteMaterial
              ref={(el) => { tailMats.current[i] = el; }}
              map={glowTex} transparent opacity={0} depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        ))}
        <points ref={sparksRef} raycast={() => null}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={SPARK_N} array={sparkPositions} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial
            ref={sparksMat} size={0.06} color="#FFC46B" transparent opacity={0}
            sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </>
  );
}

/* ============================================================
   LOSOWE PRZELOTY KOMET — WOOOSH co 30–60 s, nieklikalne
   ============================================================ */
function FlybyComets() {
  const group = useRef();
  const headObj = useRef();
  const headMat = useRef();
  const coreObj = useRef();
  const coreMat = useRef();
  const tailObjs = useRef([]);
  const tailMats = useRef([]);

  const st = useRef({
    active: false,
    nextAt: 10 + Math.random() * 12, // pierwszy przelot szybko, żeby było WOW
    t0: 0,
    dur: 6,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    color: new THREE.Color("#BFE9FF"),
    seed: 0,
  });

  const glowTex = useMemo(() => makeRadialGlow("rgba(255,255,255,0.95)", "rgba(150,200,255,0.22)", 128), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const perp = useMemo(() => new THREE.Vector3(), []);
  const UP = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    const s = st.current;
    if (!group.current) return;

    if (!s.active) {
      group.current.visible = false;
      if (now >= s.nextAt) {
        const ang = Math.random() * Math.PI * 2;
        s.from.set(Math.cos(ang) * 58, (Math.random() - 0.5) * 30, Math.sin(ang) * 58);
        const ang2 = ang + Math.PI + (Math.random() - 0.5) * 1.1;
        s.to.set(Math.cos(ang2) * 58, (Math.random() - 0.5) * 26, Math.sin(ang2) * 58);
        s.dur = 4.5 + Math.random() * 2.5;
        s.t0 = now;
        s.seed = Math.random() * 100;
        const palette = ["#BFE9FF", "#9FF7E8", "#FFE9C4", "#D9C9FF"];
        s.color.set(palette[Math.floor(Math.random() * palette.length)]);
        s.active = true;
      }
      return;
    }

    const k = (now - s.t0) / s.dur;
    if (k >= 1) {
      s.active = false;
      s.nextAt = now + 30 + Math.random() * 30; // następny za 30–60 s
      group.current.visible = false;
      return;
    }

    group.current.visible = true;
    const fade = Math.pow(Math.sin(Math.PI * k), 0.55);
    dir.copy(s.to).sub(s.from).normalize();
    perp.copy(dir).cross(UP).normalize();
    tmp.copy(s.from).lerp(s.to, k);
    tmp.y += Math.sin(now * 2.0 + s.seed) * 0.6;

    if (headObj.current) { headObj.current.position.copy(tmp); headObj.current.scale.set(2.0, 2.0, 1); }
    if (headMat.current) { headMat.current.opacity = 0.95 * fade; headMat.current.color.copy(s.color); }
    if (coreObj.current) { coreObj.current.position.copy(tmp); coreObj.current.scale.set(0.8, 0.8, 1); }
    if (coreMat.current) coreMat.current.opacity = fade;

    for (let i = 0; i < FLYBY_TAIL; i++) {
      const o = tailObjs.current[i];
      const m = tailMats.current[i];
      if (!o || !m) continue;
      const f = (i + 1) / FLYBY_TAIL;
      const wob = Math.sin(now * 3.0 + s.seed + i * 0.55) * 0.5 * f;
      o.position.copy(tmp).addScaledVector(dir, -(i + 1) * 0.62).addScaledVector(perp, wob);
      o.position.y += Math.sin(now * 2.4 + s.seed * 2 + i * 0.4) * 0.22 * f;
      const sc = 1.7 * (1 - f * 0.82) + 0.18;
      o.scale.set(sc, sc, 1);
      m.opacity = 0.62 * Math.pow(1 - f, 1.6) * fade;
      m.color.copy(s.color);
    }
  });

  return (
    <group ref={group} visible={false}>
      <sprite ref={headObj} raycast={() => null}>
        <spriteMaterial ref={headMat} map={glowTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite ref={coreObj} raycast={() => null}>
        <spriteMaterial ref={coreMat} map={glowTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} color="#FFFFFF" toneMapped={false} />
      </sprite>
      {Array.from({ length: FLYBY_TAIL }).map((_, i) => (
        <sprite key={i} raycast={() => null} ref={(el) => { tailObjs.current[i] = el; }}>
          <spriteMaterial
            ref={(el) => { tailMats.current[i] = el; }}
            map={glowTex} transparent opacity={0} depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

function SimulationClock({ clock, timeScale }) {
  useFrame((_, dt) => { clock.current.t += dt * timeScale; });
  return null;
}

/** Płynne odsłanianie elementów po starcie (orbity, pył) */
function RevealDriver({ reveal, phase }) {
  useFrame((_, dt) => {
    const target = phase === "intro" ? 0 : 1;
    reveal.current.v += (target - reveal.current.v) * Math.min(1, dt * 1.2);
  });
  return null;
}

function EasyPilotControls({ enabled, controlsRef, onPilotMove }) {
  const { camera } = useThree();
  const keys = useRef(new Set());
  const notifiedRef = useRef(false);
  const forward = useMemo(() => new THREE.Vector3(), []);
  const right = useMemo(() => new THREE.Vector3(), []);
  const move = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      if (!el) return false;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
    };

    const keyFor = (code) => {
      if (code === "KeyW") return "w";
      if (code === "KeyS") return "s";
      if (code === "KeyA") return "a";
      if (code === "KeyD") return "d";
      return null;
    };

    const onKeyDown = (event) => {
      const key = keyFor(event.code);
      if (!enabled || !key || isTyping()) return;
      event.preventDefault();
      keys.current.add(key);
    };

    const onKeyUp = (event) => {
      const key = keyFor(event.code);
      if (!key) return;
      keys.current.delete(key);
      if (keys.current.size === 0) notifiedRef.current = false;
    };

    const clearKeys = () => {
      keys.current.clear();
      notifiedRef.current = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearKeys);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
    };
  }, [enabled]);

  useFrame((_, dt) => {
    if (!enabled || keys.current.size === 0) return;

    const ctrl = controlsRef.current;
    if (!ctrl) return;

    if (!notifiedRef.current) {
      onPilotMove();
      notifiedRef.current = true;
    }

    camera.getWorldDirection(forward).normalize();
    right.crossVectors(forward, up).normalize();
    move.set(0, 0, 0);

    if (keys.current.has("w")) move.add(forward);
    if (keys.current.has("s")) move.sub(forward);
    if (keys.current.has("d")) move.add(right);
    if (keys.current.has("a")) move.sub(right);

    if (move.lengthSq() === 0) return;

    move.normalize().multiplyScalar(EASY_PILOT_SPEED * Math.min(dt, 0.05));
    camera.position.add(move);
    ctrl.target.add(move);
    ctrl.update();
  });

  return null;
}

/**
 * REŻYSER KAMERY
 *  intro     — wisi tuż nad Ziemią, delikatny dryf (planeta wypełnia kadr)
 *  launch    — filmowy odlot ~6 s, easing, na końcu onLaunchDone()
 *  earth     — podąża za Ziemią
 *  moon      — przelot do Księżyca i podążanie za nim
 *  detect    — REAKTYWNY zoom na wykryty obiekt + puls FOV (~2.6 s)
 *  cinematic — fly-through przez scenę
 *  system    — powrót do szerokiego widoku Układu Słonecznego
 *  focus     — płynny lot do planety + OrbitControls wokół planety
 *  free      — OrbitControls
 */
function CameraDirector({
  mode,
  earthPos,
  moonPos,
  scanTargetPos,
  planetPositions,
  focusTargetId,
  controlsRef,
  onLaunchDone,
  onDetectDone,
}) {
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const focusTarget = useMemo(() => new THREE.Vector3(), []);
  const focusDesired = useMemo(() => new THREE.Vector3(), []);
  const focusOffset = useMemo(() => new THREE.Vector3(), []);
  const focusDelta = useMemo(() => new THREE.Vector3(), []);
  const focusLastTarget = useMemo(() => new THREE.Vector3(), []);
  const systemTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const launchT = useRef(0);
  const driftT = useRef(0);
  const detectT = useRef(0);
  const focusT = useRef(0);
  const systemT = useRef(0);
  const lastFocusId = useRef(null);

  useEffect(() => {
    if (mode === "launch") launchT.current = 0;
    if (mode === "detect") detectT.current = 0;
    if (mode === "system") systemT.current = 0;
    if (mode === "focus") {
      focusT.current = 0;
      lastFocusId.current = null;
    }
  }, [mode, focusTargetId]);

  useFrame((state, dt) => {
    const ctrl = controlsRef.current;
    const ep = earthPos.current;

    /* powolny powrót FOV do 60 poza trybem detect */
    if (mode !== "detect" && Math.abs(camera.fov - 60) > 0.05) {
      camera.fov += (60 - camera.fov) * Math.min(1, dt * 4);
      camera.updateProjectionMatrix();
    }

    if (mode === "intro") {
      driftT.current += dt;
      const a = driftT.current * 0.05;
      const d = 1.45;
      tmp.set(ep.x + Math.cos(a) * d, ep.y + 0.35, ep.z + Math.sin(a) * d);
      camera.position.lerp(tmp, 0.08);
      tgt.set(ep.x, ep.y + 0.15, ep.z);
      camera.lookAt(tgt);
      if (ctrl) { ctrl.target.copy(tgt); }
    } else if (mode === "launch") {
      launchT.current += dt / 6.0;
      const k = easeInOut(Math.min(1, launchT.current));
      const dist = 1.45 + k * 7.0;
      const height = 0.35 + k * 2.6;
      const a = driftT.current * 0.05 + k * 1.2;
      tmp.set(ep.x + Math.cos(a) * dist, ep.y + height, ep.z + Math.sin(a) * dist);
      camera.position.lerp(tmp, 0.12);
      tgt.copy(ep);
      camera.lookAt(tgt);
      if (ctrl) ctrl.target.copy(tgt);
      if (launchT.current >= 1) onLaunchDone();
    } else if (mode === "detect") {
      detectT.current += dt;
      const dT = detectT.current;
      const tp = scanTargetPos.current;
      tmp.set(tp.x + 2.4, tp.y + 1.2, tp.z + 2.4);
      camera.position.lerp(tmp, Math.min(1, dt * 3.2));
      /* drganie kamery na początku — jak alarm w centrum dowodzenia */
      const shake = Math.max(0, 1 - dT / 1.2) * 0.035;
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      tgt.copy(tp);
      camera.lookAt(tgt);
      if (ctrl) ctrl.target.copy(tgt);
      /* puls FOV: szybki zjazd 60→47, powrót 47→60 */
      const f = dT < 1.6
        ? 60 - 13 * easeInOut(Math.min(1, dT / 0.5))
        : 47 + 13 * easeInOut(Math.min(1, (dT - 1.6) / 0.8));
      camera.fov = f;
      camera.updateProjectionMatrix();
      if (dT >= 2.6) onDetectDone();
    } else if (mode === "earth") {
      tmp.copy(ep).add(new THREE.Vector3(3.2, 1.4, 3.2));
      camera.position.lerp(tmp, 0.06);
      if (ctrl) { ctrl.target.lerp(ep, 0.1); ctrl.update(); }
    } else if (mode === "moon") {
      const mp = moonPos.current;
      tmp.copy(mp).add(new THREE.Vector3(0.9, 0.35, 0.9));
      camera.position.lerp(tmp, 0.05);
      if (ctrl) { ctrl.target.lerp(mp, 0.08); ctrl.update(); }
    } else if (mode === "system") {
      if (systemT.current < 1) {
        systemT.current = Math.min(1, systemT.current + dt / 1.35);
        tmp.set(0, 14, 42);
        camera.position.lerp(tmp, Math.min(1, dt * 2.6));
        if (ctrl) {
          ctrl.target.lerp(systemTarget, Math.min(1, dt * 4.2));
          camera.lookAt(ctrl.target);
          ctrl.update();
        } else {
          camera.lookAt(systemTarget);
        }
      }
    } else if (mode === "focus" && focusTargetId) {
      const fp = planetPositions.current[focusTargetId] || (focusTargetId === "earth" ? ep : null);
      if (!fp) return;

      if (lastFocusId.current !== focusTargetId) {
        focusT.current = 0;
        lastFocusId.current = focusTargetId;
        focusLastTarget.copy(fp);
      }

      const distance = getPlanetFocusDistance(focusTargetId);
      focusOffset.set(distance * 0.74, distance * 0.32, distance * 0.74);
      focusTarget.copy(fp);

      if (ctrl) {
        ctrl.target.lerp(focusTarget, Math.min(1, dt * 6));
      }

      if (focusT.current < 1) {
        focusT.current = Math.min(1, focusT.current + dt / 1.45);
        focusDesired.copy(focusTarget).add(focusOffset);
        camera.position.lerp(focusDesired, Math.min(1, dt * 4.0));
        camera.lookAt(ctrl ? ctrl.target : focusTarget);
      } else {
        focusDelta.copy(focusTarget).sub(focusLastTarget);
        if (focusDelta.lengthSq() > 0) camera.position.add(focusDelta);
      }

      focusLastTarget.copy(focusTarget);
      if (ctrl) ctrl.update();
    } else if (mode === "cinematic") {
      driftT.current += dt;
      const ft = driftT.current;
      const R = 9 + 8 * Math.sin(ft * 0.11);
      tmp.set(Math.cos(ft * 0.14) * R, 2.2 + 2.6 * Math.sin(ft * 0.07), Math.sin(ft * 0.14) * R);
      camera.position.lerp(tmp, 0.025);
      const mix = 0.5 + 0.5 * Math.sin(ft * 0.05);
      tgt.lerpVectors(new THREE.Vector3(0, 0, 0), ep, mix);
      if (ctrl) { ctrl.target.lerp(tgt, 0.04); ctrl.update(); }
    }
  });
  return null;
}

function labelStyle(active) {
  return {
    color: active ? "#2FE6C8" : "#9FB6D4",
    fontFamily: "monospace",
    fontSize: 13,
    whiteSpace: "nowrap",
    textShadow: "0 0 6px #04060D, 0 0 10px #04060D",
    pointerEvents: "none",
    userSelect: "none",
  };
}

/* ============================================================
   SEKWENCJA SKALI: Ziemia → Polska → Warmia → Olsztyn → Dom
   (most do "Copernix World: Wirtualna Warmia i Mazury")
   ============================================================ */
const DESCENT_STAGES = [
  { key: "orbit", title: "ORBITA ZIEMI", alt: "≈ 400 km", sub: "Cel podróży: Polska 🇵🇱" },
  { key: "poland", title: "POLSKA", alt: "≈ 100 km", sub: "Kierunek: północny wschód!" },
  { key: "warmia", title: "WARMIA I MAZURY", alt: "≈ 30 km", sub: "Kraina Tysiąca Jezior 🌊" },
  { key: "olsztyn", title: "OLSZTYN", alt: "≈ 2 km", sub: "Stare Miasto · Katedra św. Jakuba ⛪ · Zamek 🏰" },
  { key: "dom", title: "DOM DOMINIKA", alt: "≈ 200 m", sub: "Baza Strażnika gotowa do misji!" },
];
const DESCENT_CRUMBS = ["KOSMOS", "POLSKA", "WARMIA", "OLSZTYN", "DOM"];

const SVG_STARS = [
  [12, 10], [34, 22], [58, 8], [83, 18], [110, 6], [132, 16], [156, 9], [178, 20],
  [22, 34], [70, 30], [122, 28], [165, 34], [44, 14], [96, 26], [188, 12],
];

function StageStars({ count = SVG_STARS.length }) {
  return (
    <g>
      {SVG_STARS.slice(0, count).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.1 : 0.7} fill="#CFE2FF" opacity={0.35 + (i % 4) * 0.16} />
      ))}
    </g>
  );
}

function MapPin({ x, y, scale = 1, label }) {
  return (
    <g className="cx-pin">
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <path
          d="M0,-16 C-7,-16 -12,-11 -12,-4 C-12,4 0,14 0,14 C0,14 12,4 12,-4 C12,-11 7,-16 0,-16 Z"
          fill="#FF6B5E" stroke="#FFE9E5" strokeWidth="1.2"
        />
        <circle cx="0" cy="-5" r="3.4" fill="#FFFFFF" />
      </g>
      {label && (
        <text x={x} y={y + 24} textAnchor="middle" fontSize="7.5" fontFamily="monospace" fontWeight="bold" fill="#E6EEF8">
          {label}
        </text>
      )}
    </g>
  );
}

function StageArt({ stage }) {
  const svgStyle = { width: "100%", height: "auto", display: "block" };

  if (stage === 0) {
    /* ORBITA — łuk Ziemi, atmosfera, pin nad Europą */
    return (
      <svg viewBox="0 0 200 130" style={svgStyle}>
        <rect width="200" height="130" fill="#04060F" />
        <StageStars />
        <defs>
          <clipPath id="cx-earthclip"><circle cx="100" cy="320" r="246" /></clipPath>
        </defs>
        <circle cx="100" cy="320" r="254" fill="none" stroke="rgba(95,198,255,0.18)" strokeWidth="7" />
        <circle cx="100" cy="320" r="249" fill="none" stroke="rgba(95,198,255,0.55)" strokeWidth="2.5" />
        <circle cx="100" cy="320" r="246" fill="#0E3F73" />
        <g clipPath="url(#cx-earthclip)">
          <ellipse cx="64" cy="103" rx="24" ry="10" fill="#3FA66A" />
          <ellipse cx="118" cy="90" rx="19" ry="8" fill="#3FA66A" />
          <ellipse cx="158" cy="112" rx="26" ry="11" fill="#3FA66A" />
          <ellipse cx="30" cy="122" rx="20" ry="9" fill="#3FA66A" />
          <ellipse cx="92" cy="118" rx="14" ry="6" fill="#3FA66A" opacity="0.8" />
          <circle cx="74" cy="96" r="0.9" fill="#FFD37A" />
          <circle cx="112" cy="86" r="0.9" fill="#FFD37A" />
          <circle cx="124" cy="92" r="0.8" fill="#FFD37A" />
          <circle cx="150" cy="106" r="0.9" fill="#FFD37A" />
        </g>
        {/* satelita Copernix-1 */}
        <g transform="translate(34 30)">
          <rect x="-4" y="-2.5" width="8" height="5" rx="1" fill="#D9DEE8" />
          <rect x="-14" y="-1.2" width="8" height="2.4" fill="#1B4FA0" />
          <rect x="6" y="-1.2" width="8" height="2.4" fill="#1B4FA0" />
        </g>
        <MapPin x={120} y={78} scale={0.7} />
      </svg>
    );
  }

  if (stage === 1) {
    /* POLSKA — kontur + podświetlona Warmia + pin Olsztyn */
    return (
      <svg viewBox="0 0 200 130" style={svgStyle}>
        <rect width="200" height="130" fill="#0A1B33" />
        <text x="100" y="11" textAnchor="middle" fontSize="6.5" fontFamily="monospace" fill="#5FC6FF" opacity="0.8">~ Morze Bałtyckie ~</text>
        <polygon
          points="45.6,31.6 59.2,21.3 79.6,17.8 93.2,21.3 100,14.4 110.2,19 130.6,17.8 151,21.3 161.2,28.2 164.6,42 157.8,55.8 161.2,69.6 151,83.4 135.7,93.7 115.3,100.6 93.2,104.1 72.8,99.5 55.8,91.4 43.9,77.6 37.1,61.5 38.8,45.4"
          fill="#143055" stroke="#5FC6FF" strokeWidth="1.6" strokeLinejoin="round"
        />
        <polygon
          points="105,22 150,20 160,30 152,42 120,41 103,32"
          fill="rgba(47,230,200,0.22)" stroke="rgba(47,230,200,0.7)" strokeWidth="1" strokeLinejoin="round"
        />
        <text x="132" y="52" textAnchor="middle" fontSize="6" fontFamily="monospace" fill="#9FF7E8" opacity="0.9">WARMIA I MAZURY</text>
        <rect x="46" y="108" width="9" height="3.4" fill="#FFFFFF" />
        <rect x="46" y="111.4" width="9" height="3.4" fill="#DC3545" />
        <text x="60" y="114.5" fontSize="7" fontFamily="monospace" fontWeight="bold" fill="#E6EEF8">POLSKA</text>
        <MapPin x={120} y={30} scale={0.62} label="OLSZTYN" />
      </svg>
    );
  }

  if (stage === 2) {
    /* WARMIA I MAZURY — zielona kraina pełna jezior */
    return (
      <svg viewBox="0 0 200 130" style={svgStyle}>
        <rect width="200" height="130" fill="#0B1D12" />
        <path
          d="M30,60 C40,28 80,16 115,22 C150,26 175,38 172,62 C168,88 135,104 95,102 C60,100 22,92 30,60 Z"
          fill="#1C4A2E" stroke="#5EE6A0" strokeWidth="1.4"
        />
        <g fill="#1FB8E0" opacity="0.85">
          <ellipse cx="60" cy="55" rx="7" ry="4" />
          <ellipse cx="78" cy="64" rx="5" ry="3" />
          <ellipse cx="95" cy="48" rx="9" ry="5" />
          <ellipse cx="115" cy="62" rx="6" ry="3.5" />
          <ellipse cx="130" cy="50" rx="5" ry="3" />
          <ellipse cx="145" cy="60" rx="7" ry="4" />
          <ellipse cx="88" cy="78" rx="6" ry="3" />
          <ellipse cx="110" cy="82" rx="8" ry="4" />
          <ellipse cx="70" cy="40" rx="4" ry="2.5" />
          <ellipse cx="140" cy="78" rx="5" ry="2.5" />
          <ellipse cx="52" cy="72" rx="5" ry="3" />
          <ellipse cx="125" cy="36" rx="4" ry="2.5" />
        </g>
        <g fill="#2F8F5B" opacity="0.9">
          <circle cx="45" cy="48" r="3" />
          <circle cx="100" cy="92" r="3" />
          <circle cx="158" cy="48" r="3" />
          <circle cx="135" cy="90" r="2.5" />
        </g>
        <text x="100" y="120" textAnchor="middle" fontSize="6.5" fontFamily="monospace" fill="#9FF7E8">ponad 3000 jezior! 🐟</text>
        <MapPin x={78} y={56} scale={0.62} label="OLSZTYN" />
      </svg>
    );
  }

  if (stage === 3) {
    /* OLSZTYN — Łyna, Katedra św. Jakuba, Zamek, Stare Miasto */
    return (
      <svg viewBox="0 0 200 130" style={svgStyle}>
        <defs>
          <linearGradient id="cx-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0F2A57" />
            <stop offset="1" stopColor="#2E6FBF" />
          </linearGradient>
        </defs>
        <rect width="200" height="130" fill="url(#cx-sky)" />
        <StageStars count={8} />
        <circle cx="172" cy="20" r="8" fill="#F2EBD8" opacity="0.9" />
        {/* ziemia i rzeka Łyna */}
        <rect x="0" y="106" width="200" height="24" fill="#14301F" />
        <path d="M0,118 C40,110 70,122 110,114 C150,106 175,116 200,110 L200,130 L0,130 Z" fill="#1FB8E0" opacity="0.6" />
        {/* kamieniczki Starego Miasta */}
        <g>
          <rect x="28" y="78" width="18" height="28" fill="#C9747C" />
          <polygon points="28,78 37,66 46,78" fill="#8A4451" />
          <rect x="33" y="88" width="6" height="8" fill="#FFD37A" className="cx-glowwin" />
          <rect x="50" y="84" width="16" height="22" fill="#D9A05B" />
          <polygon points="50,84 58,74 66,84" fill="#9A6A33" />
          <rect x="55" y="92" width="5" height="7" fill="#FFD37A" className="cx-glowwin" />
          <rect x="70" y="80" width="17" height="26" fill="#7FA3C7" />
          <polygon points="70,80 78.5,70 87,80" fill="#4E6E91" />
          <rect x="75" y="89" width="6" height="8" fill="#FFD37A" className="cx-glowwin" />
        </g>
        {/* Katedra św. Jakuba */}
        <g>
          <rect x="98" y="40" width="16" height="66" fill="#8A4F2E" />
          <polygon points="96,40 106,18 116,40" fill="#5E3520" />
          <line x1="106" y1="18" x2="106" y2="9" stroke="#FFD37A" strokeWidth="1.5" />
          <line x1="102" y1="13" x2="110" y2="13" stroke="#FFD37A" strokeWidth="1.5" />
          <rect x="103" y="52" width="6" height="10" rx="3" fill="#FFD37A" opacity="0.9" />
          <rect x="103" y="70" width="6" height="10" rx="3" fill="#FFD37A" opacity="0.9" />
          <rect x="114" y="72" width="20" height="34" fill="#9A5C36" />
          <rect x="119" y="80" width="4" height="6" fill="#FFD37A" className="cx-glowwin" />
          <rect x="126" y="80" width="4" height="6" fill="#FFD37A" className="cx-glowwin" />
        </g>
        {/* Zamek Kapituły Warmińskiej */}
        <g>
          <rect x="150" y="62" width="20" height="44" fill="#8C5A33" />
          <rect x="150" y="56" width="5" height="8" fill="#8C5A33" />
          <rect x="157" y="56" width="5" height="8" fill="#8C5A33" />
          <rect x="164" y="56" width="5" height="8" fill="#8C5A33" />
          <rect x="156" y="90" width="8" height="16" rx="4" fill="#3A2415" />
          <rect x="154" y="70" width="4" height="6" fill="#FFD37A" className="cx-glowwin" />
          <rect x="162" y="70" width="4" height="6" fill="#FFD37A" className="cx-glowwin" />
        </g>
        {/* drzewa */}
        <rect x="14" y="96" width="3" height="10" fill="#5E3A22" />
        <circle cx="15.5" cy="93" r="7" fill="#2F8F5B" />
        <rect x="184" y="94" width="3" height="12" fill="#5E3A22" />
        <circle cx="185.5" cy="90" r="8" fill="#2F8F5B" />
      </svg>
    );
  }

  /* DOM DOMINIKA — wieczór, świecące okna, wielki pin */
  return (
    <svg viewBox="0 0 200 130" style={svgStyle}>
      <rect width="200" height="130" fill="#0E1E3A" />
      <StageStars count={10} />
      <circle cx="30" cy="22" r="7" fill="#F2EBD8" opacity="0.9" />
      <ellipse cx="100" cy="150" rx="140" ry="58" fill="#14301F" />
      {/* dom */}
      <g>
        <polygon points="66,72 100,48 134,72" fill="#A34A3F" />
        <rect x="118" y="54" width="8" height="14" fill="#7A4A2B" />
        <rect x="72" y="72" width="56" height="34" fill="#E8D9B0" />
        <rect x="94" y="86" width="12" height="20" fill="#6B4226" />
        <circle cx="103" cy="96" r="1.2" fill="#FFD37A" />
        <rect x="78" y="80" width="12" height="10" fill="#FFD37A" className="cx-glowwin" />
        <rect x="110" y="80" width="12" height="10" fill="#FFD37A" className="cx-glowwin" />
        <line x1="84" y1="80" x2="84" y2="90" stroke="#6B4226" strokeWidth="1" />
        <line x1="78" y1="85" x2="90" y2="85" stroke="#6B4226" strokeWidth="1" />
        <line x1="116" y1="80" x2="116" y2="90" stroke="#6B4226" strokeWidth="1" />
        <line x1="110" y1="85" x2="122" y2="85" stroke="#6B4226" strokeWidth="1" />
      </g>
      {/* drzewa */}
      <rect x="40" y="86" width="5" height="20" fill="#5E3A22" />
      <circle cx="42.5" cy="80" r="12" fill="#2F8F5B" />
      <rect x="152" y="84" width="5" height="22" fill="#5E3A22" />
      <circle cx="154.5" cy="76" r="14" fill="#2F8F5B" />
      <MapPin x={100} y={34} scale={1} />
    </svg>
  );
}

function DescentSequence({ open, pilot, onFinish, onClose }) {
  const [stage, setStage] = useState(0);
  const [finished, setFinished] = useState(false);
  const mountedRef = useRef(false);
  const stageTimerRef = useRef(null);

  const clearStageTimer = useCallback(() => {
    if (stageTimerRef.current !== null) {
      window.clearTimeout(stageTimerRef.current);
      stageTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearStageTimer();
    };
  }, [clearStageTimer]);

  useEffect(() => {
    if (open) { setStage(0); setFinished(false); }
  }, [open]);

  useEffect(() => {
    clearStageTimer();
    if (!open || stage >= 4) return undefined;

    stageTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setStage((s) => Math.min(4, s + 1));
      stageTimerRef.current = null;
    }, 3000);

    return clearStageTimer;
  }, [clearStageTimer, open, stage]);

  const closeDescent = useCallback(() => {
    clearStageTimer();
    onClose();
  }, [clearStageTimer, onClose]);

  const finishDescent = useCallback(() => {
    clearStageTimer();
    setFinished(true);
    onFinish();
  }, [clearStageTimer, onFinish]);

  if (!open) return null;
  const st = DESCENT_STAGES[stage];

  return (
    <div translate="no" style={S.descentOverlay} onClick={() => { if (stage < 4) setStage((s) => s + 1); }}>
      <button style={S.descentClose} onClick={(e) => { e.stopPropagation(); closeDescent(); }} title="Przerwij lądowanie">✕</button>

      <div style={S.descentTop}>
        <div style={S.descentTitle}>{st.title}</div>
        <div style={S.descentAlt}>🛰 wysokość: {st.alt}</div>
      </div>

      <div style={S.descentStageBox}>
        <StageArt stage={stage} />
      </div>

      <div style={S.descentSub}>{st.sub}</div>

      {stage === 4 && !finished && (
        <button
          style={{ ...S.startBtn, marginTop: 14 }}
          onClick={(e) => { e.stopPropagation(); finishDescent(); }}
        >
          🏁 START MISJI NAZIEMNEJ
        </button>
      )}
      {stage === 4 && finished && (
        <div style={S.descentDone}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            🎉 {pilot} melduje się w bazie! Odznaka: 🏠 Strażnik Olsztyna
          </div>
          <button
            style={{ ...S.startBtn, marginTop: 12 }}
            onClick={(e) => { e.stopPropagation(); closeDescent(); }}
          >
            🚀 POWRÓT NA ORBITĘ
          </button>
        </div>
      )}

      <div style={S.descentCrumbs}>
        {DESCENT_CRUMBS.map((c, i) => (
          <span key={c} style={{ ...S.crumb, ...(i === stage ? S.crumbActive : i < stage ? S.crumbDone : {}) }}>
            {c}{i < DESCENT_CRUMBS.length - 1 ? " ›" : ""}
          </span>
        ))}
      </div>

      {stage < 4 && <div style={S.descentHint}>kliknij, aby lecieć szybciej ⏩</div>}
    </div>
  );
}

/* ============================================================
   GŁÓWNY KOMPONENT
   ============================================================ */
export default function CopernixSpaceLab3D({ hideSceneLabels = false }) {
  const [phase, setPhase] = useState("intro"); // intro | launch | play
  const [asteroids, setAsteroids] = useState(MOCK_ASTEROIDS);
  const [dataSource, setDataSource] = useState("loading");
  const [selectedId, setSelectedId] = useState(null);
  const [timeScale, setTimeScale] = useState(1);
  const [cameraMode, setCameraMode] = useState("intro");
  const [missionIndex, setMissionIndex] = useState(() => {
    const saved = safeStorage.load();
    return Math.min(saved?.missionIndex ?? 0, MISSIONS.length - 1);
  });
  const [completed, setCompleted] = useState(() => safeStorage.load()?.completed || []);
  const [scanTargetId, setScanTargetId] = useState(null);
  const [scanCount, setScanCount] = useState(() => safeStorage.load()?.scanCount || 0);
  const [pilot, setPilot] = useState(() => safeStorage.load()?.pilot || "Dominik");
  const [toast, setToast] = useState(null);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [descentOpen, setDescentOpen] = useState(false);
  const [detectFlash, setDetectFlash] = useState(false);
  const [focusedPlanetId, setFocusedPlanetId] = useState(null);
  const [voiceMuted, setVoiceMuted] = useState(() => !!safeStorage.load()?.voiceMuted);
  const [planetQuestDone, setPlanetQuestDone] = useState(() => !!safeStorage.load()?.planetQuestDone);
  const [easyPilotEnabled, setEasyPilotEnabled] = useState(() => safeStorage.load()?.easyPilotEnabled ?? true);

  const clock = useRef({ t: 0 });
  const earthPos = useRef(new THREE.Vector3(EARTH_ORBIT_R, 0, 0));
  const moonPos = useRef(new THREE.Vector3(EARTH_ORBIT_R + MOON_ORBIT_R, 0, 0));
  const scanTargetPos = useRef(new THREE.Vector3(EARTH_ORBIT_R, 0, 0));
  const planetPositions = useRef({
    ...Object.fromEntries(SOLAR_PLANETS.map((planet) => [planet.id, new THREE.Vector3()])),
    earth: earthPos.current,
  });
  const reveal = useRef({ v: 0 });
  const controlsRef = useRef();
  const prevCamMode = useRef("free");
  const cameraModeRef = useRef("intro");

  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);

  const guardianActive = phase === "play" && missionIndex >= 4;
  const currentMission = MISSIONS[missionIndex];

  /* globalny fullscreen + animacje CSS */
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background:#03050C; }
      @keyframes cx-detect { from { opacity:.3; } to { opacity:1; } }
      @keyframes cx-blink { 0%,100% { opacity:1; } 50% { opacity:.35; } }
      @keyframes cx-stage { from { opacity:0; transform:scale(1.55); } 55% { opacity:1; } to { opacity:1; transform:scale(1); } }
      @keyframes cx-fadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
      @keyframes cx-pin { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
      @keyframes cx-winpulse { from { opacity:.45; } to { opacity:1; } }
      .cx-pin { animation: cx-pin 1.5s ease-in-out infinite; }
      .cx-glowwin { animation: cx-winpulse 1.6s ease-in-out infinite alternate; }
      @media (max-width: 640px) {
        .cx-objective-bar {
          top: 8px !important;
          left: 8px !important;
          transform: none !important;
          box-sizing: border-box !important;
          max-width: calc(100vw - 212px) !important;
          min-width: 0 !important;
          padding: 6px 8px !important;
          gap: 5px !important;
          border-radius: 14px !important;
          overflow: hidden !important;
        }
        .cx-objective-dots {
          gap: 3px !important;
        }
        .cx-objective-dot {
          width: 6px !important;
          height: 6px !important;
        }
        .cx-objective-text {
          font-size: 11px !important;
          line-height: 1.15 !important;
        }
        .cx-objective-subtext {
          font-size: 9px !important;
          line-height: 1.1 !important;
        }
        .cx-badge-toggle {
          display: none !important;
        }
        .cx-dock {
          bottom: 18px !important;
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          width: calc(100vw - 20px) !important;
          max-width: 370px !important;
          gap: 5px !important;
          padding: 6px !important;
          border-radius: 16px !important;
          box-sizing: border-box !important;
        }
        .cx-dock-divider,
        .cx-mobile-hide {
          display: none !important;
        }
        .cx-dock-btn,
        .cx-dock-text-btn {
          min-height: 44px !important;
          min-width: 0 !important;
          width: 100% !important;
          padding: 7px 6px !important;
          font-size: 11px !important;
          line-height: 1.05 !important;
          white-space: normal !important;
          text-align: center !important;
        }
        .cx-controls-hint {
          bottom: 170px !important;
          max-width: calc(100vw - 20px) !important;
          font-size: 10px !important;
          padding: 5px 8px !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode) style.parentNode.removeChild(style);
    };
  }, []);

  /* NASA z fallbackiem */
  useEffect(() => {
    let alive = true;
    fetchNASAData()
      .then((list) => { if (alive) { setAsteroids(list); setDataSource("nasa"); } })
      .catch(() => { if (alive) { setAsteroids(MOCK_ASTEROIDS); setDataSource("mock"); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    safeStorage.save({ completed, pilot, scanCount, missionIndex, voiceMuted, planetQuestDone, easyPilotEnabled });
  }, [completed, pilot, scanCount, missionIndex, voiceMuted, planetQuestDone, easyPilotEnabled]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const speakPlanet = useCallback((id) => {
    if (voiceMuted || !PLANET_FOCUS_IDS.has(id)) return;

    const fact = PLANET_AUDIO_FACTS[id];
    if (!fact) return;

    speakPolish(fact);
  }, [voiceMuted]);

  const focusPlanet = useCallback((id) => {
    if (!PLANET_FOCUS_IDS.has(id)) return;
    setFocusedPlanetId(id);
    setCameraMode("focus");
  }, []);

  const returnToSolarSystem = useCallback(() => {
    setFocusedPlanetId(null);
    setSelectedId(null);
    setDetectFlash(false);
    setCameraMode("system");
  }, []);

  const handlePilotMove = useCallback(() => {
    setFocusedPlanetId(null);
    setCameraMode((mode) => (mode === "intro" || mode === "launch" ? mode : "free"));
  }, []);

  const toggleEasyPilot = useCallback(() => {
    setEasyPilotEnabled((enabled) => {
      const next = !enabled;
      showToast(next ? "🎮 Easy Pilot włączony." : "🎮 Easy Pilot wyłączony.");
      return next;
    });
  }, [showToast]);

  const toggleVoiceMuted = useCallback(() => {
    setVoiceMuted((muted) => {
      const next = !muted;
      if (next && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return next;
    });
  }, []);

  const testAudio = useCallback(() => {
    speakPolish("Luna gotowa. Kliknij planetę, żeby usłyszeć ciekawostkę.");
  }, []);

  /* start misji = odlot */
  const startMission = () => {
    setFocusedPlanetId(null);
    setPhase("launch");
    setCameraMode("launch");
  };
  const onLaunchDone = useCallback(() => {
    setFocusedPlanetId(null);
    setPhase("play");
    setCameraMode("system");
    showToast(`🚀 Witaj na orbicie, ${pilot}! Centrum dowodzenia aktywne.`);
  }, [pilot, showToast]);

  /* KAMERA REAKTYWNA — koniec sekwencji namierzania */
  const onDetectDone = useCallback(() => {
    setDetectFlash(false);
    setCameraMode((m) => (m === "detect" ? (prevCamMode.current || "free") : m));
  }, []);

  /* wybór celu skanowania + filmowe namierzanie */
  const pickScanTarget = useCallback((exclude) => {
    const pool = asteroids.filter((a) => a.id !== exclude);
    const next = pool[Math.floor(Math.random() * pool.length)];
    setScanTargetId(next?.id || null);
    if (next) {
      showToast(`📡 Centrum wykryło obiekt: ${next.name}!`);
      const cur = cameraModeRef.current;
      prevCamMode.current = cur === "detect" ? "free" : cur;
      setCameraMode("detect");
      setDetectFlash(true);
    }
  }, [asteroids, showToast]);

  /* misja 2 i tryb Strażnika potrzebują celu */
  useEffect(() => {
    if (phase === "play" && (missionIndex === 1 || missionIndex >= 4) && !scanTargetId && !descentOpen) {
      pickScanTarget(null);
    }
  }, [phase, missionIndex, scanTargetId, descentOpen, pickScanTarget]);

  /* misja 4 (Olsztyn): kamera podlatuje do Ziemi jako podpowiedź */
  useEffect(() => {
    if (phase === "play" && missionIndex === 3) setCameraMode("earth");
  }, [phase, missionIndex]);

  const completeCurrentMission = useCallback(() => {
    const m = MISSIONS[missionIndex];
    setCompleted((c) => (c.includes(m.id) ? c : [...c, m.id]));
    showToast(`🎉 Misja wykonana! Odznaka: ${m.badge.icon} ${m.badge.name}!`);
    if (missionIndex < MISSIONS.length - 1) {
      window.setTimeout(() => setMissionIndex((i) => Math.min(i + 1, MISSIONS.length - 1)), 2200);
    }
  }, [missionIndex, showToast]);

  /* SEKWENCJA SKALI: Ziemia → Olsztyn */
  const openDescent = useCallback(() => {
    setDescentOpen(true);
    setSelectedId(null);
    setFocusedPlanetId(null);
    setDetectFlash(false);
    setCameraMode("earth");
  }, []);

  const handleDescentFinish = useCallback(() => {
    if (missionIndex === 3 && !completed.includes("descend_olsztyn")) {
      completeCurrentMission();
    } else {
      showToast(`🏠 ${pilot} melduje się w bazie w Olsztynie!`);
    }
  }, [missionIndex, completed, completeCurrentMission, showToast, pilot]);

  const handleDescentClose = useCallback(() => {
    setDescentOpen(false);
    setFocusedPlanetId(null);
    setCameraMode("earth");
    showToast("🚀 Z powrotem na orbicie. Kosmos czeka!");
  }, [showToast]);

  const handleSelect = useCallback((id) => {
    if (phase !== "play") return;
    setSelectedId(id);

    /* misja 4: kliknięcie Ziemi najpierw skupia kamerę; lądowanie startuje z CTA */
    if (PLANET_FOCUS_IDS.has(id)) {
      focusPlanet(id);
      speakPlanet(id);
      if (id === PLANET_QUEST_TARGET && !planetQuestDone) {
        setPlanetQuestDone(true);
        showToast("✔ Misja wykonana: Mars odnaleziony!");
      }
    }

    /* logika misji sekwencyjnych */
    if (missionIndex === 0 && id === "satellite") {
      completeCurrentMission();
      return;
    }
    if ((missionIndex === 1 || missionIndex >= 4) && scanTargetId) {
      if (id === scanTargetId) {
        setScanCount((n) => n + 1);
        const a = asteroids.find((x) => x.id === id);
        showToast(`✅ Zeskanowano ${a?.name}! Skan #${scanCount + 1} 🛰️`);
        setScanTargetId(null);
        if (missionIndex === 1) {
          completeCurrentMission();
        } else {
          window.setTimeout(() => pickScanTarget(id), 2400);
          if (!completed.includes("guardian")) completeCurrentMission();
        }
        return;
      }
      if (!PLANET_FOCUS_IDS.has(id) && id !== "sun" && id !== "moon" && id !== "satellite") {
        showToast("🔍 To nie ten obiekt — szukaj pomarańczowego markera 📡!", false);
        return;
      }
    }
    if (missionIndex === 2 && id === "moon") {
      setCameraMode("moon");
      showToast("🌙 Lecimy do Księżyca! Trzymaj się! 🚀");
      window.setTimeout(() => completeCurrentMission(), 3000);
      return;
    }
  }, [phase, missionIndex, scanTargetId, scanCount, asteroids, completed, planetQuestDone, completeCurrentMission, pickScanTarget, showToast, openDescent, focusPlanet, speakPlanet]);

  const selectedInfo = useMemo(() => {
    if (!selectedId) return null;
    if (BODY_INFO[selectedId]) return BODY_INFO[selectedId];
    const a = asteroids.find((x) => x.id === selectedId);
    if (!a) return null;
    return {
      name: a.name,
      type: a.hazardous ? "☄️ Asteroida — NASA ma ją na oku" : "☄️ Asteroida — spokojna trasa",
      distance: `${fmt.format(a.missKm)} km (${toLunar(a.missKm)} Księżyców 🌕)`,
      speed: `${fmt.format(a.speedKmh)} km/h (${Math.round(a.speedKmh / 900)}× samolot ✈️)`,
      fact: `Około ${fmt.format(a.diameterM)} m średnicy — starsza niż dinozaury!`,
    };
  }, [selectedId, asteroids]);

  const allDone = completed.length >= MISSIONS.length;
  const majorOverlayOpen = hideSceneLabels || !!selectedInfo || descentOpen || badgesOpen || detectFlash;
  const showSceneLabels = phase === "play" && !majorOverlayOpen;

  return (
    <div style={S.app} translate="no" onContextMenu={(e) => e.preventDefault()}>
      <Canvas
        style={{ position: "absolute", inset: 0 }}
        camera={{ position: [EARTH_ORBIT_R + 1.45, 0.35, 0], fov: 60, near: 0.05, far: 600 }}
        onPointerMissed={() => setSelectedId(null)}
        gl={{ antialias: true }}
        dpr={[1, 1.75]}
      >
        <color attach="background" args={["#03050C"]} />
        <ambientLight intensity={0.16} />
        <Stars radius={180} depth={60} count={6000} factor={4} saturation={0} fade speed={0.5} />
        <MilkyWay />
        <Nebulae />
        <SpaceDust reveal={reveal} />
        <SimulationClock clock={clock} timeScale={phase === "intro" ? 0.4 : timeScale} />
        <RevealDriver reveal={reveal} phase={phase} />
        <CameraDirector
          mode={cameraMode} earthPos={earthPos} moonPos={moonPos} scanTargetPos={scanTargetPos}
          planetPositions={planetPositions} focusTargetId={focusedPlanetId}
          controlsRef={controlsRef} onLaunchDone={onLaunchDone} onDetectDone={onDetectDone}
        />
        <EasyPilotControls
          enabled={phase === "play" && easyPilotEnabled}
          controlsRef={controlsRef}
          onPilotMove={handlePilotMove}
        />

        <Sun onSelect={handleSelect} selected={selectedId} showLabels={showSceneLabels} />
        <SolarPlanets
          clock={clock}
          onSelect={handleSelect}
          selected={selectedId}
          phase={phase}
          reveal={reveal}
          planetPositions={planetPositions}
          showLabels={showSceneLabels}
        />
        <EarthSystem
          clock={clock} earthPos={earthPos} moonPos={moonPos}
          onSelect={handleSelect} selected={selectedId}
          guardianActive={guardianActive} reveal={reveal} phase={phase}
          showLabels={showSceneLabels}
        />
        {asteroids.map((a) => {
          // reduce clutter: if asteroid has very small miss distance (close pass), render minimal placeholder
          const nearEarth = a.missKm < 1200000; // 1.2M km threshold
          const minimal = nearEarth && a.id !== scanTargetId && a.id !== selectedId;
          return (
            <Asteroid
              key={a.id} data={a} clock={clock} onSelect={handleSelect}
              selected={selectedId} isScanTarget={a.id === scanTargetId}
              reveal={reveal} phase={phase}
              earthPos={earthPos} scanTargetPos={scanTargetPos}
              minimal={minimal}
              showLabels={showSceneLabels}
            />
          );
        })}

        {/* losowe komety — czysta magia tła */}
        <FlybyComets />

        <OrbitControls
          ref={controlsRef}
          enabled={phase === "play" && (cameraMode === "free" || cameraMode === "focus" || cameraMode === "system")}
          enablePan={false}
          enableRotate
          enableZoom
          mouseButtons={EASY_MOUSE_BUTTONS}
          minDistance={1.6}
          maxDistance={70}
          dampingFactor={0.08}
          enableDamping
        />

        <EffectComposer>
          <Bloom intensity={1.15} luminanceThreshold={0.22} luminanceSmoothing={0.6} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.8} />
        </EffectComposer>
      </Canvas>

      {/* ================= INTRO ================= */}
      {phase === "intro" && (
        <div style={S.introOverlay}>
          <div style={S.introBrand}>COPERNIX SPACE LAB</div>
          <div style={S.introTitle}>STRAŻNIK ZIEMI</div>
          <div style={S.introSub}>Centrum dowodzenia kosmicznego · pilot {pilot}</div>
          <button style={S.startBtn} onClick={startMission}>🚀 ROZPOCZNIJ MISJĘ</button>
          <div style={S.introData}>
            {dataSource === "loading" && "📡 łączenie z NASA…"}
            {dataSource === "nasa" && "📡 dane na żywo: NASA NeoWs"}
            {dataSource === "mock" && "🗂️ dane treningowe"}
          </div>
        </div>
      )}

      {/* ================= HUD (tylko play) ================= */}
      {phase === "play" && (
        <>
          {/* CEL MISJI — jedna linia u góry */}
          <div className="cx-objective-bar" style={S.objectiveBar}>
            <span className="cx-objective-dots" style={S.objectiveDots}>
              {MISSIONS.map((m, i) => (
                <span key={m.id} className="cx-objective-dot" style={{ ...S.dot, ...(completed.includes(m.id) ? S.dotDone : i === missionIndex ? S.dotActive : {}) }} />
              ))}
            </span>
            <span style={S.objectiveTextGroup}>
              <span className="cx-objective-text" style={S.objectiveText}>
                {planetQuestDone ? "✔ Misja wykonana: Mars odnaleziony!" : "🎯 Znajdź Marsa"}
              </span>
              <span className="cx-objective-subtext" style={S.objectiveSubText}>
                {allDone && missionIndex >= 4
                  ? `🛡 Strażnik ${pilot} na służbie · skany: ${scanCount}`
                  : currentMission.objective}
              </span>
            </span>
            <button className="cx-badge-toggle" style={S.badgeToggle} onClick={() => setBadgesOpen((o) => !o)} title="Odznaki">
              🏅
            </button>
          </div>

          {/* ODZNAKI — wysuwane, domyślnie schowane */}
          {badgesOpen && (
            <div style={S.badgePanel}>
              {MISSIONS.map((m) => {
                const done = completed.includes(m.id);
                return (
                  <div key={m.id} style={{ ...S.badgeRow, opacity: done ? 1 : 0.45 }}>
                    <span style={{ fontSize: 18 }}>{done ? m.badge.icon : "🔒"}</span>
                    <span>{done ? m.badge.name : "???"}</span>
                  </div>
                );
              })}
              <input style={S.pilotInput} value={pilot} maxLength={14} onChange={(e) => setPilot(e.target.value)} aria-label="Imię pilota" />
            </div>
          )}

          <div className="cx-controls-hint" style={S.controlsHint}>
            Sterowanie: WASD ruch · mysz obrót · kółko zoom · klik planeta
          </div>

          {/* DOCK — czas + kamera w jednym slim pasku */}
          <div className="cx-dock" style={S.dock}>
            <button
              onClick={returnToSolarSystem}
              title="Powrót do szerokiego widoku Układu Słonecznego"
              className="cx-dock-text-btn"
              style={{ ...S.dockTextBtn, ...(cameraMode === "system" ? S.dockBtnActive : {}) }}
            >
              🏠 Układ Słoneczny
            </button>
            <button
              onClick={toggleEasyPilot}
              title="WASD rusza kamerą, mysz obraca, kółko przybliża"
              className="cx-dock-text-btn"
              style={{ ...S.dockTextBtn, ...(easyPilotEnabled ? S.dockBtnActive : {}) }}
            >
              🎮 Easy Pilot
            </button>
            <span className="cx-dock-divider" style={S.dockDivider} />
            <button
              onClick={toggleVoiceMuted}
              title={voiceMuted ? "Włącz głos planet" : "Wycisz głos planet"}
              aria-label={voiceMuted ? "Włącz głos planet" : "Wycisz głos planet"}
              className="cx-dock-btn cx-mobile-hide"
              style={{ ...S.dockBtn, ...(!voiceMuted ? S.dockBtnActive : {}) }}
            >
              {voiceMuted ? "🔇" : "🔊"}
            </button>
            <button
              onClick={testAudio}
              title="Sprawdź głos Luny"
              className="cx-dock-text-btn"
              style={S.dockTextBtn}
            >
              🔊 Test audio
            </button>
            <span className="cx-dock-divider" style={S.dockDivider} />
            {[[0, "⏸"], [1, "1×"], [10, "10×"], [100, "100×"]].map(([v, label]) => (
              <button key={v} onClick={() => setTimeScale(v)} title={`Czas ${label}`}
                className={`cx-dock-btn ${v === 0 ? "cx-mobile-hide" : ""}`}
                style={{ ...S.dockBtn, ...(timeScale === v ? S.dockBtnActive : {}) }}>
                {label}
              </button>
            ))}
            <span className="cx-dock-divider" style={S.dockDivider} />
            {[["earth", "🔭", "Skup na Ziemi"], ["cinematic", "🎬", "Odkrywca Kosmosu"], ["free", "🖐", "Wolna kamera"]].map(([m, icon, title]) => (
              <button key={m} onClick={() => { setFocusedPlanetId(null); setCameraMode(m); }} title={title}
                className="cx-dock-btn cx-mobile-hide"
                style={{ ...S.dockBtn, ...(cameraMode === m ? S.dockBtnActive : {}) }}>
                {icon}
              </button>
            ))}
          </div>

          {/* KARTA OBIEKTU — kompaktowa */}
          {selectedInfo && (
            <div style={S.infoCard}>
              <button style={S.infoClose} onClick={() => setSelectedId(null)}>✕</button>
              <div style={S.infoName}>{selectedInfo.name}</div>
              <div style={S.infoType}>{selectedInfo.type}</div>
              <div style={S.infoRow}>📏 {selectedInfo.distance}</div>
              <div style={S.infoRow}>⚡ {selectedInfo.speed}</div>
              <div style={S.infoFact}>💡 {selectedInfo.fact}</div>
              {selectedId === "earth" && (
                <button style={S.landBtn} onClick={openDescent}>🌍 LĄDUJ NA ZIEMI</button>
              )}
            </div>
          )}

          {/* KAMERA REAKTYWNA — alarm namierzania */}
          {detectFlash && (
            <div style={S.detectOverlay}>
              <div style={S.detectFrame} />
              <div style={S.detectText}>🎯 OBIEKT WYKRYTY · NAMIERZANIE</div>
            </div>
          )}
        </>
      )}

      {/* SEKWENCJA SKALI: Ziemia → Polska → Warmia → Olsztyn → Dom */}
      <DescentSequence open={descentOpen} pilot={pilot} onFinish={handleDescentFinish} onClose={handleDescentClose} />

      {/* TOAST */}
      {toast && (
        <div style={{ ...S.toast, borderColor: toast.ok ? "#5EE6A0" : "#FFB02E" }}>{toast.msg}</div>
      )}

      {/* mikro-disclaimer */}
      <div style={S.microFooter}>
        ℹ️ uproszczona wizualizacja edukacyjna · skala nieprawdziwa · to nie system astronomiczny ani ostrzegawczy · dane: NASA NeoWs · v4
      </div>
    </div>
  );
}

/* ============================================================
   STYLE — HUD ≤10%, reszta to kosmos
   ============================================================ */
const S = {
  app: {
    position: "relative", width: "100vw", height: "100vh", overflow: "hidden",
    background: "#03050C", color: "#E6EEF8",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", userSelect: "none",
  },

  /* INTRO */
  introOverlay: {
    position: "absolute", inset: 0, zIndex: 20, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "flex-end", paddingBottom: "12vh",
    background: "linear-gradient(180deg, rgba(3,5,12,0.25) 0%, rgba(3,5,12,0) 35%, rgba(3,5,12,0) 60%, rgba(3,5,12,0.55) 100%)",
    pointerEvents: "none",
  },
  introBrand: { fontFamily: "monospace", letterSpacing: 6, fontSize: 12, color: "#2FE6C8", marginBottom: 4 },
  introTitle: {
    fontSize: "clamp(34px, 6vw, 58px)", fontWeight: 900, letterSpacing: 3,
    textShadow: "0 0 30px rgba(47,230,200,0.45), 0 2px 20px rgba(0,0,0,0.8)",
  },
  introSub: { fontSize: 14, color: "#9FB6D4", marginTop: 2, marginBottom: 26 },
  startBtn: {
    pointerEvents: "auto", fontSize: 19, fontWeight: 900, letterSpacing: 1,
    padding: "16px 34px", borderRadius: 16, border: "none", cursor: "pointer",
    background: "linear-gradient(135deg, #2FE6C8, #1FB8E0)", color: "#04121C",
    boxShadow: "0 0 34px rgba(47,230,200,0.55), 0 8px 30px rgba(0,0,0,0.5)",
  },
  introData: { fontFamily: "monospace", fontSize: 11, color: "#6E89AB", marginTop: 16 },

  /* CEL MISJI */
  objectiveBar: {
    position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
    display: "flex", alignItems: "center", gap: 10,
    maxWidth: "min(760px, calc(100vw - 24px))",
    background: "rgba(6,10,24,0.72)", backdropFilter: "blur(8px)",
    border: "1px solid rgba(47,230,200,0.35)", borderRadius: 999,
    padding: "7px 14px", zIndex: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
  },
  objectiveDots: { display: "flex", gap: 5, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "#1E3A5F", display: "inline-block" },
  dotActive: { background: "#FFB02E", boxShadow: "0 0 8px rgba(255,176,46,0.8)" },
  dotDone: { background: "#5EE6A0" },
  objectiveTextGroup: { minWidth: 0, display: "grid", gap: 1 },
  objectiveText: { fontSize: 14, fontWeight: 900, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  objectiveSubText: { fontSize: 10.5, fontWeight: 700, lineHeight: 1.15, color: "#9FB6D4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  badgeToggle: {
    flexShrink: 0, background: "transparent", border: "none", fontSize: 17,
    cursor: "pointer", padding: "0 2px", filter: "drop-shadow(0 0 4px rgba(0,0,0,0.6))",
  },
  badgePanel: {
    position: "absolute", top: 52, left: "50%", transform: "translateX(-50%)",
    background: "rgba(6,10,24,0.88)", backdropFilter: "blur(8px)",
    border: "1px solid #1E3A5F", borderRadius: 14, padding: 10,
    display: "grid", gap: 7, zIndex: 11, width: 230,
  },
  badgeRow: { display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 700 },
  pilotInput: {
    background: "#0C1430", border: "1px solid #2FE6C8", borderRadius: 9, color: "#E6EEF8",
    fontSize: 13, fontWeight: 700, padding: "6px 9px", width: "100%", boxSizing: "border-box",
  },

  /* DOCK */
  dock: {
    position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)",
    display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 6,
    maxWidth: "calc(100vw - 24px)",
    background: "rgba(6,10,24,0.72)", backdropFilter: "blur(8px)",
    border: "1px solid rgba(30,58,95,0.9)", borderRadius: 999,
    padding: "6px 10px", zIndex: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
  },
  dockBtn: {
    fontSize: 14, fontWeight: 800, minWidth: 38, padding: "7px 9px", borderRadius: 999,
    border: "1px solid transparent", background: "transparent", color: "#9FB6D4", cursor: "pointer",
  },
  dockTextBtn: {
    fontSize: 13, fontWeight: 900, padding: "7px 12px", borderRadius: 999,
    border: "1px solid transparent", background: "transparent", color: "#CFE2FF", cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dockBtnActive: {
    color: "#04121C", background: "#2FE6C8",
    boxShadow: "0 0 12px rgba(47,230,200,0.55)",
  },
  dockDivider: { width: 1, height: 20, background: "#1E3A5F", margin: "0 4px" },
  controlsHint: {
    position: "absolute", left: "50%", bottom: 126, transform: "translateX(-50%)",
    zIndex: 10, padding: "5px 10px", borderRadius: 999,
    background: "rgba(6,10,24,0.58)", border: "1px solid rgba(159,182,212,0.22)",
    color: "#9FB6D4", fontSize: 11.5, fontWeight: 800, lineHeight: 1.2,
    whiteSpace: "nowrap", maxWidth: "calc(100vw - 32px)", overflow: "hidden", textOverflow: "ellipsis",
  },

  /* KARTA OBIEKTU */
  infoCard: {
    position: "absolute", right: 14, bottom: 80, width: 270, maxWidth: "calc(100vw - 28px)",
    background: "rgba(6,10,24,0.85)", backdropFilter: "blur(8px)",
    border: "1px solid rgba(47,230,200,0.5)", borderRadius: 14,
    padding: "12px 14px 11px", zIndex: 10,
    boxShadow: "0 0 20px rgba(47,230,200,0.2), 0 6px 24px rgba(0,0,0,0.5)",
  },
  infoClose: {
    position: "absolute", top: 6, right: 8, background: "transparent", border: "none",
    color: "#6E89AB", fontSize: 16, cursor: "pointer",
  },
  infoName: { fontSize: 18, fontWeight: 800 },
  infoType: { fontSize: 12, color: "#9FB6D4", marginBottom: 7 },
  infoRow: { fontSize: 13, lineHeight: 1.5 },
  infoFact: {
    marginTop: 7, background: "rgba(47,230,200,0.08)", border: "1px solid rgba(47,230,200,0.3)",
    borderRadius: 9, padding: "7px 9px", fontSize: 12.5, lineHeight: 1.45, color: "#CFEDE6",
  },
  landBtn: {
    marginTop: 9, width: "100%", padding: "9px 10px", borderRadius: 10,
    border: "none", cursor: "pointer", fontWeight: 900, fontSize: 13.5,
    background: "linear-gradient(135deg, #FFB02E, #FF7A2E)", color: "#241303",
    boxShadow: "0 0 14px rgba(255,138,60,0.4)",
  },

  /* KAMERA REAKTYWNA */
  detectOverlay: { position: "absolute", inset: 0, zIndex: 15, pointerEvents: "none" },
  detectFrame: {
    position: "absolute", inset: 10, borderRadius: 18,
    border: "2px solid rgba(255,138,60,0.85)",
    boxShadow: "inset 0 0 44px rgba(255,138,60,0.22)",
    animation: "cx-detect 0.5s ease-in-out infinite alternate",
  },
  detectText: {
    position: "absolute", top: "16%", left: "50%", transform: "translateX(-50%)",
    fontFamily: "monospace", fontSize: 15, fontWeight: 800, letterSpacing: 3,
    color: "#FFB02E", whiteSpace: "nowrap",
    textShadow: "0 0 12px rgba(255,138,60,0.8)",
    animation: "cx-blink 0.7s linear infinite",
  },

  /* SEKWENCJA SKALI */
  descentOverlay: {
    position: "absolute", inset: 0, zIndex: 30,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: "radial-gradient(circle at 50% 42%, #0A1430 0%, #03050C 72%)",
    cursor: "pointer",
  },
  descentClose: {
    position: "absolute", top: 14, right: 18, background: "transparent", border: "none",
    color: "#6E89AB", fontSize: 22, cursor: "pointer", zIndex: 2,
  },
  descentTop: { textAlign: "center", marginBottom: 12, animation: "cx-fadein 0.5s ease-out both" },
  descentTitle: {
    fontSize: "clamp(24px, 4.6vw, 38px)", fontWeight: 900, letterSpacing: 3,
    textShadow: "0 0 24px rgba(47,230,200,0.4), 0 2px 16px rgba(0,0,0,0.8)",
  },
  descentAlt: { fontFamily: "monospace", fontSize: 12.5, color: "#9FB6D4", marginTop: 4 },
  descentStageBox: {
    width: "min(560px, 86vw)", borderRadius: 18, overflow: "hidden",
    border: "1px solid rgba(95,198,255,0.35)", background: "rgba(6,10,24,0.55)",
    boxShadow: "0 0 36px rgba(31,184,224,0.18), 0 12px 40px rgba(0,0,0,0.55)",
    animation: "cx-stage 0.9s ease-out both",
  },
  descentSub: {
    marginTop: 12, fontSize: 14.5, fontWeight: 700, color: "#CFEDE6", textAlign: "center",
    padding: "0 16px", animation: "cx-fadein 0.6s ease-out both",
  },
  descentDone: {
    marginTop: 14, textAlign: "center", padding: "12px 18px",
    background: "rgba(94,230,160,0.1)", border: "1px solid rgba(94,230,160,0.45)",
    borderRadius: 14, animation: "cx-fadein 0.4s ease-out both",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  descentCrumbs: {
    position: "absolute", bottom: 18, left: 0, right: 0, textAlign: "center",
    fontFamily: "monospace", fontSize: 11.5, letterSpacing: 1,
  },
  crumb: { color: "#46618A", margin: "0 3px" },
  crumbActive: { color: "#2FE6C8", fontWeight: 900, textShadow: "0 0 10px rgba(47,230,200,0.7)" },
  crumbDone: { color: "#5EE6A0" },
  descentHint: {
    position: "absolute", bottom: 44, right: 20, fontFamily: "monospace",
    fontSize: 10.5, color: "#6E89AB",
  },

  toast: {
    position: "absolute", bottom: 86, left: "50%", transform: "translateX(-50%)",
    maxWidth: "min(540px, calc(100vw - 28px))", background: "rgba(6,10,24,0.92)",
    backdropFilter: "blur(8px)", border: "2px solid", borderRadius: 14,
    padding: "10px 15px", fontSize: 14.5, fontWeight: 700, lineHeight: 1.4,
    textAlign: "center", zIndex: 20, boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
  },
  microFooter: {
    position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center",
    fontSize: 9.5, fontFamily: "monospace", color: "rgba(110,137,171,0.65)",
    pointerEvents: "none", zIndex: 5, padding: "0 10px",
  },
};
