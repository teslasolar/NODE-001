/**
 * NODE-001 Garden of Eden · Shared Constants
 *
 * Architecture data, golden ratio math, color palettes,
 * and the complete NODE file tree — hardcoded from the live build.
 */

const PHI = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// ─── ASS-OS Ring Definitions ───────────────────────────────────────────
const RINGS = [
  { id: 'R0', name: 'BODY STATE',       color: '#cc4466', desc: 'Biometric monitoring · HRV, temp, IMU, fall detection',  isa: 'L0', weakness: 'Low-gain interoception — threats pass undetected' },
  { id: 'R1', name: 'SENSORY INPUT',    color: '#00aadd', desc: 'Sensor fusion · Camera + audio → unified scene model',   isa: 'L1', weakness: 'Max-gain overload → crash on sensory flood' },
  { id: 'R2', name: 'GATE',             color: '#ffaa00', desc: 'Priority sorting · User-specific adaptive thresholds',    isa: 'L1', weakness: 'Binary wall — open for help = open for threat' },
  { id: 'R3', name: 'EMOTIONAL STATE',  color: '#ff4444', desc: 'Arousal estimation · Overwhelm prediction from biometrics', isa: 'L2', weakness: 'Hides in R4 — undefended when R4 is busy' },
  { id: 'R4', name: 'EXECUTIVE ASSIST', color: '#44aa44', desc: 'Intervention engine · Brevity-first voice output',       isa: 'L2', weakness: 'So busy building shields it forgets to check them' },
  { id: 'R5', name: 'PERSISTENT MEMORY',color: '#aa44ff', desc: 'Encrypted storage · 1yr expiry · Data sovereignty',      isa: 'L3', weakness: 'No slot for receiving help — structural gap' },
  { id: 'R6', name: 'OBSERVER',         color: '#ffffff', desc: 'Meta-monitoring · Self-calibration · Dependency prevention', isa: 'L4', weakness: 'Cannot observe itself — blind to self-directed threats' },
];

// ─── ASS-OS Bus Definitions ────────────────────────────────────────────
const BUSES = [
  { id: 'A', name: 'ELECTRICAL', color: '#4466ff', feeds: [0, 1] },
  { id: 'B', name: 'CHEMICAL',   color: '#ff4444', feeds: [0, 2, 3] },
  { id: 'C', name: 'PHOTONIC',   color: '#ffdd00', feeds: [1, 3, 4] },
  { id: 'D', name: 'MECHANICAL', color: '#44ff44', feeds: [0, 4, 5, 6] },
];

// ─── ISA-95 Hierarchy ──────────────────────────────────────────────────
const ISA_LEVELS = [
  { level: 'L0', name: 'PHYSICAL PROCESS', desc: 'Sensors · R0 body state hardware',   color: '#cc4466', rings: ['R0'] },
  { level: 'L1', name: 'DIRECT CONTROL',   desc: 'R1 sensory + R2 gate · First wall',  color: '#00aadd', rings: ['R1', 'R2'] },
  { level: 'L2', name: 'SUPERVISORY',      desc: 'R3 affect + R4 executive · Fortress', color: '#44aa44', rings: ['R3', 'R4'] },
  { level: 'L3', name: 'OPERATIONS',       desc: 'R5 memory · Identity as armor',       color: '#aa44ff', rings: ['R5'] },
  { level: 'L4', name: 'BUSINESS',         desc: 'R6 observer · The watchtower',        color: '#ffffff', rings: ['R6'] },
];

// ─── Pipeline Stages ───────────────────────────────────────────────────
const PIPELINE = [
  { stage: 'SENSE', ring: 'R0+R1', color: '#00aadd', desc: 'Sensor fusion → scene + body model' },
  { stage: 'SORT',  ring: 'R2',    color: '#ffaa00', desc: 'Gate logic → priority action queue' },
  { stage: 'FEEL',  ring: 'R3',    color: '#ff4444', desc: 'Arousal estimation → R3 state' },
  { stage: 'ACT',   ring: 'R4',    color: '#44aa44', desc: 'Intervention → bone conduction' },
  { stage: 'STORE', ring: 'R5',    color: '#aa44ff', desc: 'Memory metadata → encrypted storage' },
  { stage: 'WATCH', ring: 'R6',    color: '#ffffff', desc: 'Self-review → calibrate or reduce' },
];

