import { useEffect, useRef, useState } from "react";
import { terraRecipe } from "./engine/terraRecipe";

const landingPath = terraRecipe.layers.map((layer) => layer.name);
const landingSequence = ["Kosmos", "Ziemia", "Polska", "Warmia", "Olsztyn"];
const missionTargets = terraRecipe.pointsOfInterest;
const OLSZTYN_WEATHER_URL = terraRecipe.weather.url;
const DISCOVERED_STORAGE_KEY = "spacelab_discovered_terra";
const TERRA_AUDIO_STORAGE_KEY = "spacelab_luna_audio_enabled";
const BADGES_STORAGE_KEY = "spacelab_badges";
const TERRA_BEACONS_STORAGE_KEY = "spacelab_terra_beacons";
const OLSZTYN_GUARDIAN_BADGE = "str-olsztyna";
const OLSZTYN_CARTOGRAPHER_BADGE = "kartograf-olsztyna";
const TERRA_MISSION_IDS = missionTargets.map((target) => target.id);
const TERRA_MISSION_TOTAL = TERRA_MISSION_IDS.length;
const TERRA_MISSION_ID_SET = new Set(TERRA_MISSION_IDS);

function readStoredStringArray(key) {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readStoredBoolean(key) {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeStorage(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage can be unavailable in strict privacy modes.
  }
}

function getPolishSpeechVoice(synthesis) {
  const voices = synthesis.getVoices();
  return voices.find((voice) => voice.lang === "pl-PL") || voices.find((voice) => voice.lang?.toLowerCase().startsWith("pl")) || null;
}

function speakLuna(text) {
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
  utterance.pitch = 1.04;
  synthesis.speak(utterance);
}

function stopLuna() {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    console.warn("SpeechSynthesis unavailable");
    return;
  }

  window.speechSynthesis.cancel();
}

