import { useEffect, useState } from "react";

/* ============================================================
   COPERNIX CITY BUILDER LITE — prosty siatkowy builder 2.5D
   ============================================================ */

export const CITY_LAYOUT_KEY = "spacelab_city_builder_layout";
export const CITY_BADGE_ID = "architekt-copernix";
const SHARED_BADGES_KEY = "spacelab_badges";

const COLS = 8;
const ROWS = 6;
const CELLS = COLS * ROWS;

export const CITY_TILES = [
  { id: "house", label: "Dom", icon: "🏠", grad: "linear-gradient(160deg,#FFC08A,#FF8A4E)" },
  { id: "school", label: "Szkoła", icon: "🏫", grad: "linear-gradient(160deg,#FFE08A,#F4B400)" },
  { id: "forest", label: "Las", icon: "🌲", grad: "linear-gradient(160deg,#6FD98A,#2E9E5B)" },
  { id: "lake", label: "Jezioro", icon: "🌊", grad: "linear-gradient(160deg,#8FD3FF,#2F8FE0)" },
  { id: "road", label: "Droga", icon: "🛣️", grad: "linear-gradient(160deg,#CBD3DE,#8A97A8)" },
  { id: "playground", label: "Boisko", icon: "⚽", grad: "linear-gradient(160deg,#D5EE7A,#9BCB3C)" },
  { id: "mission", label: "Centrum misji", icon: "🚀", grad: "linear-gradient(160deg,#7FE8FF,#1FB8E0)" },
];
export const CITY_TILE_IDS = CITY_TILES.map((t) => t.id);
const CITY_TILE_SET = new Set(CITY_TILE_IDS);
const CITY_TILE_BY_ID = Object.fromEntries(CITY_TILES.map((t) => [t.id, t]));

/* przykładowe miasto z wszystkimi 7 typami — używane przez Debug „Odblokuj wszystko" */
export const CITY_SAMPLE_LAYOUT = {
  0: "house", 1: "house", 2: "road", 3: "school",
  8: "road", 9: "forest", 10: "lake", 11: "playground",
  16: "road", 18: "mission",
};

