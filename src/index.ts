/**
 * NODE-001 — Wearable AI Companion System
 *
 * Hardware implementation of ASS-OS for neurodivergent assistive use.
 * Architecture: ASS-OS Ring/Bus Model
 * Classification: Medical Assistive Device
 * Spec: NODE-SPEC-001 Rev 0.1
 *
 * Design: John DuCrest + Thomas Frumkin
 */

// ─── Core Architecture ─────────────────────────────────────────────────
export { Bus, Ring, Runtime } from './core';
export type { RuntimeStatus } from './core';

// ─── Ring Implementations ──────────────────────────────────────────────
export {
  R0_BodyState,
  R1_SensoryInput,
  R2_Gate,
  R3_EmotionalState,
  R4_ExecutiveAssist,
  R5_PersistentMemory,
  R6_Observer,
} from './rings';
export type { GateAction, ObserverRecommendation, DailySummary } from './rings';

// ─── Sensors ───────────────────────────────────────────────────────────
export { Sensor, Camera, Microphone, PPG, SkinTemp, IMU } from './sensors';
export type { SensorConfig } from './sensors';

// ─── Pipeline ──────────────────────────────────────────────────────────
export { Pipeline } from './pipeline';

// ─── Privacy ───────────────────────────────────────────────────────────
export { PrivacyManager, ConsentFramework } from './privacy';
export type { SensorPermissions, StorageValidation, ConsentRule, ConsentRecord } from './privacy';

// ─── Device ────────────────────────────────────────────────────────────
export { DeviceManager } from './device';
export type { LEDState, HapticPattern, HardwareInfo } from './device';

// ─── P2P ───────────────────────────────────────────────────────────────
export { P2PManager } from './p2p';
export type { P2PMessage, MessageHandler } from './p2p';

// ─── Standards ─────────────────────────────────────────────────────────
export {
  calculateNodeOEE,
  KONOMI_LAYERS,
  ISA95Level,
  PackMLState,
  AlarmPriority,
} from './standards';

// ─── Configuration ─────────────────────────────────────────────────────
export { NODE_DEFAULTS } from './config';
export type { NodeConfig } from './config';

// ─── Types ─────────────────────────────────────────────────────────────
export * from './types';

// ─── NODE Factory ──────────────────────────────────────────────────────

import { Runtime } from './core';
import {
  R0_BodyState, R1_SensoryInput, R2_Gate,
  R3_EmotionalState, R4_ExecutiveAssist,
  R5_PersistentMemory, R6_Observer,
} from './rings';
import { Camera, Microphone, PPG, SkinTemp, IMU } from './sensors';
import { Pipeline } from './pipeline';
import { PrivacyManager, ConsentFramework } from './privacy';
import { DeviceManager } from './device';
import { P2PManager } from './p2p';
import { RingId } from './types';

export interface NODE {
  runtime: Runtime;
  pipeline: Pipeline;
  privacy: PrivacyManager;
  consent: ConsentFramework;
  device: DeviceManager;
  p2p: P2PManager;
  rings: {
    r0: R0_BodyState;
    r1: R1_SensoryInput;
    r2: R2_Gate;
    r3: R3_EmotionalState;
    r4: R4_ExecutiveAssist;
    r5: R5_PersistentMemory;
    r6: R6_Observer;
  };
}

/**
 * Create a fully wired NODE instance.
 *
 * Assembles the complete ring/bus architecture with all sensors,
 * privacy framework, P2P, and device management.
 */
export function createNODE(): NODE {
  // Core
  const runtime = new Runtime();
  const privacy = new PrivacyManager();
  const consent = new ConsentFramework();
  const device = new DeviceManager();
  const p2p = new P2PManager();

  // Rings
  const r0 = new R0_BodyState();
  const r1 = new R1_SensoryInput();
  const r2 = new R2_Gate();
  const r3 = new R3_EmotionalState();
  const r4 = new R4_ExecutiveAssist();
  const r5 = new R5_PersistentMemory();
  const r6 = new R6_Observer();

  runtime.registerRing(r0);
  runtime.registerRing(r1);
  runtime.registerRing(r2);
  runtime.registerRing(r3);
  runtime.registerRing(r4);
  runtime.registerRing(r5);
  runtime.registerRing(r6);

  // Pipeline with sensors
  const pipeline = new Pipeline(runtime, privacy);
  pipeline.registerSensor(new Camera());
  pipeline.registerSensor(new Microphone());
  pipeline.registerSensor(new PPG());
  pipeline.registerSensor(new SkinTemp());
  pipeline.registerSensor(new IMU());

  // Wire privacy mode changes to pipeline
  privacy.on('mode:changed', () => pipeline.onPrivacyModeChanged());
  privacy.on('indicator:changed', (active: boolean) => device.setRecordingIndicator(active));

  return {
    runtime,
    pipeline,
    privacy,
    consent,
    device,
    p2p,
    rings: { r0, r1, r2, r3, r4, r5, r6 },
  };
}
