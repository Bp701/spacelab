import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { OLSZTYN_POIS, OLSZTYN_CENTER, OLSZTYN_ZOOM } from "./olsztynPois";

// Raster style using OpenStreetMap tiles (open data, ODbL). No Google content,
// no API key, no backend. Attribution is required and is shown by MapLibre.
const MAP_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm", minzoom: 0, maxzoom: 22 }],
};

export default function MapLab({ onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState("");
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [storyOpen, setStoryOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) {
      setMapError("Nie udało się przygotować kontenera mapy.");
      return undefined;
    }

    let map;
    const markers = [];
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [OLSZTYN_CENTER.lng, OLSZTYN_CENTER.lat],
        zoom: OLSZTYN_ZOOM,
        attributionControl: { compact: true },
        cooperativeGestures: false,
      });
      mapRef.current = map;

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

      // Non-fatal: tile load issues should not crash the LAB. Markers stay usable.
      map.on("error", (e) => {
        // eslint-disable-next-line no-console
        console.warn("[MapLab] map error", e?.error?.message || e);
      });

      OLSZTYN_POIS.forEach((poi) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "maplab-marker";
        el.setAttribute("aria-label", poi.name);
        el.textContent = "📍";
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          setSelectedPoi(poi);
          setStoryOpen(false);
          map.flyTo({ center: [poi.coordinates.lng, poi.coordinates.lat], zoom: 15, speed: 0.8 });
        });

        const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([poi.coordinates.lng, poi.coordinates.lat])
          .addTo(map);
        markers.push(marker);
      });
    } catch (err) {
      setMapError(err?.message || "Mapa nie mogła się załadować.");
    }

    return () => {
      markers.forEach((m) => m.remove());
      if (map) map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section className="maplab-overlay" style={styles.overlay} aria-label="Mapa LAB">
      <style>{maplabCss}</style>
      <div className="maplab-panel" style={styles.panel}>
        <header style={styles.header}>
          <div>
            <p style={styles.kicker}>Eksperymentalny moduł LAB</p>
            <h2 style={styles.title}>🗺️ Mapa LAB — Olsztyn</h2>
          </div>
          <button
            className="maplab-close"
            type="button"
            onClick={onClose}
            style={styles.closeButton}
            aria-label="Zamknij Mapę LAB"
          >
            ✕
          </button>
        </header>

        <p style={styles.note}>
          To eksperymentalna mapa LAB. Nie zastępuje Terra Mode. Punkty na mapie to
          nasze własne, ręcznie opisane miejsca w Olsztynie — kliknij znacznik 📍, aby
          dowiedzieć się więcej.
        </p>

        <div className="maplab-mapwrap" style={styles.mapWrap}>
          {mapError ? (
            <div style={styles.fallback}>
              <p style={styles.fallbackTitle}>Mapa jest teraz niedostępna</p>
              <p style={styles.fallbackText}>
                Nie udało się załadować mapy ({mapError}). Reszta SpaceLab działa
                normalnie — możesz zamknąć to okno i wrócić do gry.
              </p>
            </div>
          ) : (
            <div ref={containerRef} className="maplab-map" style={styles.map} />
          )}

          {selectedPoi && !mapError && (
            <div className="maplab-card" style={styles.card} role="dialog" aria-label={selectedPoi.name}>
              <div style={styles.cardHead}>
                <div>
                  <span style={styles.cardCategory}>{selectedPoi.category}</span>
                  <h3 style={styles.cardTitle}>{selectedPoi.name}</h3>
                </div>
                <button
                  type="button"
                  className="maplab-card-close"
                  onClick={() => setSelectedPoi(null)}
                  style={styles.cardClose}
                  aria-label="Zamknij kartę miejsca"
                >
                  ✕
                </button>
              </div>
              <p style={styles.cardDesc}>{selectedPoi.description}</p>
              {selectedPoi.missionHint && (
                <p style={styles.cardHint}>
                  <span style={styles.cardHintLabel}>Misja:</span> {selectedPoi.missionHint}
                </p>
              )}

              {selectedPoi.story && (
                <div style={styles.storyWrap}>
                  <button
                    type="button"
                    className="maplab-story-toggle"
                    onClick={() => setStoryOpen((o) => !o)}
                    style={styles.storyToggle}
                    aria-expanded={storyOpen}
                  >
                    🌙 Opowieść Luny {storyOpen ? "▲" : "▼"}
                  </button>

                  {storyOpen && (
                    <div style={styles.storyBody}>
                      {selectedPoi.storyTitle && (
                        <h4 style={styles.storyTitle}>{selectedPoi.storyTitle}</h4>
                      )}
                      <p style={styles.storyText}>{selectedPoi.story}</p>

                      {selectedPoi.curiosity && (
                        <p style={styles.storyRow}>
                          <span style={styles.storyLabel}>✨ Ciekawostka:</span> {selectedPoi.curiosity}
                        </p>
                      )}
                      {selectedPoi.observationTask && (
                        <p style={styles.storyRow}>
                          <span style={styles.storyLabel}>🔭 Zadanie:</span> {selectedPoi.observationTask}
                        </p>
                      )}
                      {selectedPoi.childQuestion && (
                        <p style={styles.storyRow}>
                          <span style={styles.storyLabel}>❓ Pytanie:</span> {selectedPoi.childQuestion}
                        </p>
                      )}
                      {selectedPoi.lunaNarration && (
                        <p style={styles.storyLuna}>
                          <span style={styles.storyLunaLabel}>🌙 Luna:</span> {selectedPoi.lunaNarration}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <p style={styles.legal}>
          Dane miejsc: „internal manually curated POI". Mapa: © OpenStreetMap. Bez treści
          Google Maps / Street View.
        </p>
      </div>
    </section>
  );
}

const maplabCss = `
  .maplab-marker {
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    background: transparent;
    font-size: 30px;
    line-height: 1;
    cursor: pointer;
    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.6));
    touch-action: manipulation;
  }
  .maplab-marker:hover { transform: scale(1.12); }

  .maplab-map .maplibregl-ctrl-group button {
    width: 38px !important;
    height: 38px !important;
  }

  @media (max-width: 640px) {
    .maplab-overlay {
      align-items: stretch !important;
      justify-content: flex-start !important;
      padding: 8px !important;
      overflow-x: hidden !important;
    }
    .maplab-panel {
      width: 100% !important;
      max-width: calc(100vw - 16px) !important;
      max-height: calc(100dvh - 16px) !important;
      padding: 14px !important;
      border-radius: 14px !important;
      overflow-x: hidden !important;
    }
    .maplab-close {
      width: 44px !important;
      height: 44px !important;
      font-size: 18px !important;
      touch-action: manipulation !important;
    }
    .maplab-mapwrap { min-height: 320px !important; }
    .maplab-card { left: 8px !important; right: 8px !important; bottom: 8px !important; }
  }
`;

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1400,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 50% 28%, rgba(47, 230, 200, 0.13), rgba(1, 4, 12, 0.96) 54%, rgba(1, 4, 12, 0.99))",
    color: "#E6EEF8",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  panel: {
    width: "min(900px, 100%)",
    maxHeight: "calc(100dvh - 32px)",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    border: "1px solid rgba(95, 198, 255, 0.34)",
    borderRadius: 18,
    padding: 18,
    boxSizing: "border-box",
    background: "rgba(4, 8, 20, 0.96)",
    boxShadow: "0 0 0 1px rgba(47, 230, 200, 0.08), 0 24px 70px rgba(0, 0, 0, 0.72)",
    backdropFilter: "blur(14px)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
  },
  kicker: {
    margin: "0 0 5px",
    color: "#5EE6A0",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: "clamp(22px, 4vw, 34px)",
    lineHeight: 1.05,
  },
  closeButton: {
    flex: "0 0 auto",
    width: 38,
    height: 38,
    borderRadius: 999,
    border: "1px solid rgba(159, 182, 212, 0.32)",
    background: "rgba(12, 20, 48, 0.72)",
    color: "#CFEDE6",
    cursor: "pointer",
    fontSize: 17,
  },
  note: {
    margin: "16px 0 0",
    color: "#9FB6D4",
    fontSize: 14,
    lineHeight: 1.5,
  },
  mapWrap: {
    position: "relative",
    marginTop: 16,
    minHeight: 360,
    flex: "1 1 auto",
    border: "1px solid rgba(95, 198, 255, 0.22)",
    borderRadius: 14,
    overflow: "hidden",
    background: "rgba(6, 10, 24, 0.74)",
  },
  map: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  fallback: {
    display: "grid",
    placeItems: "center",
    height: "100%",
    minHeight: 360,
    padding: 20,
    textAlign: "center",
  },
  fallbackTitle: {
    margin: 0,
    color: "#FFE2A6",
    fontSize: 16,
    fontWeight: 900,
  },
  fallbackText: {
    margin: "8px 0 0",
    maxWidth: 360,
    color: "#CFEDE6",
    fontSize: 13.5,
    lineHeight: 1.5,
  },
  card: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    maxWidth: 420,
    maxHeight: "calc(100% - 28px)",
    overflowY: "auto",
    border: "1px solid rgba(47, 230, 200, 0.5)",
    borderRadius: 14,
    padding: 14,
    background: "rgba(4, 10, 22, 0.94)",
    boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(8px)",
  },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  },
  cardCategory: {
    display: "block",
    color: "#5EE6A0",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  cardTitle: {
    margin: "4px 0 0",
    fontSize: 18,
    fontWeight: 900,
    lineHeight: 1.2,
  },
  cardClose: {
    flex: "0 0 auto",
    width: 36,
    height: 36,
    borderRadius: 999,
    border: "1px solid rgba(159, 182, 212, 0.32)",
    background: "rgba(12, 20, 48, 0.72)",
    color: "#CFEDE6",
    cursor: "pointer",
    fontSize: 15,
    touchAction: "manipulation",
  },
  cardDesc: {
    margin: "10px 0 0",
    color: "#E6EEF8",
    fontSize: 14,
    lineHeight: 1.5,
  },
  cardHint: {
    margin: "10px 0 0",
    padding: "8px 10px",
    border: "1px solid rgba(255, 176, 46, 0.3)",
    borderRadius: 10,
    background: "rgba(36, 22, 6, 0.45)",
    color: "#FFE2A6",
    fontSize: 13.5,
    lineHeight: 1.45,
  },
  cardHintLabel: {
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  storyWrap: {
    marginTop: 12,
    borderTop: "1px solid rgba(95, 198, 255, 0.18)",
    paddingTop: 10,
  },
  storyToggle: {
    width: "100%",
    minHeight: 44,
    border: "1px solid rgba(95, 198, 255, 0.4)",
    borderRadius: 12,
    padding: "10px 12px",
    background: "rgba(12, 20, 48, 0.7)",
    color: "#CFEDE6",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    textAlign: "left",
    touchAction: "manipulation",
  },
  storyBody: {
    marginTop: 10,
  },
  storyTitle: {
    margin: "0 0 8px",
    color: "#9FD8FF",
    fontSize: 15,
    fontWeight: 900,
    lineHeight: 1.25,
  },
  storyText: {
    margin: 0,
    color: "#E6EEF8",
    fontSize: 14,
    lineHeight: 1.55,
  },
  storyRow: {
    margin: "10px 0 0",
    color: "#CFEDE6",
    fontSize: 13.5,
    lineHeight: 1.5,
  },
  storyLabel: {
    fontWeight: 900,
    color: "#5EE6A0",
  },
  storyLuna: {
    margin: "12px 0 0",
    padding: "10px 12px",
    border: "1px solid rgba(122, 162, 255, 0.34)",
    borderRadius: 12,
    background: "rgba(14, 18, 44, 0.6)",
    color: "#DCE6FF",
    fontSize: 13.5,
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  storyLunaLabel: {
    fontStyle: "normal",
    fontWeight: 900,
    color: "#9FB6FF",
  },
  legal: {
    margin: "12px 0 0",
    color: "#7C92B4",
    fontSize: 11.5,
    lineHeight: 1.5,
  },
};
