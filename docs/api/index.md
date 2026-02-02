# API Reference

## Components

ECS components for game entities. Each component has a bitECS component definition and helper functions.

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| Position | X, Y coordinates and z-index | [Position](./position.md) |
| Renderable | Colors, visibility, dirty tracking | [Renderable](./renderable.md) |
| Dimensions | Width, height, constraints | [Dimensions](./dimensions.md) |
| Hierarchy | Parent-child relationships | [Hierarchy](./hierarchy.md) |
| Focusable | Keyboard focus and tab order | [Focusable](./focusable.md) |
| Interactive | Click, hover, drag states | [Interactive](./interactive.md) |
| Scrollable | Scroll position and content size | [Scrollable](./scrollable.md) |
| Border | Box borders | [Border](./border.md) |
| Content | Text content and alignment | [Content](./content.md) |
| Padding | Inner spacing | [Padding](./padding.md) |
| Label | Text labels | [Label](./label.md) |
| Input | Keyboard, mouse, text buffer state | [Input](./components/input.md) |

## Core

### Entity Factories

Create pre-configured entities with multiple components.

| Factory | Components Added |
|---------|------------------|
| `createBoxEntity` | Position, Dimensions, Renderable, Hierarchy, Border?, Padding? |
| `createTextEntity` | Position, Dimensions, Renderable, Hierarchy, Content |
| `createButtonEntity` | Position, Dimensions, Renderable, Hierarchy, Content, Interactive, Focusable |
| `createInputEntity` | Position, Dimensions, Renderable, Hierarchy, Content, Interactive, Focusable |
| `createListEntity` | Position, Dimensions, Renderable, Hierarchy, Content, Scrollable, Interactive, Focusable |
| `createScreenEntity` | Position, Dimensions, Renderable, Hierarchy |

See [Entity Factories](./entities.md) for configuration options.

### Events

Type-safe event bus.

```typescript
import { createEventBus } from 'blecsd';

interface Events {
  'player:moved': { x: number; y: number };
}

const events = createEventBus<Events>();
events.on('player:moved', (e) => console.log(e.x, e.y));
events.emit('player:moved', { x: 10, y: 5 });
```

See [Events](./events.md) for the full API.

### Queries

Pre-built queries and filters for finding entities.

| Query/Filter | Purpose |
|--------------|---------|
| `queryRenderable` | Entities with Renderable |
| `queryFocusable` | Entities with Focusable |
| `queryInteractive` | Entities with Interactive |
| `queryHierarchy` | Entities with Hierarchy |
| `filterVisible` | Filter to visible entities |
| `filterDirty` | Filter to dirty entities |
| `filterFocusable` | Filter to focusable entities |
| `filterClickable` | Filter to clickable entities |
| `sortByZIndex` | Sort by z-index ascending |
| `sortByDepth` | Sort by hierarchy depth |
| `sortByTabIndex` | Sort by tab order |

See [Queries](./queries.md) for usage.

### Scheduler

Optional game loop with phase ordering.

```typescript
import { createScheduler, LoopPhase } from 'blecsd';

const scheduler = createScheduler();
scheduler.add(LoopPhase.UPDATE, (world, delta) => world);
scheduler.start(world);
```

Phases execute in order:
1. INPUT (reserved)
2. EARLY_UPDATE
3. UPDATE
4. LATE_UPDATE
5. PHYSICS
6. LAYOUT
7. RENDER
8. POST_RENDER

## Systems

ECS systems for game logic.

| System | Purpose | Documentation |
|--------|---------|---------------|
| Input System | Process input events, hit testing, focus | [Input System](./systems/input-system.md) |
| State Machine | Update entity state age | (built-in) |

## Input Handling

### Input Stream Handler

Wrap a NodeJS readable stream to get typed input events.

```typescript
import { createInputHandler } from 'blecsd';

const handler = createInputHandler(process.stdin);
handler.onKey((e) => console.log(e.name));
handler.onMouse((e) => console.log(e.x, e.y));
handler.start();
```

See [Input Stream](./input-stream.md) for the full API.

### Input Parsing

Parse terminal input into structured events.

#### Keyboard

