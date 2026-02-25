import { PrivacyMode } from '../types';

/**
 * NODE-001 Default Configuration.
 *
 * All values derived from NODE-SPEC-001 specifications.
 * User-specific overrides are loaded at runtime.
 */
export const NODE_DEFAULTS = {
  // Device identity
  deviceId: 'NODE-V1-001',
  firmwareVersion: '0.1.0',
  specRevision: 'NODE-SPEC-001 Rev 0.1',

  // Privacy defaults (conservative by design)
  privacy: {
    defaultMode: PrivacyMode.PRIVATE,
    memoryExpiryDays: 365,
    autoModeSwitch: false,
  },

  // R2 Gate thresholds (user-adaptable)
  gate: {
    hrvLowWarning: 35,
    hrvCritical: 25,
    ambientNoiseLoud: 75,
    approachDetectionDistance: 3,
    stimmingAwarenessMinutes: 10,
  },

  // R3 State estimation baselines
  baselines: {
    restingHr: 72,
    restingHrv: 55,
    normalSkinTemp: 36.8,
    overwhelmHrvThreshold: 30,
    calmHrvThreshold: 50,
  },

  // Voice design (NODE-SPEC §7.1)
  voice: {
    style: 'calm',           // calm, low-affect, gender-neutral
    brevity: 'maximum',       // shortest possible utterance
    timing: 'anticipatory',   // deliver before user needs it
    interruptWord: ['got it', 'stop', 'shh'],
    silenceByDefault: true,
    adaptiveVolume: true,
    minVolume: 0.1,
    maxVolume: 0.4,          // Never louder than a gentle whisper
  },

  // Power budget (NODE-SPEC §4.2)
  power: {
    batteryCapacity: 3000,    // mAh
    batteryVoltage: 3.7,      // V
    totalEnergy: 11.1,        // Wh
    targetRuntime: 564,       // minutes (9.4 hours)
    thermalBudget: 600,       // mW average
    thermalMax: 1500,         // mW peak
  },

  // Sensor duty cycles (NODE-SPEC §4.2)
  sensors: {
    cameraDutyCycle: 0.5,
    microphoneDutyCycle: 0.9,
    ppgDutyCycle: 1.0,
    skinTempDutyCycle: 1.0,
    imuDutyCycle: 1.0,
    boneCondDutyCycle: 0.1,
  },

  // R6 Observer review schedule
  observer: {
    reviewIntervalMinutes: 30,
    dailySummaryEnabled: true,
    dependencyTrackingEnabled: true,
  },

  // P2P defaults
  p2p: {
    heartbeatIntervalSeconds: 30,
    trustRequired: true,
    encryptionRequired: true,
  },
} as const;

export type NodeConfig = typeof NODE_DEFAULTS;
