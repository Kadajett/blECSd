# Core Types API

Core type definitions for blECSd. Defines the fundamental types used throughout the library.

## Quick Start

```typescript
import type { Entity, World, System, Unsubscribe } from 'blecsd';
import { LoopPhase } from 'blecsd';
```

## Types

### Entity

Branded entity type from bitecs. Prevents accidentally passing raw numbers where entities are expected.

```typescript
type Entity = EntityId;
```

```typescript
import type { Entity } from 'blecsd';

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
import type { System } from 'blecsd';

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
  PHYSICS = 4,      // Physics calculations
  LAYOUT = 5,       // UI layout calculation
  RENDER = 6,       // Render to screen buffer
  POST_RENDER = 7,  // Output to terminal, cleanup
}
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { LoopPhase } from 'blecsd';

loop.registerSystem(LoopPhase.UPDATE, gameLogicSystem);
loop.registerSystem(LoopPhase.RENDER, renderSystem);
loop.registerInputSystem(inputSystem); // Always LoopPhase.INPUT
```

## Usage Example

<!-- blecsd-doccheck:ignore -->
```typescript
import type { Entity, World, System, Unsubscribe } from 'blecsd';
import { LoopPhase, createWorld, addEntity } from 'blecsd';

// Define a system
const gravitySystem: System = (world: World): World => {
  // Apply gravity to all entities with Velocity
  return world;
};

// Use Entity type for function parameters
function spawnEnemy(world: World, x: number, y: number): Entity {
  const eid = addEntity(world);
  // ... setup components ...
  return eid;
}

// Use Unsubscribe for cleanup
function setupEventHandlers(): Unsubscribe {
  const handler = () => { /* ... */ };
  eventBus.on('event', handler);
  return () => eventBus.off('event', handler);
}

// Register systems at appropriate phases
loop.registerSystem(LoopPhase.PHYSICS, gravitySystem);
loop.registerSystem(LoopPhase.UPDATE, aiSystem);
loop.registerSystem(LoopPhase.LATE_UPDATE, cleanupSystem);
```
