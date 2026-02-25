import { v4 as uuid } from 'uuid';
import { Ring } from '../core/Ring';
import {
  BusMessage, RingId, BusId, Priority,
  Intervention, InterventionType, OutputType,
  R3State, ArousalState,
} from '../types';
import { GateAction } from './R2_Gate';

/**
 * R4 — Executive Assist Ring
 *
 * NODE-SPEC §8 Pipeline Stage 4: "Act"
 * Generate helpful interventions: name reminders, conversation summaries,
 * regulation prompts, social cue narration.
 *
 * Output must be filtered through R2 (relevance) and calibrated to user's
 * current R3 state. Don't interrupt a conversation to say "your HRV is dropping"
 * unless R3 is actually approaching overwhelm.
 *
 * Voice Design Principles (NODE-SPEC §7.1):
 *   - Calm, low-affect
 *   - Brevity first ("Sarah Chen. MESA. PLCs." not a full sentence)
 *   - Anticipatory, not reactive
 *   - Interruptible
 *   - Silence by default
 */
export class R4_ExecutiveAssist extends Ring {
  private currentR3State: R3State | null = null;
  private pendingInterventions: Intervention[] = [];
  private deliveredHistory: string[] = [];
  private userSpeaking = false;
  private suppressed = false;

  constructor() {
    super(RingId.R4, 'Executive Assist');
  }

  protected onMessage(msg: BusMessage): void {
    const payload = msg.payload as Record<string, unknown>;
    if (!payload?.type) return;

    switch (payload.type) {
      case 'gate_actions':
        this.processGateActions(payload.actions as GateAction[]);
        break;
      case 'r3_state':
        this.currentR3State = payload as unknown as R3State;
        break;
      case 'user_speaking':
        this.userSpeaking = payload.speaking as boolean;
        break;
      case 'user_dismiss':
        this.onDismiss();
        break;
    }
  }

  private processGateActions(actions: GateAction[]): void {
    for (const action of actions) {
      const intervention = this.actionToIntervention(action);
      if (intervention && this.shouldDeliver(intervention)) {
        this.pendingInterventions.push(intervention);
      }
    }

    this.deliverNext();
  }

  private actionToIntervention(action: GateAction): Intervention | null {
    switch (action.type) {
      case 'name_lookup':
        return this.createIntervention(
          InterventionType.NAME_REMINDER,
          action.priority,
          this.formatNameReminder(action.data),
          'immediate',
        );

      case 'face_identify':
        return this.createIntervention(
          InterventionType.NAME_REMINDER,
          action.priority,
          'Identifying...',
          'next_gap',
        );

      case 'conversation_track':
        return null; // Silent tracking, summary later

      case 'hrv_warning':
        return this.createIntervention(
          InterventionType.REGULATION_PROMPT,
          action.priority,
          this.formatRegulationPrompt(action.data),
          'next_gap',
        );

      case 'overwhelm_alert':
        return this.createIntervention(
          InterventionType.OVERWHELM_ALERT,
          action.priority,
          this.formatOverwhelmAlert(action.data),
          this.isOverwhelmUrgent() ? 'immediate' : 'next_gap',
        );

      case 'stimming_awareness':
        return this.createIntervention(
          InterventionType.STIMMING_AWARENESS,
          action.priority,
          this.formatStimmingAwareness(action.data),
          'deferred',
        );

      case 'environment_alert':
        return this.createIntervention(
          InterventionType.ENVIRONMENT_NARRATION,
          action.priority,
          this.formatEnvironment(action.data),
          'deferred',
        );

      case 'safety_alert':
        return this.createIntervention(
          InterventionType.SAFETY_ALERT,
          Priority.P3_SAFETY,
          'Fall detected. Are you okay?',
          'immediate',
        );

      default:
        return null;
    }
  }

  private createIntervention(
    type: InterventionType,
    priority: Priority,
    content: string,
    timing: Intervention['timing'],
  ): Intervention {
    return {
      id: uuid(),
      priority,
      type,
      content,
      output: priority === Priority.P3_SAFETY ? OutputType.HAPTIC : OutputType.BONE_CONDUCTION,
      timing,
      suppressible: priority !== Priority.P3_SAFETY,
    };
  }

