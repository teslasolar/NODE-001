import { BusId, RingId, SensorReading, SensorType } from '../types';
import { Sensor } from './Sensor';

/**
 * Skin temperature sensor — R0 (Body State) via Bus B (Chemical proxy).
 *
 * NODE-SPEC §2.1: Thermoregulation stress detection.
 * 5mW continuous. Negligible power impact.
 */
export class SkinTemp extends Sensor {
  constructor() {
    super({
      type: SensorType.SKIN_TEMP,
      ring: RingId.R0,
      bus: BusId.B,
      dutyCycle: 1.0,
      powerDraw: 5,
      sampleRate: 5000,  // Every 5 seconds
    });
  }

  protected sample(): SensorReading {
    return {
      sensorType: this.type,
      ring: this.ring,
      bus: this.bus,
      timestamp: Date.now(),
      confidence: 0.95,
      data: {
        temperature: 36.8,  // °C
        trend: 'stable',
      },
    };
  }
}
