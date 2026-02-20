# State Machine System

The state machine system updates the `stateAge` for all entities with a StateMachine component. This enables time-based state transitions and animations by tracking how long an entity has been in its current state.

## Import

```typescript
import {
  stateMachineSystem,
  createStateMachineSystem,
  registerStateMachineSystem,
  queryStateMachine,
  getStateAgeStore,
  updateStateAges,
  resetStateAge,
  getSystemStateAge,
} from 'blecsd/systems';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { registerStateMachineSystem, getSystemStateAge } from 'blecsd/systems';
import { attachStateMachine } from 'blecsd/components';

const world = createWorld();
const scheduler = createScheduler();

// Register the state machine system
registerStateMachineSystem(scheduler);

// Create an entity with state machine
const enemy = addEntity(world);
attachStateMachine(world, enemy, {
  states: ['idle', 'patrol', 'chase', 'attack'],
  initial: 'idle',
});

// Check how long in current state
function update() {
  const age = getSystemStateAge(enemy);
  if (age > 3.0) {
    // Been idle for 3 seconds, start patrol
    sendEvent(world, enemy, 'startPatrol');
  }
}
```

## Recommended Phase

Register in the **UPDATE** phase:

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';
import { stateMachineSystem } from 'blecsd/systems';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.UPDATE, stateMachineSystem);
```

## System Behavior

Each frame, the state machine system:

1. Reads delta time from the scheduler
2. Queries all entities with StateMachine component
3. For each entity, adds delta time to `stateAge`

The `stateAge` is automatically reset to 0 when a state transition occurs (via `sendEvent`).

## Functions

### System Registration

```typescript
import { createWorld } from 'blecsd/core';
import { createScheduler, LoopPhase } from 'blecsd/core';
import { stateMachineSystem, createStateMachineSystem, registerStateMachineSystem } from 'blecsd/systems';

const world = createWorld();
const scheduler = createScheduler();

// Register with scheduler (convenience function)
registerStateMachineSystem(scheduler);

// Or create and register manually
const system = createStateMachineSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system);

// Or use the system directly
stateMachineSystem(world);
```

### Query Functions

```typescript
import { createWorld } from 'blecsd/core';
import { queryStateMachine } from 'blecsd/systems';

const world = createWorld();

// Query all entities with StateMachine
const stateful = queryStateMachine(world);
// Returns: number[] (entity IDs)
console.log('stateful entities:', stateful.length);
```

### State Age Functions

```typescript
// Get state age for an entity
const age = getSystemStateAge(eid);
// Returns: number (seconds in current state)

// Reset state age manually
resetStateAge(eid);

// Update specific entities outside the system
const entities = queryStateMachine(world);
updateStateAges(entities, 0.016);

// Get the raw state age store (for advanced use)
const ageStore = getStateAgeStore();
// Returns: Float32Array
```

## State Machine Store

The state machine system uses a Structure of Arrays (SoA) pattern:

| Field | Type | Description |
|-------|------|-------------|
| `machineId` | `Uint32Array` | Index into machine definitions |
| `currentState` | `Uint16Array` | Current state index |
| `previousState` | `Uint16Array` | Previous state index |
| `stateAge` | `Float32Array` | Time in current state (seconds) |

## Example: Enemy AI

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getState, attachStateMachine, sendEvent } from 'blecsd/components';
import { registerStateMachineSystem, getSystemStateAge, resetStateAge } from 'blecsd/systems';
import { createScheduler } from 'blecsd/core';

const world = createWorld();
const scheduler = createScheduler();
registerStateMachineSystem(scheduler);

// Game-specific helper stubs (implement in your game)
const canSeePlayer = (_eid: number): boolean => false;
const moveAlongPatrolPath = (_eid: number): void => {};
const moveTowardPlayer = (_eid: number): void => {};
const isInAttackRange = (_eid: number): boolean => false;
const isLowHealth = (_eid: number): boolean => false;
const performAttack = (_eid: number): void => {};
const moveAwayFromPlayer = (_eid: number): void => {};
const isSafeDistance = (_eid: number): boolean => false;

// Define enemy state machine
const enemyMachine = {
  states: ['idle', 'patrol', 'chase', 'attack', 'flee'],
  initial: 'idle',
  transitions: {
    idle: { seePlayer: 'chase', timeout: 'patrol' },
    patrol: { seePlayer: 'chase', losePlayer: 'idle' },
    chase: { inRange: 'attack', losePlayer: 'patrol', lowHealth: 'flee' },
    attack: { outOfRange: 'chase', lowHealth: 'flee' },
    flee: { safe: 'idle' },
  },
};

// Create enemy
const enemy = addEntity(world);
attachStateMachine(world, enemy, enemyMachine);

// AI update function
const updateEnemyAI = (eid: number): void => {
  const state = getState(world, eid);
  const age = getSystemStateAge(eid);

  switch (state) {
    case 'idle':
      if (canSeePlayer(eid)) {
        sendEvent(world, eid, 'seePlayer');
      } else if (age > 2.0) {
        sendEvent(world, eid, 'timeout');
      }
      break;
    case 'patrol':
      moveAlongPatrolPath(eid);
      if (canSeePlayer(eid)) {
        sendEvent(world, eid, 'seePlayer');
      }
      break;
    case 'chase':
      moveTowardPlayer(eid);
      if (isInAttackRange(eid)) {
        sendEvent(world, eid, 'inRange');
      } else if (!canSeePlayer(eid) && age > 3.0) {
        sendEvent(world, eid, 'losePlayer');
      }
      if (isLowHealth(eid)) {
        sendEvent(world, eid, 'lowHealth');
      }
      break;
    case 'attack':
      if (age > 0.5) {
        performAttack(eid);
        resetStateAge(eid);
      }
      if (!isInAttackRange(eid)) {
        sendEvent(world, eid, 'outOfRange');
      }
      break;
    case 'flee':
      moveAwayFromPlayer(eid);
      if (isSafeDistance(eid)) {
        sendEvent(world, eid, 'safe');
      }
      break;
  }
};

updateEnemyAI(enemy);
```

