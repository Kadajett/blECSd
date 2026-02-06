# State Machine API

Configurable state machine framework with typed states, events, guard conditions, and entry/exit actions. Used internally by widgets and available for user code.

## Quick Start

```typescript
import { createStateMachine } from 'blecsd';

const machine = createStateMachine({
  initial: 'idle',
  states: {
    idle: { on: { start: 'running' } },
    running: { on: { pause: 'paused', stop: 'idle' } },
    paused: { on: { resume: 'running', stop: 'idle' } },
  },
});

machine.send('start');   // -> 'running'
machine.send('pause');   // -> 'paused'
machine.send('resume');  // -> 'running'
```

## Types

### Action

Action function executed on state transitions.

```typescript
type Action<Context = unknown> = (context: Context) => void;
```

### TransitionConfig

Transition target with optional actions and guard.

```typescript
interface TransitionConfig<S extends string, Context = unknown> {
  target: S;
  actions?: Action<Context>[];
  guard?: (context: Context) => boolean;
}
```

### StateConfig

State configuration with entry/exit actions and transitions.

```typescript
interface StateConfig<S extends string, E extends string, Context = unknown> {
  entry?: Action<Context>[];
  exit?: Action<Context>[];
  on?: Partial<Record<E, S | TransitionConfig<S, Context>>>;
}
```

### StateMachineConfig

Full state machine configuration.

```typescript
interface StateMachineConfig<S extends string, E extends string, Context = unknown> {
  initial: S;
  states: Record<S, StateConfig<S, E, Context>>;
  context?: Context;
}
```

### StateListener

```typescript
type StateListener<S extends string> = (current: S, previous: S) => void;
```

### StateMachine

```typescript
interface StateMachine<S extends string, E extends string, Context = unknown> {
  readonly current: S;
  readonly context: Context;
  send(event: E): boolean;
  can(event: E): boolean;
  matches(state: S): boolean;
  subscribe(listener: StateListener<S>): Unsubscribe;
  validEvents(): E[];
  reset(): void;
}
```

## Functions

### createStateMachine

Creates a new state machine.

```typescript
function createStateMachine<S extends string, E extends string, Context = unknown>(
  config: StateMachineConfig<S, E, Context>
): StateMachine<S, E, Context>;
```

**Parameters:**
- `config` - State machine configuration with initial state, state definitions, and optional context

**Returns:** A new StateMachine instance.

### validateStateMachineConfig

Validates a state machine configuration object using Zod.

```typescript
function validateStateMachineConfig(config: unknown): z.infer<typeof StateMachineConfigSchema>;
```

## Validation Schemas

### TransitionConfigSchema / StateConfigSchema / StateMachineConfigSchema

Zod schemas for validating state machine configurations at runtime, useful for loading configs from JSON.

## Usage Example

### With Guards and Actions

```typescript
import { createStateMachine } from 'blecsd';

type State = 'locked' | 'unlocked' | 'open';
type Event = 'insertCoin' | 'push';

interface Context {
  coins: number;
}

const turnstile = createStateMachine<State, Event, Context>({
  initial: 'locked',
  context: { coins: 0 },
  states: {
    locked: {
      on: {
        insertCoin: {
          target: 'unlocked',
          actions: [(ctx) => { ctx.coins++; }],
        },
      },
    },
    unlocked: {
      entry: [(ctx) => console.log(`Coins: ${ctx.coins}`)],
      on: {
        push: 'open',
      },
    },
    open: {
      exit: [() => console.log('Door closing')],
      on: {
        push: 'locked',
      },
    },
  },
});

turnstile.send('insertCoin'); // -> 'unlocked', prints "Coins: 1"
turnstile.can('push');        // true
turnstile.matches('unlocked'); // true
turnstile.validEvents();      // ['push']
```

### With Subscriptions

```typescript
import { createStateMachine } from 'blecsd';

const machine = createStateMachine({
  initial: 'off',
  states: {
    off: { on: { toggle: 'on' } },
    on: { on: { toggle: 'off' } },
  },
});

const unsub = machine.subscribe((current, previous) => {
  console.log(`${previous} -> ${current}`);
});

machine.send('toggle'); // prints "off -> on"
unsub(); // stop listening
```
