import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

/* ============================================================
   COPERNIX SPACE LAB 3D — v3 "COMMAND CENTER"
   Start nad Ziemią → odlot → misje jak w grze. 90% kosmos, 10% HUD.

   Instalacja (Vite):
     npm i three @react-three/fiber @react-three/drei @react-three/postprocessing

   Fazy gry:
     intro   — kamera 'nad powierzchnią' Ziemi, tylko przycisk startu
     launch  — filmowy odlot (~6 s), HUD wjeżdża
     play    — misje sekwencyjne + tryb Strażnika
   ============================================================ */

/* ---------------- Bezpieczny zapis ---------------- */
const STORAGE_KEY = "copernix_space_lab_3d_v3";
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

function hash01(str, salt = 0) {
  let h = salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
  return (h % 1000) / 1000;
}
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

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
  earth: {
    name: "Ziemia", type: "🌍 Planeta",
    distance: "Tu jesteśmy! Dom 8 miliardów ludzi",
    speed: "Pędzi wokół Słońca 107 000 km/h — i nic nie czujemy!",
    fact: "Jedyna znana planeta z czekoladą, dinozaurami w muzeach i Olsztynem. 😄",
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
   SCENA
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
        <sprite key={i} position={s.pos} scale={[s.s, s.s, 1]}>
          <spriteMaterial map={s.tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
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
    <points ref={ref}>
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

function Sun({ onSelect, selected }) {
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
      <sprite scale={[SUN_R * 7, SUN_R * 7, 1]}>
        <spriteMaterial map={coronaTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <Html position={[0, SUN_R + 1.6, 0]} center distanceFactor={40} style={labelStyle(selected === "sun")}>☀️ Słońce</Html>
    </group>
  );
}

/** Ziemia + chmury + atmosfera + Księżyc + satelita Copernix-1 */
function EarthSystem({ clock, earthPos, moonPos, onSelect, selected, guardianActive, reveal, phase }) {
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

  const showLabels = phase === "play";

  return (
    <>
      <OrbitRing radius={EARTH_ORBIT_R} color="#2F6FB0" opacity={0.6} reveal={reveal} />
      <group ref={group}>
        <mesh ref={earthMesh} onClick={(e) => { e.stopPropagation(); onSelect("earth"); }}>
          <sphereGeometry args={[EARTH_R, 64, 64]} />
          <meshStandardMaterial map={earthTex} roughness={0.7} metalness={0.05} />
        </mesh>
        <mesh ref={cloudsMesh} scale={1.025}>
          <sphereGeometry args={[EARTH_R, 48, 48]} />
          <meshStandardMaterial map={cloudsTex} transparent opacity={0.85} depthWrite={false} />
        </mesh>
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
        {showLabels && (
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
          {showLabels && (
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
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
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
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.045, 10, 48]} />
      <meshBasicMaterial color="#FFB02E" toneMapped={false} />
    </mesh>
  );
}

function Asteroid({ data, clock, onSelect, selected, isScanTarget, reveal, phase }) {
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
        reveal={reveal}
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
        {phase === "play" && (sel || isScanTarget) && (
          <Html position={[0, params.size + 0.55, 0]} center distanceFactor={36} style={labelStyle(true)}>
            {isScanTarget ? "📡 " : "☄️ "}{data.name}
          </Html>
        )}
      </group>
    </>
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

/**
 * REŻYSER KAMERY
 *  intro     — wisi tuż nad Ziemią, delikatny dryf (planeta wypełnia kadr)
 *  launch    — filmowy odlot ~6 s, easing, na końcu onLaunchDone()
 *  earth     — podąża za Ziemią
 *  moon      — przelot do Księżyca i podążanie za nim
 *  cinematic — fly-through przez scenę
 *  free      — OrbitControls
 */
function CameraDirector({ mode, earthPos, moonPos, controlsRef, onLaunchDone }) {
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const launchT = useRef(0);
  const driftT = useRef(0);

  useEffect(() => {
    if (mode === "launch") launchT.current = 0;
  }, [mode]);

  useFrame((state, dt) => {
    const ctrl = controlsRef.current;
    const ep = earthPos.current;

    if (mode === "intro") {
      driftT.current += dt;
      const a = driftT.current * 0.05;
      // tuż nad 'powierzchnią': ~1.45 jednostki od środka (promień 0.95 + atmosfera)
      const d = 1.45;
      tmp.set(ep.x + Math.cos(a) * d, ep.y + 0.35, ep.z + Math.sin(a) * d);
      camera.position.lerp(tmp, 0.08);
      tgt.set(ep.x, ep.y + 0.15, ep.z);
      camera.lookAt(tgt);
      if (ctrl) { ctrl.target.copy(tgt); }
    } else if (mode === "launch") {
      launchT.current += dt / 6.0; // 6 sekund
      const k = easeInOut(Math.min(1, launchT.current));
      const dist = 1.45 + k * 7.0;     // 1.45 → 8.45
      const height = 0.35 + k * 2.6;   // 0.35 → ~3
      const a = driftT.current * 0.05 + k * 1.2; // lekki obrót w trakcie odlotu
      tmp.set(ep.x + Math.cos(a) * dist, ep.y + height, ep.z + Math.sin(a) * dist);
      camera.position.lerp(tmp, 0.12);
      tgt.copy(ep);
      camera.lookAt(tgt);
      if (ctrl) ctrl.target.copy(tgt);
      if (launchT.current >= 1) onLaunchDone();
    } else if (mode === "earth") {
      tmp.copy(ep).add(new THREE.Vector3(3.2, 1.4, 3.2));
      camera.position.lerp(tmp, 0.06);
      if (ctrl) { ctrl.target.lerp(ep, 0.1); ctrl.update(); }
    } else if (mode === "moon") {
      const mp = moonPos.current;
      tmp.copy(mp).add(new THREE.Vector3(0.9, 0.35, 0.9));
      camera.position.lerp(tmp, 0.05);
      if (ctrl) { ctrl.target.lerp(mp, 0.08); ctrl.update(); }
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

  const clock = useRef({ t: 0 });
  const earthPos = useRef(new THREE.Vector3(EARTH_ORBIT_R, 0, 0));
  const moonPos = useRef(new THREE.Vector3(EARTH_ORBIT_R + MOON_ORBIT_R, 0, 0));
  const reveal = useRef({ v: 0 });
  const controlsRef = useRef();

  const guardianActive = phase === "play" && missionIndex >= 3;
  const currentMission = MISSIONS[missionIndex];

  /* globalny fullscreen bez scrolli */
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `html, body, #root { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background:#03050C; }`;
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
    safeStorage.save({ completed, pilot, scanCount, missionIndex });
  }, [completed, pilot, scanCount, missionIndex]);

  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3500);
  }, []);

  /* start misji = odlot */
  const startMission = () => {
    setPhase("launch");
    setCameraMode("launch");
  };
  const onLaunchDone = useCallback(() => {
    setPhase("play");
    setCameraMode("free");
    showToast(`🚀 Witaj na orbicie, ${pilot}! Centrum dowodzenia aktywne.`);
  }, [pilot, showToast]);

  /* wybór celu skanowania */
  const pickScanTarget = useCallback((exclude) => {
    const pool = asteroids.filter((a) => a.id !== exclude);
    const next = pool[Math.floor(Math.random() * pool.length)];
    setScanTargetId(next?.id || null);
    if (next) showToast(`📡 Centrum wykryło obiekt: ${next.name}. Znajdź pomarańczowy marker! 🔍`);
  }, [asteroids, showToast]);

  /* misja 2 i tryb Strażnika potrzebują celu */
  useEffect(() => {
    if (phase === "play" && (missionIndex === 1 || missionIndex >= 3) && !scanTargetId) {
      pickScanTarget(null);
    }
  }, [phase, missionIndex, scanTargetId, pickScanTarget]);

  const completeCurrentMission = useCallback(() => {
    const m = MISSIONS[missionIndex];
    setCompleted((c) => (c.includes(m.id) ? c : [...c, m.id]));
    showToast(`🎉 Misja wykonana! Odznaka: ${m.badge.icon} ${m.badge.name}!`);
    if (missionIndex < MISSIONS.length - 1) {
      window.setTimeout(() => setMissionIndex((i) => Math.min(i + 1, MISSIONS.length - 1)), 2200);
    }
  }, [missionIndex, showToast]);

  const handleSelect = useCallback((id) => {
    if (phase !== "play") return;
    setSelectedId(id);

    /* logika misji sekwencyjnych */
    if (missionIndex === 0 && id === "satellite") {
      completeCurrentMission();
      return;
    }
    if ((missionIndex === 1 || missionIndex >= 3) && scanTargetId) {
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
      if (id !== "sun" && id !== "earth" && id !== "moon" && id !== "satellite") {
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
  }, [phase, missionIndex, scanTargetId, scanCount, asteroids, completed, completeCurrentMission, pickScanTarget, showToast]);

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

  return (
    <div style={S.app}>
      <Canvas
        style={{ position: "absolute", inset: 0 }}
        camera={{ position: [EARTH_ORBIT_R + 1.45, 0.35, 0], fov: 60, near: 0.05, far: 600 }}
        onPointerMissed={() => setSelectedId(null)}
        gl={{ antialias: true }}
        dpr={[1, 1.75]}
      >
        <color attach="background" args={["#03050C"]} />
        <ambientLight intensity={0.16} />
        <Stars radius={180} depth={60} count={5000} factor={4} saturation={0} fade speed={0.5} />
        <Nebulae />
        <SpaceDust reveal={reveal} />
        <SimulationClock clock={clock} timeScale={phase === "intro" ? 0.4 : timeScale} />
        <RevealDriver reveal={reveal} phase={phase} />
        <CameraDirector mode={cameraMode} earthPos={earthPos} moonPos={moonPos} controlsRef={controlsRef} onLaunchDone={onLaunchDone} />

        <Sun onSelect={handleSelect} selected={selectedId} />
        <EarthSystem
          clock={clock} earthPos={earthPos} moonPos={moonPos}
          onSelect={handleSelect} selected={selectedId}
          guardianActive={guardianActive} reveal={reveal} phase={phase}
        />
        {asteroids.map((a) => (
          <Asteroid
            key={a.id} data={a} clock={clock} onSelect={handleSelect}
            selected={selectedId} isScanTarget={a.id === scanTargetId}
            reveal={reveal} phase={phase}
          />
        ))}

        <OrbitControls
          ref={controlsRef}
          enabled={phase === "play" && cameraMode === "free"}
          enablePan={false}
          minDistance={1.6}
          maxDistance={45}
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
          <div style={S.objectiveBar}>
            <span style={S.objectiveDots}>
              {MISSIONS.map((m, i) => (
                <span key={m.id} style={{ ...S.dot, ...(completed.includes(m.id) ? S.dotDone : i === missionIndex ? S.dotActive : {}) }} />
              ))}
            </span>
            <span style={S.objectiveText}>
              {allDone && missionIndex >= 3
                ? `🛡 STRAŻNIK ${pilot.toUpperCase()} NA SŁUŻBIE · skany: ${scanCount}`
                : currentMission.objective}
            </span>
            <button style={S.badgeToggle} onClick={() => setBadgesOpen((o) => !o)} title="Odznaki">
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

          {/* DOCK — czas + kamera w jednym slim pasku */}
          <div style={S.dock}>
            {[[0, "⏸"], [1, "1×"], [10, "10×"], [100, "100×"]].map(([v, label]) => (
              <button key={v} onClick={() => setTimeScale(v)} title={`Czas ${label}`}
                style={{ ...S.dockBtn, ...(timeScale === v ? S.dockBtnActive : {}) }}>
                {label}
              </button>
            ))}
            <span style={S.dockDivider} />
            {[["earth", "🔭", "Skup na Ziemi"], ["cinematic", "🎬", "Odkrywca Kosmosu"], ["free", "🖐", "Wolna kamera"]].map(([m, icon, title]) => (
              <button key={m} onClick={() => setCameraMode(m)} title={title}
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
            </div>
          )}
        </>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ ...S.toast, borderColor: toast.ok ? "#5EE6A0" : "#FFB02E" }}>{toast.msg}</div>
      )}

      {/* mikro-disclaimer */}
      <div style={S.microFooter}>
        ℹ️ uproszczona wizualizacja edukacyjna · skala nieprawdziwa · to nie system astronomiczny ani ostrzegawczy · dane: NASA NeoWs
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
  objectiveText: { fontSize: 13.5, fontWeight: 700, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
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
    display: "flex", alignItems: "center", gap: 6,
    background: "rgba(6,10,24,0.72)", backdropFilter: "blur(8px)",
    border: "1px solid rgba(30,58,95,0.9)", borderRadius: 999,
    padding: "6px 10px", zIndex: 10, boxShadow: "0 4px 24px rgba(0,0,0,0.45)",
  },
  dockBtn: {
    fontSize: 14, fontWeight: 800, minWidth: 38, padding: "7px 9px", borderRadius: 999,
    border: "1px solid transparent", background: "transparent", color: "#9FB6D4", cursor: "pointer",
  },
  dockBtnActive: {
    color: "#04121C", background: "#2FE6C8",
    boxShadow: "0 0 12px rgba(47,230,200,0.55)",
  },
  dockDivider: { width: 1, height: 20, background: "#1E3A5F", margin: "0 4px" },

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
