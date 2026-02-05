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
} from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  registerAnimationSystem,
  attachAnimation,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Register the animation system
registerAnimationSystem(scheduler);

// Create an animated entity
const entity = addEntity(world);
attachAnimation(world, entity, {
  animationId: walkAnimation,
  playing: true,
  loop: true,
  speed: 1.0,
});

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
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  registerAnimationSystem,
  attachAnimation,
  setAnimationPlaying,
  setAnimationId,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();
registerAnimationSystem(scheduler);

// Animation definitions (from your asset system)
const ANIM_IDLE = 1;
const ANIM_WALK = 2;
const ANIM_ATTACK = 3;

// Create player
const player = addEntity(world);
attachAnimation(world, player, {
  animationId: ANIM_IDLE,
  playing: true,
  loop: true,
  speed: 1.0,
});

// State transitions
function playerIdle() {
  setAnimationId(world, player, ANIM_IDLE);
  setAnimationPlaying(world, player, true);
}

function playerWalk() {
  setAnimationId(world, player, ANIM_WALK);
  setAnimationPlaying(world, player, true);
}

function playerAttack() {
  setAnimationId(world, player, ANIM_ATTACK);
  setAnimationPlaying(world, player, true);
  // Attack animation doesn't loop
}

// In game loop
function gameLoop(dt: number) {
  scheduler.run(world, dt);
}
```

## Example: Animated UI Elements

```typescript
import {
  attachAnimation,
  registerAnimationSystem,
} from 'blecsd';

// Loading spinner
const spinner = addEntity(world);
attachAnimation(world, spinner, {
  animationId: spinnerAnim,
  playing: true,
  loop: true,
  speed: 2.0, // Double speed
});

// Blinking cursor
const cursor = addEntity(world);
attachAnimation(world, cursor, {
  animationId: blinkAnim,
  playing: true,
  loop: true,
  speed: 0.5, // Slow blink
});
```

## Performance Considerations

- Uses SoA layout for cache-efficient iteration
- Only processes entities with Animation component
- Skips non-playing animations (though they still exist in the query)
- Default capacity: 10,000 entities

## Related

- [Movement System](./movementSystem.md) - Velocity-based movement
- [State Machine System](./stateMachineSystem.md) - State transitions
- [Scheduler](../scheduler.md) - System execution
