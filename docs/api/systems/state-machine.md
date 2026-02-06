# State Machine System API

ECS system for tracking state age on entities with finite state machines.

## Overview

The state machine system handles:
- Incrementing `stateAge` for all entities with a StateMachine component each frame
- Enabling time-based state transitions and animations
- Providing direct access to state age for game logic queries

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createScheduler,
  registerStateMachineSystem,
  LoopPhase,
} from 'blecsd';

const scheduler = createScheduler();
registerStateMachineSystem(scheduler);

// In game loop
scheduler.run(world, deltaTime);
```

## Functions

### stateMachineSystem

The state machine system function. Reads delta time from the scheduler and updates `stateAge` for all entities with a StateMachine component.

```typescript
const stateMachineSystem: System
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { stateMachineSystem, LoopPhase } from 'blecsd';

scheduler.registerSystem(LoopPhase.UPDATE, stateMachineSystem);
```

### createStateMachineSystem

Factory function that returns the stateMachineSystem.

```typescript
function createStateMachineSystem(): System
```

```typescript
import { createStateMachineSystem, createScheduler, LoopPhase } from 'blecsd';

const scheduler = createScheduler();
const system = createStateMachineSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system);
```

### registerStateMachineSystem

Convenience function that registers the state machine system in the UPDATE phase.

```typescript
function registerStateMachineSystem(scheduler: Scheduler, priority?: number): void
```

**Parameters:**
- `scheduler` - The scheduler to register with
- `priority` - Optional priority within the UPDATE phase (default: 0)

```typescript
import { createScheduler, registerStateMachineSystem } from 'blecsd';

const scheduler = createScheduler();
registerStateMachineSystem(scheduler);
```

### queryStateMachine

Query all entities with the StateMachine component.

```typescript
function queryStateMachine(world: World): number[]
```

### hasStateMachineSystem

Checks if an entity has the StateMachine component via the system store.

```typescript
function hasStateMachineSystem(world: World, eid: number): boolean
```

### getSystemStateAge

Gets the state age for an entity from the system store.

```typescript
function getSystemStateAge(eid: number): number
```

**Returns:** Time in seconds the entity has been in its current state.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getSystemStateAge } from 'blecsd';

const age = getSystemStateAge(entityId);
if (age > 5.0) {
  // Entity has been in this state for over 5 seconds
}
```

### resetStateAge

Resets the state age for an entity to zero. Typically called when a state transition occurs.

```typescript
function resetStateAge(eid: number): void
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { resetStateAge } from 'blecsd';

// After a manual state transition
resetStateAge(entityId);
```

### updateStateAges

Manually update state age for specific entities. Useful for testing or custom update loops.

```typescript
function updateStateAges(entities: readonly number[], deltaTime: number): void
```

```typescript
import { updateStateAges, queryStateMachine } from 'blecsd';

const entities = queryStateMachine(world);
updateStateAges(entities, 0.016); // ~60fps frame
```

### getStateAgeStore

Gets the raw state age typed array for direct access. Primarily for testing.

```typescript
function getStateAgeStore(): Float32Array
```

## Usage Example

Complete state machine setup with time-based transitions:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  registerStateMachineSystem,
  getSystemStateAge,
  resetStateAge,
  queryStateMachine,
  defineStateMachine,
  setStateMachine,
  sendEvent,
  getCurrentStateName,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Register state machine system in UPDATE phase
registerStateMachineSystem(scheduler);

// Define a state machine
const enemyFSM = defineStateMachine({
  initialState: 'idle',
  states: ['idle', 'patrol', 'chase', 'attack'],
  transitions: [
    { from: 'idle', to: 'patrol', event: 'startPatrol' },
    { from: 'patrol', to: 'chase', event: 'spotPlayer' },
    { from: 'chase', to: 'attack', event: 'inRange' },
    { from: 'attack', to: 'chase', event: 'outOfRange' },
    { from: 'chase', to: 'patrol', event: 'lostPlayer' },
  ],
});

// Create an enemy entity
const enemy = addEntity(world);
setStateMachine(world, enemy, enemyFSM);

// Run game loop
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  scheduler.run(world, dt);

  // Check state age for time-based transitions
  const age = getSystemStateAge(enemy);
  const currentState = getCurrentStateName(world, enemy);

  if (currentState === 'idle' && age > 3.0) {
    sendEvent(world, enemy, 'startPatrol');
    resetStateAge(enemy);
  }

  if (currentState === 'attack' && age > 1.0) {
    // Attack cooldown expired
    sendEvent(world, enemy, 'outOfRange');
  }
}, 16);
```
