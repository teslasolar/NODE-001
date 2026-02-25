import EventEmitter from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import { BusId, BusMessage, Priority, RingId } from '../types';

/**
 * ASS-OS Bus — Communication channel between rings.
 *
 * Four buses per the ASS-OS architecture:
 *   Bus A — Electrical (digital sensor data, processed signals)
 *   Bus B — Chemical proxy (biometric chemical-equivalent readings: GSR, cortisol proxy)
 *   Bus C — Photonic (camera, IR, UV, light-based data)
 *   Bus D — Mechanical/Spatial (IMU, LiDAR, movement, spatial)
 */
export class Bus extends EventEmitter {
  readonly id: BusId;
  private queue: BusMessage[] = [];
  private processing = false;

  constructor(id: BusId) {
    super();
    this.id = id;
  }

  send<T>(sourceRing: RingId, payload: T, priority: Priority, targetRing?: RingId): string {
    const msg: BusMessage<T> = {
      id: uuid(),
      bus: this.id,
      sourceRing,
      targetRing,
      timestamp: Date.now(),
      payload,
      priority,
    };

    // Priority insertion — safety-critical goes to front
    if (priority === Priority.P3_SAFETY) {
      this.queue.unshift(msg);
    } else {
      // Insert sorted by priority (lower number = higher priority)
      const idx = this.queue.findIndex(m => m.priority > priority);
      if (idx === -1) {
        this.queue.push(msg);
      } else {
        this.queue.splice(idx, 0, msg);
      }
    }

    this.processQueue();
    return msg.id;
  }

  private processQueue(): void {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const msg = this.queue.shift()!;
      if (msg.targetRing) {
        this.emit(`message:${msg.targetRing}`, msg);
      }
      this.emit('message', msg);
    }

    this.processing = false;
  }

  get pending(): number {
    return this.queue.length;
  }
}
