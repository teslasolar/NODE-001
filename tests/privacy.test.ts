import { PrivacyManager } from '../src/privacy/PrivacyManager';
import { ConsentFramework } from '../src/privacy/ConsentFramework';
import { PrivacyMode, SensorType, OutputType } from '../src/types';

describe('PrivacyManager', () => {
  let pm: PrivacyManager;

  beforeEach(() => {
    pm = new PrivacyManager();
  });

  it('starts in PRIVATE mode', () => {
    expect(pm.mode).toBe(PrivacyMode.PRIVATE);
  });

  it('PUBLIC mode allows camera and microphone', () => {
    pm.setMode(PrivacyMode.PUBLIC);
    expect(pm.isSensorAllowed(SensorType.CAMERA)).toBe(true);
    expect(pm.isSensorAllowed(SensorType.MICROPHONE)).toBe(true);
    expect(pm.isSensorAllowed(SensorType.PPG)).toBe(true);
  });

  it('PRIVATE mode blocks camera, allows microphone', () => {
    pm.setMode(PrivacyMode.PRIVATE);
    expect(pm.isSensorAllowed(SensorType.CAMERA)).toBe(false);
    expect(pm.isSensorAllowed(SensorType.MICROPHONE)).toBe(true);
    expect(pm.isSensorAllowed(SensorType.PPG)).toBe(true);
  });

  it('KILLED mode blocks everything', () => {
    pm.setMode(PrivacyMode.KILLED);
    expect(pm.isSensorAllowed(SensorType.CAMERA)).toBe(false);
    expect(pm.isSensorAllowed(SensorType.MICROPHONE)).toBe(false);
    expect(pm.isSensorAllowed(SensorType.PPG)).toBe(false);
    expect(pm.isSensorAllowed(SensorType.IMU)).toBe(false);
  });

  it('kill switch engages KILLED mode', () => {
    pm.engageKillSwitch();
    expect(pm.killSwitchEngaged).toBe(true);
    expect(pm.mode).toBe(PrivacyMode.KILLED);
  });

  it('kill switch disengage returns to PRIVATE', () => {
    pm.engageKillSwitch();
    pm.disengageKillSwitch();
    expect(pm.killSwitchEngaged).toBe(false);
    expect(pm.mode).toBe(PrivacyMode.PRIVATE);
  });

  it('recording indicator is active when camera or mic is on', () => {
    pm.setMode(PrivacyMode.PRIVATE); // mic on
    expect(pm.recordingIndicatorActive).toBe(true);

    pm.setMode(PrivacyMode.KILLED); // everything off
    expect(pm.recordingIndicatorActive).toBe(false);
  });

  it('validates storage data — rejects raw audio/video', () => {
    const valid = pm.validateForStorage({ summary: 'Met Sarah' });
    expect(valid.valid).toBe(true);

    const invalid = pm.validateForStorage({ rawAudio: new ArrayBuffer(100) });
    expect(invalid.valid).toBe(false);
    expect(invalid.violations).toContain('Raw audio data cannot be stored');
  });

  it('validates storage data — rejects exact quotes', () => {
    const invalid = pm.validateForStorage({ transcript: 'word for word...' });
    expect(invalid.valid).toBe(false);
  });

  it('PUBLIC mode allows person storage', () => {
    pm.setMode(PrivacyMode.PUBLIC);
    expect(pm.canStorePerson()).toBe(true);
    expect(pm.canStoreConversation()).toBe(true);
  });

  it('PRIVATE mode blocks person storage', () => {
    pm.setMode(PrivacyMode.PRIVATE);
    expect(pm.canStorePerson()).toBe(false);
    expect(pm.canStoreConversation()).toBe(false);
  });

  it('output allowed in all non-KILLED modes', () => {
    pm.setMode(PrivacyMode.PUBLIC);
    expect(pm.isOutputAllowed(OutputType.BONE_CONDUCTION)).toBe(true);

    pm.setMode(PrivacyMode.PRIVATE);
    expect(pm.isOutputAllowed(OutputType.BONE_CONDUCTION)).toBe(true);

    pm.setMode(PrivacyMode.KILLED);
    expect(pm.isOutputAllowed(OutputType.BONE_CONDUCTION)).toBe(false);
  });
});

describe('ConsentFramework', () => {
  let cf: ConsentFramework;

  beforeEach(() => {
    cf = new ConsentFramework();
  });

  it('has default context rules', () => {
    expect(cf.evaluateContext('conference')).toBeDefined();
    expect(cf.evaluateContext('medical')).toBeDefined();
    expect(cf.evaluateContext('home')).toBeDefined();
  });

  it('medical context suggests private mode with auto-switch', () => {
    const rule = cf.evaluateContext('medical');
    expect(rule?.suggestedMode).toBe('private');
    expect(rule?.autoSwitch).toBe(true);
  });

  it('tracks consent records', () => {
    cf.recordConsent({
      id: 'c1',
      dataTypes: ['name', 'face'],
      granted: true,
      grantedAt: Date.now(),
      purpose: 'social assistance',
    });

    expect(cf.hasConsent('name')).toBe(true);
    expect(cf.hasConsent('medical')).toBe(false);
  });

  it('revokes consent', () => {
    cf.recordConsent({
      id: 'c1',
      dataTypes: ['name'],
      granted: true,
      grantedAt: Date.now(),
      purpose: 'test',
    });

    expect(cf.hasConsent('name')).toBe(true);
    cf.revokeConsent('c1');
    expect(cf.hasConsent('name')).toBe(false);
  });
});
