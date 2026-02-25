import { BusId, RingId, SensorReading, SensorType } from '../types';
import { Sensor } from './Sensor';

/**
 * PPG heart rate sensor — R0 (Body State) via Bus B (Chemical proxy).
 *
 * NODE-SPEC §2.1: Real-time physiological monitoring. HRV = vagal tone =
 * parasympathetic capacity. This IS the R0 readout.
 *
 * V1: Maxim MAX86150 or MAX30101. 30mW continuous.
 */
export class PPG extends Sensor {
  constructor() {
    super({
      type: SensorType.PPG,
      ring: RingId.R0,
      bus: BusId.B,
      dutyCycle: 1.0,    // Always on
      powerDraw: 30,      // mW
      sampleRate: 1000,   // 1 Hz for processed metrics
    });
  }

  protected sample(): SensorReading {
    return {
      sensorType: this.type,
      ring: this.ring,
      bus: this.bus,
      timestamp: Date.now(),
      confidence: 0.92,
      data: {
        heartRate: 72,      // bpm
        hrv: 50,            // ms RMSSD
        spo2: 98,           // %
        perfusionIndex: 2.5,
        signalQuality: 0.95,
      },
    };
  }
}
