import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

/* ============================================================
   COPERNIX SPACE LAB 3D — v2 "CINEMATIC"
   Orbitarium Dominika: tym razem ma robić "o kurde". 🚀

   Instalacja (Vite):
     npm i three @react-three/fiber @react-three/drei @react-three/postprocessing

   Nowości v2:
   - Bloom + Vignette (postprocessing) — Słońce i obiekty świecą
   - proceduralne mgławice + pył kosmiczny (particles)
   - proceduralna tekstura Ziemi (kontynenty + chmury) — bez plików
   - POPRAWIONA SKALA: kamera startuje PRZY ZIEMI, Słońce w tle
   - Reżyser kamery: 🌍 Skup na Ziemi / 🚀 Odkrywca Kosmosu / 🖐 Wolna
   - Tryb Strażnika = mini-gra: centrum wykrywa obiekt → znajdź i zeskanuj
   - fix poziomego scrolla (globalny overflow hidden)

   Chcesz PRAWDZIWE zdjęcia NASA jako tekstury? Wrzuć np.
   earth_daymap.jpg do /public i podmień proceduralną teksturę:
     const map = useLoader(THREE.TextureLoader, "/earth_daymap.jpg")
   ============================================================ */

/* ---------------- Bezpieczny zapis postępu ---------------- */
const STORAGE_KEY = "copernix_space_lab_3d_v2";

const safeStorage = {
  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(data) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* gramy bez zapisu */
    }
  },
};

/* ---------------- Stałe ---------------- */
const LUNAR_KM = 384400;
const fmt = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const toLunar = (km) => (km / LUNAR_KM).toFixed(1);

/* SKALA SCENY (fix #3 — wszystko ciasno, kamera blisko) */
const SUN_R = 2.4;
const EARTH_ORBIT_R = 12;
const EARTH_R = 0.95;
const MOON_ORBIT_R = 1.9;
const MOON_R = 0.26;
const AST_MIN_R = 8.5;
const AST_MAX_R = 17;

function hash01(str, salt = 0) {
  let h = salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
  return (h % 1000) / 1000;
}

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

/* ---------------- Info o obiektach stałych ---------------- */
const BODY_INFO = {
  sun: {
    name: "Słońce",
    type: "⭐ Gwiazda",
    distance: "149 600 000 km od Ziemi",
    speed: "Ziemia okrąża je z prędkością 107 000 km/h",
    fact: "Słońce jest tak duże, że zmieściłoby się w nim ponad MILION Ziemi! 🤯",
  },
  earth: {
    name: "Ziemia",
    type: "🌍 Planeta",
    distance: "Tu jesteśmy! Dom 8 miliardów ludzi",
    speed: "Pędzi wokół Słońca 107 000 km/h — i nic nie czujemy!",
    fact: "Ziemia to jedyna znana planeta z czekoladą, dinozaurami w muzeach i Olsztynem. 😄",
  },
  moon: {
    name: "Księżyc",
    type: "🌙 Naturalny satelita Ziemi",
    distance: "384 400 km od Ziemi",
    speed: "Okrąża Ziemię w 27 dni",
    fact: "Na Księżycu było 12 osób — ich ślady zostaną tam na miliony lat, bo nie ma wiatru!",
  },
};

/* ---------------- Misje ---------------- */
const MISSIONS = [
  { id: "find_earth", icon: "🌍", title: "Znajdź Ziemię", text: "Kliknij naszą niebieską planetę!", badge: { icon: "🧭", name: "Nawigator" } },
  { id: "find_moon", icon: "🌙", title: "Znajdź Księżyc", text: "Mała kula krąży wokół Ziemi. Przybliż się i kliknij!", badge: { icon: "🔭", name: "Obserwator" } },
  { id: "closest_asteroid", icon: "🎯", title: "Najbliższa asteroida", text: "Kliknij asteroidę, która przelatuje NAJBLIŻEJ Ziemi.", badge: { icon: "🥇", name: "Tropiciel Orbit" } },
  { id: "guardian", icon: "🛡️", title: "Pierwszy skan Strażnika", text: "Włącz Tryb Strażnika i zeskanuj wykryty obiekt!", badge: { icon: "🛡️", name: "STRAŻNIK ZIEMI" } },
];

