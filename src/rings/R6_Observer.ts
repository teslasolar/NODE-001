import { Ring } from '../core/Ring';
import {
  BusMessage, RingId, BusId, Priority,
  ObserverMetrics, Intervention,
} from '../types';

/**
 * R6 — Observer Ring (Meta-Monitoring + Self-Calibration)
 *
 * NODE-SPEC §8 Pipeline Stage 6: "Watch"
 * Is the system helping or annoying? Is the user becoming dependent?
 * Is the intervention pattern working? Self-calibration.
 *
 * R6 prevents the system from becoming a crutch. Tracks:
 * "Is the user remembering names MORE over time (training natural memory)
 *  or LESS (replacing natural memory)?" Adaptive: reduce assistance as user improves.
 */
export class R6_Observer extends Ring {
  private metrics: ObserverMetrics = {
    timestamp: Date.now(),
    namesRecalledIndependently: 0,
    namesRecalledWithAssist: 0,
    interventionAccuracy: 0.5,
    overwhelmsPredicted: 0,
    overwhelmsMissed: 0,
    userDismissalRate: 0,
    baselineHrv: 55,
    currentHrvTrend: 'stable',
  };

  private interventionLog: Array<{
    type: string;
    timestamp: number;
    dismissed: boolean;
  }> = [];

