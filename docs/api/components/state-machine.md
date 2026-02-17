# State Machine Components API

ECS component for finite state machines with typed states, events, and transition tracking.

## Overview

The StateMachine module attaches a finite state machine to an entity. State machine definitions are registered in a global store, and each entity tracks its current/previous state index and time spent in the current state. Transitions are triggered by sending named events.

## Import

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  StateMachineStore,
  attachStateMachine,
  detachStateMachine,
  getState,
  getPreviousState,
  sendEvent,
  canSendEvent,
  getStateAge,
  isInState,
  updateStateAge,
  hasStateMachine,
} from 'blecsd';
```

## Component Data Layout

The component uses a custom store with the following typed arrays:

```typescript
interface StateMachineStore {
  machineId:     Uint32Array,   // Index into machine definitions
  currentState:  Uint16Array,   // Current state index
  previousState: Uint16Array,   // Previous state index
  stateAge:      Float32Array,  // Time in current state (seconds)
}
```

## StateMachineStore (Definition Registry)

The `StateMachineStore` object manages state machine definitions:

<!-- blecsd-doccheck:ignore -->
```typescript
import { StateMachineStore } from 'blecsd';

// Register a definition (returns machine ID)
const id = StateMachineStore.register({
  initial: 'idle',
  states: {
    idle: { on: { activate: 'active' } },
    active: { on: { deactivate: 'idle' } },
  },
});

// Query definitions
const machine = StateMachineStore.getMachine(id);
const index = StateMachineStore.getStateIndex(id, 'idle');   // 0
const name = StateMachineStore.getStateName(id, 0);          // 'idle'

// Cleanup
StateMachineStore.unregister(id);
StateMachineStore.clear(); // Remove all
```

## Core Functions

### attachStateMachine

Attaches a state machine to an entity. Returns the machine ID.

<!-- blecsd-doccheck:ignore -->
```typescript
import { attachStateMachine } from 'blecsd/components';

const machineId = attachStateMachine(world, entity, {
  initial: 'idle',
  states: {
    idle: { on: { activate: 'active', destroy: 'dead' } },
    active: { on: { deactivate: 'idle', destroy: 'dead' } },
    dead: {},
  },
});
```

### detachStateMachine

Removes the state machine from an entity and unregisters its definition.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detachStateMachine } from 'blecsd';

detachStateMachine(world, entity);
```

### getState / getPreviousState

Query current and previous state names.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getPreviousState } from 'blecsd';
import { getState } from 'blecsd/components';

const current = getState(world, entity);    // 'idle'
const previous = getPreviousState(world, entity); // 'active'
```

**Returns:** State name string, or `''` if no machine attached.

### sendEvent

Sends an event to the entity's state machine. Returns whether a transition occurred.

<!-- blecsd-doccheck:ignore -->
```typescript
import { sendEvent } from 'blecsd/components';

const transitioned = sendEvent(world, entity, 'activate');
if (transitioned) {
  console.log(`Now in state: ${getState(world, entity)}`);
}
```

### canSendEvent

Checks if an event would cause a transition from the current state.

<!-- blecsd-doccheck:ignore -->
```typescript
import { canSendEvent } from 'blecsd';

if (canSendEvent(world, entity, 'activate')) {
  sendEvent(world, entity, 'activate');
}
```

### getStateAge

Returns the time spent in the current state.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getStateAge } from 'blecsd';

const age = getStateAge(world, entity);
if (age > 5.0) {
  // Been in this state for over 5 seconds
}
```

### isInState

Convenience check for a specific state.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isInState } from 'blecsd';

if (isInState(world, entity, 'active')) {
  // Handle active state
}
```

### hasStateMachine

<!-- blecsd-doccheck:ignore -->
```typescript
import { hasStateMachine } from 'blecsd';

if (hasStateMachine(world, entity)) {
  // Entity has a state machine attached
}
```

### updateStateAge

Updates state age for a batch of entities. Call each frame.

<!-- blecsd-doccheck:ignore -->
```typescript
import { updateStateAge } from 'blecsd';

updateStateAge(world, entities, deltaTime);
```

## Usage Example

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { isInState, updateStateAge } from 'blecsd';
import { attachStateMachine, sendEvent, getState } from 'blecsd/components';

const world = createWorld();
const entity = addEntity(world);

// Attach a door state machine
attachStateMachine(world, entity, {
  initial: 'closed',
  states: {
    closed: { on: { open: 'opening' } },
    opening: { on: { opened: 'open' } },
    open: { on: { close: 'closing' } },
    closing: { on: { closed: 'closed' } },
  },
});

console.log(getState(world, entity)); // 'closed'

sendEvent(world, entity, 'open');
console.log(getState(world, entity)); // 'opening'

sendEvent(world, entity, 'opened');
console.log(isInState(world, entity, 'open')); // true

// Each frame
updateStateAge(world, [entity], deltaTime);
```
