# Behavior Components API

ECS component for AI behavior control with idle, patrol, chase, flee, and custom behavior modes.

## Overview

The Behavior module provides a lightweight behavior system for game entities. Each entity gets a behavior type (idle, patrol, chase, flee, custom) and the module provides direction-computation helpers that return movement vectors without directly modifying position. Side stores hold patrol routes and custom callbacks.

## Import

```typescript
import {
  Behavior,
  BehaviorType,
  BehaviorState,
  setBehavior,
  getBehavior,
  hasBehavior,
  removeBehavior,
  setIdle,
  setPatrol,
  setChase,
  setFlee,
  setCustomBehavior,
  getBehaviorType,
  getBehaviorState,
  getBehaviorTarget,
  setBehaviorTarget,
  setBehaviorSpeed,
  setDetectionRange,
  isBehaviorActive,
  isBehaviorWaiting,
  isBehaviorCompleted,
  getPatrolRoute,
  getCurrentPatrolPoint,
  computePatrolDirection,
  computeChaseDirection,
  computeFleeDirection,
  executeCustomBehavior,
  updateBehaviorTimer,
} from 'blecsd/components';
```

## Component Data Layout

```typescript
const Behavior = {
  behaviorType:   Uint8Array,    // Current behavior type
  state:          Uint8Array,    // Current behavior state
  targetEntity:   Uint32Array,   // Chase/flee target (0 = none)
  waitTimer:      Float32Array,  // Remaining wait time in seconds
  patrolIndex:    Uint16Array,   // Current patrol waypoint index
  patrolCount:    Uint16Array,   // Total patrol waypoints
  speed:          Float32Array,  // Movement speed
  detectionRange: Float32Array,  // Detection range for chase/flee
  fleeRange:      Float32Array,  // Distance to flee before stopping
};
```

## Constants

### BehaviorType

```typescript
import { BehaviorType } from 'blecsd/components';

BehaviorType.Idle    // 0
BehaviorType.Patrol  // 1
BehaviorType.Chase   // 2
BehaviorType.Flee    // 3
BehaviorType.Custom  // 4
```

### BehaviorState

```typescript
import { BehaviorState } from 'blecsd/components';

BehaviorState.Inactive  // 0
BehaviorState.Active    // 1
BehaviorState.Waiting   // 2
BehaviorState.Completed // 3
```

## Core Functions

### setBehavior

Sets behavior on an entity. Adds the component if not present.

```typescript
import { setBehavior, BehaviorType } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const player = addEntity(world);

setBehavior(world, entity, {
  type: BehaviorType.Chase,
  speed: 3,
  targetEntity: player,
  detectionRange: 15,
  fleeRange: 20,
});
```

**Options:**
- `type` - Behavior type (default: `Idle`)
- `speed` - Movement speed (default: `1`)
- `targetEntity` - Target for chase/flee (default: `0`)
- `detectionRange` - Detection range (default: `10`)
- `fleeRange` - Flee distance (default: `15`)

### getBehavior

Returns a snapshot of the entity's behavior data.

```typescript
import { getBehavior } from 'blecsd/components';

const ai = getBehavior(world, entity);
if (ai) {
  console.log(`Type: ${ai.type}, State: ${ai.state}, Speed: ${ai.speed}`);
}
```

**Returns:** `BehaviorData | undefined`

### hasBehavior / removeBehavior

```typescript
import { hasBehavior, removeBehavior } from 'blecsd/components';

if (hasBehavior(world, entity)) {
  removeBehavior(world, entity); // Also cleans up patrol routes and custom callbacks
}
```

## Behavior Type Setters

### setIdle / setPatrol / setChase / setFlee / setCustomBehavior

```typescript
import { setPatrol, setChase, setFlee, setCustomBehavior } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const guard = addEntity(world);
const player = addEntity(world);
const enemy = addEntity(world);
const civilian = addEntity(world);
const boss = addEntity(world);

// Patrol with waypoints
setPatrol(world, guard, [
  { x: 10, y: 5 },
  { x: 20, y: 5 },
  { x: 20, y: 15 },
], { loop: true, waitTime: 2 });

// Chase a target
setChase(world, enemy, player);

// Flee from a target
setFlee(world, civilian, enemy);

// Custom behavior callback
setCustomBehavior(world, boss, (world, eid, delta) => {
  // Custom AI logic
});
```