/* ============================================================
   PROCEDURALNE TEKSTURY (canvas — zero plików)
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
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function makeEarthTexture() {
  const W = 1024, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  // ocean — gradient
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0, "#0E3F73");
  og.addColorStop(0.5, "#1567B0");
  og.addColorStop(1, "#0E3F73");
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, W, H);
  // kontynenty — losowe plamy (seedowane)
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
  // pustynie
  ctx.fillStyle = "rgba(201,166,75,0.55)";
  for (let i = 0; i < 9; i++) {
    const x = rnd() * W, y = H * 0.3 + rnd() * H * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, 12 + rnd() * 30, 0, Math.PI * 2);
    ctx.fill();
  }
  // czapy polarne
  ctx.fillStyle = "rgba(240,248,255,0.95)";
  ctx.fillRect(0, 0, W, H * 0.06);
  ctx.fillRect(0, H * 0.94, W, H * 0.06);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function makeCloudsTexture() {
  const W = 1024, H = 512;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, W, H);
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
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/* ============================================================
   ELEMENTY SCENY
   ============================================================ */

/** Mgławice — wielkie świecące sprite'y w tle */
function Nebulae() {
  const sprites = useMemo(() => {
    const defs = [
      { c1: "rgba(130,80,220,0.55)", c2: "rgba(60,20,120,0.18)", pos: [-60, 18, -90], s: 95 },
      { c1: "rgba(47,230,200,0.4)", c2: "rgba(10,80,90,0.14)", pos: [70, -12, -110], s: 110 },
      { c1: "rgba(230,80,160,0.35)", c2: "rgba(90,20,70,0.12)", pos: [20, 35, -130], s: 120 },
      { c1: "rgba(80,140,255,0.35)", c2: "rgba(20,40,110,0.12)", pos: [-85, -28, -70], s: 80 },
      { c1: "rgba(255,170,80,0.22)", c2: "rgba(120,60,10,0.08)", pos: [95, 26, -60], s: 70 },
    ];
    return defs.map((d) => ({ ...d, tex: makeRadialGlow(d.c1, d.c2, 256) }));
  }, []);
  return (
    <group>
      {sprites.map((s, i) => (
        <sprite key={i} position={s.pos} scale={[s.s, s.s, 1]}>
          <spriteMaterial map={s.tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
}

/** Pył kosmiczny — drobinki dryfujące w przestrzeni */
function SpaceDust() {
  const ref = useRef();
  const positions = useMemo(() => {
    const N = 1600;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 10 + Math.random() * 60;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 30;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.004;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.07} color="#9FD8FF" transparent opacity={0.55} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Linia orbity */
function OrbitRing({ radius, inclination = 0, color = "#1E3A5F", opacity = 0.5 }) {
  const geom = useMemo(() => {
    const pts = [];
    const N = 128;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  return (
    <group rotation={[inclination, 0, 0]}>
      <line geometry={geom}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </line>
    </group>
  );
}

/** Słońce — jasny rdzeń (Bloom go rozświetla) + korona */
function Sun({ onSelect, selected }) {
  const coronaTex = useMemo(() => makeRadialGlow("rgba(255,210,90,0.9)", "rgba(255,120,20,0.25)", 256), []);
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.04;
  });
  return (
    <group>
      <pointLight intensity={2.6} distance={200} decay={0.35} color="#FFF3D6" />
      <mesh ref={ref} onClick={(e) => { e.stopPropagation(); onSelect("sun"); }}>
        <sphereGeometry args={[SUN_R, 48, 48]} />
        {/* bardzo jasny — przekracza próg Blooma i "płonie" */}
        <meshBasicMaterial color="#FFF6CF" toneMapped={false} />
      </mesh>
      <sprite scale={[SUN_R * 7, SUN_R * 7, 1]}>
        <spriteMaterial map={coronaTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <Html position={[0, SUN_R + 1.6, 0]} center distanceFactor={40} style={labelStyle(selected === "sun")}>
        ☀️ Słońce
      </Html>
    </group>
  );
}

/** Ziemia + Księżyc + chmury + atmosfera */
function EarthSystem({ clock, earthPos, onSelect, selected, guardianActive }) {
  const group = useRef();
  const earthMesh = useRef();
  const cloudsMesh = useRef();
  const moonMesh = useRef();
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
    if (moonMesh.current) {
      moonMesh.current.position.set(Math.cos(ma) * MOON_ORBIT_R, 0.2 * Math.sin(ma), Math.sin(ma) * MOON_ORBIT_R);
    }
    if (shieldRef.current) {
      const s = 1 + 0.06 * Math.sin(t * 2.2);
      shieldRef.current.scale.set(s, s, s);
      shieldRef.current.rotation.y += dt * 0.3;
    }
  });

  return (
    <>
      <OrbitRing radius={EARTH_ORBIT_R} color="#2F6FB0" opacity={0.6} />
      <group ref={group}>
        <mesh ref={earthMesh} onClick={(e) => { e.stopPropagation(); onSelect("earth"); }}>
          <sphereGeometry args={[EARTH_R, 64, 64]} />
          <meshStandardMaterial map={earthTex} roughness={0.7} metalness={0.05} />
        </mesh>
        {/* chmury */}
        <mesh ref={cloudsMesh} scale={1.025}>
          <sphereGeometry args={[EARTH_R, 48, 48]} />
          <meshStandardMaterial map={cloudsTex} transparent opacity={0.85} depthWrite={false} />
        </mesh>
        {/* atmosfera — świeci w Bloomie */}
        <mesh scale={1.12}>
          <sphereGeometry args={[EARTH_R, 32, 32]} />
          <meshBasicMaterial color="#5FC6FF" transparent opacity={0.16} side={THREE.BackSide} toneMapped={false} />
        </mesh>
        {selected === "earth" && <SelectionRing radius={EARTH_R + 0.5} />}
        {guardianActive && (
          <mesh ref={shieldRef}>
            <sphereGeometry args={[EARTH_R + 0.85, 24, 24]} />
            <meshBasicMaterial color="#2FE6C8" wireframe transparent opacity={0.3} toneMapped={false} />
          </mesh>
        )}
        <Html position={[0, EARTH_R + 1.1, 0]} center distanceFactor={32} style={labelStyle(selected === "earth")}>
          🌍 Ziemia
        </Html>

        <OrbitRing radius={MOON_ORBIT_R} color="#3D6491" opacity={0.4} />
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
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 1.5;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.03, 12, 64]} />
      <meshBasicMaterial color="#2FE6C8" toneMapped={false} />
    </mesh>
  );
}

/** Asteroida + marker celu skanowania */
function Asteroid({ data, clock, onSelect, selected, isScanTarget }) {
  const ref = useRef();

  const params = useMemo(() => {
    const t = Math.min(1, data.missKm / 9000000);
    return {
      radius: AST_MIN_R + t * (AST_MAX_R - AST_MIN_R) + hash01(data.id, 7) * 1.2,
      speed: 0.04 + (data.speedKmh / 70000) * 0.07,
      inclination: (hash01(data.id, 13) - 0.5) * 0.6,
      phase: hash01(data.id, 29) * Math.PI * 2,
      size: Math.max(0.16, Math.min(0.6, 0.13 + Math.sqrt(data.diameterM) / 46)),
      tumble: 0.4 + hash01(data.id, 41) * 1.2,
    };
  }, [data]);

  useFrame((_, dt) => {
    const t = clock.current.t;
    const a = params.phase + t * params.speed;
    const x = Math.cos(a) * params.radius;
    const z = Math.sin(a) * params.radius;
    const y = Math.sin(a) * Math.sin(params.inclination) * params.radius * 0.35;
    if (ref.current) {
      ref.current.position.set(x, y, z);
      ref.current.rotation.x += dt * params.tumble;
      ref.current.rotation.y += dt * params.tumble * 0.7;
    }
  });

  const sel = selected === data.id;
  const baseColor = data.hazardous ? "#C98A4B" : "#8C9BB5";

  return (
    <>
      <OrbitRing
        radius={params.radius}
        inclination={params.inclination}
        color={isScanTarget ? "#FFB02E" : sel ? "#2FE6C8" : "#16294A"}
        opacity={isScanTarget ? 0.9 : sel ? 0.9 : 0.45}
      />
      <group ref={ref}>
        <mesh onClick={(e) => { e.stopPropagation(); onSelect(data.id); }}>
          <icosahedronGeometry args={[params.size, 0]} />
          <meshStandardMaterial
            color={sel ? "#2FE6C8" : baseColor}
            flatShading
            roughness={0.9}
            emissive={sel ? "#2FE6C8" : isScanTarget ? "#FF8A3C" : "#000000"}
            emissiveIntensity={sel ? 0.6 : isScanTarget ? 0.8 : 0}
          />
        </mesh>
        {sel && <SelectionRing radius={params.size + 0.35} />}
        {isScanTarget && <ScanMarker radius={params.size + 0.5} />}
        <Html position={[0, params.size + 0.55, 0]} center distanceFactor={36} style={labelStyle(sel || isScanTarget)}>
          {isScanTarget ? "📡 " : "☄️ "}{data.name}
        </Html>
      </group>
    </>
  );
}

/** Pulsujący marker celu w Trybie Strażnika */
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
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.045, 10, 48]} />
      <meshBasicMaterial color="#FFB02E" toneMapped={false} />
    </mesh>
  );
}

