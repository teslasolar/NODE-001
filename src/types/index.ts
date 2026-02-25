/**
 * NODE-001 Core Type Definitions
 * Maps directly to NODE-SPEC-001 § 2 ASS-OS Architecture
 */

// ─── ASS-OS Ring Identifiers ───────────────────────────────────────────────
export enum RingId {
  R0 = 'R0', // Body State
  R1 = 'R1', // Sensory Input
  R2 = 'R2', // Gate (Priority Sorting)
  R3 = 'R3', // Emotional / Arousal State
  R4 = 'R4', // Executive Assist
  R5 = 'R5', // Persistent Memory
  R6 = 'R6', // Observer (Meta-Monitoring)
}

// ─── ASS-OS Bus Identifiers ────────────────────────────────────────────────
export enum BusId {
  A = 'BUS_A', // Electrical
  B = 'BUS_B', // Chemical / Chemical Proxy
  C = 'BUS_C', // Photonic
  D = 'BUS_D', // Mechanical / Spatial
}

// ─── Sensor Types (NODE-SPEC §2.1) ────────────────────────────────────────
export enum SensorType {
  CAMERA = 'camera',
  LIDAR = 'lidar',
  IR_THERMAL = 'ir_thermal',
  UV = 'uv',
  GAMMA = 'gamma',
  MICROPHONE = 'microphone',
  PPG = 'ppg',           // Photoplethysmography (heart rate)
  GSR = 'gsr',           // Galvanic skin response
  SKIN_TEMP = 'skin_temp',
  IMU = 'imu',           // Accelerometer + Gyroscope
}

// ─── Output Types (NODE-SPEC §2.2) ────────────────────────────────────────
export enum OutputType {
  BONE_CONDUCTION = 'bone_conduction',
  HAPTIC = 'haptic',
  LED = 'led',
}

// ─── Priority Levels (NODE-SPEC §3.2) ─────────────────────────────────────
export enum Priority {
  P0_MUST = 0,   // Must Have (Name/Face Memory, Conversation Summary, Privacy)
  P1_SHOULD = 1, // Should Have (Social Cue, Overwhelm Detection, Env Narration)
  P2_NICE = 2,   // Nice to Have (Stimming Awareness, Coaching, Daily Summary)
  P3_SAFETY = -1, // Safety Critical (overrides all)
}

// ─── Privacy Modes (NODE-SPEC §5.1) ───────────────────────────────────────
export enum PrivacyMode {
  PUBLIC = 'public',     // Camera active, stores names/faces in public contexts
  PRIVATE = 'private',   // Camera off, audio only for user voice commands
  KILLED = 'killed',     // Hardware kill switch engaged — everything off
}

// ─── R3 Arousal States ─────────────────────────────────────────────────────
export enum ArousalState {
  CALM = 'calm',
  MILD = 'mild',
  MODERATE = 'moderate',
  ELEVATED = 'elevated',
  OVERWHELM = 'overwhelm',
}

// ─── Pipeline Stages (NODE-SPEC §8) ───────────────────────────────────────
export enum PipelineStage {
  SENSE = 'sense',   // R0 + R1 → Sensor fusion
  SORT = 'sort',     // R2 → Gate logic
  FEEL = 'feel',     // R3 → State estimation
  ACT = 'act',       // R4 → Intervention generation
  STORE = 'store',   // R5 → Persistent memory
  WATCH = 'watch',   // R6 → Meta-monitoring
}

// ─── Data Structures ───────────────────────────────────────────────────────

export interface SensorReading {
  sensorType: SensorType;
  ring: RingId;
  bus: BusId;
  timestamp: number;
  data: Record<string, unknown>;
  confidence: number; // 0..1
}

export interface SceneModel {
  timestamp: number;
  people: PersonDetection[];
  ambientNoise: number;     // dB
  location?: string;
  objectsOfInterest: string[];
}

export interface PersonDetection {
  id: string;
  name?: string;
  confidence: number;
  distance: number;         // meters
  direction: number;        // degrees from forward
  isApproaching: boolean;
  isSpeaking: boolean;
  context?: PersonContext;
}

export interface PersonContext {
  firstMet?: string;        // ISO date
  lastSeen?: string;
  location?: string;
  topics: string[];
  relationship?: string;
  notes: string[];
}

