# Velocity Components API

ECS components for entity movement with velocity, acceleration, friction, and speed clamping.

## Overview

The velocity module provides two components:
- **Velocity** - Per-entity speed (x/y cells per second) with max speed and friction
- **Acceleration** - Per-entity acceleration (x/y cells per second squared)

A complete movement update applies acceleration to velocity, friction, speed clamping, and then velocity to position, all in a single `updateEntityMovement` call.

## Import

```typescript
import {
  Velocity,
  Acceleration,
  setVelocity,
  setVelocityOptions,
  getVelocity,
  hasVelocity,
  setMaxSpeed,
  setFriction,
  addVelocity,
  getSpeed,
  stopEntity,
  removeVelocity,
  setAcceleration,
  getAcceleration,
  hasAcceleration,
  clearAcceleration,
  removeAcceleration,
  updateEntityMovement,
  applyAccelerationToEntity,
  applyFrictionToEntity,
  clampSpeedForEntity,
  applyVelocityToEntity,
} from 'blecsd';
```

## Velocity Component

### Component Data Layout

```typescript
const Velocity = {
  x:        Float32Array,  // X velocity in cells per second
  y:        Float32Array,  // Y velocity in cells per second
  maxSpeed: Float32Array,  // Maximum speed (0 = unlimited)
  friction: Float32Array,  // Friction factor 0-1 (0 = none)
};
```

### setVelocity

Sets X/Y velocity on an entity. Adds the component if not present.

```typescript
import { setVelocity } from 'blecsd';

setVelocity(world, entity, 5, -2); // Right 5, up 2 cells/sec
```

### setVelocityOptions

Sets velocity with all options.

```typescript
import { setVelocityOptions } from 'blecsd';

setVelocityOptions(world, entity, {
  x: 5,
  y: 0,
  maxSpeed: 10,
  friction: 0.1,
});
```

### getVelocity

Returns velocity state for an entity.

```typescript
import { getVelocity } from 'blecsd';

const vel = getVelocity(world, entity);
if (vel) {
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  console.log(`Moving at ${speed} cells/sec`);
}
```

**Returns:** `VelocityData | undefined`

### hasVelocity

```typescript
import { hasVelocity } from 'blecsd';

if (hasVelocity(world, entity)) {
  // Entity has velocity
}
```

### setMaxSpeed / setFriction

```typescript
import { setMaxSpeed, setFriction } from 'blecsd';

setMaxSpeed(world, entity, 15);   // 0 = unlimited
setFriction(world, entity, 0.05); // 0-1, clamped
```

### addVelocity

Adds to current velocity (impulse).

```typescript
import { addVelocity } from 'blecsd';

addVelocity(world, entity, 0, -10); // Jump impulse
```

### getSpeed

Returns the magnitude of velocity.

```typescript
import { getSpeed } from 'blecsd';

const speed = getSpeed(world, entity); // 0 if no component
```

### stopEntity / removeVelocity

```typescript
import { stopEntity, removeVelocity } from 'blecsd';

stopEntity(world, entity);     // Sets velocity to zero
removeVelocity(world, entity); // Resets all fields to zero
```

## Acceleration Component

### Component Data Layout

```typescript
const Acceleration = {
  x: Float32Array,  // X acceleration in cells/sec^2
  y: Float32Array,  // Y acceleration in cells/sec^2
};
```

### setAcceleration

Sets acceleration on an entity. Adds the component if not present.

```typescript
import { setAcceleration } from 'blecsd';

setAcceleration(world, entity, 0, 20); // Gravity
```

### getAcceleration

```typescript
import { getAcceleration } from 'blecsd';

const accel = getAcceleration(world, entity);
if (accel) {
  console.log(`Accel: (${accel.x}, ${accel.y})`);
}
```

**Returns:** `AccelerationData | undefined`

### hasAcceleration / clearAcceleration / removeAcceleration

```typescript
import { hasAcceleration, clearAcceleration, removeAcceleration } from 'blecsd';

if (hasAcceleration(world, entity)) {
  clearAcceleration(world, entity);  // Set to (0, 0)
  removeAcceleration(world, entity); // Reset all fields
}
```

## Movement Update

### updateEntityMovement

Full movement update for a single entity. Applies: acceleration, friction, speed clamping, then velocity to position.

<!-- blecsd-doccheck:ignore -->
```typescript
import { updateEntityMovement } from 'blecsd';

// In your update loop
updateEntityMovement(world, entity, deltaTime);
```

### Individual Update Steps

For finer control, use the individual functions:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  applyAccelerationToEntity,
  applyFrictionToEntity,
  clampSpeedForEntity,
  applyVelocityToEntity,
} from 'blecsd';

applyAccelerationToEntity(entity, deltaTime);
applyFrictionToEntity(entity, deltaTime);
clampSpeedForEntity(entity);
applyVelocityToEntity(entity, deltaTime);
```

Note: These lower-level functions take only `Entity` (not `World`) and access typed arrays directly.

## Usage Example

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  setVelocity,
  setAcceleration,
  setFriction,
  setMaxSpeed,
  updateEntityMovement,
  getSpeed,
} from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Set initial velocity and physics
setVelocity(world, entity, 10, 0);
setAcceleration(world, entity, 0, 20); // Gravity
setFriction(world, entity, 0.02);
setMaxSpeed(world, entity, 30);

// Each frame
updateEntityMovement(world, entity, deltaTime);
console.log(`Speed: ${getSpeed(world, entity)}`);
```

## Direct Component Access

For high-performance code in systems, access arrays directly:

<!-- blecsd-doccheck:ignore -->
```typescript
import { Velocity, Acceleration } from 'blecsd';

for (const eid of entities) {
  const vx = Velocity.x[eid];
  const vy = Velocity.y[eid];
  const ax = Acceleration.x[eid];
  const ay = Acceleration.y[eid];
}
```

## Types

### VelocityData

```typescript
interface VelocityData {
  readonly x: number;
  readonly y: number;
  readonly maxSpeed: number;
  readonly friction: number;
}
```

### VelocityOptions

```typescript
interface VelocityOptions {
  x?: number;
  y?: number;
  maxSpeed?: number;
  friction?: number;
}
```

### AccelerationData

```typescript
interface AccelerationData {
  readonly x: number;
  readonly y: number;
}
```