/** Zegar symulacji */
function SimulationClock({ clock, timeScale }) {
  useFrame((_, dt) => {
    clock.current.t += dt * timeScale;
  });
  return null;
}

/**
 * REŻYSER KAMERY — tryby:
 *  - "earth":     kamera płynnie podąża za Ziemią (start aplikacji)
 *  - "cinematic": filmowy przelot przez scenę (🚀 Odkrywca Kosmosu)
 *  - "free":      OrbitControls dla użytkownika
 */
function CameraDirector({ mode, earthPos, controlsRef }) {
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const flight = useRef(0);

  useFrame((state, dt) => {
    const ctrl = controlsRef.current;
    if (mode === "earth") {
      // pozycja: Ziemia + offset; cel: Ziemia
      tmp.copy(earthPos.current).add(new THREE.Vector3(3.2, 1.4, 3.2));
      camera.position.lerp(tmp, 0.06);
      if (ctrl) {
        ctrl.target.lerp(earthPos.current, 0.1);
        ctrl.update();
      }
    } else if (mode === "cinematic") {
      flight.current += dt;
      const ft = flight.current;
      // spiralny przelot: raz blisko Ziemi, raz szeroko przez mgławice
      const R = 9 + 8 * Math.sin(ft * 0.11);
      const px = Math.cos(ft * 0.14) * R;
      const pz = Math.sin(ft * 0.14) * R;
      const py = 2.2 + 2.6 * Math.sin(ft * 0.07);
      tmp.set(px, py, pz);
      camera.position.lerp(tmp, 0.025);
      // cel: płynnie między Słońcem a Ziemią
      const mix = 0.5 + 0.5 * Math.sin(ft * 0.05);
      const target = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), earthPos.current, mix);
      if (ctrl) {
        ctrl.target.lerp(target, 0.04);
        ctrl.update();
      }
    }
  });
  return null;
}

