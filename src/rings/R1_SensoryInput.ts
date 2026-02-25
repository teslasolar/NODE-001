import { Ring } from '../core/Ring';
import {
  BusMessage, RingId, BusId, Priority,
  SceneModel, PersonDetection, SensorReading, SensorType,
} from '../types';

/**
 * R1 — Sensory Input Ring
 *
 * Sensor fusion: combine camera + audio + thermal into a unified scene model.
 * Must be real-time (<100ms latency for social cues). Edge processing avoids
 * cloud dependency and privacy risk.
 *
 * This ring builds the "what is happening around me right now" model.
 */
export class R1_SensoryInput extends Ring {
  private scene: SceneModel = {
    timestamp: Date.now(),
    people: [],
    ambientNoise: 0,
    objectsOfInterest: [],
  };

  constructor() {
    super(RingId.R1, 'Sensory Input');
  }

  protected onMessage(msg: BusMessage): void {
    const reading = msg.payload as SensorReading;
    if (!reading?.sensorType) return;

    switch (reading.sensorType) {
      case SensorType.CAMERA:
        this.fuseCameraData(reading.data);
        break;
      case SensorType.MICROPHONE:
        this.fuseAudioData(reading.data);
        break;
    }

    this.scene.timestamp = Date.now();
    this.broadcastScene();
  }

  private fuseCameraData(data: Record<string, unknown>): void {
    const faces = data.faces as Array<Record<string, unknown>> | undefined;
    if (faces) {
      this.scene.people = faces.map((f): PersonDetection => ({
        id: (f.id as string) ?? 'unknown',
        name: f.name as string | undefined,
        confidence: (f.confidence as number) ?? 0,
        distance: (f.distance as number) ?? 0,
        direction: (f.direction as number) ?? 0,
        isApproaching: (f.isApproaching as boolean) ?? false,
        isSpeaking: false,
      }));
    }

    const objects = data.objects as string[] | undefined;
    if (objects) {
      this.scene.objectsOfInterest = objects;
    }

    const sceneType = data.sceneType as string | undefined;
    if (sceneType) {
      this.scene.location = sceneType;
    }
  }

  private fuseAudioData(data: Record<string, unknown>): void {
    this.scene.ambientNoise = (data.ambientLevel as number) ?? 0;

    // Match speaking audio to detected people
    if (data.voiceDetected && data.speakerId) {
      const speaker = this.scene.people.find(p => p.id === data.speakerId);
      if (speaker) speaker.isSpeaking = true;
    }
  }

  private broadcastScene(): void {
    // Send fused scene to R2 for priority sorting
    this.sendToBus(BusId.A, {
      type: 'scene_update',
      scene: this.getScene(),
    }, Priority.P0_MUST, RingId.R2);

    this.emit('scene', this.scene);
  }

  getScene(): SceneModel {
    return {
      ...this.scene,
      people: this.scene.people.map(p => ({ ...p })),
      objectsOfInterest: [...this.scene.objectsOfInterest],
    };
  }
}
