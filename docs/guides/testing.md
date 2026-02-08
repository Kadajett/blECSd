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

## Test Utilities

blECSd provides a comprehensive set of test utilities in `src/testing/` to reduce boilerplate and make tests more readable.

### Test Helper Functions

Import from `'blecsd/testing'`:

```typescript
import {
  createTestWorld,
  createTestEntity,
  createRenderableEntity,
  createClickableEntity,
  createHoverableEntity,
  createTestScreen,
} from 'blecsd/testing';
```

#### `createTestWorld()`

Creates a pre-configured ECS world for testing:

```typescript
import { createTestWorld } from 'blecsd/testing';

const world = createTestWorld();
// Use world in tests...
```

#### `createTestEntity(world, config)`

Creates an entity with common components based on configuration. This eliminates boilerplate for setting up test entities:

```typescript
import { createTestWorld, createTestEntity } from 'blecsd/testing';

const world = createTestWorld();

// Simple positioned entity
const box = createTestEntity(world, {
  x: 10,
  y: 5,
  width: 20,
  height: 10,
});

// Clickable button with content
const button = createTestEntity(world, {
  x: 0,
  y: 0,
  width: 10,
  height: 3,
  content: 'Click me',
  clickable: true,
  style: { fg: 0xffffff, bg: 0x0000ff },
});

// Entity with z-index for layering
const overlay = createTestEntity(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 24,
  z: 100, // High z-index renders on top
  style: { bg: 0x000000 },
});
```

**Configuration options:**
- `x`, `y`: Position coordinates
- `z`: Z-index for layering (sets ZOrder.zIndex)
- `width`, `height`: Dimensions
- `style`: Colors and text attributes
- `visible`, `dirty`: Renderable flags
- `content`: Text content
- `clickable`, `hoverable`: Interactive flags
- `focusable`: Focus capability
- `scrollable`: Scroll capability
- `border`, `padding`, `hierarchy`: Add component flags

#### Specialized Entity Creators

```typescript
// Renderable entity (Position + Dimensions + Renderable)
const renderable = createRenderableEntity(world, 10, 20, 30, 15);

// Clickable entity (adds Interactive component)
const clickable = createClickableEntity(world, 5, 5, 20, 10);

// Hoverable entity (adds Interactive component with hover)
const hoverable = createHoverableEntity(world, 0, 0, 15, 8);
```

#### `createTestScreen(world, config)`

Creates a screen entity with standard terminal configuration:

```typescript
import { createTestWorld, createTestScreen } from 'blecsd/testing';

const world = createTestWorld();
const screen = createTestScreen(world, {
  width: 80,
  height: 24,
  title: 'Test App',
});
```

### Test Fixtures

blECSd provides shared test fixtures to reduce duplication and improve consistency. Import from `'blecsd/testing'`:

#### Screen Dimensions

```typescript
import { SCREEN_80X24, SCREEN_40X12, SCREEN_120X40, SCREEN_10X5 } from 'blecsd/testing';

// Use in tests
const screen = createTestScreen(world, SCREEN_80X24);
```

**Available fixtures:**
- `SCREEN_80X24`: Standard terminal (80x24)
- `SCREEN_40X12`: Small screen for compact tests
- `SCREEN_120X40`: Large screen for extended layouts
- `SCREEN_10X5`: Minimal screen for edge cases

#### Position and Size Presets

```typescript
import {
  POSITION_ORIGIN,
  POSITION_CENTER,
  SIZE_SMALL_BOX,
  SIZE_MEDIUM_BOX,
  SIZE_LARGE_BOX,
  SIZE_BUTTON,
} from 'blecsd/testing';

// Use in entity creation
const box = createTestEntity(world, {
  ...POSITION_CENTER,
  ...SIZE_MEDIUM_BOX,
});
```

**Available fixtures:**
- `POSITION_ORIGIN`: `{ x: 0, y: 0 }`
- `POSITION_CENTER`: `{ x: 40, y: 12 }` (center of 80x24)
- `SIZE_SMALL_BOX`: `{ width: 10, height: 5 }`
- `SIZE_MEDIUM_BOX`: `{ width: 20, height: 10 }`
- `SIZE_LARGE_BOX`: `{ width: 40, height: 20 }`
- `SIZE_BUTTON`: `{ width: 10, height: 3 }`

#### Text Content

```typescript
import {
  TEXT_HELLO,
  TEXT_HELLO_WORLD,
  TEXT_TEST,
  TEXT_MULTILINE,
  TEXT_LOREM_IPSUM,
  TEXT_UNICODE_EMOJI,
} from 'blecsd/testing';

// Use in content tests
const entity = createTestEntity(world, {
  x: 0,
  y: 0,
  content: TEXT_HELLO_WORLD,
});
```

