import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import * as THREE from "three";

/* ============================================================
   COPERNIX SPACE LAB 3D — "Orbitarium Dominika"
   Edukacyjna symulacja 3D dla dziecka 7–10 lat.

   Stack: React + Vite + three + @react-three/fiber + @react-three/drei
   Instalacja w projekcie Vite:
     npm i three @react-three/fiber @react-three/drei

   - jeden plik, bez backendu, bez auth, bez płatności
   - dane asteroid: mock realistyczny + przygotowane fetchNASAData()
     pod NASA NeoWs (api.nasa.gov)
   - UWAGA: wizualizacja jest UPROSZCZONA (skala i orbity nie są
     prawdziwe) — patrz disclaimer na dole ekranu
   ============================================================ */

/* ---------------- Bezpieczny zapis postępu ---------------- */
const STORAGE_KEY = "copernix_space_lab_3d_v1";

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
      /* brak localStorage — gramy bez zapisu */
    }
  },
};

/* ---------------- Stałe i pomocnicze ---------------- */
const LUNAR_KM = 384400;
const fmt = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function toLunar(km) {
  return (km / LUNAR_KM).toFixed(1);
}

function hash01(str, salt = 0) {
  let h = salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 100000;
  return (h % 1000) / 1000;
}

/* ---------------- Dane mock (realistyczne wartości NEO) ---------------- */
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

/* ---------------- NASA NeoWs (gotowe do użycia) ---------------- */
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Pobiera obiekty bliskie Ziemi z NASA NeoWs (7 najbliższych dni).
 * Zwraca tablicę w formacie zgodnym z MOCK_ASTEROIDS.
 * Rzuca błąd przy problemie z siecią/API — wtedy aplikacja
 * automatycznie używa danych mock.
 * Wskazówka: zamień DEMO_KEY na własny klucz z api.nasa.gov,
 * żeby zwiększyć limit zapytań.
 */
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

  if (out.length === 0) throw new Error("Brak obiektów w odpowiedzi NeoWs");
  return out.sort((a, b) => a.missKm - b.missKm).slice(0, 10);
}

/* ---------------- Karty informacyjne obiektów stałych ---------------- */
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
    fact: "Na Księżycu były 12 osoby — a ślady ich butów zostaną tam na miliony lat, bo nie ma wiatru!",
  },
};

/* ---------------- Misje ---------------- */
const MISSIONS = [
  {
    id: "find_earth",
    icon: "🌍",
    title: "Znajdź Ziemię",
    text: "Obróć kamerę i kliknij naszą niebieską planetę!",
    badge: { icon: "🧭", name: "Nawigator" },
  },
  {
    id: "find_moon",
    icon: "🌙",
    title: "Znajdź Księżyc",
    text: "Mała kula krąży wokół Ziemi. Przybliż się i kliknij ją!",
    badge: { icon: "🔭", name: "Obserwator" },
  },
  {
    id: "closest_asteroid",
    icon: "🎯",
    title: "Najbliższa asteroida",
    text: "Kliknij asteroidę, która przelatuje NAJBLIŻEJ Ziemi. Sprawdzaj odległości na kartach!",
    badge: { icon: "🥇", name: "Tropiciel Orbit" },
  },
  {
    id: "guardian",
    icon: "🛡️",
    title: "Tryb Strażnika Ziemi",
    text: "Włącz tarczę obserwacyjną i obejmij wszystkie asteroidy kosmicznym nadzorem!",
    badge: { icon: "🛡️", name: "STRAŻNIK ZIEMI" },
  },
];

/* ============================================================
   SCENA 3D — komponenty
   ============================================================ */

/** Linia orbity (okrąg) w płaszczyźnie z opcjonalnym nachyleniem */
function OrbitRing({ radius, inclination = 0, color = "#1E3A5F", opacity = 0.6 }) {
  const points = useMemo(() => {
    const pts = [];
    const N = 128;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);

  const geom = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  return (
    <group rotation={[inclination, 0, 0]}>
      <line geometry={geom}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </line>
    </group>
  );
}

/** Słońce — świecąca kula + światło punktowe */
function Sun({ onSelect, selected }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05;
  });
  return (
    <group>
      <pointLight intensity={2.2} distance={300} decay={0.4} color="#FFF3D6" />
      <mesh
        ref={ref}
        onClick={(e) => {
          e.stopPropagation();
          onSelect("sun");
        }}
      >
        <sphereGeometry args={[4, 48, 48]} />
        <meshBasicMaterial color="#FFD24D" />
      </mesh>
      {/* poświata */}
      <mesh scale={1.35}>
        <sphereGeometry args={[4, 32, 32]} />
        <meshBasicMaterial color="#FF9E2C" transparent opacity={0.18} />
      </mesh>
      <mesh scale={1.8}>
        <sphereGeometry args={[4, 32, 32]} />
        <meshBasicMaterial color="#FF7A00" transparent opacity={0.07} />
      </mesh>
      <Html position={[0, 6.2, 0]} center distanceFactor={60} style={labelStyle(selected === "sun")}>
        ☀️ Słońce
      </Html>
    </group>
  );
}

