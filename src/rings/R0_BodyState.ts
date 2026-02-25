import { Ring } from '../core/Ring';
import { BusMessage, RingId, BusId, Priority, BodyState, MovementState, PostureState, SensorReading, SensorType } from '../types';

/**
 * R0 — Body State Ring
 *
 * Continuous biometric monitoring: HRV, GSR, temperature, movement.
 * Feeds into R3 state estimation. This IS interoception assist — for
 * people whose R0→R3 pipe is noisy or unreliable.
 *
 * The device knows your body state before YOU do.
 */
export class R0_BodyState extends Ring {
  private heartRate = 72;
  private hrv = 50;
  private skinTemp = 36.8;
  private gsr: number | undefined;
  private movement: MovementState = {
    isMoving: false,
    activity: 'still',
    fallDetected: false,
  };
  private posture: PostureState = {
    orientation: { pitch: 0, roll: 0, yaw: 0 },
    isUpright: true,
  };

  constructor() {
    super(RingId.R0, 'Body State');
  }

  protected onMessage(msg: BusMessage): void {
    const reading = msg.payload as SensorReading;
    if (!reading?.sensorType) return;

    switch (reading.sensorType) {
      case SensorType.PPG:
        this.updateCardio(reading.data as Record<string, number>);
        break;
      case SensorType.SKIN_TEMP:
        this.skinTemp = (reading.data as Record<string, number>).temperature ?? this.skinTemp;
        break;
      case SensorType.GSR:
        this.gsr = (reading.data as Record<string, number>).conductance;
        break;
      case SensorType.IMU:
        this.updateMovement(reading.data as Record<string, unknown>);
        break;
    }

    this.broadcastState();
  }

  private updateCardio(data: Record<string, number>): void {
    if (data.heartRate !== undefined) this.heartRate = data.heartRate;
    if (data.hrv !== undefined) this.hrv = data.hrv;
  }

  private updateMovement(data: Record<string, unknown>): void {
    this.movement = {
      isMoving: data.activity !== 'still',
      activity: (data.activity as MovementState['activity']) ?? 'still',
      stimmingDuration: data.stimmingDuration as number | undefined,
      fallDetected: (data.fallDetected as boolean) ?? false,
    };
    if (data.posture) {
      const p = data.posture as Record<string, number>;
      this.posture = {
        orientation: { pitch: p.pitch ?? 0, roll: p.roll ?? 0, yaw: p.yaw ?? 0 },
        isUpright: Math.abs(p.pitch ?? 0) < 45,
      };
    }

    // Fall detection is safety-critical → P3
    if (this.movement.fallDetected) {
      this.sendToBus(BusId.A, { type: 'fall_detected', bodyState: this.getState() }, Priority.P3_SAFETY);
    }
  }

  private broadcastState(): void {
    const state = this.getState();
    this.sendToBus(BusId.B, state, Priority.P1_SHOULD, RingId.R3);
    this.emit('state', state);
  }

  getState(): BodyState {
    return {
      timestamp: Date.now(),
      heartRate: this.heartRate,
      hrv: this.hrv,
      skinTemp: this.skinTemp,
      gsr: this.gsr,
      movement: { ...this.movement },
      posture: { ...this.posture },
    };
  }
}