**Available fixtures:**
- `TEXT_HELLO`: `'Hello'`
- `TEXT_HELLO_WORLD`: `'Hello, World!'`
- `TEXT_TEST`: `'Test'`
- `TEXT_SINGLE_LINE`: Single line text
- `TEXT_MULTILINE`: `'Line 1\nLine 2\nLine 3'`
- `TEXT_LOREM_IPSUM`: Lorem ipsum sample
- `TEXT_UNICODE_EMOJI`: `'Hello 👋 World 🌍'`
- `TEXT_UNICODE_CJK`: `'你好世界'`
- `TEXT_EMPTY`: `''`

#### Colors

```typescript
import { COLORS, COLOR_PAIRS } from 'blecsd/testing';

// Use in style tests
const button = createTestEntity(world, {
  x: 0,
  y: 0,
  width: 10,
  height: 3,
  style: {
    fg: COLORS.WHITE,
    bg: COLORS.BLUE,
  },
});

// Or use color pairs
const text = createTestEntity(world, {
  x: 0,
  y: 0,
  style: COLOR_PAIRS.WHITE_ON_BLACK,
});
```

**Available color fixtures:**
- `COLORS.WHITE`, `COLORS.BLACK`, `COLORS.RED`, `COLORS.GREEN`, `COLORS.BLUE`
- `COLORS.YELLOW`, `COLORS.CYAN`, `COLORS.MAGENTA`
- `COLORS.LIGHT_GRAY`, `COLORS.DARK_GRAY`, `COLORS.MEDIUM_GRAY`

**Available color pairs:**
- `COLOR_PAIRS.WHITE_ON_BLACK`: Default terminal colors
- `COLOR_PAIRS.BLACK_ON_WHITE`: Inverted
- `COLOR_PAIRS.GREEN_ON_BLACK`: Matrix style
- `COLOR_PAIRS.BLUE_ON_WHITE`: Hyperlink style
- `COLOR_PAIRS.WHITE_ON_BLUE`: Button style
- `COLOR_PAIRS.YELLOW_ON_BLACK`: Warning style
- `COLOR_PAIRS.RED_ON_BLACK`: Error style

#### Keyboard Input

```typescript
import { KEYS } from 'blecsd/testing';

// Use in input tests
queueKeyEvent({ sequence: KEYS.ENTER, name: 'return' });
queueKeyEvent({ sequence: KEYS.ARROW_UP, name: 'up' });
```

**Available key fixtures:**
- `KEYS.ENTER`, `KEYS.ESC`, `KEYS.TAB`, `KEYS.BACKSPACE`, `KEYS.SPACE`
- `KEYS.ARROW_UP`, `KEYS.ARROW_DOWN`, `KEYS.ARROW_LEFT`, `KEYS.ARROW_RIGHT`

#### Mouse Positions

```typescript
import { MOUSE_POSITIONS } from 'blecsd/testing';

// Use in mouse event tests
queueMouseEvent({
  ...MOUSE_POSITIONS.CENTER,
  button: 'left',
  action: 'press',
});
```

**Available mouse position fixtures:**
- `MOUSE_POSITIONS.TOP_LEFT`: `{ x: 0, y: 0 }`
- `MOUSE_POSITIONS.CENTER`: `{ x: 40, y: 12 }`
- `MOUSE_POSITIONS.BOTTOM_RIGHT`: `{ x: 79, y: 23 }`

#### ANSI Codes

```typescript
import { ANSI, ANSI_TEXT } from 'blecsd/testing';

// Use in ANSI parsing tests
const stripped = stripAnsi(ANSI_TEXT.RED_TEXT);
expect(stripped).toBe('Red Text');
```

**Available ANSI fixtures:**
- `ANSI.RESET`, `ANSI.BOLD`, `ANSI.DIM`, `ANSI.ITALIC`, `ANSI.UNDERLINE`
- `ANSI.BLINK`, `ANSI.INVERSE`, `ANSI.CLEAR_SCREEN`, `ANSI.CURSOR_HOME`

#### Timeouts

```typescript
import { TIMEOUTS } from 'blecsd/testing';

// Use in async tests
await new Promise(resolve => setTimeout(resolve, TIMEOUTS.SHORT));
```

