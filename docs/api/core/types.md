# Core Types API

Core type definitions for blECSd. Defines the fundamental types used throughout the library.

> **Tip:** For standard applications, [`createApp()`](./gameLoop.md#quick-start-with-createapp) handles phase management automatically.

## Quick Start

```typescript
import type { Entity, World, System, Unsubscribe } from 'blecsd/core';
import { LoopPhase } from 'blecsd/core';
```

## Types

### Entity

Branded entity type from bitecs. Prevents accidentally passing raw numbers where entities are expected.

```typescript
type Entity = EntityId;
```

```typescript
import type { Entity } from 'blecsd/core';

function moveEntity(eid: Entity, x: number, y: number): void {
  // eid is guaranteed to be a valid entity reference
}
```

### World

The ECS World type from bitecs. Contains all entity and component data.

```typescript
type World = BitEcsWorld;
```

### System

A System is a function that processes entities in the world. Systems should be pure functions that take a world and return it.

```typescript
type System = (world: World) => World;
```

```typescript
import type { System } from 'blecsd/core';

const movementSystem: System = (world) => {
  // Process entities with Position and Velocity
  return world;
};
```

### Unsubscribe

Function to unsubscribe from events or callbacks.

```typescript
type Unsubscribe = () => void;
```

### LoopPhase

Loop phases for the game loop. INPUT is always first and cannot be reordered.

```typescript
enum LoopPhase {
  INPUT = 0,        // Process all pending input - ALWAYS FIRST
  EARLY_UPDATE = 1, // Pre-update logic
  UPDATE = 2,       // Main game logic
  LATE_UPDATE = 3,  // Post-update logic
  ANIMATION = 4,    // Physics and animation calculations
  LAYOUT = 5,       // UI layout calculation
  RENDER = 6,       // Render to screen buffer
  POST_RENDER = 7,  // Output to terminal, cleanup
}
```

```typescript
import { LoopPhase, createScheduler, createWorld } from 'blecsd/core';

const world = createWorld();
const scheduler = createScheduler();
const gameLogicSystem = (w: typeof world) => w;
const renderSystem = (w: typeof world) => w;

scheduler.registerSystem(LoopPhase.UPDATE, gameLogicSystem);
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
```

## Usage Example

```typescript
import type { Entity, World, System, Unsubscribe } from 'blecsd/core';
import { createWorld, addEntity, createScheduler, LoopPhase } from 'blecsd/core';

// Define a system
const gravitySystem: System = (world: World): World => {
  // Apply gravity to all entities with Velocity
  return world;
};

// Use Entity type for function parameters
function spawnEnemy(world: World, _x: number, _y: number): Entity {
  const eid = addEntity(world);
  // ... setup components ...
  return eid;
}

// Use Unsubscribe for cleanup
function setupEventHandlers(): Unsubscribe {
  const handler = () => { /* ... */ };
  return () => { /* cleanup handler */ };
}

const world = createWorld();
const scheduler = createScheduler();
const aiSystem: System = (w) => w;
const cleanupSystem: System = (w) => w;

// Register systems at appropriate phases
scheduler.registerSystem(LoopPhase.ANIMATION, gravitySystem);
scheduler.registerSystem(LoopPhase.UPDATE, aiSystem);
scheduler.registerSystem(LoopPhase.LATE_UPDATE, cleanupSystem);

// Use the functions to avoid unused variable errors
spawnEnemy(world, 0, 0);
setupEventHandlers();
```
