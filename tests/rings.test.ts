import { R0_BodyState } from '../src/rings/R0_BodyState';
import { R3_EmotionalState } from '../src/rings/R3_EmotionalState';
import { R5_PersistentMemory } from '../src/rings/R5_PersistentMemory';
import { R6_Observer } from '../src/rings/R6_Observer';
import { ArousalState } from '../src/types';

describe('R0_BodyState', () => {
  it('initializes with default body state', () => {
    const r0 = new R0_BodyState();
    const state = r0.getState();
    expect(state.heartRate).toBe(72);
    expect(state.hrv).toBe(50);
    expect(state.skinTemp).toBe(36.8);
    expect(state.movement.fallDetected).toBe(false);
  });
});

describe('R3_EmotionalState', () => {
  it('initializes in CALM state', () => {
    const r3 = new R3_EmotionalState();
    const state = r3.getState();
    expect(state.arousal).toBe(ArousalState.CALM);
    expect(state.arousalScore).toBe(0.2);
    expect(state.trend).toBe('stable');
  });

  it('allows baseline updates', () => {
    const r3 = new R3_EmotionalState();
    r3.updateBaselines({ restingHr: 68, restingHrv: 60 });
    // Baselines updated without error
  });
});

describe('R5_PersistentMemory', () => {
  let r5: R5_PersistentMemory;

  beforeEach(async () => {
    r5 = new R5_PersistentMemory();
    await r5.start();
  });

  afterEach(async () => {
    await r5.stop();
  });

  it('starts with empty memory', () => {
    expect(r5.memoryCount).toBe(0);
    expect(r5.peopleCount).toBe(0);
  });

  it('supports data sovereignty — delete all', () => {
    r5.deleteAllMemories();
    expect(r5.memoryCount).toBe(0);
    expect(r5.peopleCount).toBe(0);
  });
});

describe('R6_Observer', () => {
  it('provides initial metrics', () => {
    const r6 = new R6_Observer();
    const metrics = r6.getMetrics();
    expect(metrics.baselineHrv).toBe(55);
    expect(metrics.interventionAccuracy).toBe(0.5);
    expect(metrics.currentHrvTrend).toBe('stable');
  });

  it('generates daily summary', () => {
    const r6 = new R6_Observer();
    const summary = r6.generateDailySummary();
    expect(summary.date).toBeDefined();
    expect(summary.totalInterventions).toBe(0);
    expect(summary.hrvTrend).toBe('stable');
  });
});
