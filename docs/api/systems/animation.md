# Animation System API

ECS system for updating sprite animations based on frame timing and playback state.

## Overview

The animation system handles:
- Advancing sprite animation frames based on elapsed time
- Playback speed scaling
- Looping and one-shot animation modes
- Forward and reverse playback direction
- Updating entity Sprite component frames

## Quick Start

```typescript
import {
  createScheduler,
  registerAnimationSystem,
  LoopPhase,
} from 'blecsd';

const scheduler = createScheduler();
registerAnimationSystem(scheduler);

// In game loop
scheduler.run(world, deltaTime);
```

## Functions

### animationSystem

The animation system function. Reads delta time from the scheduler and updates all entities with the Animation component.

For each playing animation, the system:
1. Adds elapsed time (scaled by speed)
2. Checks if the current frame duration is exceeded
3. Advances to the next frame (respecting direction)
4. Handles loop/stop when the animation completes
5. Updates the entity's Sprite component frame

```typescript
const animationSystem: System
```

```typescript
import { animationSystem, LoopPhase } from 'blecsd';

scheduler.registerSystem(LoopPhase.UPDATE, animationSystem);
```

### createAnimationSystem

Factory function that returns the animationSystem.

```typescript
function createAnimationSystem(): System
```

```typescript
import { createAnimationSystem, createScheduler, LoopPhase } from 'blecsd';

const scheduler = createScheduler();
const system = createAnimationSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system);
```

### registerAnimationSystem

Convenience function that registers the animation system in the UPDATE phase.

```typescript
function registerAnimationSystem(scheduler: Scheduler, priority?: number): void
```

**Parameters:**
- `scheduler` - The scheduler to register with
- `priority` - Optional priority within the UPDATE phase (default: 0)

```typescript
import { createScheduler, registerAnimationSystem } from 'blecsd';

const scheduler = createScheduler();
registerAnimationSystem(scheduler);
```

### queryAnimation

Query all entities with the Animation component.

```typescript
function queryAnimation(world: World): number[]
```

### hasAnimationSystem

Checks if an entity has the Animation component via the system store.

```typescript
function hasAnimationSystem(world: World, eid: number): boolean
```

### updateAnimations

Manually update animations for specific entities. Useful for testing or custom update loops.

```typescript
function updateAnimations(
  world: World,
  entities: readonly number[],
  deltaTime: number,
): void
```

```typescript
import { updateAnimations, queryAnimation } from 'blecsd';

const entities = queryAnimation(world);
updateAnimations(world, entities, 0.016); // ~60fps frame
```

## Usage Example

Complete sprite animation setup:

```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  registerAnimationSystem,
  queryAnimation,
  updateAnimations,
  setAnimation,
  setSprite,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Register animation system in UPDATE phase
registerAnimationSystem(scheduler);

// Create an animated entity
const player = addEntity(world);

// Set up sprite with initial frame
setSprite(world, player, {
  char: '@',
  fg: 0xffffff,
  bg: 0x000000,
});

// Set up walk animation
setAnimation(world, player, {
  animationId: walkAnimId,
  playing: true,
  loop: true,
  speed: 1.0,
  direction: 1,  // Forward
});

// Run in game loop
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  scheduler.run(world, dt);
}, 16);

// Or manually update specific entities
const animatedEntities = queryAnimation(world);
updateAnimations(world, animatedEntities, 1 / 60);
```
