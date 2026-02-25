import { calculateNodeOEE, KONOMI_LAYERS, ISA95Level, PackMLState, AlarmPriority } from '../src/standards';
import { KonomiLayer } from '../src/types';

describe('KONOMI Standard', () => {
  it('has all 10 layers defined', () => {
    expect(Object.keys(KONOMI_LAYERS).length).toBe(10);
    expect(KONOMI_LAYERS[KonomiLayer.L0_META].name).toBe('Meta-Standard');
    expect(KONOMI_LAYERS[KonomiLayer.L9_KPIS].name).toBe('KPIs');
  });

  it('ISA-95 levels map to NODE rings', () => {
    expect(ISA95Level.L0_PROCESS).toBe(0);   // R0/R1 sensors
    expect(ISA95Level.L1_SENSING).toBe(1);    // Edge AI
    expect(ISA95Level.L2_SUPERVISORY).toBe(2); // R2+R3
    expect(ISA95Level.L3_OPERATIONS).toBe(3);  // R4+R5
    expect(ISA95Level.L4_BUSINESS).toBe(4);    // R6
  });

  it('PackML states include all standard states', () => {
    expect(PackMLState.IDLE).toBe('idle');
    expect(PackMLState.EXECUTE).toBe('execute');
    expect(PackMLState.HELD).toBe('held');
    expect(PackMLState.ABORTED).toBe('aborted');
    expect(PackMLState.STOPPED).toBe('stopped');
  });

  it('alarm priorities match NODE intervention priorities', () => {
    expect(AlarmPriority.P1_CRITICAL).toBe(1); // Safety
    expect(AlarmPriority.P2_HIGH).toBe(2);     // Overwhelm imminent
    expect(AlarmPriority.P3_MEDIUM).toBe(3);   // HRV declining
    expect(AlarmPriority.P4_LOW).toBe(4);      // Stimming awareness
  });
});

describe('calculateNodeOEE', () => {
  it('calculates perfect OEE', () => {
    const oee = calculateNodeOEE({
      uptimeHours: 10,
      totalWearHours: 10,
      successfulInterventions: 100,
      totalInterventions: 100,
      independentRecalls: 50,
      totalRecalls: 50,
    });

    expect(oee.availability).toBe(1);
    expect(oee.performance).toBe(1);
    expect(oee.quality).toBe(1);
    expect(oee.oee).toBe(1);
  });

  it('calculates realistic OEE', () => {
    const oee = calculateNodeOEE({
      uptimeHours: 8.5,
      totalWearHours: 10,
      successfulInterventions: 85,
      totalInterventions: 100,
      independentRecalls: 30,
      totalRecalls: 50,
    });

    expect(oee.availability).toBeCloseTo(0.85);
    expect(oee.performance).toBeCloseTo(0.85);
    expect(oee.quality).toBeCloseTo(0.60);
    expect(oee.oee).toBeCloseTo(0.85 * 0.85 * 0.60);
  });

  it('handles zero values gracefully', () => {
    const oee = calculateNodeOEE({
      uptimeHours: 0,
      totalWearHours: 0,
      successfulInterventions: 0,
      totalInterventions: 0,
      independentRecalls: 0,
      totalRecalls: 0,
    });

    expect(oee.availability).toBe(0);
    expect(oee.performance).toBe(0);
    expect(oee.quality).toBe(0);
    expect(oee.oee).toBe(0);
  });
});
