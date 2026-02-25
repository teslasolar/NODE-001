import { BusId, RingId, SensorReading, SensorType } from '../types';
import { Sensor } from './Sensor';

/**
 * Dual lavalier microphone array — R1 (Sensory Input) via Bus A (Electrical).
 *
 * NODE-SPEC §2.1: Conversation capture, speaker identification,
 * ambient sound level monitoring, keyword/name detection.
 * Dual mics for directional beamforming (who's talking to user vs background).
 *
 * V1: Knowles SPH0645 MEMS x2. 50mW at 90% duty = 45mW effective.
 */
export class Microphone extends Sensor {
  constructor() {
    super({
      type: SensorType.MICROPHONE,
      ring: RingId.R1,
      bus: BusId.A,
      dutyCycle: 0.9,    // Always listening
      powerDraw: 50,      // mW
      sampleRate: 500,    // Process audio chunks every 500ms
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
        ambientLevel: 0,         // dB
        voiceDetected: false,
        speakerId: null,
        speechContent: null,     // Transcription
        direction: 0,            // Degrees from forward
        isSpeakingToUser: false,
        keywords: [],
      },
    };
  }
}