function labelStyle(active) {
  return {
    color: active ? "#2FE6C8" : "#9FB6D4",
    fontFamily: "monospace",
    fontSize: 12,
    whiteSpace: "nowrap",
    textShadow: "0 0 6px #04060D, 0 0 10px #04060D",
    pointerEvents: "none",
    userSelect: "none",
  };
}

/* ============================================================
   GŁÓWNY KOMPONENT
   ============================================================ */
export default function CopernixSpaceLab3D() {
  const [asteroids, setAsteroids] = useState(MOCK_ASTEROIDS);
  const [dataSource, setDataSource] = useState("loading");
  const [selectedId, setSelectedId] = useState(null);
  const [timeScale, setTimeScale] = useState(1);
  const [cameraMode, setCameraMode] = useState("earth"); // earth | cinematic | free
  const [guardianActive, setGuardianActive] = useState(false);
  const [scanTargetId, setScanTargetId] = useState(null);
  const [scanCount, setScanCount] = useState(() => safeStorage.load()?.scanCount || 0);
  const [completed, setCompleted] = useState(() => safeStorage.load()?.completed || []);
  const [pilot, setPilot] = useState(() => safeStorage.load()?.pilot || "Dominik");
  const [toast, setToast] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const clock = useRef({ t: 0 });
  const earthPos = useRef(new THREE.Vector3(EARTH_ORBIT_R, 0, 0));
  const controlsRef = useRef();

  /* fix #5 — globalnie wyłącz scrollbary */
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
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
    safeStorage.save({ completed, pilot, scanCount });
  }, [completed, pilot, scanCount]);

  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const completeMission = useCallback((missionId) => {
    const m = MISSIONS.find((x) => x.id === missionId);
    if (!m) return;
    setCompleted((c) => {
      if (c.includes(missionId)) return c;
      showToast(`🎉 Misja "${m.title}" wykonana! Odznaka: ${m.badge.icon} ${m.badge.name}!`);
      return [...c, missionId];
    });
  }, [showToast]);

  const closestId = useMemo(
    () => [...asteroids].sort((a, b) => a.missKm - b.missKm)[0]?.id,
    [asteroids]
  );

  /* nowy cel skanowania */
  const pickScanTarget = useCallback((exclude) => {
    const pool = asteroids.filter((a) => a.id !== exclude);
    const next = pool[Math.floor(Math.random() * pool.length)];
    setScanTargetId(next?.id || null);
    if (next) showToast(`📡 Centrum wykryło nowy obiekt: ${next.name}. Znajdź go i zeskanuj! 🔍`, true);
  }, [asteroids, showToast]);

  const toggleGuardian = () => {
    const next = !guardianActive;
    setGuardianActive(next);
    if (next) {
      pickScanTarget(null);
    } else {
      setScanTargetId(null);
      showToast("🛡️ Tryb Strażnika wyłączony. Dobra robota na służbie!");
    }
  };

  const handleSelect = useCallback((id) => {
    setSelectedId(id);
    if (id === "earth") completeMission("find_earth");
    if (id === "moon") completeMission("find_moon");
    if (id === closestId) completeMission("closest_asteroid");

    /* mini-gra skanowania */
    if (guardianActive && scanTargetId) {
      if (id === scanTargetId) {
        setScanCount((n) => n + 1);
        completeMission("guardian");
        const a = asteroids.find((x) => x.id === id);
        showToast(`✅ Zeskanowano ${a?.name}! Świetna robota, Strażniku! Skan #${scanCount + 1} 🛰️`);
        window.setTimeout(() => pickScanTarget(id), 2600);
        return;
      }
      if (id !== "sun" && id !== "earth" && id !== "moon") {
        showToast("🔍 To nie ten obiekt — szukaj pomarańczowego markera 📡!", false);
        return;
      }
    }

    if (id !== "sun" && id !== "earth" && id !== "moon" && id !== closestId && !completed.includes("closest_asteroid")) {
      const a = asteroids.find((x) => x.id === id);
      if (a) showToast(`☄️ ${a.name} — ciekawa! Ale jest jeszcze bliższa. Porównaj odległości 🌕`, false);
    }
  }, [closestId, completeMission, guardianActive, scanTargetId, asteroids, scanCount, completed, pickScanTarget, showToast]);

  const selectedInfo = useMemo(() => {
    if (!selectedId) return null;
    if (BODY_INFO[selectedId]) return BODY_INFO[selectedId];
    const a = asteroids.find((x) => x.id === selectedId);
    if (!a) return null;
    return {
      name: a.name,
      type: a.hazardous ? "☄️ Asteroida — NASA ma ją na oku (wszystko pod kontrolą!)" : "☄️ Asteroida — spokojna trasa",
      distance: `${fmt.format(a.missKm)} km od Ziemi (${toLunar(a.missKm)} Księżyców 🌕)`,
      speed: `${fmt.format(a.speedKmh)} km/h (≈ ${Math.round(a.speedKmh / 900)}× szybciej niż samolot ✈️)`,
      fact: `Ma około ${fmt.format(a.diameterM)} m średnicy. Asteroidy pamiętają początki Układu Słonecznego — są starsze niż dinozaury!`,
    };
  }, [selectedId, asteroids]);

  const allDone = completed.length >= MISSIONS.length;

  return (
    <div style={S.app}>
      <Canvas
        style={{ position: "absolute", inset: 0 }}
        camera={{ position: [EARTH_ORBIT_R + 3.2, 1.4, 3.2], fov: 60, near: 0.1, far: 600 }}
        onPointerMissed={() => setSelectedId(null)}
        gl={{ antialias: true }}
        dpr={[1, 1.75]}
      >
        <color attach="background" args={["#03050C"]} />
        <ambientLight intensity={0.16} />
        <Stars radius={180} depth={60} count={5000} factor={4} saturation={0} fade speed={0.5} />
        <Nebulae />
        <SpaceDust />
        <SimulationClock clock={clock} timeScale={timeScale} />
        <CameraDirector mode={cameraMode} earthPos={earthPos} controlsRef={controlsRef} />

        <Sun onSelect={handleSelect} selected={selectedId} />
        <EarthSystem clock={clock} earthPos={earthPos} onSelect={handleSelect} selected={selectedId} guardianActive={guardianActive} />
        {asteroids.map((a) => (
          <Asteroid key={a.id} data={a} clock={clock} onSelect={handleSelect} selected={selectedId} isScanTarget={guardianActive && a.id === scanTargetId} />
        ))}

        {/* fix #2 — ciasne limity kamery */}
        <OrbitControls
          ref={controlsRef}
          enabled={cameraMode === "free"}
          enablePan={false}
          minDistance={2.5}
          maxDistance={45}
          dampingFactor={0.08}
          enableDamping
        />

        {/* postprocessing — to robi "wow" */}
        <EffectComposer>
          <Bloom intensity={1.15} luminanceThreshold={0.22} luminanceSmoothing={0.6} mipmapBlur />
          <Vignette eskil={false} offset={0.18} darkness={0.78} />
        </EffectComposer>
      </Canvas>

      {/* ====== NAGŁÓWEK ====== */}
      <header style={S.header}>
        <div>
          <div style={S.brand}>COPERNIX SPACE LAB 3D · v2</div>
          <div style={S.title}>🛡️ Orbitarium — pilot {pilot}</div>
        </div>
        <div style={S.dataBadge}>
          {dataSource === "loading" && "📡 Łączę z NASA…"}
          {dataSource === "nasa" && "📡 DANE NA ŻYWO: NASA"}
          {dataSource === "mock" && "🗂️ DANE TRENINGOWE"}
        </div>
      </header>

      {/* ====== TRYBY KAMERY ====== */}
      <div style={S.cameraBar}>
        {[
          ["earth", "🔭 Skup na Ziemi"],
          ["cinematic", "🚀 Odkrywca Kosmosu"],
          ["free", "🖐 Wolna kamera"],
        ].map(([m, label]) => (
          <button
            key={m}
            onClick={() => setCameraMode(m)}
            style={{ ...S.camBtn, ...(cameraMode === m ? S.camBtnActive : {}) }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ====== HUD STRAŻNIKA ====== */}
      {guardianActive && scanTargetId && (
        <div style={S.scanHud}>
          📡 WYKRYTO OBIEKT: <b>{asteroids.find((a) => a.id === scanTargetId)?.name}</b> — znajdź pomarańczowy marker i kliknij! · Skany: {scanCount}
        </div>
      )}

      {/* ====== CZAS + STRAŻNIK ====== */}
      <div style={S.timeBar}>
        <span style={S.timeLabel}>⏱ CZAS:</span>
        {[[0, "⏸"], [1, "1×"], [10, "10×"], [100, "100×"]].map(([v, label]) => (
          <button key={v} onClick={() => setTimeScale(v)} style={{ ...S.timeBtn, ...(timeScale === v ? S.timeBtnActive : {}) }}>
            {label}
          </button>
        ))}
        <button onClick={toggleGuardian} style={{ ...S.guardianBtn, ...(guardianActive ? S.guardianBtnOn : {}) }}>
          🛡️ {guardianActive ? "STRAŻNIK NA SŁUŻBIE" : "Tryb Strażnika"}
        </button>
      </div>

      {/* ====== PANEL MISJI ====== */}
      <div style={S.missionPanel}>
        <button style={S.missionToggle} onClick={() => setPanelOpen((o) => !o)}>
          🚀 MISJE ({completed.length}/{MISSIONS.length}) {panelOpen ? "▾" : "▸"}
        </button>
        {panelOpen && (
          <div style={S.missionList}>
            {MISSIONS.map((m) => {
              const done = completed.includes(m.id);
              return (
                <div key={m.id} style={{ ...S.missionRow, ...(done ? S.missionRowDone : {}) }}>
                  <span style={{ fontSize: 18 }}>{done ? m.badge.icon : m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={S.missionTitle}>
                      {m.title} {done && <span style={{ color: "#5EE6A0" }}>✓ {m.badge.name}</span>}
                    </div>
                    {!done && <div style={S.missionText}>{m.text}</div>}
                  </div>
                </div>
              );
            })}
            {allDone && (
              <div style={S.winBox}>🛡️ {pilot.toUpperCase()} = STRAŻNIK ZIEMI! Wszystkie misje wykonane! 🌍✨</div>
            )}
            <input style={S.pilotInput} value={pilot} maxLength={14} onChange={(e) => setPilot(e.target.value)} aria-label="Imię pilota" />
          </div>
        )}
      </div>

      {/* ====== KARTA OBIEKTU ====== */}
      {selectedInfo && (
        <div style={S.infoCard}>
          <button style={S.infoClose} onClick={() => setSelectedId(null)}>✕</button>
          <div style={S.infoName}>{selectedInfo.name}</div>
          <div style={S.infoType}>{selectedInfo.type}</div>
          <div style={S.infoRow}><span style={S.infoLabel}>📏 ODLEGŁOŚĆ</span>{selectedInfo.distance}</div>
          <div style={S.infoRow}><span style={S.infoLabel}>⚡ PRĘDKOŚĆ</span>{selectedInfo.speed}</div>
          <div style={S.infoFact}>💡 {selectedInfo.fact}</div>
        </div>
      )}

      {toast && (
        <div style={{ ...S.toast, borderColor: toast.ok ? "#5EE6A0" : "#FFB02E" }}>{toast.msg}</div>
      )}

      <footer style={S.footer}>
        ℹ️ Uproszczona wizualizacja edukacyjna — odległości, rozmiary i orbity NIE są w skali. To nie jest system astronomiczny ani ostrzegawczy. Dane: NASA NeoWs (api.nasa.gov).
      </footer>
    </div>
  );
}

/* ============================================================
   STYLE UI
   ============================================================ */
const S = {
  app: {
    position: "relative",
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    background: "#03050C",
    color: "#E6EEF8",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    userSelect: "none",
  },
  header: {
    position: "absolute", top: 12, left: 16, right: 16,
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    gap: 12, pointerEvents: "none", zIndex: 10,
  },
  brand: { fontFamily: "monospace", letterSpacing: 4, fontSize: 11, color: "#2FE6C8" },
  title: { fontSize: 21, fontWeight: 800, textShadow: "0 0 12px rgba(0,0,0,0.8)" },
  dataBadge: {
    fontFamily: "monospace", fontSize: 12, border: "1px solid #3D6491",
    borderRadius: 999, padding: "6px 12px", color: "#9FB6D4", background: "rgba(8,12,28,0.85)",
  },
  cameraBar: {
    position: "absolute", top: 64, right: 16, display: "flex", flexDirection: "column",
    gap: 8, zIndex: 10,
  },
  camBtn: {
    fontSize: 14, fontWeight: 800, padding: "10px 14px", borderRadius: 12,
    border: "2px solid #1E3A5F", background: "rgba(8,12,28,0.85)", color: "#9FB6D4",
    cursor: "pointer", textAlign: "left",
  },
  camBtnActive: {
    borderColor: "#2FE6C8", background: "rgba(47,230,200,0.16)", color: "#2FE6C8",
    boxShadow: "0 0 14px rgba(47,230,200,0.35)",
  },
  scanHud: {
    position: "absolute", top: 64, left: "50%", transform: "translateX(-50%)",
    maxWidth: "min(620px, calc(100vw - 280px))",
    background: "rgba(35,20,5,0.9)", border: "2px solid #FFB02E", borderRadius: 14,
    padding: "10px 16px", fontSize: 14.5, fontWeight: 700, color: "#FFD9A0",
    zIndex: 10, textAlign: "center", boxShadow: "0 0 22px rgba(255,176,46,0.35)",
  },
  timeBar: {
    position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)",
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center",
    background: "rgba(8,12,28,0.88)", border: "1px solid #1E3A5F", borderRadius: 16,
    padding: "10px 14px", zIndex: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
    maxWidth: "calc(100vw - 24px)",
  },
  timeLabel: { fontFamily: "monospace", fontSize: 12, letterSpacing: 2, color: "#6E89AB" },
  timeBtn: {
    fontSize: 15, fontWeight: 800, padding: "9px 14px", borderRadius: 12,
    border: "2px solid #1E3A5F", background: "rgba(14,22,48,0.8)", color: "#9FB6D4", cursor: "pointer",
  },
  timeBtnActive: {
    borderColor: "#2FE6C8", background: "#2FE6C8", color: "#0B1026",
    boxShadow: "0 0 14px rgba(47,230,200,0.55)",
  },
  guardianBtn: {
    fontSize: 15, fontWeight: 800, padding: "9px 14px", borderRadius: 12,
    border: "2px solid #FFD24D", background: "rgba(14,22,48,0.8)", color: "#FFD24D",
    cursor: "pointer", marginLeft: 6,
  },
  guardianBtnOn: { background: "#FFD24D", color: "#0B1026", boxShadow: "0 0 18px rgba(255,210,77,0.6)" },
  missionPanel: { position: "absolute", top: 64, left: 16, width: 280, maxWidth: "calc(100vw - 32px)", zIndex: 10 },
  missionToggle: {
    fontFamily: "monospace", fontSize: 13, letterSpacing: 2, fontWeight: 700, color: "#2FE6C8",
    background: "rgba(8,12,28,0.88)", border: "1px solid #1E3A5F", borderRadius: 12,
    padding: "9px 14px", cursor: "pointer", width: "100%", textAlign: "left",
  },
  missionList: {
    marginTop: 8, background: "rgba(8,12,28,0.9)", border: "1px solid #1E3A5F",
    borderRadius: 14, padding: 10, display: "grid", gap: 8, boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  },
  missionRow: {
    display: "flex", gap: 10, alignItems: "flex-start", border: "1px solid #1E3A5F",
    borderRadius: 10, padding: "8px 10px", background: "rgba(14,22,48,0.6)",
  },
  missionRowDone: { borderColor: "#5EE6A0", opacity: 0.9 },
  missionTitle: { fontSize: 14, fontWeight: 800 },
  missionText: { fontSize: 12.5, color: "#9FB6D4", lineHeight: 1.4, marginTop: 2 },
  winBox: {
    border: "2px solid #FFD24D", borderRadius: 12, padding: "10px 12px",
    fontSize: 13.5, fontWeight: 800, color: "#FFD24D", textAlign: "center",
    lineHeight: 1.5, boxShadow: "0 0 20px rgba(255,210,77,0.4)",
  },
  pilotInput: {
    background: "#0C1430", border: "2px solid #2FE6C8", borderRadius: 10, color: "#E6EEF8",
    fontSize: 14, fontWeight: 700, padding: "7px 10px", width: "100%", boxSizing: "border-box",
  },
  infoCard: {
    position: "absolute", right: 16, bottom: 120, width: 320, maxWidth: "calc(100vw - 32px)",
    background: "rgba(8,12,28,0.93)", border: "1px solid #2FE6C8", borderRadius: 16,
    padding: "16px 16px 14px", zIndex: 10,
    boxShadow: "0 0 24px rgba(47,230,200,0.25), 0 8px 30px rgba(0,0,0,0.5)",
  },
  infoClose: {
    position: "absolute", top: 8, right: 10, background: "transparent", border: "none",
    color: "#6E89AB", fontSize: 18, cursor: "pointer",
  },
  infoName: { fontSize: 21, fontWeight: 800, marginBottom: 2 },
  infoType: { fontSize: 13, color: "#9FB6D4", marginBottom: 10 },
  infoRow: { borderTop: "1px dashed #1E3A5F", padding: "7px 0", fontSize: 14, lineHeight: 1.45 },
  infoLabel: { display: "block", fontFamily: "monospace", fontSize: 11, letterSpacing: 1.5, color: "#6E89AB", marginBottom: 2 },
  infoFact: {
    marginTop: 9, background: "rgba(47,230,200,0.08)", border: "1px solid rgba(47,230,200,0.35)",
    borderRadius: 10, padding: "9px 12px", fontSize: 13, lineHeight: 1.5, color: "#CFEDE6",
  },
  toast: {
    position: "absolute", bottom: 118, left: "50%", transform: "translateX(-50%)",
    maxWidth: "min(560px, calc(100vw - 32px))", background: "rgba(8,12,28,0.95)",
    border: "2px solid", borderRadius: 14, padding: "12px 16px", fontSize: 15,
    fontWeight: 700, lineHeight: 1.45, textAlign: "center", zIndex: 20,
    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
  },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0, padding: "7px 16px",
    fontSize: 11, fontFamily: "monospace", color: "#6E89AB",
    background: "rgba(3,5,12,0.85)", borderTop: "1px solid #14213D", lineHeight: 1.5, zIndex: 10,
  },
};
