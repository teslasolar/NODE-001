import { Ring } from '../core/Ring';
import {
  BusMessage, RingId, BusId, Priority,
  R3State, ArousalState, BodyState,
} from '../types';

/**
 * R3 — Emotional / Arousal State Estimation Ring
 *
 * NODE-SPEC §8 Pipeline Stage 3: "Feel"
 * Infer emotional/arousal state from R0 biometrics + R1 context.
 * "User is in social situation + HRV dropping + GSR rising = R3 overwhelm approaching."
 *
 * Pattern matching requires training data. Cloud for model updates.
 * Edge for real-time inference.
 */
export class R3_EmotionalState extends Ring {
  private state: R3State = {
    timestamp: Date.now(),
    arousal: ArousalState.CALM,
    arousalScore: 0.2,
    socialContext: false,
    overwhelmRisk: 0,
    trend: 'stable',
    durationInState: 0,
  };

  // Rolling windows for trend detection
  private hrvHistory: number[] = [];
  private arousalHistory: number[] = [];
  private lastStateChange = Date.now();

  // User-learned baselines (R6 adjusts these over time)
  private baselines = {
    restingHr: 72,
    restingHrv: 55,
    normalSkinTemp: 36.8,
    overwhelmHrvThreshold: 30,
    calmHrvThreshold: 50,
  };

  constructor() {
    super(RingId.R3, 'Emotional State');
  }

  protected onMessage(msg: BusMessage): void {
    const payload = msg.payload as BodyState;
    if (!payload?.heartRate) return;

    this.updateFromBodyState(payload);
    this.broadcastState();
  }

  private updateFromBodyState(body: BodyState): void {
    // Track HRV history (last 60 samples ≈ 1 minute at 1Hz)
    this.hrvHistory.push(body.hrv);
    if (this.hrvHistory.length > 60) this.hrvHistory.shift();

    // Calculate arousal score from multiple signals
    const hrvDeviation = (this.baselines.restingHrv - body.hrv) / this.baselines.restingHrv;
    const hrDeviation = (body.heartRate - this.baselines.restingHr) / this.baselines.restingHr;
    const tempDeviation = Math.abs(body.skinTemp - this.baselines.normalSkinTemp) / 2;

    // Weighted arousal score
    let score = Math.max(0, Math.min(1,
      hrvDeviation * 0.5 +
      hrDeviation * 0.3 +
      tempDeviation * 0.2
    ));

    // GSR spike detection (if available)
    if (body.gsr !== undefined && body.gsr > 5) {
      score = Math.min(1, score + 0.15);
    }

    // Movement agitation factor
    if (body.movement.activity === 'stimming' || body.movement.activity === 'fidgeting') {
      score = Math.min(1, score + 0.1);
    }

    this.arousalHistory.push(score);
    if (this.arousalHistory.length > 30) this.arousalHistory.shift();

    // Determine trend from recent history
    const trend = this.calculateTrend();

    // Map score to arousal state
    const prevArousal = this.state.arousal;
    const arousal = this.scoreToArousal(score);

    if (arousal !== prevArousal) {
      this.lastStateChange = Date.now();
    }

    // Overwhelm risk: combine current score with trend
    const overwhelmRisk = trend === 'rising'
      ? Math.min(1, score * 1.3)
      : score;

    this.state = {
      timestamp: Date.now(),
      arousal,
      arousalScore: score,
      socialContext: false, // Updated by R2 scene context
      overwhelmRisk,
      trend,
      durationInState: Date.now() - this.lastStateChange,
    };
  }

  private scoreToArousal(score: number): ArousalState {
    if (score < 0.2) return ArousalState.CALM;
    if (score < 0.4) return ArousalState.MILD;
    if (score < 0.6) return ArousalState.MODERATE;
    if (score < 0.8) return ArousalState.ELEVATED;
    return ArousalState.OVERWHELM;
  }

  private calculateTrend(): 'rising' | 'stable' | 'falling' {
    if (this.arousalHistory.length < 5) return 'stable';

    const recent = this.arousalHistory.slice(-5);
    const older = this.arousalHistory.slice(-10, -5);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const diff = recentAvg - olderAvg;

    if (diff > 0.05) return 'rising';
    if (diff < -0.05) return 'falling';
    return 'stable';
  }

  private broadcastState(): void {
    this.sendToBus(BusId.A, {
      type: 'r3_state',
      ...this.state,
    }, Priority.P1_SHOULD, RingId.R2);

    this.emit('state', this.state);
  }

  getState(): R3State {
    return { ...this.state };
  }

  updateBaselines(updates: Partial<typeof this.baselines>): void {
    Object.assign(this.baselines, updates);
    this.emit('baselines:updated', this.baselines);
  }
}
