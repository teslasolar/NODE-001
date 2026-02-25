import EventEmitter from 'eventemitter3';
import { BusId, RingId, PrivacyMode, PowerState } from '../types';
import { Bus } from './Bus';
import { Ring } from './Ring';

/**
 * ASS-OS Runtime — The central coordinator of the ring/bus architecture.
 *
 * Manages the lifecycle of all rings and buses, enforces privacy modes,
 * monitors power state, and provides the system-wide event bus.
 *
 * This is NODE's nervous system kernel.
 */
export class Runtime extends EventEmitter {
  private rings: Map<RingId, Ring> = new Map();
  private buses: Map<BusId, Bus> = new Map();
  private _privacyMode: PrivacyMode = PrivacyMode.PRIVATE;
  private _running = false;
  private startTime = 0;

  constructor() {
    super();
    // Initialize the four ASS-OS buses
    this.buses.set(BusId.A, new Bus(BusId.A));
    this.buses.set(BusId.B, new Bus(BusId.B));
    this.buses.set(BusId.C, new Bus(BusId.C));
    this.buses.set(BusId.D, new Bus(BusId.D));
  }

  registerRing(ring: Ring): void {
    this.rings.set(ring.id, ring);
    // Attach all buses to the ring
    for (const bus of this.buses.values()) {
      ring.attachBus(bus);
    }
    this.emit('ring:registered', ring.id);
  }

  getRing<T extends Ring>(id: RingId): T | undefined {
    return this.rings.get(id) as T | undefined;
  }

  getBus(id: BusId): Bus | undefined {
    return this.buses.get(id);
  }

  async start(): Promise<void> {
    if (this._running) return;

    this.emit('starting');
    this.startTime = Date.now();

    // Start rings in order: R0 → R6
    const order = [RingId.R0, RingId.R1, RingId.R2, RingId.R3, RingId.R4, RingId.R5, RingId.R6];
    for (const id of order) {
      const ring = this.rings.get(id);
      if (ring) {
        await ring.start();
        this.emit('ring:started', id);
      }
    }

    this._running = true;
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this._running) return;

    this.emit('stopping');

    // Stop rings in reverse order: R6 → R0
    const order = [RingId.R6, RingId.R5, RingId.R4, RingId.R3, RingId.R2, RingId.R1, RingId.R0];
    for (const id of order) {
      const ring = this.rings.get(id);
      if (ring) {
        await ring.stop();
        this.emit('ring:stopped', id);
      }
    }

    this._running = false;
    this.emit('stopped');
  }

  get running(): boolean {
    return this._running;
  }

  get uptime(): number {
    return this._running ? Date.now() - this.startTime : 0;
  }

  // ─── Privacy Mode ──────────────────────────────────────────────────────

  get privacyMode(): PrivacyMode {
    return this._privacyMode;
  }

  setPrivacyMode(mode: PrivacyMode): void {
    const prev = this._privacyMode;
    this._privacyMode = mode;
    this.emit('privacy:changed', { from: prev, to: mode });

    // KILLED mode stops everything — hardware kill switch engaged
    if (mode === PrivacyMode.KILLED) {
      this.stop();
    }
  }

  // ─── Power Monitoring ──────────────────────────────────────────────────

  getPowerState(): PowerState {
    // Hardware abstraction — real implementation reads from device
    return {
      batteryPercent: 100,
      estimatedRuntime: 564, // 9.4 hours per spec
      isCharging: false,
      thermalState: 'nominal',
      totalDraw: 1180, // mW per spec table
    };
  }

  // ─── Diagnostics ───────────────────────────────────────────────────────

  status(): RuntimeStatus {
    return {
      running: this._running,
      uptime: this.uptime,
      privacyMode: this._privacyMode,
      rings: Array.from(this.rings.entries()).map(([id, ring]) => ({
        id,
        name: ring.name,
        active: ring.isActive,
      })),
      buses: Array.from(this.buses.entries()).map(([id, bus]) => ({
        id,
        pending: bus.pending,
      })),
      power: this.getPowerState(),
    };
  }
}

export interface RuntimeStatus {
  running: boolean;
  uptime: number;
  privacyMode: PrivacyMode;
  rings: Array<{ id: RingId; name: string; active: boolean }>;
  buses: Array<{ id: BusId; pending: number }>;
  power: PowerState;
}
