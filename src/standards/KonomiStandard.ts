import { KonomiLayer } from '../types';

/**
 * KONOMI Standard — Self-Defining Industrial Standards Compression.
 *
 * Maps NODE's architecture to industrial standards for:
 *   - Equipment hierarchy (ISA-95 L0-L4)
 *   - State machines (ISA-88 / PackML)
 *   - HMI design (ISA-101)
 *   - Alarm management (ISA-18.2)
 *   - Communication (OPC-UA, MQTT/Sparkplug, Modbus)
 *   - KPI tracking (OEE, MTBF, MTTR)
 *
 * NODE maps to ISA-95 as follows:
 *   L0 — Physical sensors (R0/R1 hardware)
 *   L1 — Edge AI processing (sensor fusion, on-device inference)
 *   L2 — R2 gate logic + R3 state estimation (supervisory)
 *   L3 — R4 executive assist + R5 memory (operations management)
 *   L4 — R6 observer + cloud analytics (business planning)
 */

// ─── Base UDTs (Layer 1) ───────────────────────────────────────────────

export interface Identifier {
  id: string;
  namespace: string;
  version: string;
}

export interface Timestamp {
  utc: number;
  timezone: string;
  quality: 'good' | 'uncertain' | 'bad';
}

export interface Quality {
  value: 'good' | 'uncertain' | 'bad' | 'not_available';
  source: string;
  timestamp: number;
}

export interface Quantity {
  value: number;
  unit: string;
  quality: Quality['value'];
}

export interface Range {
  min: number;
  max: number;
  unit: string;
}

export interface Duration {
  value: number;
  unit: 'ms' | 's' | 'min' | 'hr' | 'day';
}

export interface Status {
  state: string;
  enteredAt: number;
  reason?: string;
}

// ─── ISA-95 Equipment Hierarchy (Layer 2) ──────────────────────────────

export interface Equipment {
  id: Identifier;
  name: string;
  level: ISA95Level;
  parent?: string;
  children: string[];
  status: Status;
  capabilities: string[];
}

export enum ISA95Level {
  L0_PROCESS = 0,     // Physical sensors
  L1_SENSING = 1,     // Edge AI processing
  L2_SUPERVISORY = 2, // R2 Gate + R3 State
  L3_OPERATIONS = 3,  // R4 Assist + R5 Memory
  L4_BUSINESS = 4,    // R6 Observer + Cloud
}

// ─── ISA-88 State Machine (Layer 3) ────────────────────────────────────

export enum PackMLState {
  IDLE = 'idle',
  STARTING = 'starting',
  EXECUTE = 'execute',
  COMPLETING = 'completing',
  COMPLETE = 'complete',
  RESETTING = 'resetting',
  HOLDING = 'holding',
  HELD = 'held',
  UNHOLDING = 'unholding',
  SUSPENDING = 'suspending',
  SUSPENDED = 'suspended',
  UNSUSPENDING = 'unsuspending',
  ABORTING = 'aborting',
  ABORTED = 'aborted',
  CLEARING = 'clearing',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
}

export interface StateMachine {
  currentState: PackMLState;
  previousState: PackMLState | null;
  transitions: StateTransition[];
  stateEnteredAt: number;
}

export interface StateTransition {
  from: PackMLState;
  to: PackMLState;
  trigger: string;
  guard?: string;
}

// ─── ISA-18.2 Alarm Management (Layer 5) ──────────────────────────────

export enum AlarmPriority {
  P1_CRITICAL = 1,  // Immediate action required (safety)
  P2_HIGH = 2,      // Prompt action (overwhelm imminent)
  P3_MEDIUM = 3,    // Awareness needed (HRV declining)
  P4_LOW = 4,       // Information only (stimming duration)
}

export interface Alarm {
  id: string;
  priority: AlarmPriority;
  state: 'active' | 'acknowledged' | 'cleared' | 'shelved';
  message: string;
  source: string;
  activatedAt: number;
  acknowledgedAt?: number;
  clearedAt?: number;
}

// ─── OPC-UA Node Model (Layer 6) ──────────────────────────────────────

export interface OPCNode {
  nodeId: string;
  browseName: string;
  nodeClass: 'Object' | 'Variable' | 'Method';
  value?: unknown;
  dataType?: string;
  children: string[];
}

// ─── KPIs (Layer 9) ───────────────────────────────────────────────────

export interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  period: Duration;
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * NODE-specific KPIs mapped to standard OEE framework:
 *   Availability  → Device uptime / Total wear time
 *   Performance   → Successful interventions / Total interventions
 *   Quality       → Independent recalls / Total recalls (user improving)
 */
export function calculateNodeOEE(metrics: {
  uptimeHours: number;
  totalWearHours: number;
  successfulInterventions: number;
  totalInterventions: number;
  independentRecalls: number;
  totalRecalls: number;
}): { availability: number; performance: number; quality: number; oee: number } {
  const availability = metrics.totalWearHours > 0
    ? metrics.uptimeHours / metrics.totalWearHours : 0;
  const performance = metrics.totalInterventions > 0
    ? metrics.successfulInterventions / metrics.totalInterventions : 0;
  const quality = metrics.totalRecalls > 0
    ? metrics.independentRecalls / metrics.totalRecalls : 0;

  return {
    availability,
    performance,
    quality,
    oee: availability * performance * quality,
  };
}

// ─── Layer Registry ────────────────────────────────────────────────────

export const KONOMI_LAYERS: Record<KonomiLayer, LayerInfo> = {
  [KonomiLayer.L0_META]: {
    name: 'Meta-Standard',
    description: 'Self-defining standard primitives: STD, UDT, LEVEL, STATE_MACHINE, ENTITY, RELATION, RULE, CROSSWALK',
  },
  [KonomiLayer.L1_BASE_UDT]: {
    name: 'Base UDTs',
    description: 'Identifier, Timestamp, Quality, Value, Range, Quantity, Duration, Status',
  },
  [KonomiLayer.L2_ISA95]: {
    name: 'ISA-95',
    description: 'Equipment hierarchy L0-L4, PhysicalAsset, Material, Personnel, ProcessSegment',
  },
  [KonomiLayer.L3_ISA88]: {
    name: 'ISA-88',
    description: 'Equipment/Recipe hierarchies, Procedure, Formula, Batch, PackML state machines',
  },
  [KonomiLayer.L4_ISA101]: {
    name: 'ISA-101',
    description: 'HMI design principles, layers L1-L5, color standards, faceplate/trend design',
  },
  [KonomiLayer.L5_ISA182]: {
    name: 'ISA-18.2',
    description: 'Alarm priorities P1-P4, lifecycle state machine, rationalization, metrics',
  },
  [KonomiLayer.L6_OPC_UA]: {
    name: 'OPC-UA',
    description: 'NodeClass, address space, variables, methods, subscriptions, companion specs',
  },
  [KonomiLayer.L7_MQTT_SPARKPLUG]: {
    name: 'MQTT/Sparkplug',
    description: 'QoS levels, topic format, Sparkplug message types, payload encoding',
  },
  [KonomiLayer.L8_MODBUS]: {
    name: 'Modbus',
    description: 'Register types, data types, function codes, exception codes, device maps',
  },
  [KonomiLayer.L9_KPIS]: {
    name: 'KPIs',
    description: 'OEE formula/targets, MTBF, MTTR, supporting metrics, KPI tree',
  },
};

export interface LayerInfo {
  name: string;
  description: string;
}
