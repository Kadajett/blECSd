# State Machine System

The state machine system updates the `stateAge` for all entities with a StateMachine component. This enables time-based state transitions and animations by tracking how long an entity has been in its current state.

## Import

```typescript
import {
  stateMachineSystem,
  createStateMachineSystem,
  registerStateMachineSystem,
  queryStateMachine,
  hasStateMachineSystem,
  getStateAgeStore,
  updateStateAges,
  resetStateAge,
  getSystemStateAge,
} from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  registerStateMachineSystem,
  attachStateMachine,
  getSystemStateAge,
} from 'blecsd';

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
// Register with scheduler (convenience function)
registerStateMachineSystem(scheduler, priority?);

// Or create and register manually
const system = createStateMachineSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system);

// Or use the system directly
stateMachineSystem(world);
```

### Query Functions

```typescript
// Query all entities with StateMachine
const stateful = queryStateMachine(world);
// Returns: number[] (entity IDs)

// Check if entity has StateMachine component
if (hasStateMachineSystem(world, eid)) {
  // Entity has state machine
}
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

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  registerStateMachineSystem,
  attachStateMachine,
  sendEvent,
  getSystemStateAge,
  getCurrentState,
} from 'blecsd';

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
function updateEnemyAI(enemy: Entity) {
  const state = getCurrentState(world, enemy);
  const age = getSystemStateAge(enemy);

  switch (state) {
    case 'idle':
      if (canSeePlayer(enemy)) {
        sendEvent(world, enemy, 'seePlayer');
      } else if (age > 2.0) {
        sendEvent(world, enemy, 'timeout');
      }
      break;

    case 'patrol':
      moveAlongPatrolPath(enemy);
      if (canSeePlayer(enemy)) {
        sendEvent(world, enemy, 'seePlayer');
      }
      break;

    case 'chase':
      moveTowardPlayer(enemy);
      if (isInAttackRange(enemy)) {
        sendEvent(world, enemy, 'inRange');
      } else if (!canSeePlayer(enemy) && age > 3.0) {
        sendEvent(world, enemy, 'losePlayer');
      }
      if (isLowHealth(enemy)) {
        sendEvent(world, enemy, 'lowHealth');
      }
      break;

    case 'attack':
      if (age > 0.5) { // Attack cooldown
        performAttack(enemy);
        resetStateAge(enemy); // Reset for next attack
      }
      if (!isInAttackRange(enemy)) {
        sendEvent(world, enemy, 'outOfRange');
      }
      break;

    case 'flee':
      moveAwayFromPlayer(enemy);
      if (isSafeDistance(enemy)) {
        sendEvent(world, enemy, 'safe');
      }
      break;
  }
}
```

## Example: Animation State

```typescript
// Link animation to state machine
const player = addEntity(world);
attachStateMachine(world, player, {
  states: ['idle', 'walk', 'run', 'jump', 'fall'],
  initial: 'idle',
});
attachAnimation(world, player);

// Update animation based on state age
function updatePlayerAnimation(player: Entity) {
  const state = getCurrentState(world, player);
  const age = getSystemStateAge(player);

  switch (state) {
    case 'idle':
      // Blend to breathing animation after standing still
      if (age > 2.0) {
        setAnimationBlend(player, 'idle', 'breathe', (age - 2.0) / 1.0);
      } else {
        setAnimation(player, 'idle');
      }
      break;

    case 'walk':
      setAnimation(player, 'walk');
      break;

    case 'jump':
      // Jump has phases based on time
      if (age < 0.2) {
        setAnimation(player, 'jump_start');
      } else {
        setAnimation(player, 'jump_air');
      }
      break;
  }
}
```

## Example: UI Button States

```typescript
// Button with hover/press states
const button = addEntity(world);
attachStateMachine(world, button, {
  states: ['normal', 'hover', 'pressed', 'disabled'],
  initial: 'normal',
});

// Visual feedback based on state age
function renderButton(button: Entity) {
  const state = getCurrentState(world, button);
  const age = getSystemStateAge(button);

  switch (state) {
    case 'hover':
      // Fade in hover effect
      const hoverAlpha = Math.min(1.0, age / 0.2);
      renderWithHighlight(button, hoverAlpha);
      break;

    case 'pressed':
      // Quick press animation
      const pressScale = 1.0 - Math.sin(age * Math.PI * 2) * 0.1;
      renderScaled(button, pressScale);
      break;

    default:
      renderNormal(button);
  }
}
```

## Example: Combo System

```typescript
// Fighting game combo tracking
const player = addEntity(world);
attachStateMachine(world, player, {
  states: ['neutral', 'attack1', 'attack2', 'attack3', 'recovery'],
  initial: 'neutral',
});

function handleAttackInput(player: Entity) {
  const state = getCurrentState(world, player);
  const age = getSystemStateAge(player);

  // Combo window: can chain within 0.3-0.6 seconds
  const inComboWindow = age > 0.3 && age < 0.6;

  switch (state) {
    case 'neutral':
      sendEvent(world, player, 'attack');
      break;

    case 'attack1':
      if (inComboWindow) {
        sendEvent(world, player, 'attack'); // Goes to attack2
      }
      break;

    case 'attack2':
      if (inComboWindow) {
        sendEvent(world, player, 'attack'); // Goes to attack3
      }
      break;
  }
}

// Auto-transition to recovery after attack finishes
function updateComboState(player: Entity) {
  const state = getCurrentState(world, player);
  const age = getSystemStateAge(player);

  if (state.startsWith('attack') && age > 0.6) {
    sendEvent(world, player, 'finish');
  }

  if (state === 'recovery' && age > 0.3) {
    sendEvent(world, player, 'recover');
  }
}
```

## Performance Considerations

- Uses SoA layout for cache-efficient iteration
- Only increments a single float per entity per frame
- Very lightweight system, suitable for many entities
- Default capacity: 10,000 entities

## Related

- [Animation System](./animationSystem.md) - Sprite animations
- [State Machine Component](../components/stateMachine.md) - State machine data
- [Scheduler](../scheduler.md) - System execution