// ─── NODE-001 File Tree ────────────────────────────────────────────────
const NODE_MODULES = [
  {
    name: 'core', label: 'ASS-OS Kernel', color: '#0af',
    files: [
      { path: 'src/core/Bus.ts',     name: 'Bus.ts',     size: 1200 },
      { path: 'src/core/Ring.ts',    name: 'Ring.ts',    size: 980 },
      { path: 'src/core/Runtime.ts', name: 'Runtime.ts', size: 2800 },
      { path: 'src/core/index.ts',   name: 'index.ts',   size: 120 },
    ]
  },
  {
    name: 'rings', label: 'Ring Implementations', color: '#f80',
    files: [
      { path: 'src/rings/R0_BodyState.ts',       name: 'R0_BodyState.ts',       size: 2400 },
      { path: 'src/rings/R1_SensoryInput.ts',    name: 'R1_SensoryInput.ts',    size: 2100 },
      { path: 'src/rings/R2_Gate.ts',            name: 'R2_Gate.ts',            size: 3800 },
      { path: 'src/rings/R3_EmotionalState.ts',  name: 'R3_EmotionalState.ts',  size: 3200 },
      { path: 'src/rings/R4_ExecutiveAssist.ts',  name: 'R4_ExecutiveAssist.ts',  size: 4500 },
      { path: 'src/rings/R5_PersistentMemory.ts', name: 'R5_PersistentMemory.ts', size: 3600 },
      { path: 'src/rings/R6_Observer.ts',         name: 'R6_Observer.ts',         size: 3900 },
      { path: 'src/rings/index.ts',               name: 'index.ts',               size: 320 },
    ]
  },
  {
    name: 'sensors', label: 'Sensor Array', color: '#0dd',
    files: [
      { path: 'src/sensors/Sensor.ts',     name: 'Sensor.ts',     size: 1100 },
      { path: 'src/sensors/Camera.ts',     name: 'Camera.ts',     size: 950 },
      { path: 'src/sensors/Microphone.ts', name: 'Microphone.ts', size: 880 },
      { path: 'src/sensors/PPG.ts',        name: 'PPG.ts',        size: 720 },
      { path: 'src/sensors/SkinTemp.ts',   name: 'SkinTemp.ts',   size: 580 },
      { path: 'src/sensors/IMU.ts',        name: 'IMU.ts',        size: 1050 },
      { path: 'src/sensors/index.ts',      name: 'index.ts',      size: 200 },
    ]
  },
  {
    name: 'pipeline', label: 'Processing Pipeline', color: '#f0a',
    files: [
      { path: 'src/pipeline/Pipeline.ts', name: 'Pipeline.ts', size: 2600 },
      { path: 'src/pipeline/index.ts',    name: 'index.ts',    size: 60 },
    ]
  },
  {
    name: 'privacy', label: 'Privacy Framework', color: '#fd0',
    files: [
      { path: 'src/privacy/PrivacyManager.ts',   name: 'PrivacyManager.ts',   size: 3200 },
      { path: 'src/privacy/ConsentFramework.ts', name: 'ConsentFramework.ts', size: 1800 },
      { path: 'src/privacy/index.ts',            name: 'index.ts',            size: 180 },
    ]
  },
  {
    name: 'device', label: 'Hardware Abstraction', color: '#8f4',
    files: [
      { path: 'src/device/DeviceManager.ts', name: 'DeviceManager.ts', size: 2900 },
      { path: 'src/device/index.ts',         name: 'index.ts',         size: 120 },
    ]
  },
  {
    name: 'p2p', label: 'KONOMI P2P Mesh', color: '#48f',
    files: [
      { path: 'src/p2p/P2PManager.ts', name: 'P2PManager.ts', size: 3100 },
      { path: 'src/p2p/index.ts',      name: 'index.ts',      size: 100 },
    ]
  },
  {
    name: 'standards', label: 'KONOMI Standard', color: '#a8f',
    files: [
      { path: 'src/standards/KonomiStandard.ts', name: 'KonomiStandard.ts', size: 4200 },
      { path: 'src/standards/index.ts',          name: 'index.ts',          size: 380 },
    ]
  },
  {
    name: 'types', label: 'Type System', color: '#fa8',
    files: [
      { path: 'src/types/index.ts', name: 'index.ts', size: 5200 },
    ]
  },
  {
    name: 'config', label: 'Configuration', color: '#8af',
    files: [
      { path: 'src/config/defaults.ts', name: 'defaults.ts', size: 1800 },
      { path: 'src/config/index.ts',    name: 'index.ts',    size: 80 },
    ]
  },
  {
    name: 'tests', label: 'Test Suites', color: '#4f8',
    files: [
      { path: 'tests/core.test.ts',      name: 'core.test.ts',      size: 2200 },
      { path: 'tests/privacy.test.ts',   name: 'privacy.test.ts',   size: 2800 },
      { path: 'tests/rings.test.ts',     name: 'rings.test.ts',     size: 1400 },
      { path: 'tests/node.test.ts',      name: 'node.test.ts',      size: 2000 },
      { path: 'tests/standards.test.ts', name: 'standards.test.ts', size: 1600 },
    ]
  },
  {
    name: 'root', label: 'Project Root', color: '#888',
    files: [
      { path: 'src/index.ts',    name: 'index.ts',    size: 3400 },
      { path: 'package.json',    name: 'package.json', size: 720 },
      { path: 'tsconfig.json',   name: 'tsconfig.json', size: 680 },
      { path: 'README.md',       name: 'README.md',     size: 3200 },
    ]
  },
];

// ─── Color Utilities ───────────────────────────────────────────────────
function hexToRGB(hex) {
  if (hex.length === 4) hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function hueForExt(filename) {
  if (/\.ts$/i.test(filename))   return 0.58;
  if (/\.js$/i.test(filename))   return 0.12;
  if (/\.json$/i.test(filename)) return 0.15;
  if (/\.md$/i.test(filename))   return 0.85;
  return 0.33;
}

// ─── Golden Ratio Utilities ────────────────────────────────────────────
function goldenSpiral(index, total, baseRadius) {
  const angle = index * GOLDEN_ANGLE;
  const r = baseRadius + Math.sqrt(index) * (baseRadius * 0.6);
  return {
    x: Math.cos(angle) * r,
    z: Math.sin(angle) * r,
    angle
  };
}

function fibonacci127(dim) {
  // Map dimension 0..126 onto a sphere using golden ratio
  const theta = dim * PHI * TAU;
  const phi = Math.acos(2 * (dim / 127) - 1);
  return { theta, phi };
}
