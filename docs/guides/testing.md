# Testing blECSd Applications

This guide shows you how to test blECSd applications using Vitest, covering ECS components, systems, widgets, and terminal I/O.

## Overview

blECSd uses **Vitest** as its testing framework. The functional, data-oriented architecture makes testing straightforward:

- **Components** are just data - test by reading component arrays
- **Systems** are pure functions - test inputs and outputs
- **Widgets** are factories - test the entities and components they create
- **No mocking needed** for most tests - create real worlds and entities

## Setting Up Vitest

### Installation

```bash
npm install -D vitest
# or
pnpm add -D vitest
```

### Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],

    // Enable globals (describe, it, expect)
    globals: true,

    // Environment
    environment: 'node',

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Testing ECS Components

Components are data containers. Test by creating entities, setting component data, and reading it back.

```typescript
import { describe, it, expect } from 'vitest';
import { createWorld, addEntity } from 'blecsd';
import { Position, setPosition, getPosition, hasPosition } from 'blecsd';

describe('Position component', () => {
  it('sets and retrieves position', () => {
    const world = createWorld();
    const eid = addEntity(world);

    setPosition(world, eid, 10, 20);

    expect(Position.x[eid]).toBe(10);
    expect(Position.y[eid]).toBe(20);
  });

  it('adds component if not present', () => {
    const world = createWorld();
    const eid = addEntity(world);

    expect(hasPosition(world, eid)).toBe(false);
    setPosition(world, eid, 5, 15);
    expect(hasPosition(world, eid)).toBe(true);
  });

  it('returns position data', () => {
    const world = createWorld();
    const eid = addEntity(world);
    setPosition(world, eid, 10, 20, 5);

    const pos = getPosition(world, eid);

    expect(pos.x).toBe(10);
    expect(pos.y).toBe(20);
    expect(pos.z).toBe(5);
  });

  it('handles float coordinates', () => {
    const world = createWorld();
    const eid = addEntity(world);

    setPosition(world, eid, 10.5, 20.7);

    expect(Position.x[eid]).toBeCloseTo(10.5);
    expect(Position.y[eid]).toBeCloseTo(20.7);
  });
});
```

### Testing Component Helpers

```typescript
import { describe, it, expect } from 'vitest';
import { createWorld, addEntity } from 'blecsd';
import { Position, moveBy, bringToFront, sendToBack } from 'blecsd';

describe('moveBy', () => {
  it('moves entity by delta', () => {
    const world = createWorld();
    const eid = addEntity(world);
    setPosition(world, eid, 10, 20);

    moveBy(world, eid, 5, -3);

    expect(Position.x[eid]).toBe(15);
    expect(Position.y[eid]).toBe(17);
  });
});

describe('z-index helpers', () => {
  it('brings entity to front', () => {
    const world = createWorld();
    const eid1 = addEntity(world);
    const eid2 = addEntity(world);
    setPosition(world, eid1, 0, 0, 5);
    setPosition(world, eid2, 0, 0, 10);

    bringToFront(world, eid1);

    expect(Position.z[eid1]).toBeGreaterThan(Position.z[eid2] ?? 0);
  });
});
```

## Testing ECS Systems

Systems are pure functions that take a world and return a world. Test by:
1. Setting up world state (entities + components)
2. Running the system
3. Asserting the new state

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, query, World } from 'blecsd';
import { Position, setPosition } from 'blecsd';
import { Velocity, setVelocity } from 'blecsd';

// Example system
function movementSystem(world: World): World {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid] ?? 0;
    Position.y[eid] += Velocity.y[eid] ?? 0;
  }

  return world;
}

