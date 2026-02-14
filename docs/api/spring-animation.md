# Spring Animation

Physics-based spring animations for smooth, natural motion. The spring system uses Hooke's law and damping forces to create bouncy, fluid animations that feel responsive and organic.

## Quick Start

```typescript
import {
  createWorld,
  addEntity,
  createSpring,
  setSpringTarget,
  springSystem,
  springBouncy,
  createScheduler,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Create spring animation with bouncy preset
createSpring(world, entity, springBouncy);

// Animate to target position
setSpringTarget(world, entity, 100, 50);

// Register spring system in game loop
const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.ANIMATION, springSystem);

// In game loop
let lastTime = Date.now();
function gameLoop() {
  const now = Date.now();
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;

  scheduler.run(world, deltaTime);
  requestAnimationFrame(gameLoop);
}
gameLoop();
```

## API Reference

### Spring Component

The `Spring` component stores spring physics parameters and state. It uses Structure of Arrays (SoA) layout for optimal performance.

**Properties:**
- `targetX` - Target X position
- `targetY` - Target Y position
- `stiffness` - Spring stiffness coefficient (higher = faster response)
- `damping` - Damping coefficient (higher = less oscillation)
- `precision` - Precision threshold for stopping animation
- `active` - 1 if spring is active, 0 if at rest

### Spring Configuration

#### SpringConfig

Configuration interface for spring behavior.

**Properties:**
- `stiffness` - Spring stiffness (higher = faster response)
- `damping` - Damping coefficient (higher = less oscillation)
- `precision` - Precision threshold for stopping (smaller = more precise)

### Spring Presets

Pre-configured spring settings for common animation styles.

#### springBouncy

High stiffness, low damping. Creates bouncy, playful animations.

**Values:**
- `stiffness: 180`
- `damping: 8`
- `precision: 0.01`

**Example:**
```typescript
import { createSpring, springBouncy } from 'blecsd';

createSpring(world, entity, springBouncy);
```

#### springSmooth

Moderate stiffness and damping. Creates smooth, fluid animations (default).

**Values:**
- `stiffness: 100`
- `damping: 15`
- `precision: 0.01`

**Example:**
```typescript
import { createSpring, springSmooth } from 'blecsd';

createSpring(world, entity, springSmooth);
```

#### springSnappy

Very high stiffness, high damping. Creates quick, snappy animations.

**Values:**
- `stiffness: 300`
- `damping: 20`
- `precision: 0.01`

**Example:**
```typescript
import { createSpring, springSnappy } from 'blecsd';

createSpring(world, entity, springSnappy);
```

### Functions

#### createSpring

Creates a spring animation component on an entity. Automatically adds `Position` and `Velocity` components if not present.

**Parameters:**
- `world` - The ECS world
- `eid` - The entity to add spring animation to
- `config` - Spring configuration (default: `springSmooth`)

**Returns:** `Entity` - The entity ID for chaining

**Example:**
```typescript
import { createWorld, addEntity, createSpring, springBouncy } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Create with custom config
createSpring(world, entity, springBouncy);

// Create with default smooth spring
createSpring(world, entity);

// Create with custom values
createSpring(world, entity, {
  stiffness: 200,
  damping: 10,
  precision: 0.005,
});
```

#### setSpringTarget

Sets the target position for a spring animation. Activates the spring if it's currently at rest.

**Parameters:**
- `world` - The ECS world
- `eid` - The entity with spring animation
- `targetX` - Target X position
- `targetY` - Target Y position

**Example:**
```typescript
import { setSpringTarget } from 'blecsd';

// Animate to new position
setSpringTarget(world, entity, 100, 50);

// Chain multiple animations by calling repeatedly
setSpringTarget(world, entity, 50, 25);
```

#### getSpringTarget

Gets the spring target position.

**Parameters:**
- `world` - The ECS world
- `eid` - The entity to query

**Returns:** `{ x: number, y: number } | undefined` - Target position or undefined if no spring component

**Example:**
```typescript
import { getSpringTarget } from 'blecsd';

const target = getSpringTarget(world, entity);
if (target) {
  console.log(`Target: (${target.x}, ${target.y})`);
}
```

#### isSpringActive

Checks if a spring animation is currently active.

**Parameters:**
- `world` - The ECS world
- `eid` - The entity to check

**Returns:** `boolean` - True if spring is animating, false otherwise

**Example:**
```typescript
import { isSpringActive } from 'blecsd';

if (isSpringActive(world, entity)) {
  console.log('Animation in progress');
}
```

#### springSystem

Spring physics system that updates all entities with active spring animations. Should be registered in the `ANIMATION` phase of the game loop.

**Parameters:**
- `world` - The ECS world to process
- `dt` - Delta time in seconds

**Returns:** `World` - The world (unchanged reference)

**Example:**
```typescript
import { createScheduler, LoopPhase, springSystem } from 'blecsd';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.ANIMATION, springSystem);

// In game loop
scheduler.run(world, deltaTime);
```

## Common Patterns

### UI Element Animation

```typescript
import { createSpring, setSpringTarget, springSmooth } from 'blecsd';

// Create a button that smoothly moves on hover
const button = addEntity(world);
setPosition(world, button, 10, 5);
createSpring(world, button, springSmooth);

// On hover
setSpringTarget(world, button, 12, 5);

// On hover end
setSpringTarget(world, button, 10, 5);
```

### Dialog Slide-In Animation

```typescript
import { createSpring, setSpringTarget, springSnappy } from 'blecsd';

// Create dialog off-screen
const dialog = addEntity(world);
setPosition(world, dialog, -50, 10);
createSpring(world, dialog, springSnappy);

// Slide in from left
setSpringTarget(world, dialog, 10, 10);
```

### Bouncy Notification

```typescript
import { createSpring, setSpringTarget, springBouncy } from 'blecsd';

// Create notification
const notification = addEntity(world);
setPosition(world, notification, 0, -10);
createSpring(world, notification, springBouncy);

// Drop down from top with bounce
setSpringTarget(world, notification, 0, 2);
```

### Custom Spring Behavior

```typescript
import { createSpring } from 'blecsd';

// Very stiff, heavily damped (no overshoot)
createSpring(world, entity, {
  stiffness: 400,
  damping: 40,
  precision: 0.01,
});

// Loose spring with lots of bounce
createSpring(world, entity, {
  stiffness: 50,
  damping: 3,
  precision: 0.001,
});
```

### Chained Animations

```typescript
import { setSpringTarget, isSpringActive } from 'blecsd';

// Animate in sequence
setSpringTarget(world, entity, 50, 50);

// Check periodically or in update loop
function checkAndContinue() {
  if (!isSpringActive(world, entity)) {
    // First animation complete, start next
    setSpringTarget(world, entity, 100, 100);
  }
}
```

### Following Mouse/Target

```typescript
import { setSpringTarget } from 'blecsd';

// In input handler
function onMouseMove(x: number, y: number) {
  // Entity smoothly follows cursor
  setSpringTarget(world, follower, x, y);
}
```

## Physics Explanation

The spring system uses:

1. **Hooke's Law**: Force proportional to displacement from target
   - `F = -k * x` where `k` is stiffness, `x` is displacement

2. **Damping**: Force opposing velocity
   - `F_damping = -c * v` where `c` is damping coefficient, `v` is velocity

3. **Integration**: Updates velocity and position each frame
   - Velocity changes based on net force
   - Position changes based on velocity

4. **Automatic Stop**: Animation stops when both displacement and speed fall below the precision threshold

Higher stiffness makes the spring pull harder toward the target. Higher damping reduces oscillation. The precision threshold determines when the animation "settles" and becomes inactive.