export default function AndromedaBridge({ onClose }) {
  const [landingActive, setLandingActive] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [selectedMission, setSelectedMission] = useState(null);
  const [weatherLabel, setWeatherLabel] = useState(terraRecipe.weather.fallback);
  const [discoveredIds, setDiscoveredIds] = useState(() => readStoredStringArray(DISCOVERED_STORAGE_KEY));
  const [audioEnabled, setAudioEnabled] = useState(() => readStoredBoolean(TERRA_AUDIO_STORAGE_KEY));
  const [badges, setBadges] = useState(() => readStoredStringArray(BADGES_STORAGE_KEY));
  const [badgesPanelOpen, setBadgesPanelOpen] = useState(false);
  const [beacons, setBeacons] = useState(() =>
    readStoredStringArray(TERRA_BEACONS_STORAGE_KEY).filter((id) => TERRA_MISSION_ID_SET.has(id))
  );
  const mountedRef = useRef(false);
  const landingTimerRef = useRef(null);
  const narrationPanelRef = useRef(null);

  const clearLandingTimer = () => {
    if (landingTimerRef.current !== null) {
      window.clearTimeout(landingTimerRef.current);
      landingTimerRef.current = null;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      clearLandingTimer();
      stopLuna();
    };
  }, []);

  useEffect(() => {
    clearLandingTimer();

    if (!landingActive) return undefined;
    if (activeStep >= landingSequence.length - 1) return undefined;

    landingTimerRef.current = window.setTimeout(() => {
      if (!mountedRef.current) return;
      setActiveStep((step) => step + 1);
      landingTimerRef.current = null;
    }, activeStep < 0 ? 120 : 760);

    return clearLandingTimer;
  }, [activeStep, landingActive]);

  useEffect(() => {
    writeStorage(DISCOVERED_STORAGE_KEY, discoveredIds);
  }, [discoveredIds]);

  useEffect(() => {
    writeStorage(TERRA_AUDIO_STORAGE_KEY, audioEnabled);
  }, [audioEnabled]);

  useEffect(() => {
    writeStorage(BADGES_STORAGE_KEY, badges);
  }, [badges]);

  useEffect(() => {
    writeStorage(TERRA_BEACONS_STORAGE_KEY, beacons);
  }, [beacons]);

  const terraMissionDone = TERRA_MISSION_IDS.filter((id) => discoveredIds.includes(id)).length;
  const terraMissionComplete = terraMissionDone >= TERRA_MISSION_TOTAL;
  const guardianUnlocked = badges.includes(OLSZTYN_GUARDIAN_BADGE);
  const beaconCount = beacons.length;
  const allBeaconsPlaced = beaconCount >= TERRA_MISSION_TOTAL;
  const cartographerUnlocked = badges.includes(OLSZTYN_CARTOGRAPHER_BADGE);

  useEffect(() => {
    if (!terraMissionComplete) return;
    setBadges((current) => (current.includes(OLSZTYN_GUARDIAN_BADGE) ? current : [...current, OLSZTYN_GUARDIAN_BADGE]));
  }, [terraMissionComplete]);

  useEffect(() => {
    if (!allBeaconsPlaced) return;
    setBadges((current) => (current.includes(OLSZTYN_CARTOGRAPHER_BADGE) ? current : [...current, OLSZTYN_CARTOGRAPHER_BADGE]));
  }, [allBeaconsPlaced]);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    fetch(OLSZTYN_WEATHER_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!alive) return;
        const current = data.current_weather;
        if (!current || typeof current.temperature !== "number" || typeof current.windspeed !== "number") {
          throw new Error("Open-Meteo missing current_weather");
        }
        setWeatherLabel(`Olsztyn teraz: ${Math.round(current.temperature)}°C | wiatr ${Math.round(current.windspeed)} km/h`);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        if (alive) setWeatherLabel(terraRecipe.weather.fallback);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const startLanding = () => {
    clearLandingTimer();
    setActiveStep(-1);
    setLandingActive(true);
    setSelectedMission(null);
    stopLuna();
  };

  const closeBridge = () => {
    clearLandingTimer();
    mountedRef.current = false;
    stopLuna();
    onClose();
  };

  const markDiscovered = (targetId) => {
    setDiscoveredIds((ids) => (ids.includes(targetId) ? ids : [...ids, targetId]));
  };

  const placeBeacon = (targetId) => {
    if (!TERRA_MISSION_ID_SET.has(targetId)) return;
    setBeacons((ids) => (ids.includes(targetId) ? ids : [...ids, targetId]));
  };

  const readMission = (mission) => {
    setAudioEnabled(true);
    speakLuna(mission.narration);
  };

  const selectMission = (target) => {
    setSelectedMission(target);
    markDiscovered(target.id);
    if (audioEnabled) {
      speakLuna(target.narration);
    }
    window.requestAnimationFrame(() => {
      narrationPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      narrationPanelRef.current?.focus({ preventScroll: true });
    });
  };

  const landingComplete = activeStep === landingSequence.length - 1;
  const selectedMissionDiscovered = selectedMission ? discoveredIds.includes(selectedMission.id) : false;
  const selectedMissionBeacon = selectedMission ? beacons.includes(selectedMission.id) : false;

  return (
    <section className="terra-overlay" style={styles.overlay} aria-label="AndromedaBridge Terra Mode">
      <style>{terraResponsiveCss}</style>
      <div className="terra-panel" style={styles.panel}>
        <div style={styles.header}>
          <div>
            <p style={styles.phase}>Faza 0: prototyp lokalizacyjny w przygotowaniu</p>
            <h1 className="terra-title" style={styles.title}>AndromedaBridge: Terra Mode</h1>
          </div>
          <button type="button" onClick={closeBridge} style={styles.closeButton} aria-label="Wróć do kosmosu">
            ✕
          </button>
        </div>

        <div style={styles.path} aria-label="Ścieżka lądowania">
          {landingPath.map((step, index) => (
            <span key={step} style={styles.pathStep}>
              {step}
              {index < landingPath.length - 1 && <span style={styles.arrow}>→</span>}
            </span>
          ))}
        </div>

        <p style={styles.message}>{terraRecipe.narration.intro}</p>

        <div style={styles.sequencePanel} aria-label="Animowana sekwencja lądowania">
          <div style={styles.sequenceHeader}>
            <strong style={styles.sequenceTitle}>Sekwencja lądowania Terra v1</strong>
            <button type="button" onClick={startLanding} style={styles.startLandingButton}>
              Start lądowania
            </button>
          </div>
          <div style={styles.sequenceTrack}>
            {landingSequence.map((step, index) => {
              const isActive = index === activeStep;
              const isDone = index < activeStep;
              return (
                <span
                  key={step}
                  style={{
                    ...styles.sequenceStep,
                    ...(isActive ? styles.sequenceStepActive : {}),
                    ...(isDone ? styles.sequenceStepDone : {}),
                  }}
                >
                  {step}
                </span>
              );
            })}
          </div>
          <p style={styles.sequenceStatus}>
            {activeStep < 0 && "Gotowe do rozpoczęcia zejścia z orbity."}
            {activeStep >= 0 && activeStep < landingSequence.length - 1 && `Aktualny etap: ${landingSequence[activeStep]}`}
            {activeStep === landingSequence.length - 1 && "Lądowanie zakończone: Olsztyn namierzony."}
          </p>
        </div>

        {landingComplete && (
          <section style={styles.missionHub} aria-label="Olsztyn Mission Hub">
            <div style={styles.hubHeader}>
              <div>
                <p style={styles.hubVersion}>Copernix Terra v1</p>
                <h2 style={styles.hubTitle}>Olsztyn Mission Hub</h2>
              </div>
              <div style={styles.hubBadges}>
                <span style={styles.hubBadge}>Luna online</span>
                <span
                  style={{ ...styles.progressBadge, ...(terraMissionComplete ? styles.progressBadgeDone : {}) }}
                  aria-label={`Postęp misji Olsztyn: ${terraMissionDone} z ${TERRA_MISSION_TOTAL}`}
                >
                  Misja Olsztyn: {terraMissionDone}/{TERRA_MISSION_TOTAL}
                </span>
                <span
                  style={{ ...styles.progressBadge, ...(allBeaconsPlaced ? styles.progressBadgeDone : {}) }}
                  aria-label={`Znaczniki misji: ${beaconCount} z ${TERRA_MISSION_TOTAL}`}
                >
                  Znaczniki: {beaconCount}/{TERRA_MISSION_TOTAL}
                </span>
                <span style={styles.weatherBadge}>{weatherLabel}</span>
                <button
                  type="button"
                  onClick={() => setBadgesPanelOpen((open) => !open)}
                  style={styles.showBadgesButton}
                  aria-expanded={badgesPanelOpen}
                >
                  🏅 Pokaż odznaki
                </button>
              </div>
            </div>

            {badgesPanelOpen && (
              <div style={styles.badgesPanel} aria-label="Panel odznak">
                <div style={{ ...styles.badgeRow, ...(guardianUnlocked ? styles.badgeRowDone : {}) }}>
                  <span style={{ fontSize: 20 }}>{guardianUnlocked ? "🏠" : "🔒"}</span>
                  <span>
                    {guardianUnlocked
                      ? "Strażnik Olsztyna"
                      : `Strażnik Olsztyna — odkryj ${terraMissionDone}/${TERRA_MISSION_TOTAL} punktów`}
                  </span>
                </div>
                <div style={{ ...styles.badgeRow, ...(cartographerUnlocked ? styles.badgeRowDone : {}) }}>
                  <span style={{ fontSize: 20 }}>{cartographerUnlocked ? "📍" : "🔒"}</span>
                  <span>
                    {cartographerUnlocked
                      ? "Kartograf Olsztyna"
                      : `Kartograf Olsztyna — ustaw ${beaconCount}/${TERRA_MISSION_TOTAL} znaczników`}
                  </span>
                </div>
              </div>
            )}

            {terraMissionComplete && (
              <div style={styles.completionPanel} role="status" aria-label="Misja Olsztyn ukończona">
                <p style={styles.completionTitle}>🎉 Misja ukończona!</p>
                <p style={styles.completionBadge}>🏠 Odznaka: Strażnik Olsztyna</p>
              </div>
            )}

            <div className="terra-targets" style={styles.targets} aria-label="Punkty docelowe Olsztyna">
              {missionTargets.map((target) => {
                const isDiscovered = discoveredIds.includes(target.id);

                return (
                  <article
                    key={target.id}
                    className="terra-card"
                    style={{
                      ...styles.targetCard,
                      ...(selectedMission?.id === target.id ? styles.targetCardActive : {}),
                    }}
                  >
                    {isDiscovered && <span style={styles.discoveredBadge}>✅ Odkryte</span>}
                    {beacons.includes(target.id) && <span style={styles.beaconPin} aria-label="Znacznik ustawiony">📍 Znacznik</span>}
                    <TerraPhoto target={target} />
                    <h3 style={styles.targetTitle}>{target.icon} {target.name}</h3>
                    <p style={styles.route}>{target.route}</p>
                    <p style={styles.luna}>Luna gotowa do narracji terenowej.</p>
                    <button type="button" onClick={() => selectMission(target)} style={styles.discoverButton}>
                      Odkryj
                    </button>
                  </article>
                );
              })}
            </div>

            {selectedMission && (
              <article ref={narrationPanelRef} tabIndex={-1} style={styles.narrationPanel}>
                <p style={styles.narrationLabel}>Narracja Luny · 30-60 sekund</p>
                <h3 style={styles.narrationTitle}>{selectedMission.icon} {selectedMission.name}</h3>
                {!audioEnabled && (
                  <p style={styles.audioHint}>Kliknij Czytaj, żeby włączyć głos Luny dla Terra Mode.</p>
                )}
                <div style={styles.narrationActions}>
                  <button type="button" onClick={() => readMission(selectedMission)} style={styles.readButton}>
                    🔊 Czytaj
                  </button>
                  <button
                    type="button"
                    onClick={() => markDiscovered(selectedMission.id)}
                    style={{
                      ...styles.discoveredButton,
                      ...(selectedMissionDiscovered ? styles.discoveredButtonActive : {}),
                    }}
                  >
                    ✅ Odkryte
                  </button>
                  <button type="button" onClick={stopLuna} style={styles.stopButton}>
                    ⏹ Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => placeBeacon(selectedMission.id)}
                    disabled={selectedMissionBeacon}
                    style={{ ...styles.beaconButton, ...(selectedMissionBeacon ? styles.beaconButtonActive : {}) }}
                  >
                    {selectedMissionBeacon ? "📍 Znacznik ustawiony" : "📍 Postaw znacznik misji"}
                  </button>
                </div>
                <p style={styles.narrationText}>Luna: “{selectedMission.narration}”</p>
              </article>
            )}
          </section>
        )}

        <button type="button" onClick={closeBridge} style={styles.returnButton}>
          Powrót do kosmosu
        </button>
      </div>
    </section>
  );
}

