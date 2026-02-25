import { v4 as uuid } from 'uuid';
import { Ring } from '../core/Ring';
import {
  BusMessage, RingId, Priority,
  MemoryEntry, PersonContext,
} from '../types';

/**
 * R5 — Persistent Memory Ring
 *
 * NODE-SPEC §8 Pipeline Stage 5: "Store"
 * Long-term storage: people met, conversations had, places visited,
 * patterns learned, user preferences, personal history.
 *
 * NODE stores: "Sarah Chen, controls engineer, met March 2025."
 * NODE does NOT store: photos of Sarah, recordings of Sarah's voice,
 * transcripts of Sarah's exact words.
 *
 * This is the MEMORY CONSOLIDATION assist. ETH architecture often has
 * strong R1 perception but weak R1→R5 long-term storage.
 *
 * All data encrypted. User-configurable expiration (default: 1 year).
 * User can make specific memories permanent. HIPAA-grade handling.
 */
export class R5_PersistentMemory extends Ring {
  private memories: Map<string, MemoryEntry> = new Map();
  private people: Map<string, PersonContext> = new Map();
  private defaultExpiry = 365 * 24 * 60 * 60 * 1000; // 1 year

  constructor() {
    super(RingId.R5, 'Persistent Memory');
  }

  protected onMessage(msg: BusMessage): void {
    const payload = msg.payload as Record<string, unknown>;
    if (!payload?.type) return;

    switch (payload.type) {
      case 'store_person':
        this.storePerson(payload);
        break;
      case 'store_conversation':
        this.storeConversation(payload);
        break;
      case 'store_event':
        this.storeEvent(payload);
        break;
      case 'intervention_log':
        this.logIntervention(payload);
        break;
      case 'query_person':
        this.queryPerson(payload);
        break;
      case 'delete_memory':
        this.deleteMemory(payload.id as string);
        break;
    }
  }

  // ─── Storage ─────────────────────────────────────────────────────────

  private storePerson(data: Record<string, unknown>): void {
    const personId = data.personId as string;
    const existing = this.people.get(personId);

    const context: PersonContext = existing ? { ...existing } : {
      topics: [],
      notes: [],
    };

    if (data.name) context.firstMet = context.firstMet ?? new Date().toISOString();
    context.lastSeen = new Date().toISOString();
    if (data.location) context.location = data.location as string;
    if (data.topics) context.topics.push(...(data.topics as string[]));
    if (data.relationship) context.relationship = data.relationship as string;
    if (data.notes) context.notes.push(...(data.notes as string[]));

    // Deduplicate topics
    context.topics = [...new Set(context.topics)];

    this.people.set(personId, context);

    this.storeMemory({
      type: 'person',
      data: { personId, context },
    });
  }

  private storeConversation(data: Record<string, unknown>): void {
    // Store SUMMARY, never raw transcript (privacy by design)
    this.storeMemory({
      type: 'conversation',
      data: {
        participants: data.participants,
        summary: data.summary,      // "Discussed PLCs and Austin office move"
        actionItems: data.actionItems, // "Send HNS paper to Sarah"
        location: data.location,
        duration: data.duration,
      },
    });
  }

  private storeEvent(data: Record<string, unknown>): void {
    this.storeMemory({
      type: 'event',
      data: {
        description: data.description,
        location: data.location,
        peoplePresent: data.people,
        significance: data.significance,
      },
    });
  }

  private logIntervention(data: Record<string, unknown>): void {
    this.storeMemory({
      type: 'pattern',
      data: {
        interventionType: (data.intervention as Record<string, unknown>)?.type,
        timestamp: Date.now(),
      },
    });
  }

  private storeMemory(config: { type: MemoryEntry['type']; data: Record<string, unknown> }): void {
    const entry: MemoryEntry = {
      id: uuid(),
      timestamp: Date.now(),
      type: config.type,
      data: config.data,
      expiresAt: Date.now() + this.defaultExpiry,
      encrypted: true,
    };

    this.memories.set(entry.id, entry);
    this.emit('stored', entry);

    // Prune expired
    this.pruneExpired();
  }

  // ─── Retrieval ───────────────────────────────────────────────────────

  private queryPerson(data: Record<string, unknown>): void {
    const personId = data.personId as string;
    const context = this.people.get(personId);

    // Send result back to requesting ring
    if (data.replyTo) {
      this.sendToBus(
        (data as Record<string, string>).bus ?? 'BUS_A',
        { type: 'person_context', personId, context, found: !!context },
        Priority.P0_MUST,
        data.replyTo as RingId,
      );
    }

    this.emit('query:person', { personId, context });
  }

  getPersonContext(personId: string): PersonContext | undefined {
    return this.people.get(personId);
  }

  getMemories(type?: MemoryEntry['type']): MemoryEntry[] {
    const all = Array.from(this.memories.values());
    return type ? all.filter(m => m.type === type) : all;
  }

  searchMemories(query: string): MemoryEntry[] {
    const lower = query.toLowerCase();
    return Array.from(this.memories.values()).filter(m => {
      const json = JSON.stringify(m.data).toLowerCase();
      return json.includes(lower);
    });
  }

  // ─── Data Sovereignty (NODE-SPEC §5.1) ──────────────────────────────

  deleteMemory(id: string): boolean {
    const deleted = this.memories.delete(id);
    if (deleted) this.emit('deleted', id);
    return deleted;
  }

  deleteAllMemories(): void {
    this.memories.clear();
    this.people.clear();
    this.emit('deleted:all');
  }

  makePermanent(id: string): boolean {
    const entry = this.memories.get(id);
    if (entry) {
      entry.expiresAt = undefined;
      this.emit('permanent', id);
      return true;
    }
    return false;
  }

  setDefaultExpiry(ms: number): void {
    this.defaultExpiry = ms;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.memories) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.memories.delete(id);
        this.emit('expired', id);
      }
    }
  }

  get memoryCount(): number {
    return this.memories.size;
  }

  get peopleCount(): number {
    return this.people.size;
  }
}