describe('movementSystem', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  it('updates position based on velocity', () => {
    const eid = addEntity(world);
    setPosition(world, eid, 0, 0);
    setVelocity(world, eid, 2, 3);

    movementSystem(world);

    expect(Position.x[eid]).toBe(2);
    expect(Position.y[eid]).toBe(3);
  });

  it('processes multiple entities', () => {
    const eid1 = addEntity(world);
    const eid2 = addEntity(world);
    setPosition(world, eid1, 10, 20);
    setVelocity(world, eid1, 1, 1);
    setPosition(world, eid2, 5, 15);
    setVelocity(world, eid2, -1, 2);

    movementSystem(world);

    expect(Position.x[eid1]).toBe(11);
    expect(Position.y[eid1]).toBe(21);
    expect(Position.x[eid2]).toBe(4);
    expect(Position.y[eid2]).toBe(17);
  });

  it('only affects entities with both components', () => {
    const withBoth = addEntity(world);
    const onlyPosition = addEntity(world);
    const onlyVelocity = addEntity(world);

    setPosition(world, withBoth, 0, 0);
    setVelocity(world, withBoth, 5, 5);
    setPosition(world, onlyPosition, 10, 10);
    setVelocity(world, onlyVelocity, 3, 3);

    movementSystem(world);

    // withBoth moved
    expect(Position.x[withBoth]).toBe(5);

    // onlyPosition didn't move
    expect(Position.x[onlyPosition]).toBe(10);
  });
});
```

### Testing System State

Some systems maintain state outside the world. Reset it in `beforeEach`/`afterEach`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  inputSystem,
  resetInputState,
  queueKeyEvent,
  getEventQueue,
} from 'blecsd';

describe('inputSystem', () => {
  beforeEach(() => {
    resetInputState();
  });

  afterEach(() => {
    resetInputState();
  });

  it('processes queued events', () => {
    queueKeyEvent({ name: 'a', ctrl: false, meta: false, shift: false });

    expect(getEventQueue().length).toBe(1);

    // System processes and clears queue
    const world = createWorld();
    inputSystem(world);

    expect(getEventQueue().length).toBe(0);
  });
});
```

## Testing Widgets

Widgets are factory functions that create and configure entities. Test by:
1. Creating a widget
2. Checking the created components
3. Testing widget-specific behavior

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, hasComponent, World } from 'blecsd';
import { createBox, setBoxContent, getBoxContent } from 'blecsd';
import { Position, Dimensions, Content, Border, Padding } from 'blecsd';

describe('Box widget', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  it('creates entity with required components', () => {
    const box = createBox(world, {
      left: 10,
      top: 5,
      width: 20,
      height: 10,
    });

    expect(hasComponent(world, Position, box)).toBe(true);
    expect(hasComponent(world, Dimensions, box)).toBe(true);
    expect(hasComponent(world, Content, box)).toBe(true);
  });

  it('sets position from config', () => {
    const box = createBox(world, {
      left: 10,
      top: 5,
    });

    expect(Position.x[box]).toBe(10);
    expect(Position.y[box]).toBe(5);
  });

  it('sets dimensions from config', () => {
    const box = createBox(world, {
      width: 30,
      height: 15,
    });

    expect(Dimensions.width[box]).toBe(30);
    expect(Dimensions.height[box]).toBe(15);
  });

  it('adds border when border config provided', () => {
    const box = createBox(world, {
      border: { type: 'single' },
    });

    expect(hasComponent(world, Border, box)).toBe(true);
  });

  it('adds padding when padding config provided', () => {
    const box = createBox(world, {
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
    });

    expect(hasComponent(world, Padding, box)).toBe(true);
  });

  it('sets and retrieves content', () => {
    const box = createBox(world, {});

    setBoxContent(world, box, 'Hello, world!');

    expect(getBoxContent(world, box)).toBe('Hello, world!');
  });
});
```

### Testing Widget Config Validation

Test Zod schemas for widget configuration:

```typescript
import { describe, it, expect } from 'vitest';
import { BoxConfigSchema } from 'blecsd';

