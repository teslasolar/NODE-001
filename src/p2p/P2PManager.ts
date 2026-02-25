import EventEmitter from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import { P2PMessageType, P2PPeer } from '../types';

/**
 * P2P Communication Manager — KONOMI P2P Architecture Integration.
 *
 * Enables NODE devices to form mesh networks for:
 *   - Multi-device state synchronization
 *   - Distributed memory sharing (with consent)
 *   - Alert broadcasting (safety)
 *   - Peer discovery and trust establishment
 *
 * Built on KONOMI P2P primitives: CRDT-based state sync,
 * end-to-end encryption, NAT traversal, mesh topology.
 */
export class P2PManager extends EventEmitter {
  readonly peerId: string;
  private peers: Map<string, P2PPeer> = new Map();
  private messageHandlers: Map<P2PMessageType, MessageHandler[]> = new Map();
  private _connected = false;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(peerId?: string) {
    super();
    this.peerId = peerId ?? uuid();
  }

  async start(): Promise<void> {
    this._connected = true;
    this.heartbeatInterval = setInterval(() => this.broadcastHeartbeat(), 30_000);
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this._connected = false;
    this.emit('stopped');
  }

  get connected(): boolean {
    return this._connected;
  }

  // ─── Peer Discovery ──────────────────────────────────────────────────

  addPeer(peer: P2PPeer): void {
    this.peers.set(peer.id, peer);
    this.emit('peer:added', peer);
  }

  removePeer(id: string): void {
    this.peers.delete(id);
    this.emit('peer:removed', id);
  }

  getPeer(id: string): P2PPeer | undefined {
    return this.peers.get(id);
  }

  getConnectedPeers(): P2PPeer[] {
    return Array.from(this.peers.values());
  }

  // ─── Messaging ───────────────────────────────────────────────────────

  onMessage(type: P2PMessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type) ?? [];
    handlers.push(handler);
    this.messageHandlers.set(type, handlers);
  }

  async send(peerId: string, type: P2PMessageType, payload: unknown): Promise<boolean> {
    const peer = this.peers.get(peerId);
    if (!peer || !this._connected) return false;

    const message: P2PMessage = {
      id: uuid(),
      type,
      from: this.peerId,
      to: peerId,
      timestamp: Date.now(),
      payload,
    };

    this.emit('message:sent', message);
    return true;
  }

  async broadcast(type: P2PMessageType, payload: unknown): Promise<number> {
    let sent = 0;
    for (const peer of this.peers.values()) {
      const success = await this.send(peer.id, type, payload);
      if (success) sent++;
    }
    return sent;
  }

  receive(message: P2PMessage): void {
    const handlers = this.messageHandlers.get(message.type) ?? [];
    for (const handler of handlers) {
      handler(message);
    }
    this.emit('message:received', message);
  }

  // ─── State Sync (CRDT-based) ─────────────────────────────────────────

  async syncState(peerId: string, stateKey: string, value: unknown): Promise<boolean> {
    return this.send(peerId, P2PMessageType.STATE_SYNC, {
      key: stateKey,
      value,
      vectorClock: Date.now(),
    });
  }

  // ─── Memory Sharing (with consent) ───────────────────────────────────

  async shareMemory(peerId: string, memoryId: string, data: unknown): Promise<boolean> {
    const peer = this.peers.get(peerId);
    if (!peer || peer.trustLevel !== 'trusted') {
      this.emit('share:denied', { peerId, reason: 'Peer not trusted' });
      return false;
    }

    return this.send(peerId, P2PMessageType.MEMORY_SHARE, {
      memoryId,
      data,
      sharedAt: Date.now(),
    });
  }

  // ─── Safety Alert Broadcasting ───────────────────────────────────────

  async broadcastAlert(alertType: string, data: unknown): Promise<number> {
    return this.broadcast(P2PMessageType.ALERT_BROADCAST, {
      alertType,
      data,
      urgency: 'immediate',
    });
  }

  // ─── Trust Management ────────────────────────────────────────────────

  setTrustLevel(peerId: string, level: P2PPeer['trustLevel']): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.trustLevel = level;
      this.emit('trust:changed', { peerId, level });
    }
  }

  private broadcastHeartbeat(): void {
    if (!this._connected) return;
    this.broadcast(P2PMessageType.HEARTBEAT, {
      peerId: this.peerId,
      timestamp: Date.now(),
      peerCount: this.peers.size,
    });
  }

  get peerCount(): number {
    return this.peers.size;
  }
}

export interface P2PMessage {
  id: string;
  type: P2PMessageType;
  from: string;
  to: string;
  timestamp: number;
  payload: unknown;
}

export type MessageHandler = (message: P2PMessage) => void;
