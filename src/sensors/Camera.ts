import { BusId, RingId, SensorReading, SensorType } from '../types';
import { Sensor } from './Sensor';

/**
 * Camera sensor — R1 (Sensory Input) via Bus C (Photonic).
 *
 * NODE-SPEC §2.1: Face recognition, object identification, text reading,
 * environmental scene understanding. Provides persistent R1 — what the eyes
 * saw but the brain didn't store.
 *
 * V1: Single wide-angle camera (OV5693 class), 1080p 30fps.
 * Power: 800mW at 50% duty cycle = 400mW effective.
 */
export class Camera extends Sensor {
  constructor() {
    super({
      type: SensorType.CAMERA,
      ring: RingId.R1,
      bus: BusId.C,
      dutyCycle: 0.5,    // Active in social contexts, sleep otherwise
      powerDraw: 800,     // mW
      sampleRate: 1000,   // 1 frame analysis per second for high-level processing
    });
  }

  protected sample(): SensorReading {
    return {
      sensorType: this.type,
      ring: this.ring,
      bus: this.bus,
      timestamp: Date.now(),
      confidence: 0.85,
      data: {
        faces: [],           // Face detections from edge AI
        objects: [],         // Identified objects
        text: [],            // OCR results
        sceneType: 'unknown', // indoor/outdoor/social/private
        lightLevel: 0,       // lux
        resolution: { width: 1920, height: 1080 },
      },
    };
  }
}
