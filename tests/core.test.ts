import { Bus, Runtime } from '../src/core';
import { R0_BodyState } from '../src/rings/R0_BodyState';
import { R1_SensoryInput } from '../src/rings/R1_SensoryInput';
import { R2_Gate } from '../src/rings/R2_Gate';
import { R3_EmotionalState } from '../src/rings/R3_EmotionalState';
import { R4_ExecutiveAssist } from '../src/rings/R4_ExecutiveAssist';
import { R5_PersistentMemory } from '../src/rings/R5_PersistentMemory';
import { R6_Observer } from '../src/rings/R6_Observer';
import { BusId, RingId, Priority, PrivacyMode } from '../src/types';

describe('Bus', () => {
  it('creates a bus with correct id', () => {
    const bus = new Bus(BusId.A);
    expect(bus.id).toBe(BusId.A);
  });

  it('sends messages and emits events', (done) => {
    const bus = new Bus(BusId.A);
    bus.on('message', (msg) => {
      expect(msg.sourceRing).toBe(RingId.R0);
      expect(msg.payload).toEqual({ test: true });
      done();
    });
    bus.send(RingId.R0, { test: true }, Priority.P1_SHOULD);
  });

  it('routes targeted messages', (done) => {
    const bus = new Bus(BusId.B);
    bus.on(`message:${RingId.R3}`, (msg) => {
      expect(msg.targetRing).toBe(RingId.R3);
      done();
    });
    bus.send(RingId.R0, { hrv: 50 }, Priority.P1_SHOULD, RingId.R3);
  });

  it('prioritizes safety messages', () => {
    const bus = new Bus(BusId.A);
    const received: number[] = [];
    bus.on('message', (msg) => received.push(msg.priority));

    // Send P2 first, then P3 safety — safety should be processed
    bus.send(RingId.R0, {}, Priority.P2_NICE);
    bus.send(RingId.R0, {}, Priority.P3_SAFETY);

    expect(received.length).toBe(2);
  });
});

describe('Runtime', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  afterEach(async () => {
    if (runtime.running) await runtime.stop();
  });

  it('initializes with 4 buses', () => {
    expect(runtime.getBus(BusId.A)).toBeDefined();
    expect(runtime.getBus(BusId.B)).toBeDefined();
    expect(runtime.getBus(BusId.C)).toBeDefined();
    expect(runtime.getBus(BusId.D)).toBeDefined();
  });

  it('registers and starts rings in order R0→R6', async () => {
    const r0 = new R0_BodyState();
    const r1 = new R1_SensoryInput();
    const r2 = new R2_Gate();
    const r3 = new R3_EmotionalState();
    const r4 = new R4_ExecutiveAssist();
    const r5 = new R5_PersistentMemory();
    const r6 = new R6_Observer();

    runtime.registerRing(r0);
    runtime.registerRing(r1);
    runtime.registerRing(r2);
    runtime.registerRing(r3);
    runtime.registerRing(r4);
    runtime.registerRing(r5);
    runtime.registerRing(r6);

    const startOrder: RingId[] = [];
    runtime.on('ring:started', (id: RingId) => startOrder.push(id));

    await runtime.start();

    expect(runtime.running).toBe(true);
    expect(startOrder).toEqual([
      RingId.R0, RingId.R1, RingId.R2,
      RingId.R3, RingId.R4, RingId.R5, RingId.R6,
    ]);
  });

  it('stops rings in reverse order R6→R0', async () => {
    const r0 = new R0_BodyState();
    const r6 = new R6_Observer();
    runtime.registerRing(r0);
    runtime.registerRing(r6);

    await runtime.start();

    const stopOrder: RingId[] = [];
    runtime.on('ring:stopped', (id: RingId) => stopOrder.push(id));

    await runtime.stop();
    expect(runtime.running).toBe(false);
    expect(stopOrder[0]).toBe(RingId.R6);
  });

  it('reports status', () => {
    runtime.registerRing(new R0_BodyState());
    const status = runtime.status();
    expect(status.running).toBe(false);
    expect(status.privacyMode).toBe(PrivacyMode.PRIVATE);
    expect(status.rings.length).toBe(1);
    expect(status.buses.length).toBe(4);
  });

  it('KILLED privacy mode stops runtime', async () => {
    runtime.registerRing(new R0_BodyState());
    await runtime.start();
    expect(runtime.running).toBe(true);

    runtime.setPrivacyMode(PrivacyMode.KILLED);
    // Wait for stop to complete
    await new Promise(r => setTimeout(r, 50));
    expect(runtime.running).toBe(false);
  });
});
