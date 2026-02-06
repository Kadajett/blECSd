# Particle System API

ECS system for spawning, updating, and removing particles with rate-based and burst-based emitters.

## Overview

The particle system handles:
- Rate-based continuous particle spawning from emitters
- Burst particle emission (one-shot effects)
- Particle aging, gravity, and velocity-based movement
- Automatic removal of dead particles
- Configurable maximum particle limits
- Random angle spread within emitter cone

## Quick Start

```typescript
import { createParticleSystem } from 'blecsd';

const particleSystem = createParticleSystem({
  emitters: (world) => myEmitterEntities,
  particles: (world) => myParticleEntities,
  maxParticles: 500,
});

// In your game loop
particleSystem(world);
```

## Types

### EntityProvider

Function that provides entity IDs to iterate over.

```typescript
type EntityProvider = (world: World) => ReadonlyArray<Entity>;
```

### ParticleSystemConfig

```typescript
interface ParticleSystemConfig {
  /** Provides emitter entities each frame */
  readonly emitters: EntityProvider;
  /** Provides particle entities each frame */
  readonly particles: EntityProvider;
  /** Maximum concurrent particles (default: 1000) */
  readonly maxParticles?: number;
}
```

## Functions

### createParticleSystem

Creates a particle system that processes emitters and particles each frame. The system handles rate-based spawning from active emitters, ages particles, applies gravity, updates positions, and removes dead particles.

```typescript
function createParticleSystem(config: ParticleSystemConfig): System
```

**Parameters:**
- `config` - System configuration with entity providers and particle limits

**Returns:** A `System` function.

```typescript
import { createParticleSystem } from 'blecsd';

const particleSystem = createParticleSystem({
  emitters: (world) => activeEmitters,
  particles: (world) => liveParticles,
  maxParticles: 1000,
});
```

### spawnParticle

Spawns a single particle from an emitter at a random angle within the emitter's spread cone. Sets position to the emitter's position and velocity based on emitter speed and angle.

```typescript
function spawnParticle(
  world: World,
  emitterId: Entity,
  appearance: EmitterAppearance,
): Entity
```

**Parameters:**
- `world` - The ECS world
- `emitterId` - The emitter entity ID
- `appearance` - Visual appearance config (chars, colors, fade)

**Returns:** The spawned particle entity ID, or `-1` if spawn failed.

### burstParticles

Triggers a burst of particles from an emitter (one-shot effect).

```typescript
function burstParticles(
  world: World,
  emitterId: Entity,
  count?: number,
  maxParticles?: number,
  currentCount?: number,
): Entity[]
```

**Parameters:**
- `world` - The ECS world
- `emitterId` - The emitter entity ID
- `count` - Number of particles to emit (default: emitter's burstCount)
- `maxParticles` - Maximum total particles allowed (default: 1000)
- `currentCount` - Current total particle count (default: 0)

**Returns:** Array of spawned particle entity IDs.

```typescript
import { burstParticles } from 'blecsd';

// Explosion effect
const particles = burstParticles(world, explosionEmitter, 50);
```

### ageParticle

Ages a particle and applies gravity from its emitter.

```typescript
function ageParticle(world: World, eid: Entity, delta: number): void
```

### moveParticle

Updates a particle's position based on its velocity.

```typescript
function moveParticle(world: World, eid: Entity, delta: number): void
```

### killParticle

Removes a dead particle and cleans up emitter tracking.

```typescript
function killParticle(world: World, eid: Entity): void
```

## Usage Example

Complete particle effect setup with emitters:

```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  createParticleSystem,
  burstParticles,
  setPosition,
  setEmitter,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Track entities
const emitterEntities: Entity[] = [];
const particleEntities: Entity[] = [];

// Create particle system
const particleSystem = createParticleSystem({
  emitters: () => emitterEntities,
  particles: () => particleEntities,
  maxParticles: 500,
});

scheduler.registerSystem(LoopPhase.UPDATE, particleSystem);

// Create a fire emitter
const fireEmitter = addEntity(world);
setPosition(world, fireEmitter, 40, 20);
setEmitter(world, fireEmitter, {
  rate: 10,           // 10 particles per second
  lifetime: 2.0,      // Each particle lives 2 seconds
  speed: 3,           // Particle speed
  angle: -Math.PI / 2, // Upward
  spread: 0.5,        // Cone width
  gravity: -0.5,      // Slight upward drift
  active: true,
});
emitterEntities.push(fireEmitter);

// One-shot explosion
const explosionEmitter = addEntity(world);
setPosition(world, explosionEmitter, 60, 12);
setEmitter(world, explosionEmitter, {
  rate: 0,
  lifetime: 1.0,
  speed: 8,
  angle: 0,
  spread: Math.PI * 2, // Full circle
  gravity: 2,
  active: true,
});

// Trigger burst
burstParticles(world, explosionEmitter, 30);

// Run in game loop
scheduler.run(world, 1 / 60);
```
