import EventEmitter from 'eventemitter3';
import {
  DeviceCapabilities, PowerState, SensorType, OutputType,
} from '../types';

/**
 * Device Manager — Hardware abstraction for NODE V1.
 *
 * NODE-SPEC §4: Hardware design constraints.
 *   Form factor: Shoulder mount, <150g
 *   Battery: 3000mAh LiPo, ~9.4 hours runtime
 *   SoC: Qualcomm QCS6490 class (edge AI NPU)
 *   Thermal: Passive cooling, ~600mW average
 *
 * This layer abstracts hardware access so the ring/bus architecture
 * works identically on real hardware and in simulation.
 */
export class DeviceManager extends EventEmitter {
  private _capabilities: DeviceCapabilities;
  private _power: PowerState;
  private _ledState: LEDState = { recording: false, battery: 'green', system: 'green' };
  private powerMonitorInterval: ReturnType<typeof setInterval> | null = null;

  constructor(capabilities?: Partial<DeviceCapabilities>) {
    super();

    // V1 default capabilities per NODE-SPEC §3.1
    this._capabilities = {
      sensors: [
        SensorType.CAMERA,
        SensorType.MICROPHONE,
        SensorType.PPG,
        SensorType.SKIN_TEMP,
        SensorType.IMU,
      ],
      outputs: [
        OutputType.BONE_CONDUCTION,
        OutputType.LED,
      ],
      hasKillSwitch: true,
      batteryCapacity: 3000,
      edgeProcessingAvailable: true,
      cloudConnectivity: true,
      ...capabilities,
    };

    this._power = {
      batteryPercent: 100,
      estimatedRuntime: 564,  // 9.4 hours
      isCharging: false,
      thermalState: 'nominal',
      totalDraw: 1180,
    };
  }

  async start(): Promise<void> {
    this.powerMonitorInterval = setInterval(() => this.updatePower(), 60_000);
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (this.powerMonitorInterval) {
      clearInterval(this.powerMonitorInterval);
      this.powerMonitorInterval = null;
    }
    this.emit('stopped');
  }

  get capabilities(): DeviceCapabilities {
    return { ...this._capabilities };
  }

  get power(): PowerState {
    return { ...this._power };
  }

  get led(): LEDState {
    return { ...this._ledState };
  }

  hasSensor(type: SensorType): boolean {
    return this._capabilities.sensors.includes(type);
  }

  hasOutput(type: OutputType): boolean {
    return this._capabilities.outputs.includes(type);
  }

  // ─── LED Control (NODE-SPEC §5.1) ────────────────────────────────────

  setRecordingIndicator(active: boolean): void {
    this._ledState.recording = active;
    this.emit('led:recording', active);
  }

  // ─── Output Devices ──────────────────────────────────────────────────

  async playBoneConduction(text: string, volume: number): Promise<void> {
    if (!this.hasOutput(OutputType.BONE_CONDUCTION)) return;
    this.emit('output:bone_conduction', { text, volume });
  }

  async triggerHaptic(pattern: HapticPattern): Promise<void> {
    if (!this.hasOutput(OutputType.HAPTIC)) return;
    this.emit('output:haptic', pattern);
  }

  // ─── Power Management ────────────────────────────────────────────────

  private updatePower(): void {
    // Simulate battery drain (1180mW from 11.1Wh = ~9.4h)
    if (!this._power.isCharging && this._power.batteryPercent > 0) {
      this._power.batteryPercent = Math.max(0, this._power.batteryPercent - 0.177);
      this._power.estimatedRuntime = (this._power.batteryPercent / 100) * 564;
    }

    // Thermal management
    if (this._power.totalDraw > 1500) {
      this._power.thermalState = 'warm';
    }
    if (this._power.totalDraw > 2000) {
      this._power.thermalState = 'throttling';
    }

    // LED battery indicator
    if (this._power.batteryPercent > 20) {
      this._ledState.battery = 'green';
    } else if (this._power.batteryPercent > 5) {
      this._ledState.battery = 'yellow';
    } else {
      this._ledState.battery = 'red';
    }

    this.emit('power:updated', this._power);

    if (this._power.batteryPercent <= 5) {
      this.emit('power:critical', this._power);
    }
  }

  // ─── Hardware Info ───────────────────────────────────────────────────

  getHardwareInfo(): HardwareInfo {
    return {
      model: 'NODE-V1',
      soc: 'Qualcomm QCS6490',
      camera: 'OV5693 5MP Wide-Angle',
      microphones: 'Knowles SPH0645 MEMS x2',
      boneConduction: 'Custom Piezo Transducer',
      ppg: 'Maxim MAX86150',
      imu: 'Bosch BMI270',
      battery: '3000mAh LiPo Pouch',
      connectivity: 'WiFi 6E + BLE 5.2 (WCN6856)',
      formFactor: 'Shoulder Mount (<150g)',
      classification: 'Class II Medical Assistive Device',
    };
  }
}

export interface LEDState {
  recording: boolean;
  battery: 'green' | 'yellow' | 'red';
  system: 'green' | 'yellow' | 'red';
}

export interface HapticPattern {
  type: 'single' | 'double' | 'wave' | 'alert';
  intensity: number; // 0..1
  duration: number;  // ms
}

export interface HardwareInfo {
  model: string;
  soc: string;
  camera: string;
  microphones: string;
  boneConduction: string;
  ppg: string;
  imu: string;
  battery: string;
  connectivity: string;
  formFactor: string;
  classification: string;
}