  private hrvSamples: number[] = [];
  private reviewInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super(RingId.R6, 'Observer');
  }

  async start(): Promise<void> {
    await super.start();
    // Periodic self-review every 30 minutes
    this.reviewInterval = setInterval(() => this.selfReview(), 30 * 60 * 1000);
  }

  async stop(): Promise<void> {
    if (this.reviewInterval) {
      clearInterval(this.reviewInterval);
      this.reviewInterval = null;
    }
    await super.stop();
  }

  protected onMessage(msg: BusMessage): void {
    const payload = msg.payload as Record<string, unknown>;
    if (!payload?.type) return;

    switch (payload.type) {
      case 'intervention_track':
        this.trackIntervention(payload.intervention as Intervention);
        break;
      case 'user_recalled_name':
        this.trackNameRecall(payload.independent as boolean);
        break;
      case 'overwhelm_occurred':
        this.trackOverwhelm(payload.predicted as boolean);
        break;
      case 'hrv_sample':
        this.trackHrv(payload.hrv as number);
        break;
    }
  }

  protected onBroadcast(msg: BusMessage): void {
    const payload = msg.payload as Record<string, unknown>;
    // Listen for body state broadcasts to track HRV baseline
    if (payload?.heartRate !== undefined && payload?.hrv !== undefined) {
      this.trackHrv(payload.hrv as number);
    }
  }

  private trackIntervention(intervention: Intervention): void {
    this.interventionLog.push({
      type: intervention.type,
      timestamp: Date.now(),
      dismissed: false,
    });

    // Trim to last 1000 entries
    if (this.interventionLog.length > 1000) {
      this.interventionLog = this.interventionLog.slice(-500);
    }
  }

  private trackNameRecall(independent: boolean): void {
    if (independent) {
      this.metrics.namesRecalledIndependently++;
    } else {
      this.metrics.namesRecalledWithAssist++;
    }
  }

  private trackOverwhelm(predicted: boolean): void {
    if (predicted) {
      this.metrics.overwhelmsPredicted++;
    } else {
      this.metrics.overwhelmsMissed++;
    }
  }

  private trackHrv(hrv: number): void {
    this.hrvSamples.push(hrv);
    if (this.hrvSamples.length > 1440) { // ~24 hours at 1/min
      this.hrvSamples = this.hrvSamples.slice(-720);
    }
  }

  /**
   * Periodic self-review — adjusts system behavior.
   * This is the mechanism that prevents NODE from becoming a crutch.
   */
  private selfReview(): void {
    this.metrics.timestamp = Date.now();

    // Calculate dismissal rate
    const recent = this.interventionLog.filter(
      i => i.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );
    if (recent.length > 0) {
      const dismissed = recent.filter(i => i.dismissed).length;
      this.metrics.userDismissalRate = dismissed / recent.length;
    }

    // Calculate intervention accuracy
    const totalOverwhelms = this.metrics.overwhelmsPredicted + this.metrics.overwhelmsMissed;
    if (totalOverwhelms > 0) {
      this.metrics.interventionAccuracy =
        this.metrics.overwhelmsPredicted / totalOverwhelms;
    }

    // HRV baseline tracking
    if (this.hrvSamples.length >= 60) {
      const avg = this.hrvSamples.reduce((a, b) => a + b, 0) / this.hrvSamples.length;
      const prevBaseline = this.metrics.baselineHrv;
      this.metrics.baselineHrv = avg;

      if (avg > prevBaseline + 2) {
        this.metrics.currentHrvTrend = 'improving';
      } else if (avg < prevBaseline - 2) {
        this.metrics.currentHrvTrend = 'declining';
      } else {
        this.metrics.currentHrvTrend = 'stable';
      }
    }

    // Emit recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      this.sendToBus(BusId.A, {
        type: 'observer_recommendations',
        recommendations,
        metrics: this.getMetrics(),
      }, Priority.P2_NICE);
    }

    this.emit('review', { metrics: this.metrics, recommendations });
  }

  private generateRecommendations(): ObserverRecommendation[] {
    const recs: ObserverRecommendation[] = [];

    // High dismissal rate → reduce intervention frequency
    if (this.metrics.userDismissalRate > 0.4) {
      recs.push({
        target: RingId.R2,
        action: 'reduce_frequency',
        reason: `User dismissal rate ${Math.round(this.metrics.userDismissalRate * 100)}% — intervening too often.`,
      });
    }

    // User recalling names independently → reduce name assist
    const totalRecalls = this.metrics.namesRecalledIndependently + this.metrics.namesRecalledWithAssist;
    if (totalRecalls > 20) {
      const independentRate = this.metrics.namesRecalledIndependently / totalRecalls;
      if (independentRate > 0.7) {
        recs.push({
          target: RingId.R4,
          action: 'reduce_name_assist',
          reason: `Independent name recall ${Math.round(independentRate * 100)}% — natural memory improving.`,
        });
      }
    }

    // Low overwhelm prediction accuracy → adjust R3 thresholds
    if (this.metrics.overwhelmsMissed > 3 && this.metrics.interventionAccuracy < 0.5) {
      recs.push({
        target: RingId.R3,
        action: 'increase_sensitivity',
        reason: `Missing ${this.metrics.overwhelmsMissed} overwhelms — R3 thresholds too high.`,
      });
    }

    return recs;
  }

  getMetrics(): ObserverMetrics {
    return { ...this.metrics };
  }

  generateDailySummary(): DailySummary {
    const today = this.interventionLog.filter(
      i => i.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );

    return {
      date: new Date().toISOString().split('T')[0],
      totalInterventions: today.length,
      namesRecalled: this.metrics.namesRecalledIndependently + this.metrics.namesRecalledWithAssist,
      independentRecalls: this.metrics.namesRecalledIndependently,
      averageHrv: this.metrics.baselineHrv,
      hrvTrend: this.metrics.currentHrvTrend,
      overwhelmsPredicted: this.metrics.overwhelmsPredicted,
      overwhelmsMissed: this.metrics.overwhelmsMissed,
      dismissalRate: this.metrics.userDismissalRate,
    };
  }
}

export interface ObserverRecommendation {
  target: RingId;
  action: string;
  reason: string;
}

export interface DailySummary {
  date: string;
  totalInterventions: number;
  namesRecalled: number;
  independentRecalls: number;
  averageHrv: number;
  hrvTrend: 'improving' | 'stable' | 'declining';
  overwhelmsPredicted: number;
  overwhelmsMissed: number;
  dismissalRate: number;
}