export function loadCityLayout() {
  try {
    const raw = window.localStorage.getItem(CITY_LAYOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      const idx = Number(k);
      if (Number.isInteger(idx) && idx >= 0 && idx < CELLS && CITY_TILE_SET.has(v)) out[idx] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function cityHasAllTypes(layout) {
  const present = new Set(Object.values(layout || {}));
  return CITY_TILE_IDS.every((id) => present.has(id));
}

function persistLayout(layout) {
  try {
    if (Object.keys(layout).length === 0) window.localStorage.removeItem(CITY_LAYOUT_KEY);
    else window.localStorage.setItem(CITY_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* localStorage niedostępny */
  }
}

export default function CityBuilderLite({ onClose, onArchitectUnlocked }) {
  const [layout, setLayout] = useState(() => loadCityLayout());
  const [selected, setSelected] = useState("house"); // id kafelka lub "erase"
  const [note, setNote] = useState("");

  const allTypes = cityHasAllTypes(layout);
  const typesPlaced = new Set(Object.values(layout)).size;

  /* auto-zapis (i usunięcie klucza, gdy miasto puste) — dziecko nie traci pracy */
  useEffect(() => {
    persistLayout(layout);
  }, [layout]);

  /* odznaka: po ustawieniu wszystkich 7 typów dopisz do współdzielonego klucza */
  useEffect(() => {
    if (!allTypes) return;
    try {
      const raw = window.localStorage.getItem(SHARED_BADGES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(arr) ? arr : [];
      if (!list.includes(CITY_BADGE_ID)) {
        window.localStorage.setItem(SHARED_BADGES_KEY, JSON.stringify([...list, CITY_BADGE_ID]));
      }
    } catch {
      /* bez zapisu */
    }
    if (onArchitectUnlocked) onArchitectUnlocked();
  }, [allTypes, onArchitectUnlocked]);

  const placeAt = (idx) => {
    setNote("");
    setLayout((prev) => {
      const next = { ...prev };
      if (selected === "erase") delete next[idx];
      else next[idx] = selected;
      return next;
    });
  };

  const handleSave = () => {
    persistLayout(layout);
    setNote("💾 Miasto zapisane");
  };

  const handleClear = () => {
    if (typeof window !== "undefined" && !window.confirm("Na pewno wyczyścić całe miasto?")) return;
    setLayout({});
    try { window.localStorage.removeItem(CITY_LAYOUT_KEY); } catch { /* ok */ }
    setNote("🧹 Miasto wyczyszczone");
  };

  const handleRandom = () => {
    /* losowy start: po jednym z każdego typu + kilka dróg/domów, w wolnych komórkach */
    const cells = Array.from({ length: CELLS }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const picks = [...CITY_TILE_IDS, "house", "road", "road", "forest"];
    const next = {};
    picks.forEach((id, i) => { if (cells[i] !== undefined) next[cells[i]] = id; });
    setLayout(next);
    setNote("✨ Wylosowano start");
  };

  return (
    <div style={S.overlay} aria-label="Copernix City Builder">
      <style>{css}</style>
      <div style={S.panel}>
        <button type="button" style={S.close} onClick={onClose} aria-label="Zamknij">✕</button>
        <div style={S.title}>🏗️ Copernix City Builder</div>
        <div style={S.subtitle}>Zbuduj swoje miasto misji. Wybierz element i kliknij pole.</div>

        {/* PALETA */}
        <div style={S.palette}>
          {CITY_TILES.map((t) => (
            <button
              key={t.id}
              type="button"
              className="cb-pal"
              style={{ ...S.palBtn, ...(selected === t.id ? S.palBtnActive : {}) }}
              onClick={() => setSelected(t.id)}
              title={t.label}
            >
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span style={S.palLabel}>{t.label}</span>
            </button>
          ))}
          <button
            type="button"
            className="cb-pal"
            style={{ ...S.palBtn, ...(selected === "erase" ? S.palBtnActive : {}) }}
            onClick={() => setSelected("erase")}
            title="Gumka — usuń element"
          >
            <span style={{ fontSize: 18 }}>🧽</span>
            <span style={S.palLabel}>Gumka</span>
          </button>
        </div>

        {/* SIATKA */}
        <div style={S.gridWrap}>
          <div style={S.grid}>
            {Array.from({ length: CELLS }, (_, idx) => {
              const tileId = layout[idx];
              const tile = tileId ? CITY_TILE_BY_ID[tileId] : null;
              return (
                <button
                  key={idx}
                  type="button"
                  className={tile ? "cb-cell cb-cell-filled" : "cb-cell"}
                  style={{ ...S.cell, ...(tile ? { backgroundImage: tile.grad, border: "1px solid rgba(255,255,255,0.25)" } : {}) }}
                  onClick={() => placeAt(idx)}
                  aria-label={tile ? tile.label : "Puste pole"}
                >
                  {tile ? tile.icon : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* AKCJE */}
        <div style={S.actions}>
          <button type="button" style={S.btn} onClick={handleSave}>💾 Zapisz</button>
          <button type="button" style={S.btn} onClick={handleRandom}>✨ Losuj start</button>
          <button type="button" style={{ ...S.btn, ...S.btnDanger }} onClick={handleClear}>🧹 Wyczyść miasto</button>
        </div>

        <div style={S.footer}>
          <span style={{ ...S.progress, ...(allTypes ? S.progressDone : {}) }}>
            {allTypes ? "🏗️ Architekt Copernix!" : `Typy elementów: ${typesPlaced}/7`}
          </span>
          {note && <span style={S.note}>{note}</span>}
        </div>
      </div>
    </div>
  );
}

const css = `
  .cb-cell { transition: transform .12s ease, box-shadow .12s ease; }
  .cb-cell:hover { transform: translateY(-1px); }
  .cb-cell:active { transform: scale(0.94); }
  .cb-cell-filled { animation: cb-pop .18s ease; }
  @keyframes cb-pop { from { transform: scale(0.7); } to { transform: scale(1); } }
  .cb-pal:active { transform: scale(0.96); }
`;

const S = {
  overlay: {
    position: "fixed", inset: 0, zIndex: 1500,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 12, boxSizing: "border-box",
    background: "rgba(2,4,10,0.74)", backdropFilter: "blur(6px)",
  },
  panel: {
    position: "relative", width: "min(560px, 100%)", maxHeight: "92vh", overflowY: "auto",
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
  subtitle: { fontSize: 12.5, color: "#9FB6D4", marginTop: 2, marginBottom: 12 },
  palette: { display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  palBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", borderRadius: 999,
    border: "1px solid rgba(159,182,212,0.28)", background: "rgba(12,20,48,0.7)",
    color: "#CFE2FF", cursor: "pointer", fontSize: 12.5, fontWeight: 800, lineHeight: 1,
  },
  palBtnActive: {
    border: "1px solid #2FE6C8", background: "rgba(47,230,200,0.16)", color: "#EAFBF7",
    boxShadow: "0 0 12px rgba(47,230,200,0.3)",
  },
  palLabel: { whiteSpace: "nowrap" },
  gridWrap: { overflowX: "auto", paddingBottom: 4 },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(8, minmax(42px, 1fr))", gap: 6,
    minWidth: 360,
    background: "radial-gradient(circle at 50% 30%, rgba(47,111,176,0.12), rgba(3,5,12,0) 70%)",
    padding: 8, borderRadius: 14, border: "1px solid rgba(30,58,95,0.6)",
  },
  cell: {
    aspectRatio: "1 / 1", borderRadius: 10, cursor: "pointer",
    border: "1px dashed rgba(159,182,212,0.22)", background: "rgba(255,255,255,0.04)",
    fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)", color: "#fff",
  },
  actions: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 },
  btn: {
    flex: "1 1 auto", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
    border: "1px solid rgba(159,182,212,0.3)", background: "rgba(12,20,48,0.78)",
    color: "#E6EEF8", fontWeight: 900, fontSize: 13,
  },
  btnDanger: { border: "1px solid rgba(255,122,46,0.55)", background: "rgba(255,122,46,0.14)", color: "#FFD3A6" },
  footer: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 12 },
  progress: {
    fontSize: 12.5, fontWeight: 900, padding: "6px 11px", borderRadius: 999,
    background: "rgba(47,230,200,0.1)", border: "1px solid rgba(47,230,200,0.3)", color: "#CFEDE6",
  },
  progressDone: {
    color: "#04121C", background: "linear-gradient(135deg,#5EE6A0,#2FE6C8)",
    border: "1px solid rgba(94,230,160,0.6)", boxShadow: "0 0 12px rgba(94,230,160,0.3)",
  },
  note: { fontSize: 12.5, fontWeight: 800, color: "#FFE2A6" },
};
