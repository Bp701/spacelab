import { Component, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { ASSET_LAB_ITEMS } from "./assetManifest";

export default function AssetViewer({ onClose }) {
  const [selectedId, setSelectedId] = useState(ASSET_LAB_ITEMS[0]?.id || "");
  const [previewState, setPreviewState] = useState("empty");
  const [previewError, setPreviewError] = useState("");
  const selectedAsset = useMemo(
    () => ASSET_LAB_ITEMS.find((item) => item.id === selectedId) || ASSET_LAB_ITEMS[0],
    [selectedId]
  );
  const hasModelFile = !!selectedAsset?.file;
  const modelUrl = useMemo(() => normalizeModelFile(selectedAsset?.file), [selectedAsset?.file]);

  useEffect(() => {
    setPreviewError("");
    setPreviewState(modelUrl ? "loading" : "empty");
  }, [modelUrl]);

  return (
    <section className="asset-lab-overlay" style={styles.overlay} aria-label="Asset LAB">
      <style>{assetViewerResponsiveCss}</style>
      <div className="asset-lab-panel" style={styles.panel}>
        <header style={styles.header}>
          <div>
            <p style={styles.kicker}>Eksperymentalny moduł LAB</p>
            <h2 style={styles.title}>to3D Asset Pipeline LAB</h2>
          </div>
          <button className="asset-lab-close" type="button" onClick={onClose} style={styles.closeButton} aria-label="Zamknij Asset LAB">
            ✕
          </button>
        </header>

        <p style={styles.note}>
          Modele 3D nie są jeszcze częścią głównej gry. Ten panel służy tylko do bezpiecznego testowania manifestu i przyszłych lekkich GLB.
        </p>

        <div className="asset-lab-content" style={styles.content}>
          <aside style={styles.assetList} aria-label="Lista assetów LAB">
            {ASSET_LAB_ITEMS.map((item) => (
              <button
                key={item.id}
                className="asset-lab-item"
                type="button"
                onClick={() => setSelectedId(item.id)}
                style={{
                  ...styles.assetButton,
                  ...(item.id === selectedAsset?.id ? styles.assetButtonActive : {}),
                }}
              >
                <span style={styles.assetName}>{item.name}</span>
                <span style={styles.assetStatus}>{item.status}</span>
              </button>
            ))}
          </aside>

          <article className="asset-lab-details" style={styles.details}>
            <div style={styles.previewBox}>
              {hasModelFile ? (
                <div style={styles.canvasShell}>
                  <Canvas camera={{ position: [0, 1.2, 4.2], fov: 42 }} dpr={[1, 1.4]} gl={{ antialias: true, alpha: true }}>
                    <ambientLight intensity={1.6} />
                    <directionalLight position={[3, 4, 5]} intensity={2.2} />
                    <directionalLight position={[-3, 1, -2]} intensity={0.6} color="#5FC6FF" />
                    <Suspense fallback={<PreviewLoadingMesh />}>
                      <ModelErrorBoundary
                        resetKey={modelUrl}
                        onError={(error) => {
                          setPreviewState("error");
                          setPreviewError(error?.message || "Nie udało się załadować modelu GLB.");
                        }}
                      >
                        <GlbModel file={modelUrl} onReady={() => setPreviewState("ready")} />
                      </ModelErrorBoundary>
                    </Suspense>
                    <OrbitControls enablePan={false} enableDamping dampingFactor={0.08} minDistance={1.8} maxDistance={8} />
                  </Canvas>
                  {previewState === "loading" && <div style={styles.previewStatus}>Ładowanie modelu GLB...</div>}
                  {previewState === "ready" && <div style={styles.previewStatus}>Podgląd GLB aktywny</div>}
                  {previewState === "error" && (
                    <div style={{ ...styles.previewStatus, ...styles.previewError }}>
                      Nie udało się załadować GLB. {previewError}
                    </div>
                  )}
                </div>
              ) : (
                <div style={styles.emptyModel}>
                  Brak modelu. Dodaj plik GLB do public/assets3d/lab/.
                </div>
              )}
            </div>

            <dl style={styles.metaGrid}>
              <div style={styles.metaItem}>
                <dt style={styles.metaLabel}>Nazwa</dt>
                <dd style={styles.metaValue}>{selectedAsset?.name || "Brak"}</dd>
              </div>
              <div style={styles.metaItem}>
                <dt style={styles.metaLabel}>Typ</dt>
                <dd style={styles.metaValue}>{selectedAsset?.type || "unknown"}</dd>
              </div>
              <div style={styles.metaItem}>
                <dt style={styles.metaLabel}>Status</dt>
                <dd style={styles.metaValue}>{selectedAsset?.status || "unknown"}</dd>
              </div>
              <div style={styles.metaItem}>
                <dt style={styles.metaLabel}>Plik</dt>
                <dd style={styles.metaValue}>{selectedAsset?.file || "nie ustawiono"}</dd>
              </div>
            </dl>

            <p style={styles.description}>{selectedAsset?.description}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function normalizeModelFile(file) {
  if (!file) return "";
  return file.startsWith("/") ? file : `/assets3d/lab/${file}`;
}

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return <PreviewErrorMesh />;
    return this.props.children;
  }
}

function GlbModel({ file, onReady }) {
  const group = useRef();
  const gltf = useGLTF(file);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.28;
  });

  return (
    <group ref={group} position={[0, -0.55, 0]} scale={1.35}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function PreviewLoadingMesh() {
  useFrame((_, delta) => {
    // Suspense fallback stays intentionally light.
  });

  return (
    <mesh>
      <torusGeometry args={[0.75, 0.025, 8, 64]} />
      <meshBasicMaterial color="#2FE6C8" transparent opacity={0.55} />
    </mesh>
  );
}

function PreviewErrorMesh() {
  return (
    <mesh>
      <boxGeometry args={[1.1, 1.1, 1.1]} />
      <meshBasicMaterial color="#FF7A2E" wireframe transparent opacity={0.55} />
    </mesh>
  );
}

const assetViewerResponsiveCss = `
  @media (max-width: 640px) {
    .asset-lab-overlay {
      align-items: stretch !important;
      justify-content: flex-start !important;
      padding: 8px !important;
      overflow-x: hidden !important;
    }

    .asset-lab-panel {
      width: 100% !important;
      max-width: calc(100vw - 16px) !important;
      max-height: calc(100dvh - 16px) !important;
      padding: 14px !important;
      border-radius: 14px !important;
      overflow-x: hidden !important;
    }

    .asset-lab-close {
      width: 44px !important;
      height: 44px !important;
      font-size: 18px !important;
      touch-action: manipulation !important;
    }

    .asset-lab-content {
      grid-template-columns: minmax(0, 1fr) !important;
      gap: 12px !important;
    }

    .asset-lab-item {
      min-height: 48px !important;
      touch-action: manipulation !important;
    }

    .asset-lab-details {
      min-width: 0 !important;
    }

    .asset-lab-details dl {
      grid-template-columns: minmax(0, 1fr) !important;
    }
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
    background: "radial-gradient(circle at 50% 28%, rgba(47, 230, 200, 0.13), rgba(1, 4, 12, 0.96) 54%, rgba(1, 4, 12, 0.99))",
    color: "#E6EEF8",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  panel: {
    width: "min(860px, 100%)",
    maxHeight: "calc(100dvh - 32px)",
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
    fontSize: "clamp(24px, 4vw, 38px)",
    lineHeight: 1.05,
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
  },
  note: {
    margin: "16px 0 0",
    color: "#9FB6D4",
    fontSize: 14,
    lineHeight: 1.5,
  },
  content: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))",
    gap: 14,
    marginTop: 18,
  },
  assetList: {
    display: "grid",
    gap: 8,
    alignContent: "start",
  },
  assetButton: {
    border: "1px solid rgba(95, 198, 255, 0.22)",
    borderRadius: 12,
    padding: "10px 11px",
    background: "rgba(12, 20, 48, 0.62)",
    color: "#E6EEF8",
    cursor: "pointer",
    textAlign: "left",
  },
  assetButtonActive: {
    border: "1px solid rgba(47, 230, 200, 0.62)",
    background: "rgba(47, 230, 200, 0.1)",
    boxShadow: "0 0 18px rgba(47, 230, 200, 0.14)",
  },
  assetName: {
    display: "block",
    fontWeight: 900,
    fontSize: 13.5,
    lineHeight: 1.25,
  },
  assetStatus: {
    display: "block",
    marginTop: 4,
    color: "#FFB02E",
    fontFamily: "ui-monospace, Consolas, monospace",
    fontSize: 11,
    fontWeight: 800,
  },
  details: {
    minWidth: 0,
  },
  previewBox: {
    display: "grid",
    minHeight: 210,
    placeItems: "center",
    border: "1px dashed rgba(159, 182, 212, 0.28)",
    borderRadius: 14,
    background: "linear-gradient(135deg, rgba(12, 20, 48, 0.74), rgba(6, 10, 24, 0.74))",
    overflow: "hidden",
  },
  canvasShell: {
    position: "relative",
    width: "100%",
    minHeight: 250,
    height: "min(42vh, 340px)",
  },
  previewStatus: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    border: "1px solid rgba(47, 230, 200, 0.3)",
    borderRadius: 999,
    padding: "7px 10px",
    background: "rgba(6, 10, 24, 0.78)",
    color: "#CFEDE6",
    fontSize: 12,
    fontWeight: 900,
    textAlign: "center",
    lineHeight: 1.25,
  },
  previewError: {
    border: "1px solid rgba(255, 122, 46, 0.45)",
    color: "#FFE2A6",
  },
  previewPlaceholder: {
    maxWidth: 320,
    color: "#CFEDE6",
    fontWeight: 800,
    textAlign: "center",
    lineHeight: 1.45,
  },
  emptyModel: {
    maxWidth: 320,
    color: "#FFE2A6",
    fontWeight: 900,
    textAlign: "center",
    lineHeight: 1.45,
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
    margin: "14px 0 0",
  },
  metaItem: {
    minWidth: 0,
    border: "1px solid rgba(159, 182, 212, 0.18)",
    borderRadius: 12,
    padding: 10,
    background: "rgba(6, 10, 24, 0.62)",
  },
  metaLabel: {
    margin: 0,
    color: "#9FB6D4",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  metaValue: {
    margin: "4px 0 0",
    color: "#E6EEF8",
    fontSize: 13,
    fontWeight: 800,
    overflowWrap: "anywhere",
  },
  description: {
    margin: "12px 0 0",
    color: "#CFEDE6",
    fontSize: 14,
    lineHeight: 1.5,
  },
};