## Query Helpers

```typescript
import {
  getBehaviorType,
  getBehaviorState,
  getBehaviorTarget,
  isBehaviorActive,
  isBehaviorWaiting,
  isBehaviorCompleted,
  getPatrolRoute,
  getCurrentPatrolPoint,
} from 'blecsd/components';

const type = getBehaviorType(world, entity);    // BehaviorTypeValue | undefined
const state = getBehaviorState(world, entity);  // BehaviorStateValue | undefined
const target = getBehaviorTarget(world, entity); // number (0 if none)
const active = isBehaviorActive(world, entity);  // boolean
const route = getPatrolRoute(world, entity);     // PatrolRoute | undefined
const point = getCurrentPatrolPoint(world, entity); // Point2D | undefined
```

## Direction Computation

These functions return movement direction vectors without modifying entity position.

### computePatrolDirection

```typescript
import { computePatrolDirection } from 'blecsd/components';

const currentX = 0, currentY = 0;
const dir = computePatrolDirection(world, entity, currentX, currentY, deltaTime);
if (dir) {
  // Apply dir.dx, dir.dy to entity position
}
```

### computeChaseDirection / computeFleeDirection

```typescript
import { computeChaseDirection, computeFleeDirection } from 'blecsd/components';

const myX = 0, myY = 0, targetX = 10, targetY = 10;
const chase = computeChaseDirection(world, entity, myX, myY, targetX, targetY);
const flee = computeFleeDirection(world, entity, myX, myY, targetX, targetY);
```

**Returns:** `BehaviorDirection | undefined` (with `dx` and `dy` fields)

### executeCustomBehavior / updateBehaviorTimer

```typescript
import { executeCustomBehavior, updateBehaviorTimer } from 'blecsd/components';

// In your update loop
updateBehaviorTimer(world, entity, deltaTime);
executeCustomBehavior(world, entity, deltaTime);
```

## Usage Example

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setBehavior, BehaviorType, setPatrol, computePatrolDirection } from 'blecsd/components';

const world = createWorld();
const guard = addEntity(world);

// Set up patrol behavior
setBehavior(world, guard, { type: BehaviorType.Patrol, speed: 2 });
setPatrol(world, guard, [
  { x: 5, y: 5 },
  { x: 15, y: 5 },
  { x: 15, y: 10 },
], { loop: true, waitTime: 1.0 });

// In update loop
let currentX = 5, currentY = 5;
const dir = computePatrolDirection(world, guard, currentX, currentY, deltaTime);
if (dir) {
  currentX += dir.dx * deltaTime;
  currentY += dir.dy * deltaTime;
}
```

## Types

### BehaviorData

```typescript
interface BehaviorData {
  readonly type: BehaviorTypeValue;
  readonly state: BehaviorStateValue;
  readonly targetEntity: number;
  readonly waitTimer: number;
  readonly patrolIndex: number;
  readonly patrolCount: number;
  readonly speed: number;
  readonly detectionRange: number;
  readonly fleeRange: number;
}
```

### Point2D

```typescript
interface Point2D {
  readonly x: number;
  readonly y: number;
}
```

### PatrolRoute

```typescript
interface PatrolRoute {
  readonly points: readonly Point2D[];
  readonly loop: boolean;
  readonly waitTime: number;
}
```

### BehaviorDirection

```typescript
interface BehaviorDirection {
  readonly dx: number;
  readonly dy: number;
}
```

## Namespace API

The `behavior` namespace groups all related functions into a single import:

```typescript
import { behavior } from 'blecsd/components';

// Available methods: get,has,set,remove,getType,getState,getTarget,setTarget, ...
```

This is equivalent to importing individual functions but provides better discoverability. See the [namespace pattern](../index.md#namespace-pattern) for details.
