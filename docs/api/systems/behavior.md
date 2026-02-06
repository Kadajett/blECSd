# Behavior System API

ECS system for processing AI behaviors each frame, including patrol, chase, flee, and custom behaviors.

## Overview

The behavior system handles:
- Patrol movement along waypoints
- Chase behavior toward a target entity
- Flee behavior away from a target entity
- Custom behavior callbacks
- Wait timers between behavior actions
- Pluggable position resolution and movement application

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import { createBehaviorSystem } from 'blecsd';

const behaviorSystem = createBehaviorSystem(
  { getDelta: () => 1 / 60 },
  (world) => behaviorEntities,
);

// In your update loop
behaviorSystem(world);
```

## Types

### PositionResolver

Function for getting entity positions. Allows the behavior system to work with any position storage.

```typescript
type PositionResolver = (
  world: World,
  eid: Entity,
) => { x: number; y: number } | undefined;
```

### MovementApplier

Function for applying computed movement. Allows the behavior system to work with any movement system.

```typescript
type MovementApplier = (
  world: World,
  eid: Entity,
  dx: number,
  dy: number,
  delta: number,
) => void;
```

### BehaviorSystemConfig

Configuration for the behavior system.

```typescript
interface BehaviorSystemConfig {
  /** Function to resolve entity positions (default: uses Position component) */
  getPosition?: PositionResolver;
  /** Function to apply movement (default: directly modifies Position) */
  applyMovement?: MovementApplier;
  /** Function to get delta time */
  getDelta: () => number;
}
```

## Functions

### createBehaviorSystem

Creates a behavior system that processes all entities with Behavior components. The system computes movement directions for patrol, chase, and flee behaviors and applies them via the configured movement applier.

```typescript
function createBehaviorSystem(
  config: BehaviorSystemConfig,
  entities: (world: World) => readonly Entity[],
): System
```

**Parameters:**
- `config` - System configuration (getDelta is required, others have defaults)
- `entities` - Function returning entity IDs to process each frame

**Returns:** A `System` function that processes behaviors when called with a world.

```typescript
import { createBehaviorSystem } from 'blecsd';

// Basic setup with default position/movement handling
const behaviorSystem = createBehaviorSystem(
  { getDelta: () => 1 / 60 },
  (world) => myBehaviorEntities,
);

// Custom position resolver and movement applier
const customBehaviorSystem = createBehaviorSystem(
  {
    getDelta: () => deltaTime,
    getPosition: (world, eid) => {
      return { x: myPositions.x[eid], y: myPositions.y[eid] };
    },
    applyMovement: (world, eid, dx, dy, delta) => {
      myPositions.x[eid] += dx * delta;
      myPositions.y[eid] += dy * delta;
    },
  },
  (world) => myBehaviorEntities,
);
```

## Behavior Types

The system processes entities based on their `BehaviorType`:

| Type | Description |
|------|-------------|
| `Idle` | No movement, entity stands still |
| `Patrol` | Moves between waypoints |
| `Chase` | Moves toward a target entity |
| `Flee` | Moves away from a target entity |
| `Custom` | Executes a registered custom behavior callback |

## Usage Example

Complete example showing an enemy with patrol and chase behaviors:

```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  createBehaviorSystem,
  setBehavior,
  BehaviorType,
  setPosition,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Track behavior entities
const behaviorEntities: Entity[] = [];

// Create the behavior system
const behaviorSystem = createBehaviorSystem(
  { getDelta: () => 1 / 60 },
  () => behaviorEntities,
);

scheduler.registerSystem(LoopPhase.UPDATE, behaviorSystem);

// Create an enemy that patrols
const enemy = addEntity(world);
setPosition(world, enemy, 10, 5);
setBehavior(world, enemy, {
  behaviorType: BehaviorType.Patrol,
  speed: 2,
});
behaviorEntities.push(enemy);

// Create a player
const player = addEntity(world);
setPosition(world, player, 50, 10);

// Switch enemy to chase when player is nearby
setBehavior(world, enemy, {
  behaviorType: BehaviorType.Chase,
  targetEntity: player,
  speed: 3,
});

// Run in game loop
scheduler.run(world, 1 / 60);
```
