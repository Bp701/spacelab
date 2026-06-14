import { useState } from "react";
import { CITY_TILE_IDS, loadCityLayout, cityHasAllTypes } from "./CityBuilderLite";

/* ============================================================
   BADGE GALLERY + PROGRESS WORLD — panel tylko do odczytu
   ============================================================ */

const PLANET_IDS = ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"];
const PLANET_SET = new Set(PLANET_IDS);
const TERRA_IDS = ["katedra", "lyna", "most"];
const TERRA_SET = new Set(TERRA_IDS);

/* ---------- bezpieczne odczyty localStorage ---------- */
function safeArray(key, set) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const arr = parsed.filter((x) => typeof x === "string");
    return set ? arr.filter((x) => set.has(x)) : arr;
  } catch {
    return [];
  }
}
function safeObject(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function safeBool(key) {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function readProgress() {
  const planets = new Set(safeArray("spacelab_discovered_planets", PLANET_SET));
  const probes = safeObject("spacelab_probe_missions");
  let totalProbes = 0;
  let planetsWithProbe = 0;
  for (const [id, n] of Object.entries(probes)) {
    if (PLANET_SET.has(id) && typeof n === "number" && Number.isFinite(n) && n > 0) {
      totalProbes += Math.floor(n);
      planetsWithProbe += 1;
    }
  }
  const anomaly = safeBool("spacelab_anomaly_discovered");
  const aurora = safeBool("spacelab_aurora_mission_done");
  const dominik = safeBool("spacelab_dominik_demo_done");
  const satelliteScan = safeBool("spacelab_satellite_scan_done");
  const pluto = safeBool("spacelab_pluto_discovered");
  const sirius = safeBool("spacelab_sirius_discovered");
  const terra = new Set(safeArray("spacelab_discovered_terra", TERRA_SET)).size;
  const beacons = new Set(safeArray("spacelab_terra_beacons", TERRA_SET)).size;
  const cityLayout = loadCityLayout();
  const cityTypes = new Set(Object.values(cityLayout)).size;
  const cityAll = cityHasAllTypes(cityLayout);
  return {
    planetCount: planets.size,
    totalProbes,
    planetsWithProbe,
    anomaly,
    aurora,
    dominik,
    satelliteScan,
    pluto,
    sirius,
    terra,
    beacons,
    cityTypes,
    cityAll,
  };
}

function buildBadges(p) {
  return [
    {
      section: "Kosmos",
      items: [
        { icon: "🪐", name: "Pilot Układu Słonecznego", unlocked: p.planetCount >= 8, progress: `Planety: ${p.planetCount}/8` },
        { icon: "🚀", name: "Operator Sondy", unlocked: p.totalProbes >= 1, progress: `Sondy wysłane: ${p.totalProbes}` },
        { icon: "🛰️", name: "Badacz Planet", unlocked: p.planetsWithProbe >= 3, progress: `Sondy do różnych planet: ${Math.min(p.planetsWithProbe, 3)}/3` },
        { icon: "✨", name: "Badacz Anomalii", unlocked: p.anomaly, progress: p.anomaly ? "Sygnał zapisany" : "Zeskanuj anomalię" },
        { icon: "🌌", name: "Łowca Zorzy", unlocked: p.aurora, progress: p.aurora ? "Pokaz zorzy ukończony" : "Uruchom pokaz pogody kosmicznej" },
        { icon: "📡", name: "Operator Satelity", unlocked: p.satelliteScan, progress: p.satelliteScan ? "Sygnał z Ziemi zapisany" : "Zeskanuj Ziemię z Copernix-1" },
        { icon: "🧊", name: "Odkrywca Plutona", unlocked: p.pluto, progress: p.pluto ? "Pluton odkryty" : "Znajdź Pluton za Neptunem" },
        { icon: "⭐", name: "Tropiciel Gwiazd", unlocked: p.sirius, progress: p.sirius ? "Syriusz odkryty" : "Odkryj gwiazdę Syriusz" },
      ],
    },
    {
      section: "Terra / Olsztyn",
      items: [
        { icon: "🏠", name: "Strażnik Olsztyna", unlocked: p.terra >= 3, progress: `Punkty Olsztyna: ${p.terra}/3` },
        { icon: "📍", name: "Kartograf Olsztyna", unlocked: p.beacons >= 3, progress: `Znaczniki: ${p.beacons}/3` },
      ],
    },
    {
      section: "Kreatywność",
      items: [
        { icon: "🏗️", name: "Architekt Copernix", unlocked: p.cityAll, progress: `Miasto: ${p.cityTypes}/7 typów` },
      ],
    },
    {
      section: "Misje specjalne",
      items: [
        { icon: "🚀", name: "Odkrywca Misji Dominika", unlocked: p.dominik, progress: p.dominik ? "Misja ukończona" : "Ukończ prowadzoną misję" },
      ],
    },
  ];
}

export default function BadgeGallery({ onClose }) {
  const [progress, setProgress] = useState(() => readProgress());
  const refresh = () => setProgress(readProgress());

  const sections = buildBadges(progress);
  const allItems = sections.flatMap((s) => s.items);
  const total = allItems.length;
  const unlocked = allItems.filter((b) => b.unlocked).length;
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  const mood =
    unlocked >= total
      ? "🏆 Mistrz SpaceLab! Wszystkie odznaki zdobyte."
      : unlocked >= Math.ceil(total / 2)
        ? "🌟 Robi się z Ciebie prawdziwy odkrywca."
        : "🚀 Dopiero zaczynasz wyprawę.";

  const playerRows = [
    ["Planety odkryte", `${progress.planetCount}/8`],
    ["Sondy wysłane", `${progress.totalProbes}`],
    ["Planety z sondą", `${Math.min(progress.planetsWithProbe, 3)}/3`],
    ["Punkty Olsztyna", `${progress.terra}/3`],
    ["Znaczniki misji", `${progress.beacons}/3`],
    ["Elementy miasta", `${progress.cityTypes}/7`],
    ["Odznaki", `${unlocked}/${total}`],
  ];

  return (
    <div style={S.overlay} aria-label="Galeria odznak i postęp">
      <div style={S.panel}>
        <button type="button" style={S.close} onClick={onClose} aria-label="Zamknij">✕</button>
        <div style={S.title}>🏅 Odznaki i Postęp</div>
        <div style={S.mood}>{mood}</div>

        {/* GLOBALNY PASEK POSTĘPU */}
        <div style={S.summary}>
          <div style={S.summaryRow}>
            <span style={S.summaryLabel}>Odznaki: {unlocked}/{total}</span>
            <span style={S.summaryPct}>{pct}%</span>
          </div>
          <div style={S.barTrack}>
            <div style={{ ...S.barFill, width: `${pct}%` }} />
          </div>
        </div>

        {/* KARTA ODKRYWCY */}
        <div style={S.playerCard}>
          <div style={S.playerTitle}>👨‍🚀 Karta Odkrywcy</div>
          <div style={S.playerGrid}>
            {playerRows.map(([label, value]) => (
              <div key={label} style={S.playerItem}>
                <span style={S.playerItemLabel}>{label}</span>
                <span style={S.playerItemValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SEKCJE ODZNAK */}
        {sections.map((sec) => (
          <div key={sec.section} style={S.section}>
            <div style={S.sectionHead}>{sec.section}</div>
            <div style={S.cards}>
              {sec.items.map((b) => (
                <div key={b.name} style={{ ...S.card, ...(b.unlocked ? S.cardDone : S.cardLocked) }}>
                  <span style={S.cardIcon}>{b.unlocked ? b.icon : "🔒"}</span>
                  <div style={S.cardBody}>
                    <div style={S.cardName}>{b.name}</div>
                    <div style={S.cardProgress}>{b.progress}</div>
                  </div>
                  <span style={{ ...S.cardState, ...(b.unlocked ? S.cardStateDone : {}) }}>
                    {b.unlocked ? "✅" : "🔒"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={S.footer}>
          <button type="button" style={S.refreshBtn} onClick={refresh}>🔄 Odśwież postęp</button>
          <button type="button" style={S.closeBtn} onClick={onClose}>Zamknij</button>
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1500,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 12, boxSizing: "border-box",
    background: "rgba(2,4,10,0.74)", backdropFilter: "blur(6px)",
  },
  panel: {
    position: "relative", width: "min(620px, 100%)", maxHeight: "92vh", overflowY: "auto",
    background: "linear-gradient(180deg,#0B1230,#070A18)",
    border: "1px solid rgba(95,198,255,0.3)", borderRadius: 18,
    padding: "16px 16px 14px", boxSizing: "border-box",
    boxShadow: "0 16px 48px rgba(0,0,0,0.6)", color: "#E6EEF8",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  close: {
    position: "absolute", top: 10, right: 12, background: "transparent", border: "none",
    color: "#9FB6D4", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 4,
  },
  title: { fontSize: 18, fontWeight: 900 },
  mood: { fontSize: 13, fontWeight: 800, color: "#FFE2A6", marginTop: 3, marginBottom: 12 },
  summary: { marginBottom: 14 },
  summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 },
  summaryLabel: { fontSize: 13.5, fontWeight: 900, color: "#CFE2FF" },
  summaryPct: { fontSize: 13.5, fontWeight: 900, color: "#5EE6A0" },
  barTrack: { height: 12, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", border: "1px solid rgba(30,58,95,0.7)" },
  barFill: { height: "100%", background: "linear-gradient(90deg,#5EE6A0,#2FE6C8,#1FB8E0)", borderRadius: 999, transition: "width .35s ease" },
  playerCard: {
    background: "rgba(6,10,24,0.6)", border: "1px solid rgba(159,182,212,0.22)",
    borderRadius: 14, padding: 12, marginBottom: 16,
  },
  playerTitle: { fontSize: 14.5, fontWeight: 900, marginBottom: 9, color: "#E6EEF8" },
  playerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 7 },
  playerItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
    background: "rgba(12,20,48,0.6)", border: "1px solid rgba(30,58,95,0.6)", borderRadius: 10, padding: "7px 10px",
  },
  playerItemLabel: { fontSize: 12, fontWeight: 700, color: "#9FB6D4" },
  playerItemValue: { fontSize: 13.5, fontWeight: 900, color: "#EAFBF7" },
  section: { marginBottom: 14 },
  sectionHead: {
    fontSize: 11.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.2,
    color: "#6FB6E8", marginBottom: 8,
  },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 9 },
  card: {
    display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 12,
    border: "1px solid rgba(159,182,212,0.2)", background: "rgba(12,20,48,0.6)",
  },
  cardDone: {
    border: "1px solid rgba(94,230,160,0.5)",
    background: "linear-gradient(160deg, rgba(94,230,160,0.14), rgba(47,230,200,0.06))",
  },
  cardLocked: { opacity: 0.72 },
  cardIcon: { fontSize: 26, lineHeight: 1, flexShrink: 0 },
  cardBody: { minWidth: 0, flex: "1 1 auto" },
  cardName: { fontSize: 13.5, fontWeight: 900, color: "#E6EEF8", lineHeight: 1.2 },
  cardProgress: { fontSize: 12, fontWeight: 700, color: "#9FB6D4", marginTop: 2 },
  cardState: { fontSize: 15, flexShrink: 0, opacity: 0.6 },
  cardStateDone: { opacity: 1 },
  footer: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 },
  refreshBtn: {
    flex: "1 1 auto", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
    border: "1px solid rgba(47,230,200,0.5)", background: "rgba(47,230,200,0.12)",
    color: "#CFEDE6", fontWeight: 900, fontSize: 13,
  },
  closeBtn: {
    flex: "1 1 auto", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
    border: "1px solid rgba(159,182,212,0.3)", background: "rgba(12,20,48,0.78)",
    color: "#E6EEF8", fontWeight: 900, fontSize: 13,
  },
};
