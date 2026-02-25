# NODE-001

Wearable AI Companion System — Hardware implementation of ASS-OS for neurodivergent assistive use.

**Architecture:** ASS-OS Ring/Bus Model | **Classification:** Medical Assistive Device | **Spec:** NODE-SPEC-001 Rev 0.1

**Design:** John DuCrest + Thomas Frumkin

## What NODE Is

NODE is a physical, wearable AI companion platform designed as a medical assistive device for neurodivergent individuals. Real-time memory assistance, environmental sensory processing, social processing support, and companionship through bone conduction.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   R6 Observer                    │  Meta-monitoring + self-calibration
├─────────────────────────────────────────────────┤
│                R5 Persistent Memory              │  Encrypted memory consolidation
├─────────────────────────────────────────────────┤
│               R4 Executive Assist                │  Intervention engine + voice output
├─────────────────────────────────────────────────┤
│              R3 Emotional State                  │  Arousal/overwhelm estimation
├─────────────────────────────────────────────────┤
│                   R2 Gate                        │  Priority sorting (user-specific)
├─────────────────────────────────────────────────┤
│               R1 Sensory Input                   │  Sensor fusion → scene model
├─────────────────────────────────────────────────┤
│                R0 Body State                     │  Biometric monitoring (HRV, temp, IMU)
├─────────────────────────────────────────────────┤
│  Bus A (Electrical) │ Bus B (Chemical) │ Bus C (Photonic) │ Bus D (Mechanical)  │
└─────────────────────────────────────────────────┘
```

## Pipeline

```
Sense (R0+R1) → Sort (R2) → Feel (R3) → Act (R4) → Store (R5) → Watch (R6)
```

## Project Structure

```
src/
├── types/          # Core type definitions (rings, buses, sensors, states)
├── core/           # Bus, Ring, Runtime — ASS-OS kernel
├── rings/          # R0-R6 ring implementations
├── sensors/        # Camera, Microphone, PPG, SkinTemp, IMU
├── pipeline/       # 6-stage processing pipeline orchestrator
├── privacy/        # PrivacyManager + ConsentFramework
├── device/         # Hardware abstraction (V1 spec)
├── p2p/            # KONOMI P2P mesh network
├── standards/      # KONOMI Standard (ISA-95, ISA-88, PackML, KPIs)
├── config/         # Default configuration
└── index.ts        # NODE factory + exports
```

## Quick Start

```bash
npm install
npm run build
npm test
```

```typescript
import { createNODE } from '@konomi/node-001';

const node = createNODE();
await node.pipeline.start();

// Privacy-first: starts in PRIVATE mode (camera off)
console.log(node.privacy.mode); // 'private'

// Switch to public for social contexts
node.privacy.setMode('public');

// Check R3 emotional state
console.log(node.rings.r3.getState()); // { arousal: 'calm', ... }

// R6 daily summary
console.log(node.rings.r6.generateDailySummary());
```

## V1 Hardware Target

| Component | Spec | Power |
|-----------|------|-------|
| SoC | Qualcomm QCS6490 | 600mW avg |
| Camera | OV5693 5MP Wide | 400mW avg |
| Microphones | Knowles SPH0645 x2 | 45mW |
| Bone Conduction | Custom Piezo | 20mW avg |
| PPG | Maxim MAX86150 | 30mW |
| IMU | Bosch BMI270 | 15mW |
| Battery | 3000mAh LiPo | ~9.4h runtime |

Form factor: Shoulder mount, <150g.

## Privacy by Design

- On-device processing first — raw data never leaves device
- No raw storage of others — only user's memory of interactions
- Physical kill switch — hardware, not software
- Visible recording LED — hardwired to camera/mic power
- Data sovereignty — user owns all data, E2E encrypted
- Expiration — default 1 year, mimics natural memory decay

## Standards Compliance

Built on KONOMI Standard layers: ISA-95 equipment hierarchy, ISA-88/PackML state machines, ISA-18.2 alarm management, OPC-UA node model, OEE KPI tracking.
