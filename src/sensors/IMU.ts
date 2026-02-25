import { BusId, RingId, SensorReading, SensorType } from '../types';
import { Sensor } from './Sensor';

/**
 * IMU (6-axis accelerometer + gyroscope) — R0+R1 via Bus D (Mechanical).
 *
 * NODE-SPEC §2.1: Movement tracking, posture detection, stimming pattern
 * recognition, fall detection, activity classification.
 * Stimming detection is NOT for suppression — it's for AWARENESS.
 *
 * V1: Bosch BMI270. 15mW continuous.
 */
export class IMU extends Sensor {
  constructor() {
    super({
      type: SensorType.IMU,
      ring: RingId.R0,
      bus: BusId.D,
      dutyCycle: 1.0,
      powerDraw: 15,
      sampleRate: 200,  // 5 Hz for processed activity data
    });
  }

  protected sample(): SensorReading {
    return {
      sensorType: this.type,
      ring: this.ring,
      bus: this.bus,
      timestamp: Date.now(),
      confidence: 0.9,
      data: {
        accel: { x: 0, y: 0, z: 9.81 }, // m/s²
        gyro: { x: 0, y: 0, z: 0 },     // °/s
        activity: 'still',
        isStimming: false,
        stimmingType: null,
        stimmingDuration: 0,
        fallDetected: false,
        posture: { pitch: 0, roll: 0, yaw: 0 },
        stepCount: 0,
      },
    };
  }
}