  private shouldDeliver(intervention: Intervention): boolean {
    // Never suppress safety
    if (intervention.priority === Priority.P3_SAFETY) return true;

    // If user said "shh" / "stop" / "got it", suppress non-critical
    if (this.suppressed && intervention.suppressible) return false;

    // Don't repeat same intervention within 30 seconds
    if (this.deliveredHistory.includes(intervention.type)) return false;

    // Calibrate to R3 state — don't pile on when user is overwhelmed
    if (this.currentR3State?.arousal === ArousalState.OVERWHELM) {
      return intervention.type === InterventionType.OVERWHELM_ALERT ||
             intervention.type === InterventionType.REGULATION_PROMPT;
    }

    return true;
  }

  private deliverNext(): void {
    // Sort: immediate > next_gap > deferred
    const timingOrder = { immediate: 0, next_gap: 1, deferred: 2 };
    this.pendingInterventions.sort((a, b) =>
      timingOrder[a.timing] - timingOrder[b.timing] ||
      a.priority - b.priority
    );

    const next = this.pendingInterventions.shift();
    if (!next) return;

    // Wait for gap if user is speaking and timing isn't immediate
    if (this.userSpeaking && next.timing !== 'immediate') {
      this.pendingInterventions.unshift(next);
      return;
    }

    this.deliver(next);
  }

  private deliver(intervention: Intervention): void {
    // Track delivery
    this.deliveredHistory.push(intervention.type);
    setTimeout(() => {
      const idx = this.deliveredHistory.indexOf(intervention.type);
      if (idx >= 0) this.deliveredHistory.splice(idx, 1);
    }, 30_000);

    // Send to output device via bus
    this.sendToBus(BusId.A, {
      type: 'intervention_deliver',
      intervention,
    }, intervention.priority);

    // Also send to R5 for memory storage
    this.sendToBus(BusId.A, {
      type: 'intervention_log',
      intervention,
    }, Priority.P2_NICE, RingId.R5);

    // And to R6 for effectiveness tracking
    this.sendToBus(BusId.A, {
      type: 'intervention_track',
      intervention,
    }, Priority.P2_NICE, RingId.R6);

    this.emit('intervention', intervention);
  }

  private onDismiss(): void {
    this.suppressed = true;
    this.pendingInterventions = this.pendingInterventions.filter(i => !i.suppressible);
    // Reset suppression after 2 minutes
    setTimeout(() => { this.suppressed = false; }, 120_000);
    this.emit('suppressed');
  }

  private isOverwhelmUrgent(): boolean {
    return this.currentR3State?.overwhelmRisk !== undefined &&
           this.currentR3State.overwhelmRisk > 0.8;
  }

  // ─── Voice Formatting (Brevity First) ──────────────────────────────────

  private formatNameReminder(data: Record<string, unknown>): string {
    const name = data.name as string | undefined;
    const context = data.context as string | undefined;
    if (!name) return '';
    return context ? `${name}. ${context}.` : name;
  }

  private formatRegulationPrompt(data: Record<string, unknown>): string {
    const hrv = data.hrv as number;
    return `HRV ${hrv}ms. Consider a break.`;
  }

  private formatOverwhelmAlert(data: Record<string, unknown>): string {
    const r3 = data.r3 as R3State | undefined;
    const duration = r3 ? Math.round(r3.durationInState / 60_000) : 0;
    if (duration > 0) {
      return `Elevated ${duration} minutes. Step away if you can.`;
    }
    return 'Arousal rising. You have options.';
  }

  private formatStimmingAwareness(data: Record<string, unknown>): string {
    const min = Math.round((data.duration as number) / 60);
    return `${data.activity} for ${min} minutes.`;
  }

  private formatEnvironment(data: Record<string, unknown>): string {
    return `Noise level: ${data.noise}dB.`;
  }
}