```typescript
import { parseKeyBuffer, parseKeySequence } from 'blecsd';

const key = parseKeyBuffer(buffer);
// { name: 'a', ctrl: false, meta: false, shift: false, sequence: 'a' }
```

#### Mouse

```typescript
import { parseMouseSequence, isMouseBuffer } from 'blecsd';

const mouse = parseMouseSequence('\x1b[<0;10;5M');
// { action: 'mousedown', button: 0, x: 10, y: 5, ... }
```

## Terminal I/O

Low-level terminal control. Import from `blecsd/terminal`.

### ANSI Escape Sequences

```typescript
import { cursor, style, screen, mouse } from 'blecsd/terminal';

cursor.move(10, 5);      // Move cursor to column 10, row 5
cursor.hide();           // Hide cursor
cursor.show();           // Show cursor

style.bold();            // Bold text
style.fgRgb(255, 0, 0);  // Red foreground
style.reset();           // Reset all styles

screen.clear();          // Clear screen
screen.alternateOn();    // Enter alternate buffer
screen.alternateOff();   // Exit alternate buffer

mouse.enableSgr();       // Enable SGR mouse tracking
mouse.disableAll();      // Disable all mouse modes
```

See [ANSI](./ansi.md) for the complete reference.

### Program Class

High-level terminal control with event handling.

```typescript
import { Program } from 'blecsd/terminal';

const program = new Program({
  useAlternateScreen: true,
  hideCursor: true,
});

await program.init();

program.on('key', (event) => {
  if (event.name === 'q') program.destroy();
});

program.on('resize', ({ cols, rows }) => {
  // Handle resize
});
```

See [Program](./program.md) for the full API.

### Other Terminal Modules

| Module | Purpose |
|--------|---------|
| [Detection](./detection.md) | Terminal capability detection |
| [Security](./security.md) | Escape sequence sanitization |
| [Cleanup](./cleanup.md) | Terminal state restoration |
| [Output Buffer](./output-buffer.md) | Buffered output |
| [Screen Buffer](./screen-buffer.md) | Alternate screen management |
| [Sync Output](./sync-output.md) | Flicker-free rendering |
| [Tmux](./tmux.md) | Tmux pass-through |

## Validation Schemas

Zod schemas for configuration validation.

```typescript
import {
  ColorStringSchema,
  DimensionSchema,
  PositionValueSchema,
  PositiveIntSchema,
} from 'blecsd';

ColorStringSchema.parse('#ff0000');     // Valid
DimensionSchema.parse('50%');            // Valid
PositionValueSchema.parse('center');     // Valid
PositiveIntSchema.parse(10);             // Valid
```

## Utilities

### Box Rendering

Low-level utilities for drawing boxes, borders, and text to cell buffers.

| Function | Purpose |
|----------|---------|
| `createCellBuffer` | Create an in-memory cell buffer |
| `renderBox` | Draw a box with borders |
| `renderHLine` | Draw a horizontal line |
| `renderVLine` | Draw a vertical line |
| `fillRect` | Fill a rectangular region |
| `renderText` | Render text at a position |
| `bufferToString` | Convert buffer to string |
| `charsetToBoxChars` | Convert BorderCharset to BoxChars |

**Box Presets:** `BOX_SINGLE`, `BOX_DOUBLE`, `BOX_ROUNDED`, `BOX_BOLD`, `BOX_ASCII`, `BOX_DASHED`

See [Box Utilities](./utils/box.md) for the full API.

## Types

### World and Entity

```typescript
import type { World, Entity, System } from 'blecsd';

type World = ReturnType<typeof createWorld>;
type Entity = number;
type System = (world: World, deltaTime: number) => World;
```

### Event Types

```typescript
import type { EventHandler, EventMap, Unsubscribe } from 'blecsd';

type EventHandler<T> = (event: T) => void;
type EventMap = Record<string, unknown>;
type Unsubscribe = () => void;
```

### Input Types

```typescript
import type { KeyEvent, MouseEvent, KeyName, MouseAction } from 'blecsd';
```

### Component Data Types

```typescript
import type {
  PositionData,
  RenderableData,
  StyleData,
  DimensionsData,
  HierarchyData,
  FocusableData,
  InteractiveData,
  ScrollableData,
  BorderData,
  ContentData,
  PaddingData,
  LabelData,
} from 'blecsd';
```