**Available timeout fixtures:**
- `TIMEOUTS.VERY_SHORT`: 10ms
- `TIMEOUTS.SHORT`: 50ms
- `TIMEOUTS.MEDIUM`: 100ms
- `TIMEOUTS.LONG`: 500ms
- `TIMEOUTS.VERY_LONG`: 1000ms

### Complete Example with Utilities and Fixtures

```typescript
import { describe, it, expect } from 'vitest';
import { createTestWorld, createTestEntity } from 'blecsd/testing';
import {
  SCREEN_80X24,
  POSITION_CENTER,
  SIZE_BUTTON,
  TEXT_HELLO_WORLD,
  COLORS,
  COLOR_PAIRS,
} from 'blecsd/testing';

describe('Button widget', () => {
  it('creates a styled button at center', () => {
    const world = createTestWorld();

    const button = createTestEntity(world, {
      ...POSITION_CENTER,
      ...SIZE_BUTTON,
      content: TEXT_HELLO_WORLD,
      style: COLOR_PAIRS.WHITE_ON_BLUE,
      clickable: true,
      focusable: true,
    });

    expect(Position.x[button]).toBe(40);
    expect(Position.y[button]).toBe(12);
    expect(Dimensions.width[button]).toBe(10);
    expect(Dimensions.height[button]).toBe(3);
    expect(getContent(world, button)).toBe('Hello, World!');
  });
});
```

## Snapshot Testing for ANSI Output

Snapshot tests capture exact rendered terminal output to detect visual regressions. When widget rendering changes, snapshots will fail, alerting you to verify the change is intentional.

### Setup

Import snapshot testing utilities from `'blecsd/testing'`:

```typescript
import {
  createTestBuffer,
  renderToString,
  cleanupTestBuffer,
} from 'blecsd/testing';
import { layoutSystem, renderSystem } from 'blecsd';
```

### Basic Snapshot Test Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { addEntity } from 'blecsd';
import { layoutSystem, renderSystem } from 'blecsd';
import { createTestBuffer, renderToString, cleanupTestBuffer } from 'blecsd/testing';
import { createBox } from 'blecsd';

describe('Box widget snapshots', () => {
  it('renders box with border', () => {
    // Create test buffer with specific dimensions
    const { world, db } = createTestBuffer(20, 10);
    const entity = addEntity(world);

    // Configure widget
    createBox(world, entity, {
      top: 1,
      left: 1,
      width: 10,
      height: 5,
      border: { type: 'line' },
      content: 'Hello',
    });

    // Run layout and render systems
    layoutSystem(world);
    renderSystem(world);

    // Capture ANSI output and compare to snapshot
    const output = renderToString(db);
    expect(output).toMatchSnapshot();

    // Clean up
    cleanupTestBuffer();
  });
});
```

### Snapshot Testing Workflow

1. **Create test buffer**: `createTestBuffer(width, height)` creates a world and double buffer
2. **Set up widgets**: Create and configure widgets as normal
3. **Run systems**: Execute `layoutSystem(world)` and `renderSystem(world)`
4. **Capture output**: `renderToString(db)` converts buffer to ANSI string
5. **Compare snapshot**: `expect(output).toMatchSnapshot()` compares to saved snapshot
6. **Clean up**: `cleanupTestBuffer()` releases resources

### Testing Different Widget States

```typescript
describe('Button snapshots', () => {
  it('renders normal state', () => {
    const { world, db } = createTestBuffer(30, 10);
    const entity = addEntity(world);

    createButton(world, entity, {
      x: 5,
      y: 2,
      width: 15,
      height: 3,
      content: 'Click Me',
      style: { fg: 0xffffff, bg: 0x0000ff },
    });

    layoutSystem(world);
    renderSystem(world);

    expect(renderToString(db)).toMatchSnapshot();
    cleanupTestBuffer();
  });

  it('renders hover state', () => {
    const { world, db } = createTestBuffer(30, 10);
    const entity = addEntity(world);

    createButton(world, entity, {
      x: 5,
      y: 2,
      width: 15,
      height: 3,
      content: 'Click Me',
      style: { fg: 0xffffff, bg: 0x3366ff }, // Lighter blue for hover
    });

    layoutSystem(world);
    renderSystem(world);

    expect(renderToString(db)).toMatchSnapshot();
    cleanupTestBuffer();
  });

  it('renders disabled state', () => {
    const { world, db } = createTestBuffer(30, 10);
    const entity = addEntity(world);

    createButton(world, entity, {
      x: 5,
      y: 2,
      width: 15,
      height: 3,
      content: 'Click Me',
      style: { fg: 0x888888, bg: 0x444444 }, // Gray for disabled
    });

    layoutSystem(world);
    renderSystem(world);

    expect(renderToString(db)).toMatchSnapshot();
    cleanupTestBuffer();
  });
});
```

### Testing Edge Cases

```typescript
describe('Text widget edge cases', () => {
  it('renders at screen origin', () => {
    const { world, db } = createTestBuffer(25, 8);
    const entity = addEntity(world);

    createText(world, entity, {
      top: 0,
      left: 0,
      content: 'Origin',
    });

    layoutSystem(world);
    renderSystem(world);

    expect(renderToString(db)).toMatchSnapshot();
    cleanupTestBuffer();
  });

  it('renders single character', () => {
    const { world, db } = createTestBuffer(10, 10);
    const entity = addEntity(world);

    createText(world, entity, {
      top: 2,
      left: 2,
      content: 'X',
    });

    layoutSystem(world);
    renderSystem(world);

    expect(renderToString(db)).toMatchSnapshot();
    cleanupTestBuffer();
  });

  it('renders very long text with wrapping', () => {
    const { world, db } = createTestBuffer(50, 10);
    const entity = addEntity(world);

    createText(world, entity, {
      top: 1,
      left: 1,
      width: 40,
      content: 'This is a very long text string that will wrap',
    });

    layoutSystem(world);
    renderSystem(world);

    expect(renderToString(db)).toMatchSnapshot();
    cleanupTestBuffer();
  });
});
```

### Updating Snapshots

When you intentionally change rendering, update snapshots:

```bash
# Update all snapshots
pnpm test -- -u

