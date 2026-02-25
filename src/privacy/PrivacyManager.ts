import EventEmitter from 'eventemitter3';
import { PrivacyMode, SensorType, OutputType } from '../types';

/**
 * Privacy Manager — Enforced by DESIGN, not by promise.
 *
 * NODE-SPEC §5: NODE must not spy on others. Non-negotiable at the
 * architectural level. Privacy is enforced by DESIGN, not by promise.
 *
 * Technical Architecture:
 *   - On-device processing first (raw data never leaves device)
 *   - No raw storage of others (only user's MEMORY of interaction)
 *   - Physical kill switch (hardware, not software)
 *   - Visible recording indicator (hardwired LED)
 *   - Consent framework (public/private modes)
 *   - Data sovereignty (user owns all data, E2E encrypted)
 *   - Expiration (default 1 year, mimics natural memory decay)
 */
export class PrivacyManager extends EventEmitter {
  private _mode: PrivacyMode = PrivacyMode.PRIVATE;
  private _killSwitchEngaged = false;
  private _recordingIndicator = false;

  // Sensor permissions per mode
  private readonly permissions: Record<PrivacyMode, SensorPermissions> = {
    [PrivacyMode.PUBLIC]: {
      camera: true,
      microphone: true,
      biometrics: true,
      imu: true,
      storesNames: true,
      storesFaces: true,
      storesConversationSummary: true,
      neverStoresRawAudio: true,
      neverStoresRawVideo: true,
      neverStoresExactQuotes: true,
    },
    [PrivacyMode.PRIVATE]: {
      camera: false,
      microphone: true, // Voice commands only
      biometrics: true,
      imu: true,
      storesNames: false,
      storesFaces: false,
      storesConversationSummary: false,
      neverStoresRawAudio: true,
      neverStoresRawVideo: true,
      neverStoresExactQuotes: true,
    },
    [PrivacyMode.KILLED]: {
      camera: false,
      microphone: false,
      biometrics: false,
      imu: false,
      storesNames: false,
      storesFaces: false,
      storesConversationSummary: false,
      neverStoresRawAudio: true,
      neverStoresRawVideo: true,
      neverStoresExactQuotes: true,
    },
  };

  get mode(): PrivacyMode {
    return this._mode;
  }

  get killSwitchEngaged(): boolean {
    return this._killSwitchEngaged;
  }

  get recordingIndicatorActive(): boolean {
    return this._recordingIndicator;
  }

  setMode(mode: PrivacyMode): void {
    const prev = this._mode;
    this._mode = mode;

    // Update recording indicator (hardwired to camera/mic power)
    this._recordingIndicator =
      this.permissions[mode].camera || this.permissions[mode].microphone;

    this.emit('mode:changed', { from: prev, to: mode });
    this.emit('indicator:changed', this._recordingIndicator);
  }

  engageKillSwitch(): void {
    this._killSwitchEngaged = true;
    this.setMode(PrivacyMode.KILLED);
    this.emit('killswitch:engaged');
  }

  disengageKillSwitch(): void {
    this._killSwitchEngaged = false;
    this.setMode(PrivacyMode.PRIVATE); // Default to private on resume
    this.emit('killswitch:disengaged');
  }

  isSensorAllowed(sensorType: SensorType): boolean {
    const perms = this.permissions[this._mode];
    switch (sensorType) {
      case SensorType.CAMERA:
        return perms.camera;
      case SensorType.MICROPHONE:
        return perms.microphone;
      case SensorType.PPG:
      case SensorType.GSR:
      case SensorType.SKIN_TEMP:
        return perms.biometrics;
      case SensorType.IMU:
        return perms.imu;
      default:
        return perms.camera; // New sensors follow camera permission
    }
  }

  isOutputAllowed(outputType: OutputType): boolean {
    if (this._mode === PrivacyMode.KILLED) return false;
    // Bone conduction and haptic always allowed when not killed
    // LED always on for privacy indication
    return true;
  }

  canStorePerson(): boolean {
    return this.permissions[this._mode].storesNames;
  }

  canStoreConversation(): boolean {
    return this.permissions[this._mode].storesConversationSummary;
  }

  /**
   * Validate data before storage — enforces "no raw storage" rule.
   * Returns false if the data contains prohibited content.
   */
  validateForStorage(data: Record<string, unknown>): StorageValidation {
    const violations: string[] = [];

    // Check for raw audio/video data
    if (data.rawAudio || data.audioBuffer || data.audioBlob) {
      violations.push('Raw audio data cannot be stored');
    }
    if (data.rawVideo || data.videoFrame || data.imageData) {
      violations.push('Raw video/image data cannot be stored');
    }
    if (data.exactQuote || data.transcript) {
      violations.push('Exact quotes/transcripts cannot be stored — use summaries');
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  getCurrentPermissions(): SensorPermissions {
    return { ...this.permissions[this._mode] };
  }
}

export interface SensorPermissions {
  camera: boolean;
  microphone: boolean;
  biometrics: boolean;
  imu: boolean;
  storesNames: boolean;
  storesFaces: boolean;
  storesConversationSummary: boolean;
  neverStoresRawAudio: true;     // Invariant — always true
  neverStoresRawVideo: true;     // Invariant — always true
  neverStoresExactQuotes: true;  // Invariant — always true
}

export interface StorageValidation {
  valid: boolean;
  violations: string[];
}