/** Ziemia + Księżyc — pozycje liczone z zegara symulacji */
function EarthSystem({ clock, onSelect, selected, guardianActive }) {
  const earthGroup = useRef();
  const earthMesh = useRef();
  const moonMesh = useRef();
  const shieldRef = useRef();

  const EARTH_ORBIT_R = 20;
  const MOON_ORBIT_R = 2.6;

  useFrame((_, dt) => {
    const t = clock.current.t;
    // Ziemia wokół Słońca (1 "rok" ≈ 120 s przy 1x)
    const ea = t * 0.052;
    const ex = Math.cos(ea) * EARTH_ORBIT_R;
    const ez = Math.sin(ea) * EARTH_ORBIT_R;
    if (earthGroup.current) earthGroup.current.position.set(ex, 0, ez);
    if (earthMesh.current) earthMesh.current.rotation.y += dt * 0.4;
    // Księżyc wokół Ziemi (szybciej)
    const ma = t * 0.65;
    if (moonMesh.current) {
      moonMesh.current.position.set(Math.cos(ma) * MOON_ORBIT_R, 0.25 * Math.sin(ma), Math.sin(ma) * MOON_ORBIT_R);
    }
    // tarcza Strażnika — pulsowanie
    if (shieldRef.current) {
      const s = 1 + 0.06 * Math.sin(t * 2.2);
      shieldRef.current.scale.set(s, s, s);
      shieldRef.current.rotation.y += dt * 0.3;
    }
  });

  return (
    <>
      <OrbitRing radius={EARTH_ORBIT_R} color="#2F6FB0" opacity={0.7} />
      <group ref={earthGroup}>
        {/* Ziemia */}
        <mesh
          ref={earthMesh}
          onClick={(e) => {
            e.stopPropagation();
            onSelect("earth");
          }}
        >
          <sphereGeometry args={[1.3, 48, 48]} />
          <meshStandardMaterial color="#1E78C8" roughness={0.55} metalness={0.1} emissive="#0A2E5C" emissiveIntensity={0.25} />
        </mesh>
        {/* "kontynenty" — druga warstwa */}
        <mesh scale={1.004}>
          <sphereGeometry args={[1.3, 24, 24]} />
          <meshStandardMaterial color="#3FA66A" roughness={0.9} transparent opacity={0.35} wireframe />
        </mesh>
        {/* atmosfera */}
        <mesh scale={1.12}>
          <sphereGeometry args={[1.3, 32, 32]} />
          <meshBasicMaterial color="#7FD4FF" transparent opacity={0.12} />
        </mesh>
        {selected === "earth" && <SelectionRing radius={2.0} />}

        {/* Tarcza Strażnika Ziemi */}
        {guardianActive && (
          <mesh ref={shieldRef}>
            <sphereGeometry args={[2.4, 24, 24]} />
            <meshBasicMaterial color="#2FE6C8" wireframe transparent opacity={0.32} />
          </mesh>
        )}

        <Html position={[0, 2.6, 0]} center distanceFactor={55} style={labelStyle(selected === "earth")}>
          🌍 Ziemia
        </Html>

        {/* orbita Księżyca */}
        <OrbitRing radius={MOON_ORBIT_R} color="#3D6491" opacity={0.45} />
        {/* Księżyc */}
        <mesh
          ref={moonMesh}
          onClick={(e) => {
            e.stopPropagation();
            onSelect("moon");
          }}
        >
          <sphereGeometry args={[0.38, 32, 32]} />
          <meshStandardMaterial color="#B9C2CF" roughness={0.95} />
          {selected === "moon" && <SelectionRing radius={0.7} />}
        </mesh>
      </group>
    </>
  );
}

