import { useState } from "react";
import AndromedaBridge from "./AndromedaBridge";
import CopernixSpaceLab3D from "./CopernixSpaceLab3D_v4";

export default function App() {
  const [terraMode, setTerraMode] = useState(false);

  return (
    <>
      <CopernixSpaceLab3D hideSceneLabels={terraMode} />
      {!terraMode && (
        <button
          type="button"
          onClick={() => setTerraMode(true)}
          style={styles.landButton}
          aria-label="Ląduj na Ziemi"
        >
          🌍 Ląduj na Ziemi
        </button>
      )}
      {terraMode && <AndromedaBridge onClose={() => setTerraMode(false)} />}
    </>
  );
}

const styles = {
  landButton: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 40,
    border: "1px solid rgba(47, 230, 200, 0.55)",
    borderRadius: 999,
    padding: "10px 16px",
    background: "rgba(6, 10, 24, 0.82)",
    color: "#E6EEF8",
    boxShadow: "0 0 22px rgba(47, 230, 200, 0.22), 0 8px 26px rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(10px)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1,
  },
};