function PhotoPlaceholder({ palette, label, visual }) {
  const [bg, mid, light] = palette;

  return (
    <svg viewBox="0 0 320 150" role="img" aria-label={`Zdjęcie placeholder: ${label}`} style={styles.photo}>
      <rect width="320" height="150" rx="18" fill={bg} />
      <rect width="320" height="150" rx="18" fill="#071126" opacity="0.38" />
      <circle cx="260" cy="34" r="18" fill={light} opacity="0.9" />
      <path d="M0 118 C58 92 93 124 143 100 C196 74 228 112 320 82 L320 150 L0 150 Z" fill={mid} opacity="0.5" />
      <path d="M0 128 C52 110 104 132 158 116 C216 99 260 124 320 104 L320 150 L0 150 Z" fill={light} opacity="0.28" />
      {visual === "cathedral" && (
        <>
          <rect x="78" y="58" width="54" height="62" rx="5" fill="#101A34" stroke={light} strokeWidth="3" />
          <path d="M88 58 L105 31 L122 58 Z" fill={mid} stroke={light} strokeWidth="3" />
          <rect x="98" y="82" width="14" height="38" rx="7" fill={light} opacity="0.82" />
          <rect x="142" y="76" width="38" height="44" rx="4" fill="#101A34" stroke={light} strokeWidth="3" opacity="0.8" />
          <path d="M151 76 L161 55 L171 76 Z" fill={mid} stroke={light} strokeWidth="3" opacity="0.9" />
        </>
      )}
      {visual === "river" && (
        <>
          <path d="M42 120 C86 82 112 134 156 94 C192 62 222 104 286 72" fill="none" stroke={light} strokeWidth="15" strokeLinecap="round" opacity="0.72" />
          <path d="M74 104 L119 92 L139 106 L96 119 Z" fill="#E7B35B" opacity="0.92" />
          <path d="M119 92 L129 82 L139 106" fill="#BD6A48" opacity="0.9" />
          <path d="M103 92 L83 72" stroke="#F5E7B8" strokeWidth="4" strokeLinecap="round" />
        </>
      )}
      {visual === "bridge" && (
        <>
          <path d="M68 114 C94 75 134 75 162 114" fill="none" stroke={light} strokeWidth="8" strokeLinecap="round" />
          <path d="M152 114 C184 70 230 70 260 114" fill="none" stroke={light} strokeWidth="8" strokeLinecap="round" opacity="0.82" />
          <path d="M48 119 L280 119" stroke={light} strokeWidth="8" strokeLinecap="round" opacity="0.72" />
          <circle cx="82" cy="84" r="15" fill="#2F8F5B" opacity="0.9" />
          <circle cx="252" cy="80" r="18" fill="#2F8F5B" opacity="0.9" />
        </>
      )}
      <rect x="18" y="18" width="138" height="26" rx="13" fill="rgba(6, 10, 24, 0.72)" />
      <text x="32" y="36" fill="#E6EEF8" fontFamily="Segoe UI, system-ui, sans-serif" fontSize="13" fontWeight="800">
        zdjęcie placeholder
      </text>
    </svg>
  );
}

