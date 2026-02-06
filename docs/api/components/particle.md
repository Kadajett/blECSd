# Particle Components API

ECS components for particle effects, providing both individual particle state and emitter configuration.

## Overview

The particle module provides two components:
- **Particle** - Per-particle state (lifetime, age, character, color interpolation, fade)
- **ParticleEmitter** - Emitter configuration (rate, burst, speed, spread, gravity, appearance)

Emitters track which particles they have spawned via a side store. Particle colors interpolate from `startFg` to `endFg` over the particle's lifetime.

## Import

```typescript
import {
  Particle,
  ParticleEmitter,
  setParticle,
  getParticle,
  hasParticle,
  removeParticle,
  isParticleDead,
  getParticleProgress,
  getParticleColor,
  interpolateColor,
  setEmitter,
  getEmitter,
  hasEmitter,
  removeEmitter,
  setEmitterAppearance,
  getEmitterAppearance,
  getEmitterParticles,
  trackParticle,
  untrackParticle,
  activateEmitter,
  pauseEmitter,
  isEmitterActive,
  setEmitterRate,
  setEmitterSpeed,
  setEmitterGravity,
} from 'blecsd';
```

## Particle Component

### Component Data Layout

```typescript
const Particle = {
  lifetime: Float32Array,  // Total lifetime in seconds
  age:      Float32Array,  // Current age in seconds
  fadeOut:   Uint8Array,    // 1=fades out, 0=no fade
  char:     Uint32Array,   // Character code point to render
  startFg:  Uint32Array,   // Foreground color at birth (packed RGBA)
  endFg:    Uint32Array,   // Foreground color at death (packed RGBA)
  emitter:  Uint32Array,   // Emitter entity ID (0 = none)
};
```

### setParticle

Creates or updates a particle on an entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setParticle } from 'blecsd';

setParticle(world, entity, {
  lifetime: 1.5,
  char: '*'.codePointAt(0)!,
  startFg: 0xffff0000,  // Red
  endFg: 0xff880000,    // Dark red
  fadeOut: true,
  emitter: emitterEntity,
});
```

**Options:**
- `lifetime` - Total lifetime in seconds (required)
- `char` - Character code point (required)
- `startFg` - Start color packed RGBA (required)
- `endFg` - End color packed RGBA (default: same as `startFg`)
- `fadeOut` - Whether particle fades (default: `false`)
- `emitter` - Emitter entity ID (default: `0`)

### getParticle

```typescript
import { getParticle } from 'blecsd';

const p = getParticle(world, entity);
if (p) {
  console.log(`Age: ${p.age}/${p.lifetime}`);
}
```

### isParticleDead / getParticleProgress / getParticleColor

```typescript
import { isParticleDead, getParticleProgress, getParticleColor } from 'blecsd';

if (isParticleDead(world, entity)) {
  // age >= lifetime, ready for removal
}

const progress = getParticleProgress(world, entity); // 0-1
const color = getParticleColor(world, entity);        // Interpolated packed RGBA
```

### interpolateColor

Utility for interpolating between two packed RGBA colors.

```typescript
import { interpolateColor } from 'blecsd';

const mid = interpolateColor(0xffff0000, 0xff0000ff, 0.5); // Red to blue at 50%
```

### hasParticle / removeParticle

```typescript
import { hasParticle, removeParticle } from 'blecsd';

if (hasParticle(world, entity)) {
  removeParticle(world, entity); // Also untracks from emitter
}
```

## ParticleEmitter Component

### Component Data Layout

```typescript
const ParticleEmitter = {
  rate:        Float32Array,  // Particles per second
  burstCount:  Uint16Array,   // Burst particle count
  lifetime:    Float32Array,  // Default particle lifetime
  spread:      Float32Array,  // Emission spread angle (radians)
  speed:       Float32Array,  // Initial particle speed (cells/sec)
  gravity:     Float32Array,  // Downward acceleration (cells/sec^2)
  angle:       Float32Array,  // Base emission angle (radians, 0 = right)
  active:      Uint8Array,    // 1=active, 0=paused
  accumulator: Float32Array,  // Internal rate accumulator
};
```

### setEmitter

Creates or updates an emitter on an entity.

```typescript
import { setEmitter } from 'blecsd';

