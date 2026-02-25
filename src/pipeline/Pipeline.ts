import EventEmitter from 'eventemitter3';
import { PipelineStage, BusId, RingId, Priority, SensorReading } from '../types';
import { Runtime } from '../core/Runtime';
import { Sensor } from '../sensors/Sensor';
import { PrivacyManager } from '../privacy/PrivacyManager';

/**
 * Processing Pipeline Orchestrator
 *
 * NODE-SPEC §8: The 6-stage pipeline:
 *   1. SENSE  — R0+R1: Sensor fusion → unified scene + body state
 *   2. SORT   — R2: Gate logic → priority-sorted action queue
 *   3. FEEL   — R3: State estimation → arousal/overwhelm model
 *   4. ACT    — R4: Intervention generation → bone conduction / haptic
 *   5. STORE  — R5: Persistent memory → encrypted metadata
 *   6. WATCH  — R6: Meta-monitoring → self-calibration
 *
 * The pipeline enforces privacy checks at every stage.
 * Raw data is processed and discarded — only metadata is stored.
 */
export class Pipeline extends EventEmitter {
  private runtime: Runtime;
  private sensors: Sensor[] = [];
  private privacy: PrivacyManager;
  private _running = false;

  constructor(runtime: Runtime, privacy: PrivacyManager) {
    super();
    this.runtime = runtime;
    this.privacy = privacy;
  }

  registerSensor(sensor: Sensor): void {
    this.sensors.push(sensor);

    // Wire sensor readings into the bus system
    sensor.on('reading', (reading: SensorReading) => {
      // Privacy gate — check if this sensor is allowed in current mode
      if (!this.privacy.isSensorAllowed(reading.sensorType)) {
        return;
      }

      // Route to appropriate bus and target ring
      const bus = this.runtime.getBus(reading.bus as BusId);
      if (bus) {
        bus.send(
          reading.ring as RingId,
          reading,
          Priority.P1_SHOULD,
          reading.ring as RingId,
        );
      }

      this.emit('reading', reading);
    });
  }

  async start(): Promise<void> {
    if (this._running) return;

    this.emit('stage', PipelineStage.SENSE);

    // Start all permitted sensors
    for (const sensor of this.sensors) {
      if (this.privacy.isSensorAllowed(sensor.type)) {
        await sensor.start();
      }
    }

    // Start the runtime (which starts all rings R0→R6)
    await this.runtime.start();

    this._running = true;
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this._running) return;

    // Stop sensors first
    for (const sensor of this.sensors) {
      await sensor.stop();
    }

    // Then stop rings
    await this.runtime.stop();

    this._running = false;
    this.emit('stopped');
  }

  get running(): boolean {
    return this._running;
  }

  /**
   * React to privacy mode changes — start/stop sensors accordingly.
   */
  async onPrivacyModeChanged(): Promise<void> {
    for (const sensor of this.sensors) {
      if (this.privacy.isSensorAllowed(sensor.type)) {
        if (!sensor.isActive) await sensor.start();
      } else {
        if (sensor.isActive) await sensor.stop();
      }
    }
  }

  getSensorStatus(): Array<{ type: string; active: boolean; effectivePower: number }> {
    return this.sensors.map(s => ({
      type: s.type,
      active: s.isActive,
      effectivePower: s.effectivePower,
    }));
  }

  getTotalPowerDraw(): number {
    return this.sensors
      .filter(s => s.isActive)
      .reduce((total, s) => total + s.effectivePower, 0);
  }
}