export interface BodyState {
  timestamp: number;
  heartRate: number;        // bpm
  hrv: number;              // ms (RMSSD)
  skinTemp: number;         // °C
  gsr?: number;             // µS
  movement: MovementState;
  posture: PostureState;
}

export interface MovementState {
  isMoving: boolean;
  activity: 'still' | 'walking' | 'fidgeting' | 'stimming';
  stimmingDuration?: number; // seconds
  fallDetected: boolean;
}

export interface PostureState {
  orientation: { pitch: number; roll: number; yaw: number };
  isUpright: boolean;
}

export interface R3State {
  timestamp: number;
  arousal: ArousalState;
  arousalScore: number;      // 0..1
  socialContext: boolean;
  overwhelmRisk: number;     // 0..1
  trend: 'rising' | 'stable' | 'falling';
  durationInState: number;   // seconds
}

export interface Intervention {
  id: string;
  priority: Priority;
  type: InterventionType;
  content: string;
  output: OutputType;
  timing: 'immediate' | 'next_gap' | 'deferred';
  suppressible: boolean;
}

export enum InterventionType {
  NAME_REMINDER = 'name_reminder',
  CONVERSATION_SUMMARY = 'conversation_summary',
  SOCIAL_CUE = 'social_cue',
  OVERWHELM_ALERT = 'overwhelm_alert',
  ENVIRONMENT_NARRATION = 'environment_narration',
  STIMMING_AWARENESS = 'stimming_awareness',
  CONVERSATION_COACHING = 'conversation_coaching',
  REGULATION_PROMPT = 'regulation_prompt',
  DAILY_SUMMARY = 'daily_summary',
  SAFETY_ALERT = 'safety_alert',
}

export interface MemoryEntry {
  id: string;
  timestamp: number;
  type: 'person' | 'conversation' | 'event' | 'location' | 'pattern';
  data: Record<string, unknown>;
  expiresAt?: number;       // undefined = permanent
  encrypted: boolean;
}

export interface ObserverMetrics {
  timestamp: number;
  namesRecalledIndependently: number;
  namesRecalledWithAssist: number;
  interventionAccuracy: number;     // 0..1
  overwhelmsPredicted: number;
  overwhelmsMissed: number;
  userDismissalRate: number;        // 0..1
  baselineHrv: number;
  currentHrvTrend: 'improving' | 'stable' | 'declining';
}

// ─── Bus Message ───────────────────────────────────────────────────────────

export interface BusMessage<T = unknown> {
  id: string;
  bus: BusId;
  sourceRing: RingId;
  targetRing?: RingId;      // undefined = broadcast
  timestamp: number;
  payload: T;
  priority: Priority;
}

// ─── Device Hardware Abstraction ───────────────────────────────────────────

export interface DeviceCapabilities {
  sensors: SensorType[];
  outputs: OutputType[];
  hasKillSwitch: boolean;
  batteryCapacity: number;   // mAh
  edgeProcessingAvailable: boolean;
  cloudConnectivity: boolean;
}

export interface PowerState {
  batteryPercent: number;
  estimatedRuntime: number;  // minutes
  isCharging: boolean;
  thermalState: 'nominal' | 'warm' | 'throttling';
  totalDraw: number;         // mW
}

// ─── KONOMI Standard Layer References ──────────────────────────────────────

export enum KonomiLayer {
  L0_META = 0,
  L1_BASE_UDT = 1,
  L2_ISA95 = 2,
  L3_ISA88 = 3,
  L4_ISA101 = 4,
  L5_ISA182 = 5,
  L6_OPC_UA = 6,
  L7_MQTT_SPARKPLUG = 7,
  L8_MODBUS = 8,
  L9_KPIS = 9,
}

// ─── P2P Types (from KONOMI P2P) ──────────────────────────────────────────

export enum P2PMessageType {
  DISCOVERY = 'discovery',
  HANDSHAKE = 'handshake',
  STATE_SYNC = 'state_sync',
  MEMORY_SHARE = 'memory_share',
  ALERT_BROADCAST = 'alert_broadcast',
  HEARTBEAT = 'heartbeat',
}

export interface P2PPeer {
  id: string;
  name: string;
  publicKey: string;
  lastSeen: number;
  capabilities: string[];
  trustLevel: 'unknown' | 'verified' | 'trusted';
}
