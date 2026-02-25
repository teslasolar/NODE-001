import EventEmitter from 'eventemitter3';
import { BusId, RingId, SensorReading, SensorType } from '../types';

/**
 * Base sensor interface — hardware abstraction layer.
 *
 * Each sensor maps to a specific ring and bus per NODE-SPEC §2.1.
 * Real implementations talk to hardware; development stubs emit synthetic data.
 */
export abstract class Sensor extends EventEmitter {
  readonly type: SensorType;
  readonly ring: RingId;
  readonly bus: BusId;
  readonly dutyCycle: number; // 0..1
  readonly powerDraw: number; // mW

  protected active = false;
  protected interval: ReturnType<typeof setInterval> | null = null;
  protected sampleRate: number; // ms between samples

  constructor(config: SensorConfig) {
    super();
    this.type = config.type;
    this.ring = config.ring;
    this.bus = config.bus;
    this.dutyCycle = config.dutyCycle;
    this.powerDraw = config.powerDraw;
    this.sampleRate = config.sampleRate;
  }

  async start(): Promise<void> {
    this.active = true;
    this.interval = setInterval(() => {
      if (this.active && Math.random() < this.dutyCycle) {
        const reading = this.sample();
        if (reading) this.emit('reading', reading);
      }
    }, this.sampleRate);
    this.emit('started', this.type);
  }

  async stop(): Promise<void> {
    this.active = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.emit('stopped', this.type);
  }

  get isActive(): boolean {
    return this.active;
  }

  get effectivePower(): number {
    return this.powerDraw * this.dutyCycle;
  }

  protected abstract sample(): SensorReading | null;
}

export interface SensorConfig {
  type: SensorType;
  ring: RingId;
  bus: BusId;
  dutyCycle: number;
  powerDraw: number;
  sampleRate: number; // ms
}