/** Pierścień zaznaczenia wokół wybranego obiektu */
function SelectionRing({ radius }) {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 1.5;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.035, 12, 64]} />
      <meshBasicMaterial color="#2FE6C8" />
    </mesh>
  );
}

/** Pojedyncza asteroida na uproszczonej, nachylonej orbicie */
function Asteroid({ data, clock, onSelect, selected, guardianActive }) {
  const ref = useRef();
  const scanRef = useRef();

  /* parametry orbity wyliczone deterministycznie z id —
     im bliżej Ziemi w danych, tym mniejszy promień orbity */
  const params = useMemo(() => {
    const t = Math.min(1, data.missKm / 9000000);
    return {
      radius: 15 + t * 16 + hash01(data.id, 7) * 2, // 15–33
      speed: 0.03 + (data.speedKmh / 70000) * 0.06,
      inclination: (hash01(data.id, 13) - 0.5) * 0.7,
      phase: hash01(data.id, 29) * Math.PI * 2,
      size: Math.max(0.22, Math.min(0.85, 0.18 + Math.sqrt(data.diameterM) / 38)),
      tumble: 0.4 + hash01(data.id, 41) * 1.2,
    };
  }, [data]);

  useFrame((_, dt) => {
    const t = clock.current.t;
    const a = params.phase + t * params.speed;
    const x = Math.cos(a) * params.radius;
    const z = Math.sin(a) * params.radius;
    const y = Math.sin(a) * Math.sin(params.inclination) * params.radius * 0.4;
    if (ref.current) {
      ref.current.position.set(x, y, z);
      ref.current.rotation.x += dt * params.tumble;
      ref.current.rotation.y += dt * params.tumble * 0.7;
    }
    if (scanRef.current) {
      scanRef.current.position.set(x, y, z);
      const s = 1 + 0.25 * Math.sin(t * 3 + params.phase);
      scanRef.current.scale.set(s, s, s);
    }
  });

  const sel = selected === data.id;
  const baseColor = data.hazardous ? "#C98A4B" : "#8C9BB5";

  return (
    <>
      <OrbitRing radius={params.radius} inclination={params.inclination} color={sel ? "#2FE6C8" : "#16294A"} opacity={sel ? 0.9 : 0.5} />
      <group ref={ref}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(data.id);
          }}
        >
          <icosahedronGeometry args={[params.size, 0]} />
          <meshStandardMaterial color={sel ? "#2FE6C8" : baseColor} flatShading roughness={0.9} emissive={sel ? "#2FE6C8" : "#000000"} emissiveIntensity={sel ? 0.5 : 0} />
        </mesh>
        {sel && <SelectionRing radius={params.size + 0.45} />}
        <Html position={[0, params.size + 0.7, 0]} center distanceFactor={55} style={labelStyle(sel)}>
          ☄️ {data.name}
        </Html>
      </group>
      {/* pierścień skanowania w trybie Strażnika */}
      {guardianActive && (
        <mesh ref={scanRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[params.size + 0.6, 0.03, 8, 48]} />
          <meshBasicMaterial color="#5EE6A0" transparent opacity={0.8} />
        </mesh>
      )}
    </>
  );
}

/** Zegar symulacji — przesuwa czas zgodnie z mnożnikiem */
function SimulationClock({ clock, timeScale }) {
  useFrame((_, dt) => {
    clock.current.t += dt * timeScale;
  });
  return null;
}

/** Delikatny start kamery */
function CameraRig() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 26, 46);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
}

function labelStyle(active) {
  return {
    color: active ? "#2FE6C8" : "#9FB6D4",
    fontFamily: "monospace",
    fontSize: 13,
    whiteSpace: "nowrap",
    textShadow: "0 0 6px #060A18, 0 0 10px #060A18",
    pointerEvents: "none",
    userSelect: "none",
  };
}

/* ============================================================
   GŁÓWNY KOMPONENT
   ============================================================ */
