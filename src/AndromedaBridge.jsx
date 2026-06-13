import { useEffect, useRef, useState } from "react";

const landingPath = [
  "Kosmos",
  "Ziemia",
  "Polska",
  "Warmia i Mazury",
  "Olsztyn",
  "Wyspa Tumska",
];

const landingSequence = ["Kosmos", "Ziemia", "Polska", "Warmia", "Olsztyn"];

const missionTargets = [
  {
    id: "katedra",
    icon: "🏰",
    name: "Katedra św. Jakuba",
    palette: ["#263B7A", "#8F6B3A", "#FFD089"],
    visual: "cathedral",
    route: "Katedra → przybliżenie → widok wnętrza → Luna",
    narration:
      "Witaj odkrywco. Przed tobą Katedra św. Jakuba, jeden z najmocniejszych punktów starego Olsztyna. Zatrzymaj się na chwilę i spójrz na jej wysoką bryłę jak na lokalną latarnię. Gotyckie mury nie są tylko tłem do zdjęcia. To zapis miasta, które rosło wokół rynku, zamku i warmińskich traktów. W jej cieniu przechodzili kupcy, mieszkańcy, muzycy i ludzie, którzy szukali orientacji w mieście tak samo jak ty po lądowaniu. Luna sugeruje: zacznij od wieży, potem przejdź wzrokiem do wejścia, a na końcu wyobraź sobie dźwięk organów odbijający się od cegieł. Ten punkt jest kotwicą misji.",
  },
  {
    id: "lyna",
    icon: "🌊",
    name: "Rzeka Łyna",
    palette: ["#123D5A", "#1FB8E0", "#9BE7FF"],
    visual: "river",
    route: "Łyna → nurt rzeki → spływ kajakiem → Luna",
    narration:
      "Witaj odkrywco. Łyna jest wodną osią Olsztyna. Nie musisz mieć mapy satelitarnej, żeby poczuć jej kierunek. Rzeka prowadzi przez miasto spokojniej niż ulice, ale pamięta więcej niż większość budynków. Płynie obok zielonych skarp, pod mostami i blisko miejsc, w których Olsztyn zmienia tempo z miejskiego na parkowe. Luna podpowiada: słuchaj jej jak ścieżki. Jeśli kosmos daje szeroki plan, Łyna daje lokalny rytm. Tu zaczyna się zejście z orbity do konkretu: szum wody, cień drzew, wilgotne powietrze i Warmia widziana z poziomu człowieka.",
  },
  {
    id: "most",
    icon: "🌉",
    name: "Most / Park nad Łyną",
    palette: ["#241B3D", "#D9A441", "#5EE6A0"],
    visual: "bridge",
    route: "Most → park nad Łyną → przejście piesze → Luna",
    narration:
      "Witaj odkrywco. Most i park nad Łyną są punktem przejścia: z jednego brzegu miasta na drugi, ale też z perspektywy kosmicznej do lokalnego świata. W AndromedaBridge most nie jest dekoracją. Jest decyzją. Stajesz na nim po lądowaniu i widzisz, że trasa nie kończy się na Olsztynie jako nazwie. Prowadzi dalej: do ścieżek, zieleni, rzeki, katedry, ludzi i pamięci miejsca. Luna mówi: przejdź powoli. Po jednej stronie zostawiasz orbitę, po drugiej zaczynasz Wirtualną Warmię. To tu moduł staje się mostem, a nie tylko kolejnym ekranem.",
  },
];

export default function AndromedaBridge({ onClose }) {
  const [landingActive, setLandingActive] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [selectedMission, setSelectedMission] = useState(null);
  const mountedRef = useRef(false);
  const landingTimerRef = useRef(null);

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

  const startLanding = () => {
    clearLandingTimer();
    setActiveStep(-1);
    setLandingActive(true);
    setSelectedMission(null);
  };

  const closeBridge = () => {
    clearLandingTimer();
    mountedRef.current = false;
    onClose();
  };

  const landingComplete = activeStep === landingSequence.length - 1;

  return (
    <section style={styles.overlay} aria-label="AndromedaBridge Terra Mode">
      <div style={styles.panel}>
        <div style={styles.header}>
          <div>
            <p style={styles.phase}>Faza 0: prototyp lokalizacyjny w przygotowaniu</p>
            <h1 style={styles.title}>AndromedaBridge: Terra Mode</h1>
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

        <p style={styles.message}>
          Moduł lądowania: Kosmos → Ziemia → Warmia i Mazury → Olsztyn
        </p>

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
              <span style={styles.hubBadge}>Luna online</span>
            </div>

            <div style={styles.targets} aria-label="Punkty docelowe Olsztyna">
              {missionTargets.map((target) => (
                <article
                  key={target.id}
                  style={{
                    ...styles.targetCard,
                    ...(selectedMission?.id === target.id ? styles.targetCardActive : {}),
                  }}
                >
                  <PhotoPlaceholder palette={target.palette} label={target.name} visual={target.visual} />
                  <h3 style={styles.targetTitle}>{target.icon} {target.name}</h3>
                  <p style={styles.route}>{target.route}</p>
                  <p style={styles.luna}>Luna gotowa do narracji terenowej.</p>
                  <button type="button" onClick={() => setSelectedMission(target)} style={styles.discoverButton}>
                    Odkryj
                  </button>
                </article>
              ))}
            </div>

            {selectedMission && (
              <article style={styles.narrationPanel}>
                <p style={styles.narrationLabel}>Narracja Luny · 30-60 sekund</p>
                <h3 style={styles.narrationTitle}>{selectedMission.icon} {selectedMission.name}</h3>
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

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 35,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 50% 35%, rgba(31, 184, 224, 0.2), rgba(3, 5, 12, 0.92) 58%, rgba(3, 5, 12, 0.98))",
    color: "#E6EEF8",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  panel: {
    width: "min(920px, 100%)",
    maxHeight: "calc(100vh - 48px)",
    overflowY: "auto",
    border: "1px solid rgba(47, 230, 200, 0.36)",
    borderRadius: 18,
    padding: "24px",
    boxSizing: "border-box",
    background: "rgba(6, 10, 24, 0.86)",
    boxShadow: "0 0 42px rgba(47, 230, 200, 0.16), 0 18px 52px rgba(0, 0, 0, 0.55)",
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
    borderColor: "rgba(255, 176, 46, 0.78)",
    background: "rgba(255, 176, 46, 0.18)",
    color: "#FFE2A6",
    boxShadow: "0 0 18px rgba(255, 176, 46, 0.32)",
  },
  sequenceStepDone: {
    borderColor: "rgba(94, 230, 160, 0.52)",
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
    borderColor: "rgba(255, 176, 46, 0.72)",
    boxShadow: "0 0 22px rgba(255, 176, 46, 0.2)",
  },
  photo: {
    display: "block",
    width: "100%",
    aspectRatio: "320 / 150",
    marginBottom: 12,
    borderRadius: 14,
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