## Example: Animation State

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getState, attachStateMachine } from 'blecsd/components';
import { getSystemStateAge } from 'blecsd/systems';

const world = createWorld();

// Animation helper stubs (integrate with your animation system)
const setAnimation = (_eid: number, _name: string): void => {};
const setAnimationBlend = (_eid: number, _a: string, _b: string, _t: number): void => {};

// Link animation to state machine
const player = addEntity(world);
attachStateMachine(world, player, {
  states: ['idle', 'walk', 'run', 'jump', 'fall'],
  initial: 'idle',
});

// Update animation based on state age
const updatePlayerAnimation = (eid: number): void => {
  const state = getState(world, eid);
  const age = getSystemStateAge(eid);

  switch (state) {
    case 'idle':
      if (age > 2.0) {
        setAnimationBlend(eid, 'idle', 'breathe', (age - 2.0) / 1.0);
      } else {
        setAnimation(eid, 'idle');
      }
      break;
    case 'walk':
      setAnimation(eid, 'walk');
      break;
    case 'jump':
      if (age < 0.2) {
        setAnimation(eid, 'jump_start');
      } else {
        setAnimation(eid, 'jump_air');
      }
      break;
  }
};

updatePlayerAnimation(player);
```

## Example: UI Button States

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getState, attachStateMachine } from 'blecsd/components';
import { getSystemStateAge } from 'blecsd/systems';

const world = createWorld();

// Render helper stubs (implement in your render system)
const renderWithHighlight = (_eid: number, _alpha: number): void => {};
const renderScaled = (_eid: number, _scale: number): void => {};
const renderNormal = (_eid: number): void => {};

// Button with hover/press states
const button = addEntity(world);
attachStateMachine(world, button, {
  states: ['normal', 'hover', 'pressed', 'disabled'],
  initial: 'normal',
});

// Visual feedback based on state age
const renderButton = (eid: number): void => {
  const state = getState(world, eid);
  const age = getSystemStateAge(eid);

  switch (state) {
    case 'hover': {
      // Fade in hover effect
      const hoverAlpha = Math.min(1.0, age / 0.2);
      renderWithHighlight(eid, hoverAlpha);
      break;
    }
    case 'pressed': {
      // Quick press animation
      const pressScale = 1.0 - Math.sin(age * Math.PI * 2) * 0.1;
      renderScaled(eid, pressScale);
      break;
    }
    default:
      renderNormal(eid);
  }
};

renderButton(button);
```

## Example: Combo System

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getState, attachStateMachine, sendEvent } from 'blecsd/components';
import { getSystemStateAge } from 'blecsd/systems';

const world = createWorld();

// Fighting game combo tracking
const player = addEntity(world);
attachStateMachine(world, player, {
  states: ['neutral', 'attack1', 'attack2', 'attack3', 'recovery'],
  initial: 'neutral',
});

const handleAttackInput = (eid: number): void => {
  const state = getState(world, eid);
  const age = getSystemStateAge(eid);

  // Combo window: can chain within 0.3-0.6 seconds
  const inComboWindow = age > 0.3 && age < 0.6;

  switch (state) {
    case 'neutral':
      sendEvent(world, eid, 'attack');
      break;
    case 'attack1':
      if (inComboWindow) {
        sendEvent(world, eid, 'attack'); // Goes to attack2
      }
      break;
    case 'attack2':
      if (inComboWindow) {
        sendEvent(world, eid, 'attack'); // Goes to attack3
      }
      break;
  }
};

// Auto-transition to recovery after attack finishes
const updateComboState = (eid: number): void => {
  const state = getState(world, eid);
  const age = getSystemStateAge(eid);

  if (state.startsWith('attack') && age > 0.6) {
    sendEvent(world, eid, 'finish');
  }

  if (state === 'recovery' && age > 0.3) {
    sendEvent(world, eid, 'recover');
  }
};

handleAttackInput(player);
updateComboState(player);
```

## Performance Considerations

- Uses SoA layout for cache-efficient iteration
- Only increments a single float per entity per frame
- Very lightweight system, suitable for many entities
- Default capacity: 10,000 entities

## Related

- [Animation System](./animationSystem.md) - Sprite animations
- [State Machine Component](../components/state-machine.md) - State machine data
- [Scheduler](../core/scheduler.md) - System execution
