import { Ring } from '../core/Ring';
import {
  BusMessage, RingId, BusId, Priority,
  SceneModel, BodyState, R3State, ArousalState,
} from '../types';

/**
 * R2 — Gate Ring (Priority Sorting)
 *
 * NODE-SPEC §8 Pipeline Stage 2: "Sort"
 * What's relevant right now? Social context detected → prioritize face/name lookup.
 * HRV dropping → flag for R3 monitor. Nothing relevant → stay quiet.
 *
 * R2 gate configuration is USER-SPECIFIC. Learns the individual's patterns.
 */
export class R2_Gate extends Ring {
  private currentScene: SceneModel | null = null;
  private currentBodyState: BodyState | null = null;
  private currentR3State: R3State | null = null;
  private actionQueue: GateAction[] = [];

  // User-specific thresholds (adaptable over time)
  private thresholds = {
    hrvLowWarning: 35,          // ms — below this, flag for R3
    hrvCritical: 25,            // ms — overwhelm likely
    ambientNoiseLoud: 75,       // dB
    approachDetectionDistance: 3, // meters
    stimmingAwarenessMinutes: 10, // minutes before alerting
  };

  constructor() {
    super(RingId.R2, 'Gate');
  }

  protected onMessage(msg: BusMessage): void {
    const payload = msg.payload as Record<string, unknown>;
    if (!payload?.type) return;

    switch (payload.type) {
      case 'scene_update':
        this.currentScene = payload.scene as SceneModel;
        break;
      case 'body_state':
        this.currentBodyState = payload as unknown as BodyState;
        break;
      case 'r3_state':
        this.currentR3State = payload as unknown as R3State;
        break;
      case 'fall_detected':
        // Safety-critical bypasses gate entirely
        this.emitAction({
          type: 'safety_alert',
          priority: Priority.P3_SAFETY,
          reason: 'Fall detected',
          data: payload,
        });
        return;
    }

    this.evaluate();
  }

  protected onBroadcast(msg: BusMessage): void {
    this.onMessage(msg);
  }

  private evaluate(): void {
    this.actionQueue = [];

    this.evaluateSocialContext();
    this.evaluateBodyState();
    this.evaluateOverwhelmRisk();
    this.evaluateEnvironment();

    // Sort by priority and send to R4
    this.actionQueue.sort((a, b) => a.priority - b.priority);

    if (this.actionQueue.length > 0) {
      this.sendToBus(BusId.A, {
        type: 'gate_actions',
        actions: this.actionQueue,
        timestamp: Date.now(),
      }, this.actionQueue[0].priority, RingId.R4);
    }

    this.emit('evaluated', this.actionQueue);
  }

  private evaluateSocialContext(): void {
    if (!this.currentScene) return;

    // Someone approaching → name lookup (P0)
    const approaching = this.currentScene.people.filter(p => p.isApproaching);
    for (const person of approaching) {
      this.emitAction({
        type: 'name_lookup',
        priority: Priority.P0_MUST,
        reason: 'Person approaching',
        data: { personId: person.id, distance: person.distance },
      });
    }

    // New people detected in scene → context retrieval
    for (const person of this.currentScene.people) {
      if (!person.name && person.confidence > 0.7) {
        this.emitAction({
          type: 'face_identify',
          priority: Priority.P0_MUST,
          reason: 'Unidentified person in scene',
          data: { personId: person.id },
        });
      }
    }

    // Someone speaking to user → transcript priority
    const speakers = this.currentScene.people.filter(p => p.isSpeaking);
    if (speakers.length > 0) {
      this.emitAction({
        type: 'conversation_track',
        priority: Priority.P1_SHOULD,
        reason: 'Active conversation',
        data: { speakers: speakers.map(s => s.id) },
      });
    }
  }

  private evaluateBodyState(): void {
    if (!this.currentBodyState) return;

    // HRV dropping
    if (this.currentBodyState.hrv < this.thresholds.hrvLowWarning) {
      this.emitAction({
        type: 'hrv_warning',
        priority: Priority.P1_SHOULD,
        reason: `HRV ${this.currentBodyState.hrv}ms below threshold ${this.thresholds.hrvLowWarning}ms`,
        data: { hrv: this.currentBodyState.hrv },
      });
    }

    // Stimming awareness (NOT suppression)
    const stimmingSec = this.currentBodyState.movement.stimmingDuration ?? 0;
    if (stimmingSec > this.thresholds.stimmingAwarenessMinutes * 60) {
      this.emitAction({
        type: 'stimming_awareness',
        priority: Priority.P2_NICE,
        reason: `Stimming for ${Math.round(stimmingSec / 60)} minutes`,
        data: { duration: stimmingSec, activity: this.currentBodyState.movement.activity },
      });
    }
  }

  private evaluateOverwhelmRisk(): void {
    if (!this.currentR3State) return;

    if (this.currentR3State.arousal === ArousalState.ELEVATED ||
        this.currentR3State.arousal === ArousalState.OVERWHELM) {
      this.emitAction({
        type: 'overwhelm_alert',
        priority: Priority.P1_SHOULD,
        reason: `R3 state: ${this.currentR3State.arousal}, risk: ${this.currentR3State.overwhelmRisk}`,
        data: { r3: this.currentR3State },
      });
    }
  }

  private evaluateEnvironment(): void {
    if (!this.currentScene) return;

    if (this.currentScene.ambientNoise > this.thresholds.ambientNoiseLoud) {
      this.emitAction({
        type: 'environment_alert',
        priority: Priority.P2_NICE,
        reason: `Ambient noise ${this.currentScene.ambientNoise}dB exceeds threshold`,
        data: { noise: this.currentScene.ambientNoise },
      });
    }
  }

  private emitAction(action: GateAction): void {
    this.actionQueue.push(action);
  }

  updateThresholds(updates: Partial<typeof this.thresholds>): void {
    Object.assign(this.thresholds, updates);
    this.emit('thresholds:updated', this.thresholds);
  }
}

export interface GateAction {
  type: string;
  priority: Priority;
  reason: string;
  data: Record<string, unknown>;
}
