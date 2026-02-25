import EventEmitter from 'eventemitter3';

/**
 * Consent Framework — Context-aware consent management.
 *
 * NODE-SPEC §5.1: Different social contexts have different privacy
 * expectations. NODE adapts. Conference = public mode. Doctor's office
 * = private mode. Home = user preference.
 */
export class ConsentFramework extends EventEmitter {
  private contextRules: Map<string, ConsentRule> = new Map();
  private activeConsents: Map<string, ConsentRecord> = new Map();

  constructor() {
    super();
    this.initDefaultRules();
  }

  private initDefaultRules(): void {
    // Default context-based rules
    this.addRule({
      context: 'conference',
      suggestedMode: 'public',
      reason: 'Public professional event — face/name storage useful',
      autoSwitch: false, // Always ask user
    });

    this.addRule({
      context: 'medical',
      suggestedMode: 'private',
      reason: 'Medical privacy — camera off, audio for user commands only',
      autoSwitch: true,
    });

    this.addRule({
      context: 'home',
      suggestedMode: 'private',
      reason: 'Private space — user preference applies',
      autoSwitch: false,
    });

    this.addRule({
      context: 'workplace',
      suggestedMode: 'public',
      reason: 'Professional context — face/name assistance helpful',
      autoSwitch: false,
    });

    this.addRule({
      context: 'intimate',
      suggestedMode: 'private',
      reason: 'Private interaction — camera and social processing off',
      autoSwitch: true,
    });
  }

  addRule(rule: ConsentRule): void {
    this.contextRules.set(rule.context, rule);
    this.emit('rule:added', rule);
  }

  removeRule(context: string): void {
    this.contextRules.delete(context);
  }

  evaluateContext(context: string): ConsentRule | undefined {
    return this.contextRules.get(context);
  }

  recordConsent(record: ConsentRecord): void {
    this.activeConsents.set(record.id, record);
    this.emit('consent:recorded', record);
  }

  revokeConsent(id: string): void {
    this.activeConsents.delete(id);
    this.emit('consent:revoked', id);
  }

  hasConsent(dataType: string): boolean {
    for (const consent of this.activeConsents.values()) {
      if (consent.dataTypes.includes(dataType) && consent.granted) {
        if (!consent.expiresAt || consent.expiresAt > Date.now()) {
          return true;
        }
      }
    }
    return false;
  }
}

export interface ConsentRule {
  context: string;
  suggestedMode: string;
  reason: string;
  autoSwitch: boolean;
}

export interface ConsentRecord {
  id: string;
  dataTypes: string[];
  granted: boolean;
  grantedAt: number;
  expiresAt?: number;
  purpose: string;
}