# Update snapshots for specific file
pnpm test src/widgets/box.snapshot.test.ts -- -u

# Update specific test
pnpm test -- -u -t "renders box with border"
```

### Snapshot Best Practices

1. **Test visual variations**: Capture different border styles, colors, alignments
2. **Test edge cases**: Empty content, single characters, screen boundaries
3. **Test size variations**: Small, medium, large widgets
4. **Use descriptive test names**: Clearly indicate what visual state is being tested
5. **Keep snapshots focused**: One visual state per snapshot for easier review
6. **Review snapshot diffs**: When snapshots fail, verify the change is intentional

### Example: Complete Snapshot Test Suite

```typescript
import { describe, it, expect } from 'vitest';
import { addEntity } from 'blecsd';
import { layoutSystem, renderSystem } from 'blecsd';
import { createTestBuffer, renderToString, cleanupTestBuffer } from 'blecsd/testing';
import { createList } from 'blecsd';

describe('List widget snapshots', () => {
  describe('basic rendering', () => {
    it('renders simple list', () => {
      const { world, db } = createTestBuffer(30, 12);
      const entity = addEntity(world);

      createList(world, entity, {
        x: 1,
        y: 1,
        width: 20,
        height: 5,
        items: ['Item 1', 'Item 2', 'Item 3'],
      });

      layoutSystem(world);
      renderSystem(world);

      expect(renderToString(db)).toMatchSnapshot();
      cleanupTestBuffer();
    });

    it('renders empty list', () => {
      const { world, db } = createTestBuffer(30, 10);
      const entity = addEntity(world);

      createList(world, entity, {
        x: 1,
        y: 1,
        width: 20,
        height: 5,
        items: [],
      });

      layoutSystem(world);
      renderSystem(world);

      expect(renderToString(db)).toMatchSnapshot();
      cleanupTestBuffer();
    });
  });

  describe('selection', () => {
    it('renders list with first item selected', () => {
      const { world, db } = createTestBuffer(30, 12);
      const entity = addEntity(world);

      createList(world, entity, {
        x: 1,
        y: 1,
        width: 20,
        height: 5,
        items: ['Item 1', 'Item 2', 'Item 3'],
        selected: 0,
      });

      layoutSystem(world);
      renderSystem(world);

      expect(renderToString(db)).toMatchSnapshot();
      cleanupTestBuffer();
    });
  });

  describe('styling', () => {
    it('renders list with custom colors', () => {
      const { world, db } = createTestBuffer(30, 12);
      const entity = addEntity(world);

      createList(world, entity, {
        x: 1,
        y: 1,
        width: 20,
        height: 5,
        items: ['Item 1', 'Item 2', 'Item 3'],
        selected: 1,
        style: {
          selected: {
            fg: 0xffffff,
            bg: 0x0000ff,
            prefix: '> ',
          },
        },
      });

      layoutSystem(world);
      renderSystem(world);

      expect(renderToString(db)).toMatchSnapshot();
      cleanupTestBuffer();
    });
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