describe('BoxConfigSchema', () => {
  it('validates empty config', () => {
    const result = BoxConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates numeric dimensions', () => {
    const result = BoxConfigSchema.safeParse({
      width: 80,
      height: 24,
    });
    expect(result.success).toBe(true);
  });

  it('validates percentage dimensions', () => {
    const result = BoxConfigSchema.safeParse({
      width: '50%',
      height: '100%',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid dimensions', () => {
    const result = BoxConfigSchema.safeParse({
      width: -10,
    });
    expect(result.success).toBe(false);
  });

  it('validates color values', () => {
    const result = BoxConfigSchema.safeParse({
      fg: '#ff0000',
      bg: '#00ff00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid color formats', () => {
    const result = BoxConfigSchema.safeParse({
      fg: 'not-a-color',
    });
    expect(result.success).toBe(false);
  });
});
```

## Mocking Terminal I/O

For code that interacts with the terminal, use test helpers or mocks:

### Helper Functions for Input Events

```typescript
import type { KeyEvent, KeyName } from 'blecsd';

function createKeyEvent(
  name: KeyName,
  opts: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {}
): KeyEvent {
  return {
    sequence: name,
    name,
    ctrl: opts.ctrl ?? false,
    meta: opts.meta ?? false,
    shift: opts.shift ?? false,
    raw: new Uint8Array([name.charCodeAt(0)]),
  };
}

// Usage in tests
it('handles key press', () => {
  const event = createKeyEvent('a');
  queueKeyEvent(event);
  // ...
});

it('handles Ctrl+C', () => {
  const event = createKeyEvent('c', { ctrl: true });
  queueKeyEvent(event);
  // ...
});
```

### Helper Functions for Mouse Events

```typescript
import type { MouseEvent, MouseButton, MouseAction } from 'blecsd';

function createMouseEvent(
  x: number,
  y: number,
  button: MouseButton,
  action: MouseAction
): MouseEvent {
  return {
    x,
    y,
    button,
    action,
    ctrl: false,
    meta: false,
    shift: false,
    protocol: 'sgr',
    raw: new Uint8Array(),
  };
}

// Usage in tests
it('handles mouse click', () => {
  const event = createMouseEvent(10, 5, 'left', 'press');
  queueMouseEvent(event);
  // ...
});
```

### Mocking Terminal Output

Use Vitest's `vi.fn()` to spy on terminal writes:

```typescript
import { describe, it, expect, vi } from 'vitest';
import type { TerminalOutput } from 'blecsd';

describe('terminal rendering', () => {
  it('writes to terminal', () => {
    const mockWrite = vi.fn();
    const terminal: TerminalOutput = {
      write: mockWrite,
      flush: vi.fn(),
    };

    terminal.write('Hello');

    expect(mockWrite).toHaveBeenCalledWith('Hello');
    expect(mockWrite).toHaveBeenCalledTimes(1);
  });
});
```

## Snapshot Testing

Use snapshots to test rendered terminal output:

```typescript
import { describe, it, expect } from 'vitest';
import { createWorld, createBox, renderToString } from 'blecsd';

describe('Box rendering', () => {
  it('renders correctly', () => {
    const world = createWorld();
    const box = createBox(world, {
      left: 0,
      top: 0,
      width: 10,
      height: 5,
      border: { type: 'single' },
      content: 'Hello',
    });

    const output = renderToString(world, box);

    expect(output).toMatchSnapshot();
  });

  it('renders with updated content', () => {
    const world = createWorld();
    const box = createBox(world, {
      width: 10,
      height: 5,
      border: { type: 'double' },
    });

    setBoxContent(world, box, 'Updated');
    const output = renderToString(world, box);

    expect(output).toMatchSnapshot();
  });
});
```

### Updating Snapshots

```bash
# Update all snapshots
pnpm test -- -u

# Update snapshots for specific file
pnpm test -- src/widgets/box.test.ts -u
```

## Integration Testing

Test multiple systems working together:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, createBox, World } from 'blecsd';
import { inputSystem, queueKeyEvent, queueMouseEvent } from 'blecsd';
import { renderSystem } from 'blecsd';
import { focusNext, getFocusedEntity, setFocusable } from 'blecsd';

describe('focus management integration', () => {
  let world: World;
  let box1: number;
  let box2: number;

  beforeEach(() => {
    world = createWorld();
    box1 = createBox(world, { left: 0, top: 0 });
    box2 = createBox(world, { left: 0, top: 5 });
    setFocusable(world, box1, true);
    setFocusable(world, box2, true);
  });

  it('moves focus between widgets with Tab key', () => {
    // Initial focus on first box
    focus(world, box1);
    expect(getFocusedEntity(world)).toBe(box1);

    // Queue Tab key
    queueKeyEvent(createKeyEvent('tab'));

    // Process input
    inputSystem(world);

    // Focus moved to second box
    expect(getFocusedEntity(world)).toBe(box2);
  });

  it('handles mouse click to change focus', () => {
    focus(world, box1);

    // Click on box2 (at position 0, 5)
    queueMouseEvent(createMouseEvent(0, 5, 'left', 'press'));

    inputSystem(world);

    expect(getFocusedEntity(world)).toBe(box2);
  });
});
```

### Testing Game Loops

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWorld, createGameLoop, World } from 'blecsd';

describe('game loop', () => {
  let world: World;

  beforeEach(() => {
    world = createWorld();
  });

  it('runs systems in correct order', () => {
    const executionOrder: string[] = [];

    const system1 = vi.fn((w: World) => {
      executionOrder.push('system1');
      return w;
    });

    const system2 = vi.fn((w: World) => {
      executionOrder.push('system2');
      return w;
    });

    const loop = createGameLoop(world, {
      systems: [system1, system2],
      targetFPS: 60,
    });

    // Run one frame
    loop.tick();

    expect(executionOrder).toEqual(['system1', 'system2']);
  });

  it('respects target FPS', async () => {
    const loop = createGameLoop(world, {
      systems: [],
      targetFPS: 10, // 100ms per frame
    });

    const start = Date.now();
    loop.tick();
    loop.tick();
    loop.tick();
    const elapsed = Date.now() - start;

    // Should take at least 200ms for 3 frames at 10 FPS
    expect(elapsed).toBeGreaterThanOrEqual(200);
  });
});
```

## Testing Async Code

Test asynchronous operations with async/await:

```typescript
import { describe, it, expect } from 'vitest';
import { loadImage, Image } from 'blecsd';

describe('image loading', () => {
  it('loads image successfully', async () => {
    const image = await loadImage('./test-image.png');

    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
    expect(image.data).toBeInstanceOf(Uint8Array);
  });

  it('rejects on invalid path', async () => {
    await expect(loadImage('./nonexistent.png')).rejects.toThrow();
  });
});
```

## Testing with Fixtures

Create reusable test fixtures:

```typescript
import { createWorld, addEntity, World, Entity } from 'blecsd';
import { setPosition, setDimensions, setContent } from 'blecsd';

// Fixtures
function createTestWorld(): World {
  return createWorld();
}

function createTestBox(world: World, x = 0, y = 0): Entity {
  const eid = addEntity(world);
  setPosition(world, eid, x, y);
  setDimensions(world, eid, 10, 5);
  setContent(world, eid, 'Test');
  return eid;
}

function createTestScene(world: World): {
  player: Entity;
  enemy: Entity;
  wall: Entity;
} {
  const player = addEntity(world);
  setPosition(world, player, 5, 5);

  const enemy = addEntity(world);
  setPosition(world, enemy, 20, 10);

  const wall = addEntity(world);
  setPosition(world, wall, 10, 8);

  return { player, enemy, wall };
}

// Usage
describe('collision system', () => {
  it('detects collision between entities', () => {
    const world = createTestWorld();
    const { player, enemy } = createTestScene(world);

    // Move player to enemy position
    setPosition(world, player, 20, 10);

    const collision = checkCollision(world, player, enemy);
    expect(collision).toBe(true);
  });
});
```

## Coverage Reports

Run tests with coverage:

```bash
pnpm test:coverage
```

View coverage report:

```bash
# Text summary in terminal
pnpm test:coverage

# HTML report
open coverage/index.html
```

### Interpreting Coverage

```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.23 |    78.45 |   82.11 |   85.67 |
 components         |   92.15 |    85.32 |   91.45 |   92.34 |
  position.ts       |   95.00 |    90.00 |   94.23 |   95.12 |
  velocity.ts       |   88.50 |    82.14 |   87.00 |   88.76 |
 systems            |   78.45 |    71.23 |   75.89 |   78.92 |
  inputSystem.ts    |   82.12 |    76.54 |   80.00 |   82.45 |
  renderSystem.ts   |   74.32 |    65.78 |   71.23 |   74.87 |
--------------------|---------|----------|---------|---------|
```

**What to aim for:**
- **80%+ overall coverage** is good
- **Core components should be 90%+** (position, velocity, renderable, etc.)
- **Systems should be 75%+** (harder to test all branches)
- **Focus on testing critical paths** over hitting 100%

## Best Practices

### 1. Use Descriptive Test Names

```typescript
// GOOD - describes what is being tested
it('returns error when entity has no Position component', () => {
  // ...
});

// BAD - vague
it('handles missing component', () => {
  // ...
});
```

### 2. Follow AAA Pattern

**Arrange, Act, Assert:**

```typescript
it('updates velocity on key press', () => {
  // ARRANGE
  const world = createWorld();
  const player = addEntity(world);
  setVelocity(world, player, 0, 0);

  // ACT
  handleKeyPress(world, player, 'w');

  // ASSERT
  expect(Velocity.y[player]).toBe(-1);
});
```

### 3. Test Edge Cases

```typescript
describe('setPosition', () => {
  it('handles zero coordinates', () => {
    setPosition(world, eid, 0, 0);
    expect(Position.x[eid]).toBe(0);
  });

  it('handles negative coordinates', () => {
    setPosition(world, eid, -5, -10);
    expect(Position.x[eid]).toBe(-5);
  });

  it('handles very large coordinates', () => {
    setPosition(world, eid, 10000, 10000);
    expect(Position.x[eid]).toBe(10000);
  });

  it('handles float coordinates', () => {
    setPosition(world, eid, 10.5, 20.7);
    expect(Position.x[eid]).toBeCloseTo(10.5);
  });
});
```

### 4. Keep Tests Independent

```typescript
// GOOD - each test sets up its own state
describe('Position', () => {
  it('test 1', () => {
    const world = createWorld();
    const eid = addEntity(world);
    // ...
  });

  it('test 2', () => {
    const world = createWorld();
    const eid = addEntity(world);
    // ...
  });
});

// BAD - tests share state
describe('Position', () => {
  const world = createWorld(); // Shared!
  const eid = addEntity(world); // Shared!

  it('test 1', () => {
    setPosition(world, eid, 10, 20);
    // Test 2 will see this!
  });

  it('test 2', () => {
    // Depends on test 1's state
  });
});
```

### 5. Reset Global State

```typescript
import { beforeEach, afterEach } from 'vitest';
import { resetInputState, resetFocusState } from 'blecsd';

describe('input handling', () => {
  beforeEach(() => {
    resetInputState();
    resetFocusState();
  });

  afterEach(() => {
    resetInputState();
    resetFocusState();
  });

  // Tests...
});
```

### 6. Test Both Success and Failure

```typescript
import { isOk, isErr } from 'blecsd/errors';

describe('parseColor', () => {
  it('parses valid hex color', () => {
    const result = parseColor('#ff0000');

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.r).toBe(255);
      expect(result.value.g).toBe(0);
      expect(result.value.b).toBe(0);
    }
  });

  it('returns error for invalid format', () => {
    const result = parseColor('not-a-color');

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(isValidationError(result.error)).toBe(true);
    }
  });
});
```

## Common Testing Patterns

### Testing Entity Queries

```typescript
import { query } from 'blecsd';

it('queries entities with specific components', () => {
  const world = createWorld();

  const e1 = addEntity(world);
  setPosition(world, e1, 0, 0);
  setVelocity(world, e1, 1, 1);

  const e2 = addEntity(world);
  setPosition(world, e2, 5, 5);
  // No velocity

  const e3 = addEntity(world);
  setVelocity(world, e3, 2, 2);
  // No position

  const entities = query(world, [Position, Velocity]);

  expect(entities).toHaveLength(1);
  expect(entities).toContain(e1);
});
```

### Testing Component Removal

```typescript
import { removeComponent, hasComponent } from 'blecsd';

it('removes component from entity', () => {
  const world = createWorld();
  const eid = addEntity(world);
  setPosition(world, eid, 10, 20);

  expect(hasComponent(world, Position, eid)).toBe(true);

  removeComponent(world, Position, eid);

  expect(hasComponent(world, Position, eid)).toBe(false);
});
```

### Testing Events

```typescript
import { createEventBus } from 'blecsd';

it('emits and handles events', () => {
  const bus = createEventBus();
  const handler = vi.fn();

  bus.on('test-event', handler);
  bus.emit('test-event', { data: 'hello' });

  expect(handler).toHaveBeenCalledWith({ data: 'hello' });
  expect(handler).toHaveBeenCalledTimes(1);
});
```

## Summary

- Use **Vitest** for unit and integration tests
- **Components** are easy to test - just read/write data
- **Systems** are pure functions - test inputs and outputs
- **Widgets** are factories - test the entities they create
- Use **helper functions** for creating test events
- **Mock sparingly** - real ECS worlds are cheap to create
- Follow **AAA pattern** (Arrange, Act, Assert)
- Test **both success and failure** paths
- Keep tests **independent** with proper setup/teardown
- Aim for **80%+ coverage** on critical code
- Use **snapshots** for complex terminal output
- Write **descriptive test names**

For error handling patterns in tests, see the [Error Handling Guide](./error-handling.md).
