# Animation System

The animation system updates sprite animations for all entities with the Animation component. It processes frame timing, direction, looping, and automatically updates sprite frames.

## Import

```typescript
import {
  animationSystem,
  createAnimationSystem,
  registerAnimationSystem,
  queryAnimation,
  hasAnimationSystem,
  updateAnimations,
} from 'blecsd/systems';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { registerAnimation, playAnimation } from 'blecsd/components';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { registerAnimationSystem } from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();

// Register the animation system
registerAnimationSystem(scheduler);

// Register an animation definition
const walkAnimation = registerAnimation({
  name: 'walk',
  frames: [{ duration: 0.1 }, { duration: 0.1 }, { duration: 0.1 }],
});

// Create an animated entity
const entity = addEntity(world);
playAnimation(world, entity, walkAnimation, { loop: true, speed: 1.0 });

// In your game loop
function gameLoop(deltaTime: number) {
  scheduler.run(world, deltaTime);
}
```

## Recommended Phase

Register in the **UPDATE** phase:

```typescript
scheduler.registerSystem(LoopPhase.UPDATE, animationSystem);
```

## System Behavior

Each frame, the animation system:

1. Reads delta time from the scheduler
2. Queries all entities with Animation component
3. For each playing animation:
   - Adds elapsed time (scaled by speed)
   - Checks if current frame duration exceeded
   - Advances to next frame (respecting direction)
   - Handles loop/stop when animation completes
   - Updates the entity's Sprite component frame

## Functions

### System Registration

```typescript
// Register with scheduler (convenience function)
registerAnimationSystem(scheduler, priority?);

// Or create and register manually
const system = createAnimationSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system);

// Or use the system directly
animationSystem(world);
```

### Query Functions

```typescript
// Query all animated entities
const animated = queryAnimation(world);
// Returns: number[] (entity IDs)

// Check if entity has Animation component
if (hasAnimationSystem(world, eid)) {
  // Entity is animated
}
```

### Manual Updates

```typescript
// Update specific entities outside the system
const entities = queryAnimation(world);
updateAnimations(world, entities, 0.016); // ~60fps frame
```

## Animation Store

The animation system uses a Structure of Arrays (SoA) pattern for cache efficiency:

| Field | Type | Description |
|-------|------|-------------|
| `animationId` | `Uint32Array` | Index into animation definitions |
| `playing` | `Uint8Array` | Whether animation is playing (0/1) |
| `loop` | `Uint8Array` | Whether animation loops (0/1) |
| `speed` | `Float32Array` | Playback speed multiplier |
| `elapsed` | `Float32Array` | Time elapsed in current frame |
| `currentFrameIndex` | `Uint16Array` | Current frame index |
| `direction` | `Int8Array` | Playback direction (1/-1) |

## Example: Character Animation

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { registerAnimation, playAnimation } from 'blecsd/components';
import { createScheduler } from 'blecsd/core';
import { registerAnimationSystem } from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();
registerAnimationSystem(scheduler);

// Register animation definitions
const ANIM_IDLE = registerAnimation({ name: 'idle', frames: [{ duration: 0.2 }, { duration: 0.2 }] });
const ANIM_WALK = registerAnimation({ name: 'walk', frames: [{ duration: 0.1 }, { duration: 0.1 }] });
const ANIM_ATTACK = registerAnimation({ name: 'attack', frames: [{ duration: 0.08 }, { duration: 0.08 }] });

// Create player
const player = addEntity(world);
playAnimation(world, player, ANIM_IDLE, { loop: true, speed: 1.0 });

// State transitions
function playerIdle(): void {
  playAnimation(world, player, ANIM_IDLE, { loop: true });
}

function playerWalk(): void {
  playAnimation(world, player, ANIM_WALK, { loop: true });
}

function playerAttack(): void {
  playAnimation(world, player, ANIM_ATTACK, { loop: false });
}

// In game loop
function gameLoop(dt: number): void {
  scheduler.run(world, dt);
}
```

## Example: Animated UI Elements

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { registerAnimation, playAnimation } from 'blecsd/components';
import { registerAnimationSystem } from 'blecsd/systems';
import { createScheduler } from 'blecsd/core';

const world = createWorld();
const scheduler = createScheduler();
registerAnimationSystem(scheduler);

const spinnerAnim = registerAnimation({ name: 'spinner', frames: [{ duration: 0.1 }, { duration: 0.1 }] });
const blinkAnim = registerAnimation({ name: 'blink', frames: [{ duration: 0.5 }, { duration: 0.5 }] });

// Loading spinner
const spinner = addEntity(world);
playAnimation(world, spinner, spinnerAnim, { loop: true, speed: 2.0 });

// Blinking cursor
const cursor = addEntity(world);
playAnimation(world, cursor, blinkAnim, { loop: true, speed: 0.5 });
```

## Performance Considerations

- Uses SoA layout for cache-efficient iteration
- Only processes entities with Animation component
- Skips non-playing animations (though they still exist in the query)
- Default capacity: 10,000 entities

## Related

- [Movement System](./movementSystem.md) - Velocity-based movement
- [State Machine System](./stateMachineSystem.md) - State transitions
- [Scheduler](../core/scheduler.md) - System execution
