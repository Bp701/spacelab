/**
 * generate-copernix-probe-v001.mjs
 * ------------------------------------------------------------------
 * Deterministic, fully OFFLINE generator for the first Asset LAB test model:
 *   public/assets3d/lab/copernix-probe-v001.glb
 *
 * The model is a low-poly, child-friendly sci-fi "Copernix Probe" built ONLY
 * from Three.js primitive geometry (boxes, cylinders, a cone). There are:
 *   - no image textures
 *   - no animations
 *   - no external/downloaded assets
 *   - no third-party models (license-clean, 100% procedural)
 *
 * Export uses Three.js GLTFExporter (binary GLB). Run with:
 *   node scripts/generate-copernix-probe-v001.mjs
 *
 * Colors:
 *   body    graphite / dark gray   #3A3F47
 *   panels  dark navy / blue       #16264F
 *   accent  cyan / teal            #2FE6C8
 *   antenna light gray             #C7CED8
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

/**
 * Minimal, offline FileReader polyfill.
 * Three's GLTFExporter binary path uses `new FileReader().readAsArrayBuffer(blob)`
 * to read its Blob. Node has no FileReader, but it does have a native Blob with
 * `.arrayBuffer()`, so we bridge the two. No network, no dependencies.
 */
if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class {
    constructor() {
      this.result = null;
      this.onload = null;
      this.onloadend = null;
      this.onerror = null;
    }
    readAsArrayBuffer(blob) {
      Promise.resolve(blob.arrayBuffer())
        .then((buffer) => {
          this.result = buffer;
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
        })
        .catch((error) => {
          if (this.onerror) this.onerror(error);
        });
    }
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = resolve(__dirname, "../public/assets3d/lab/copernix-probe-v001.glb");

/* Flat, low-poly materials — readable in the Asset LAB lighting rig. */
const mat = (hex, { metalness = 0.25, roughness = 0.6, emissive = 0x000000, emissiveIntensity = 0 } = {}) =>
  new THREE.MeshStandardMaterial({ color: hex, metalness, roughness, emissive, emissiveIntensity, flatShading: true });

const BODY = mat(0x3a3f47, { metalness: 0.35, roughness: 0.55 });
const PANEL = mat(0x16264f, { metalness: 0.4, roughness: 0.45 });
const ACCENT = mat(0x2fe6c8, { metalness: 0.2, roughness: 0.35, emissive: 0x0e7a6b, emissiveIntensity: 0.5 });
const ANTENNA = mat(0xc7ced8, { metalness: 0.5, roughness: 0.4 });
const THRUSTER = mat(0x2a2e35, { metalness: 0.5, roughness: 0.5 });

const root = new THREE.Group();
root.name = "CopernixProbeV001";

const add = (geo, material, { pos = [0, 0, 0], rot = [0, 0, 0], name } = {}) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(...pos);
  m.rotation.set(...rot);
  if (name) m.name = name;
  root.add(m);
  return m;
};

/* Central body — slightly elongated box. */
add(new THREE.BoxGeometry(0.9, 0.7, 1.2), BODY, { name: "body" });

/* Cyan/teal accent stripe band near the front of the body. */
add(new THREE.BoxGeometry(0.94, 0.16, 0.18), ACCENT, { pos: [0, 0.12, 0.52], name: "accent" });

/* Small front sensor (cyan dome made of a low-poly sphere). */
add(new THREE.SphereGeometry(0.14, 10, 8), ACCENT, { pos: [0, 0, 0.66], name: "sensor" });

/* Two solar panels on side arms. */
const arm = new THREE.BoxGeometry(0.5, 0.06, 0.06);
const panel = new THREE.BoxGeometry(1.0, 0.04, 0.7);
add(arm, ANTENNA, { pos: [0.7, 0, 0], name: "arm-right" });
add(panel, PANEL, { pos: [1.45, 0, 0], name: "panel-right" });
add(arm, ANTENNA, { pos: [-0.7, 0, 0], name: "arm-left" });
add(panel, PANEL, { pos: [-1.45, 0, 0], name: "panel-left" });

/* Small antenna mast with a light-gray tip. */
add(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), ANTENNA, { pos: [0, 0.65, -0.2], name: "antenna-mast" });
add(new THREE.SphereGeometry(0.07, 8, 6), ANTENNA, { pos: [0, 0.98, -0.2], name: "antenna-tip" });

/* Small rear thruster cone. */
add(new THREE.ConeGeometry(0.18, 0.3, 12), THRUSTER, { pos: [0, 0, -0.78], rot: [Math.PI / 2, 0, 0], name: "thruster" });

const exporter = new GLTFExporter();
exporter.parse(
  root,
  (result) => {
    const buffer = Buffer.from(result); // result is an ArrayBuffer when binary:true
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, buffer);
    const kb = (buffer.byteLength / 1024).toFixed(1);
    console.log(`OK: wrote ${OUT_PATH} (${kb} KB, ${buffer.byteLength} bytes)`);
  },
  (error) => {
    console.error("GLTFExporter failed:", error);
    process.exitCode = 1;
  },
  { binary: true, onlyVisible: true }
);
