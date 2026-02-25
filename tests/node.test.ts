import { createNODE, NODE } from '../src/index';
import { PrivacyMode, ArousalState } from '../src/types';

describe('NODE Factory', () => {
  let node: NODE;

  beforeEach(() => {
    node = createNODE();
  });

  afterEach(async () => {
    if (node.pipeline.running) await node.pipeline.stop();
  });

  it('creates a fully wired NODE instance', () => {
    expect(node.runtime).toBeDefined();
    expect(node.pipeline).toBeDefined();
    expect(node.privacy).toBeDefined();
    expect(node.consent).toBeDefined();
    expect(node.device).toBeDefined();
    expect(node.p2p).toBeDefined();
    expect(node.rings.r0).toBeDefined();
    expect(node.rings.r1).toBeDefined();
    expect(node.rings.r2).toBeDefined();
    expect(node.rings.r3).toBeDefined();
    expect(node.rings.r4).toBeDefined();
    expect(node.rings.r5).toBeDefined();
    expect(node.rings.r6).toBeDefined();
  });

  it('starts in PRIVATE privacy mode', () => {
    expect(node.privacy.mode).toBe(PrivacyMode.PRIVATE);
  });

  it('R3 starts in CALM state', () => {
    expect(node.rings.r3.getState().arousal).toBe(ArousalState.CALM);
  });

  it('R5 starts with empty memory', () => {
    expect(node.rings.r5.memoryCount).toBe(0);
  });

  it('pipeline starts and stops cleanly', async () => {
    await node.pipeline.start();
    expect(node.pipeline.running).toBe(true);
    expect(node.runtime.running).toBe(true);

    await node.pipeline.stop();
    expect(node.pipeline.running).toBe(false);
    expect(node.runtime.running).toBe(false);
  });

  it('privacy mode change updates pipeline sensor state', async () => {
    await node.pipeline.start();

    // Switch to PUBLIC — camera should activate
    node.privacy.setMode(PrivacyMode.PUBLIC);
    await new Promise(r => setTimeout(r, 50));

    const sensors = node.pipeline.getSensorStatus();
    const camera = sensors.find(s => s.type === 'camera');
    expect(camera?.active).toBe(true);

    // Switch to PRIVATE — camera should deactivate
    node.privacy.setMode(PrivacyMode.PRIVATE);
    await new Promise(r => setTimeout(r, 50));

    const sensors2 = node.pipeline.getSensorStatus();
    const camera2 = sensors2.find(s => s.type === 'camera');
    expect(camera2?.active).toBe(false);
  });

  it('kill switch stops everything', async () => {
    await node.pipeline.start();
    node.privacy.engageKillSwitch();
    await new Promise(r => setTimeout(r, 100));

    expect(node.privacy.mode).toBe(PrivacyMode.KILLED);
    expect(node.privacy.killSwitchEngaged).toBe(true);
  });

  it('device reports V1 hardware info', () => {
    const info = node.device.getHardwareInfo();
    expect(info.model).toBe('NODE-V1');
    expect(info.soc).toBe('Qualcomm QCS6490');
    expect(info.classification).toBe('Class II Medical Assistive Device');
  });

  it('R6 observer generates daily summary', () => {
    const summary = node.rings.r6.generateDailySummary();
    expect(summary).toBeDefined();
    expect(summary.date).toBeDefined();
  });
});