function TerraPhoto({ target }) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return <PhotoPlaceholder palette={target.palette} label={target.name} visual={target.visual} />;
  }

  return (
    <figure style={styles.photoFrame}>
      <img
        src={target.image}
        alt={target.name}
        style={styles.photoImage}
        loading="lazy"
        decoding="async"
        onError={() => setImageError(true)}
      />
      <figcaption style={styles.photoCaption}>lokalne zdjęcie · {target.name}</figcaption>
    </figure>
  );
}

const terraResponsiveCss = `
  .terra-overlay {
    isolation: isolate;
    overflow-x: hidden;
  }

  .terra-panel:focus,
  .terra-panel *:focus {
    outline: 2px solid rgba(47, 230, 200, 0.72);
    outline-offset: 3px;
  }

  @media (max-width: 640px) {
    .terra-overlay {
      align-items: stretch !important;
      justify-content: flex-start !important;
      width: 100vw !important;
      max-width: 100vw !important;
      min-height: 100dvh !important;
      padding: 8px !important;
      overflow-x: hidden !important;
      background: rgba(1, 4, 12, 0.97) !important;
    }

    .terra-panel {
      width: 100% !important;
      max-width: calc(100vw - 16px) !important;
      max-height: calc(100dvh - 16px) !important;
      padding: 16px !important;
      border-radius: 14px !important;
      overflow-x: hidden !important;
      background: rgba(3, 7, 18, 0.96) !important;
      box-shadow: 0 0 0 1px rgba(47, 230, 200, 0.18), 0 18px 42px rgba(0, 0, 0, 0.72) !important;
    }

    .terra-title {
      font-size: 27px !important;
      line-height: 1.08 !important;
      overflow-wrap: anywhere !important;
    }

    .terra-targets {
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 12px !important;
      width: 100% !important;
    }

    .terra-card {
      flex: 1 1 100% !important;
      min-width: 0 !important;
      width: 100% !important;
    }
  }
`;

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100vw",
    maxWidth: "100vw",
    padding: 24,
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 50% 35%, rgba(31, 184, 224, 0.16), rgba(1, 4, 12, 0.96) 56%, rgba(1, 4, 12, 0.99))",
    color: "#E6EEF8",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    overflowX: "hidden",
  },
  panel: {
    width: "min(920px, calc(100vw - 48px))",
    maxHeight: "calc(100vh - 48px)",
    overflowY: "auto",
    overflowX: "hidden",
    border: "1px solid rgba(47, 230, 200, 0.36)",
    borderRadius: 18,
    padding: "24px",
    boxSizing: "border-box",
    background: "rgba(4, 8, 20, 0.94)",
    boxShadow: "0 0 0 1px rgba(47, 230, 200, 0.08), 0 0 42px rgba(47, 230, 200, 0.16), 0 18px 58px rgba(0, 0, 0, 0.72)",
    backdropFilter: "blur(14px)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
  },
  phase: {
    margin: "0 0 6px",
    color: "#FFB02E",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    color: "#E6EEF8",
    fontSize: "clamp(28px, 4vw, 44px)",
    lineHeight: 1.05,
    fontWeight: 900,
    letterSpacing: 0,
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
    lineHeight: 1,
  },
  path: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px 10px",
    marginTop: 24,
    padding: "14px 16px",
    borderRadius: 14,
    background: "rgba(47, 230, 200, 0.08)",
    border: "1px solid rgba(47, 230, 200, 0.2)",
    color: "#CFEDE6",
    fontSize: 14,
    fontWeight: 800,
  },
  pathStep: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
  },
  arrow: {
    color: "#5EE6A0",
  },
  message: {
    margin: "18px 0 0",
    color: "#9FB6D4",
    fontSize: 16,
    lineHeight: 1.5,
  },
  sequencePanel: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(255, 176, 46, 0.28)",
    background: "rgba(255, 176, 46, 0.07)",
  },
  sequenceHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  sequenceTitle: {
    color: "#E6EEF8",
    fontSize: 15,
    letterSpacing: 0,
  },
  startLandingButton: {
    border: "none",
    borderRadius: 999,
    padding: "10px 15px",
    background: "linear-gradient(135deg, #FFB02E, #FF7A2E)",
    color: "#241303",
    boxShadow: "0 0 16px rgba(255, 138, 60, 0.32)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
  },
  sequenceTrack: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  sequenceStep: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 86,
    padding: "9px 11px",
    borderRadius: 999,
    border: "1px solid rgba(159, 182, 212, 0.24)",
    background: "rgba(12, 20, 48, 0.72)",
    color: "#9FB6D4",
    fontSize: 13,
    fontWeight: 800,
    transition: "transform 260ms ease, color 260ms ease, background 260ms ease, border-color 260ms ease, box-shadow 260ms ease",
  },
  sequenceStepActive: {
    transform: "translateY(-3px)",
    border: "1px solid rgba(255, 176, 46, 0.78)",
    background: "rgba(255, 176, 46, 0.18)",
    color: "#FFE2A6",
    boxShadow: "0 0 18px rgba(255, 176, 46, 0.32)",
  },
  sequenceStepDone: {
    border: "1px solid rgba(94, 230, 160, 0.52)",
    background: "rgba(94, 230, 160, 0.12)",
    color: "#CFEDE6",
  },
  sequenceStatus: {
    margin: "12px 0 0",
    color: "#CFEDE6",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 12,
    lineHeight: 1.4,
  },
  missionHub: {
    marginTop: 20,
    paddingTop: 18,
    borderTop: "1px solid rgba(47, 230, 200, 0.18)",
  },
  hubHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  hubVersion: {
    margin: "0 0 4px",
    color: "#5EE6A0",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  hubTitle: {
    margin: 0,
    color: "#E6EEF8",
    fontSize: "clamp(22px, 3vw, 30px)",
    lineHeight: 1.12,
    fontWeight: 900,
    letterSpacing: 0,
  },
  hubBadges: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  hubBadge: {
    border: "1px solid rgba(94, 230, 160, 0.42)",
    borderRadius: 999,
    padding: "7px 10px",
    background: "rgba(94, 230, 160, 0.1)",
    color: "#CFEDE6",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 12,
    fontWeight: 800,
  },
  weatherBadge: {
    border: "1px solid rgba(95, 198, 255, 0.34)",
    borderRadius: 999,
    padding: "7px 10px",
    background: "rgba(31, 184, 224, 0.1)",
    color: "#D8F4FF",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 12,
    fontWeight: 800,
  },
  progressBadge: {
    border: "1px solid rgba(255, 176, 46, 0.42)",
    borderRadius: 999,
    padding: "7px 10px",
    background: "rgba(255, 176, 46, 0.12)",
    color: "#FFE2A6",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 12,
    fontWeight: 900,
  },
  progressBadgeDone: {
    border: "1px solid rgba(94, 230, 160, 0.6)",
    background: "linear-gradient(135deg, rgba(94, 230, 160, 0.9), rgba(47, 230, 200, 0.9))",
    color: "#04121C",
    boxShadow: "0 0 14px rgba(94, 230, 160, 0.28)",
  },
  showBadgesButton: {
    border: "1px solid rgba(159, 182, 212, 0.3)",
    borderRadius: 999,
    padding: "7px 12px",
    background: "rgba(12, 20, 48, 0.78)",
    color: "#E6EEF8",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1,
  },
  badgesPanel: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(159, 182, 212, 0.22)",
    background: "rgba(6, 10, 24, 0.6)",
    display: "grid",
    gap: 8,
  },
  badgeRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(159, 182, 212, 0.24)",
    background: "rgba(12, 20, 48, 0.6)",
    color: "#9FB6D4",
    fontSize: 13.5,
    fontWeight: 900,
    opacity: 0.7,
  },
  badgeRowDone: {
    border: "1px solid rgba(94, 230, 160, 0.5)",
    background: "rgba(94, 230, 160, 0.12)",
    color: "#CFEDE6",
    opacity: 1,
  },
  completionPanel: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    textAlign: "center",
    border: "1px solid rgba(255, 176, 46, 0.5)",
    background: "linear-gradient(135deg, rgba(255, 176, 46, 0.16), rgba(94, 230, 160, 0.14))",
    boxShadow: "0 0 20px rgba(255, 176, 46, 0.18)",
  },
  completionTitle: {
    margin: 0,
    color: "#FFE2A6",
    fontSize: 18,
    fontWeight: 900,
  },
  completionBadge: {
    margin: "8px 0 0",
    color: "#CFEDE6",
    fontSize: 15,
    fontWeight: 900,
  },
  targets: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
  },
  targetCard: {
    flex: "1 1 220px",
    minHeight: 126,
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(95, 198, 255, 0.28)",
    background: "linear-gradient(180deg, rgba(12, 20, 48, 0.82), rgba(6, 10, 24, 0.82))",
    boxSizing: "border-box",
    color: "inherit",
    textAlign: "left",
    transition: "transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease",
  },
  targetCardActive: {
    transform: "translateY(-3px)",
    border: "1px solid rgba(255, 176, 46, 0.72)",
    boxShadow: "0 0 0 1px rgba(255, 176, 46, 0.14), 0 0 22px rgba(255, 176, 46, 0.2)",
  },
  photo: {
    display: "block",
    width: "100%",
    aspectRatio: "320 / 150",
    marginBottom: 12,
    borderRadius: 14,
  },
  photoFrame: {
    position: "relative",
    margin: "0 0 12px",
    width: "100%",
    aspectRatio: "320 / 150",
    overflow: "hidden",
    borderRadius: 14,
    background: "rgba(12, 20, 48, 0.72)",
    border: "1px solid rgba(159, 182, 212, 0.18)",
  },
  photoImage: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoCaption: {
    position: "absolute",
    left: 10,
    bottom: 9,
    maxWidth: "calc(100% - 20px)",
    padding: "5px 8px",
    borderRadius: 999,
    background: "rgba(6, 10, 24, 0.72)",
    color: "#E6EEF8",
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.1,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  targetTitle: {
    margin: 0,
    color: "#E6EEF8",
    fontSize: 18,
    lineHeight: 1.25,
    fontWeight: 900,
    letterSpacing: 0,
  },
  route: {
    margin: "8px 0 0",
    color: "#9FB6D4",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 11.5,
    lineHeight: 1.45,
  },
  luna: {
    margin: "12px 0 0",
    color: "#CFEDE6",
    fontSize: 14,
    lineHeight: 1.45,
  },
  discoveredBadge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    marginBottom: 10,
    border: "1px solid rgba(94, 230, 160, 0.42)",
    borderRadius: 999,
    padding: "6px 10px",
    background: "rgba(94, 230, 160, 0.12)",
    color: "#CFEDE6",
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1,
  },
  beaconPin: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    marginBottom: 10,
    marginLeft: 8,
    border: "1px solid rgba(255, 176, 46, 0.5)",
    borderRadius: 999,
    padding: "6px 10px",
    background: "rgba(255, 176, 46, 0.14)",
    color: "#FFE2A6",
    fontSize: 12,
    fontWeight: 900,
    lineHeight: 1,
  },
  discoverButton: {
    marginTop: 14,
    border: "none",
    borderRadius: 999,
    padding: "10px 15px",
    background: "linear-gradient(135deg, #2FE6C8, #1FB8E0)",
    color: "#04121C",
    boxShadow: "0 0 14px rgba(47, 230, 200, 0.26)",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
  },
  narrationPanel: {
    marginTop: 14,
    padding: 16,
    borderRadius: 14,
    border: "1px solid rgba(94, 230, 160, 0.36)",
    background: "rgba(94, 230, 160, 0.08)",
  },
  narrationActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  audioHint: {
    margin: "10px 0 0",
    color: "#FFE2A6",
    fontSize: 13,
    lineHeight: 1.45,
  },
  readButton: {
    border: "none",
    borderRadius: 999,
    padding: "10px 14px",
    background: "linear-gradient(135deg, #2FE6C8, #1FB8E0)",
    color: "#04121C",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
  },
  stopButton: {
    border: "1px solid rgba(159, 182, 212, 0.3)",
    borderRadius: 999,
    padding: "9px 13px",
    background: "rgba(12, 20, 48, 0.78)",
    color: "#E6EEF8",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
  },
  discoveredButton: {
    border: "1px solid rgba(94, 230, 160, 0.38)",
    borderRadius: 999,
    padding: "9px 13px",
    background: "rgba(94, 230, 160, 0.1)",
    color: "#CFEDE6",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
  },
  discoveredButtonActive: {
    background: "linear-gradient(135deg, rgba(94, 230, 160, 0.9), rgba(47, 230, 200, 0.9))",
    color: "#04121C",
    boxShadow: "0 0 14px rgba(94, 230, 160, 0.24)",
  },
  beaconButton: {
    border: "1px solid rgba(255, 176, 46, 0.5)",
    borderRadius: 999,
    padding: "9px 13px",
    background: "rgba(255, 176, 46, 0.12)",
    color: "#FFE2A6",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 900,
    lineHeight: 1,
  },
  beaconButtonActive: {
    background: "linear-gradient(135deg, #FFD36E, #FFB02E)",
    color: "#241303",
    cursor: "default",
    boxShadow: "0 0 14px rgba(255, 176, 46, 0.3)",
  },
  narrationLabel: {
    margin: "0 0 6px",
    color: "#5EE6A0",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 12,
    fontWeight: 800,
  },
  narrationTitle: {
    margin: 0,
    color: "#E6EEF8",
    fontSize: 20,
    lineHeight: 1.2,
    fontWeight: 900,
  },
  narrationText: {
    margin: "10px 0 0",
    color: "#CFEDE6",
    fontSize: 15,
    lineHeight: 1.55,
  },
  returnButton: {
    marginTop: 20,
    border: "none",
    borderRadius: 999,
    padding: "11px 18px",
    background: "linear-gradient(135deg, #2FE6C8, #1FB8E0)",
    color: "#04121C",
    boxShadow: "0 0 18px rgba(47, 230, 200, 0.34)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 900,
    lineHeight: 1,
  },
};