export default function CopernixSpaceLab3D() {
  const [asteroids, setAsteroids] = useState(MOCK_ASTEROIDS);
  const [dataSource, setDataSource] = useState("loading"); // loading | nasa | mock
  const [selectedId, setSelectedId] = useState(null); // "sun" | "earth" | "moon" | asteroid.id
  const [timeScale, setTimeScale] = useState(1); // 0 | 1 | 10 | 100
  const [guardianActive, setGuardianActive] = useState(false);
  const [completed, setCompleted] = useState(() => safeStorage.load()?.completed || []);
  const [pilot, setPilot] = useState(() => safeStorage.load()?.pilot || "Dominik");
  const [toast, setToast] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const clock = useRef({ t: 0 });

  /* NASA z fallbackiem do mock */
  useEffect(() => {
    let alive = true;
    fetchNASAData()
      .then((list) => {
        if (!alive) return;
        setAsteroids(list);
        setDataSource("nasa");
      })
      .catch(() => {
        if (!alive) return;
        setAsteroids(MOCK_ASTEROIDS);
        setDataSource("mock");
      });
    return () => {
      alive = false;
    };
  }, []);

  /* zapis postępu */
  useEffect(() => {
    safeStorage.save({ completed, pilot });
  }, [completed, pilot]);

  const showToast = useCallback((msg, ok = true) => {
    setToast({ msg, ok });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const completeMission = useCallback(
    (missionId) => {
      const m = MISSIONS.find((x) => x.id === missionId);
      if (!m) return;
      setCompleted((c) => {
        if (c.includes(missionId)) return c;
        showToast(`🎉 Misja "${m.title}" wykonana! Odznaka: ${m.badge.icon} ${m.badge.name}!`);
        return [...c, missionId];
      });
    },
    [showToast]
  );

  /* logika kliknięć + misji */
  const closestId = useMemo(
    () => [...asteroids].sort((a, b) => a.missKm - b.missKm)[0]?.id,
    [asteroids]
  );

  const handleSelect = useCallback(
    (id) => {
      setSelectedId(id);
      setPanelOpen(true);
      if (id === "earth") completeMission("find_earth");
      if (id === "moon") completeMission("find_moon");
      if (id === closestId) completeMission("closest_asteroid");
      else if (id !== "sun" && id !== "earth" && id !== "moon" && !completed.includes("closest_asteroid")) {
        const a = asteroids.find((x) => x.id === id);
        if (a) showToast(`☄️ ${a.name} — ciekawa, ale jest jeszcze bliższa! Porównaj odległości 🌕`, false);
      }
    },
    [closestId, completeMission, asteroids, completed, showToast]
  );

  const toggleGuardian = () => {
    const next = !guardianActive;
    setGuardianActive(next);
    if (next) {
      completeMission("guardian");
      showToast("🛡️ Tarcza Strażnika aktywna! Wszystkie asteroidy pod obserwacją. Ziemia jest bezpieczna!");
    }
  };

  /* karta wybranego obiektu */
  const selectedInfo = useMemo(() => {
    if (!selectedId) return null;
    if (BODY_INFO[selectedId]) return BODY_INFO[selectedId];
    const a = asteroids.find((x) => x.id === selectedId);
    if (!a) return null;
    return {
      name: a.name,
      type: a.hazardous ? "☄️ Asteroida — NASA ma ją na oku (wszystko pod kontrolą!)" : "☄️ Asteroida — spokojna trasa",
      distance: `${fmt.format(a.missKm)} km od Ziemi (to ${toLunar(a.missKm)} Księżyców! 🌕)`,
      speed: `${fmt.format(a.speedKmh)} km/h (≈ ${Math.round(a.speedKmh / 900)}× szybciej niż samolot ✈️)`,
      fact: `Ma około ${fmt.format(a.diameterM)} m średnicy. Asteroidy to kosmiczne skały starsze niż dinozaury — pamiętają początki Układu Słonecznego!`,
    };
  }, [selectedId, asteroids]);

  const allDone = completed.length >= MISSIONS.length;

  return (
    <div style={S.app}>
      {/* ====== SCENA 3D ====== */}
      <Canvas
        style={{ position: "absolute", inset: 0, width: "100vw", height: "100vh" }}
        camera={{ fov: 55, near: 0.1, far: 1000 }}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        eventPrefix="client"
        onPointerMissed={() => setSelectedId(null)}
      >
        <color attach="background" args={["#05070F"]} />
        <ambientLight intensity={0.18} />
        <Stars radius={220} depth={60} count={4000} factor={4} saturation={0} fade speed={0.6} />
        <CameraRig />
        <SimulationClock clock={clock} timeScale={timeScale} />

        <Sun onSelect={handleSelect} selected={selectedId} />
        <EarthSystem clock={clock} onSelect={handleSelect} selected={selectedId} guardianActive={guardianActive} />
        {asteroids.map((a) => (
          <Asteroid key={a.id} data={a} clock={clock} onSelect={handleSelect} selected={selectedId} guardianActive={guardianActive} />
        ))}

        <OrbitControls enablePan={false} minDistance={6} maxDistance={120} dampingFactor={0.08} enableDamping />
      </Canvas>

      {/* ====== NAGŁÓWEK ====== */}
      <header style={S.header}>
        <div>
          <div style={S.brand}>COPERNIX SPACE LAB 3D</div>
          <div style={S.title}>🛡️ Orbitarium {pilot}a</div>
        </div>
        <div style={S.dataBadge}>
          {dataSource === "loading" && "📡 Łączę z NASA…"}
          {dataSource === "nasa" && "📡 DANE NA ŻYWO: NASA"}
          {dataSource === "mock" && "🗂️ DANE TRENINGOWE"}
        </div>
      </header>

      {/* ====== STEROWANIE CZASEM ====== */}
      <div style={S.timeBar}>
        <span style={S.timeLabel}>⏱ CZAS:</span>
        {[
          [0, "⏸ Pauza"],
          [1, "1×"],
          [10, "10×"],
          [100, "100×"],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTimeScale(v)}
            style={{ ...S.timeBtn, ...(timeScale === v ? S.timeBtnActive : {}) }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={toggleGuardian}
          style={{ ...S.guardianBtn, ...(guardianActive ? S.guardianBtnOn : {}) }}
        >
          🛡️ {guardianActive ? "TARCZA AKTYWNA" : "Tryb Strażnika Ziemi"}
        </button>
      </div>

      {/* ====== PANEL: MISJE + ODZNAKI ====== */}
      <div style={S.missionPanel}>
        <button style={S.missionToggle} onClick={() => setPanelOpen((o) => !o)}>
          🚀 MISJE {panelOpen ? "▾" : "▸"}
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
              <div style={S.winBox}>
                🛡️ {pilot.toUpperCase()} = STRAŻNIK ZIEMI! Wszystkie misje wykonane! 🌍✨
              </div>
            )}
            <input
              style={S.pilotInput}
              value={pilot}
              maxLength={14}
              onChange={(e) => setPilot(e.target.value)}
              aria-label="Imię pilota"
            />
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

      {/* ====== TOAST ====== */}
      {toast && (
        <div style={{ ...S.toast, borderColor: toast.ok ? "#5EE6A0" : "#FFB02E" }}>
          {toast.msg}
        </div>
      )}

      {/* ====== DISCLAIMER ====== */}
      <footer style={S.footer}>
        ℹ️ Uproszczona wizualizacja edukacyjna — odległości, rozmiary i orbity NIE są w prawdziwej skali.
        To nie jest system astronomiczny ani ostrzegawczy. Dane: NASA NeoWs (api.nasa.gov).
      </footer>
    </div>
  );
}

/* ============================================================
   STYLE UI — neonowe panele centrum misji
   ============================================================ */
const S = {
  app: {
    position: "relative",
    width: "100%",
    height: "100vh",
    overflow: "hidden",
    background: "#05070F",
    color: "#E6EEF8",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    userSelect: "none",
  },
  header: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    pointerEvents: "none",
    zIndex: 10,
  },
  brand: { fontFamily: "monospace", letterSpacing: 4, fontSize: 11, color: "#2FE6C8" },
  title: { fontSize: 22, fontWeight: 800, textShadow: "0 0 12px rgba(0,0,0,0.8)" },
  dataBadge: {
    fontFamily: "monospace",
    fontSize: 12,
    border: "1px solid #3D6491",
    borderRadius: 999,
    padding: "6px 12px",
    color: "#9FB6D4",
    background: "rgba(11,16,38,0.85)",
  },
  timeBar: {
    position: "absolute",
    bottom: 64,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    background: "rgba(11,16,38,0.88)",
    border: "1px solid #1E3A5F",
    borderRadius: 16,
    padding: "10px 14px",
    zIndex: 10,
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  },
  timeLabel: { fontFamily: "monospace", fontSize: 12, letterSpacing: 2, color: "#6E89AB" },
  timeBtn: {
    fontSize: 15,
    fontWeight: 800,
    padding: "10px 16px",
    borderRadius: 12,
    border: "2px solid #1E3A5F",
    background: "rgba(16,26,56,0.8)",
    color: "#9FB6D4",
    cursor: "pointer",
  },
  timeBtnActive: {
    borderColor: "#2FE6C8",
    background: "#2FE6C8",
    color: "#0B1026",
    boxShadow: "0 0 14px rgba(47,230,200,0.55)",
  },
  guardianBtn: {
    fontSize: 15,
    fontWeight: 800,
    padding: "10px 16px",
    borderRadius: 12,
    border: "2px solid #FFD24D",
    background: "rgba(16,26,56,0.8)",
    color: "#FFD24D",
    cursor: "pointer",
    marginLeft: 6,
  },
  guardianBtnOn: {
    background: "#FFD24D",
    color: "#0B1026",
    boxShadow: "0 0 18px rgba(255,210,77,0.6)",
  },
  missionPanel: {
    position: "absolute",
    top: 70,
    left: 16,
    width: 290,
    maxWidth: "calc(100vw - 32px)",
    zIndex: 10,
  },
  missionToggle: {
    fontFamily: "monospace",
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: 700,
    color: "#2FE6C8",
    background: "rgba(11,16,38,0.88)",
    border: "1px solid #1E3A5F",
    borderRadius: 12,
    padding: "9px 14px",
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
  },
  missionList: {
    marginTop: 8,
    background: "rgba(11,16,38,0.88)",
    border: "1px solid #1E3A5F",
    borderRadius: 14,
    padding: 10,
    display: "grid",
    gap: 8,
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  },
  missionRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    border: "1px solid #1E3A5F",
    borderRadius: 10,
    padding: "8px 10px",
    background: "rgba(16,26,56,0.6)",
  },
  missionRowDone: { borderColor: "#5EE6A0", opacity: 0.9 },
  missionTitle: { fontSize: 14, fontWeight: 800 },
  missionText: { fontSize: 12.5, color: "#9FB6D4", lineHeight: 1.4, marginTop: 2 },
  winBox: {
    border: "2px solid #FFD24D",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 13.5,
    fontWeight: 800,
    color: "#FFD24D",
    textAlign: "center",
    lineHeight: 1.5,
    boxShadow: "0 0 20px rgba(255,210,77,0.4)",
  },
  pilotInput: {
    background: "#101A38",
    border: "2px solid #2FE6C8",
    borderRadius: 10,
    color: "#E6EEF8",
    fontSize: 14,
    fontWeight: 700,
    padding: "7px 10px",
    width: "100%",
    boxSizing: "border-box",
  },
  infoCard: {
    position: "absolute",
    right: 16,
    top: 70,
    width: 320,
    maxWidth: "calc(100vw - 32px)",
    background: "rgba(11,16,38,0.92)",
    border: "1px solid #2FE6C8",
    borderRadius: 16,
    padding: "16px 16px 14px",
    zIndex: 10,
    boxShadow: "0 0 24px rgba(47,230,200,0.25), 0 8px 30px rgba(0,0,0,0.5)",
  },
  infoClose: {
    position: "absolute",
    top: 8,
    right: 10,
    background: "transparent",
    border: "none",
    color: "#6E89AB",
    fontSize: 18,
    cursor: "pointer",
  },
  infoName: { fontSize: 22, fontWeight: 800, marginBottom: 2 },
  infoType: { fontSize: 13.5, color: "#9FB6D4", marginBottom: 12 },
  infoRow: { borderTop: "1px dashed #1E3A5F", padding: "8px 0", fontSize: 14.5, lineHeight: 1.45 },
  infoLabel: { display: "block", fontFamily: "monospace", fontSize: 11, letterSpacing: 1.5, color: "#6E89AB", marginBottom: 2 },
  infoFact: {
    marginTop: 10,
    background: "rgba(47,230,200,0.08)",
    border: "1px solid rgba(47,230,200,0.35)",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13.5,
    lineHeight: 1.5,
    color: "#CFEDE6",
  },
  toast: {
    position: "absolute",
    bottom: 130,
    left: "50%",
    transform: "translateX(-50%)",
    maxWidth: "min(560px, calc(100vw - 32px))",
    background: "rgba(11,16,38,0.95)",
    border: "2px solid",
    borderRadius: 14,
    padding: "12px 16px",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.45,
    textAlign: "center",
    zIndex: 20,
    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "8px 16px",
    fontSize: 11,
    fontFamily: "monospace",
    color: "#6E89AB",
    background: "rgba(5,7,15,0.85)",
    borderTop: "1px solid #14213D",
    lineHeight: 1.5,
    zIndex: 10,
  },
};
