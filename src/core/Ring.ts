import EventEmitter from 'eventemitter3';
import { BusMessage, RingId } from '../types';
import { Bus } from './Bus';

/**
 * ASS-OS Ring — A processing layer in the ring/bus architecture.
 *
 * Each ring subscribes to messages on its buses, processes data,
 * and emits results back onto the bus system. Rings are the fundamental
 * processing unit of the ASS-OS architecture.
 *
 * R0 — Body State          R4 — Executive Assist
 * R1 — Sensory Input       R5 — Persistent Memory
 * R2 — Gate (Sorting)      R6 — Observer
 * R3 — Emotional State
 */
export abstract class Ring extends EventEmitter {
  readonly id: RingId;
  readonly name: string;
  protected buses: Map<string, Bus> = new Map();
  protected active = false;

  constructor(id: RingId, name: string) {
    super();
    this.id = id;
    this.name = name;
  }

  attachBus(bus: Bus): void {
    this.buses.set(bus.id, bus);
    bus.on(`message:${this.id}`, (msg: BusMessage) => this.onMessage(msg));
    bus.on('message', (msg: BusMessage) => {
      if (!msg.targetRing) this.onBroadcast(msg);
    });
  }

  async start(): Promise<void> {
    this.active = true;
    this.emit('started', this.id);
  }

  async stop(): Promise<void> {
    this.active = false;
    this.emit('stopped', this.id);
  }

  get isActive(): boolean {
    return this.active;
  }

  protected abstract onMessage(msg: BusMessage): void;

  protected onBroadcast(_msg: BusMessage): void {
    // Subclasses override to handle broadcast messages
  }

  protected sendToBus(busId: string, payload: unknown, priority: number, targetRing?: RingId): void {
    const bus = this.buses.get(busId);
    if (bus) {
      bus.send(this.id, payload, priority, targetRing);
    }
  }
}
