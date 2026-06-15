// Asset LAB manifest.
//
// Quality gate metadata (V6.6.4): every entry can declare source, license,
// file size, texture status, mobile test status, quality status and a fallback
// instruction. Fields are optional and the viewer renders "nie ustawiono"
// safely when they are missing, so older/placeholder entries never crash.
//
// Quality gate fields:
// - sourceType:    "procedural" | "cc0" | "cc-by" | "unknown"
// - license:       string (human-readable license note)
// - fileSizeKb:    number | null
// - textureStatus: "none" | "512" | "1024" | "unknown"
// - mobileStatus:  "pending" | "passed" | "failed"
// - qualityStatus: "test" | "passed" | "failed"
// - fallback:      string (what to do if the asset misbehaves)
export const ASSET_LAB_ITEMS = [
  {
    id: "placeholder",
    name: "Miejsce na model testowy",
    file: "",
    type: "placeholder",
    status: "empty",
    description: "Dodaj plik GLB do public/assets3d/lab/ i wpisz go w assetManifest.js.",
    sourceType: "unknown",
    license: null,
    fileSizeKb: null,
    textureStatus: "unknown",
    mobileStatus: "pending",
    qualityStatus: "test",
    fallback: null,
  },
  {
    id: "example-glb",
    name: "Przykładowy model GLB",
    file: "",
    type: "glb",
    status: "planned",
    description: "Wpis testowy dla przyszłego małego modelu GLB.",
    sourceType: "unknown",
    license: null,
    fileSizeKb: null,
    textureStatus: "unknown",
    mobileStatus: "pending",
    qualityStatus: "test",
    fallback: null,
  },
  {
    id: "copernix-probe-v001",
    name: "Sonda Copernix v001",
    file: "/assets3d/lab/copernix-probe-v001.glb",
    type: "glb",
    status: "test",
    description: "Pierwszy lekki proceduralny model GLB dla Asset LAB.",
    sourceType: "procedural",
    license: "internal procedural asset",
    fileSizeKb: 23,
    textureStatus: "none",
    mobileStatus: "pending",
    qualityStatus: "test",
    fallback: "Clear the file field in assetManifest.js if this model causes performance issues.",
  },
];