setEmitter(world, entity, {
  rate: 20,
  lifetime: 1.0,
  speed: 5,
  spread: Math.PI / 3,
  gravity: 9.8,
  active: true,
});
```

**Options:**
- `lifetime` - Default particle lifetime (required)
- `rate` - Particles per second (default: `0`)
- `burstCount` - Burst count (default: `0`)
- `spread` - Spread angle in radians (default: `2*PI`)
- `speed` - Initial speed (default: `3`)
- `gravity` - Gravity (default: `0`)
- `angle` - Base angle (default: `0`)
- `active` - Whether emitting (default: `true`)

### getEmitter

```typescript
import { getEmitter } from 'blecsd';

const em = getEmitter(world, entity);
if (em) {
  console.log(`Rate: ${em.rate}, Speed: ${em.speed}`);
}
```

### Emitter Controls

```typescript
import { activateEmitter, pauseEmitter, isEmitterActive } from 'blecsd';
import { setEmitterRate, setEmitterSpeed, setEmitterGravity } from 'blecsd';

activateEmitter(world, entity);
pauseEmitter(world, entity);
isEmitterActive(world, entity); // boolean

setEmitterRate(world, entity, 50);
setEmitterSpeed(world, entity, 10);
setEmitterGravity(world, entity, 20);
```

### Emitter Appearance

Configure the visual appearance of spawned particles.

```typescript
import { setEmitterAppearance, getEmitterAppearance } from 'blecsd';

setEmitterAppearance(entity, {
  chars: ['*', '.', 'o'].map(c => c.codePointAt(0)!),
  startFg: 0xffff0000,
  endFg: 0xff880000,
  fadeOut: true,
});

const appearance = getEmitterAppearance(entity);
```

### Particle Tracking

<!-- blecsd-doccheck:ignore -->
```typescript
import { trackParticle, untrackParticle, getEmitterParticles } from 'blecsd';

trackParticle(emitterEntity, particleEntity);
untrackParticle(emitterEntity, particleEntity);

const particles = getEmitterParticles(emitterEntity); // ReadonlySet<number>
```

### hasEmitter / removeEmitter

```typescript
import { hasEmitter, removeEmitter } from 'blecsd';

if (hasEmitter(world, entity)) {
  removeEmitter(world, entity); // Cleans up appearance and particle tracking
}
```

## Usage Example

```typescript
import { createWorld, addEntity } from 'blecsd';
import { setEmitter, setEmitterAppearance, setParticle, isParticleDead } from 'blecsd';

const world = createWorld();
const emitter = addEntity(world);

// Configure emitter
setEmitter(world, emitter, {
  rate: 10,
  lifetime: 2.0,
  speed: 4,
  spread: Math.PI / 4,
  gravity: 5,
});

setEmitterAppearance(emitter, {
  chars: ['*', '.'].map(c => c.codePointAt(0)!),
  startFg: 0xffffff00, // Yellow
  endFg: 0xffff0000,   // Red
  fadeOut: true,
});

// Spawn a particle (typically done by the particle system)
const particle = addEntity(world);
setParticle(world, particle, {
  lifetime: 2.0,
  char: '*'.codePointAt(0)!,
  startFg: 0xffffff00,
  endFg: 0xffff0000,
  fadeOut: true,
  emitter,
});
```

## Types

### ParticleData

```typescript
interface ParticleData {
  readonly lifetime: number;
  readonly age: number;
  readonly fadeOut: boolean;
  readonly char: number;
  readonly startFg: number;
  readonly endFg: number;
  readonly emitter: number;
}
```

### EmitterData

```typescript
interface EmitterData {
  readonly rate: number;
  readonly burstCount: number;
  readonly lifetime: number;
  readonly spread: number;
  readonly speed: number;
  readonly gravity: number;
  readonly angle: number;
  readonly active: boolean;
}
```

### EmitterAppearance

```typescript
interface EmitterAppearance {
  chars: ReadonlyArray<number>;
  startFg: number;
  endFg?: number;
  fadeOut?: boolean;
}
```
