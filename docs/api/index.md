# API Reference

## Widgets

Pre-built UI widgets with chainable APIs. Each widget wraps ECS components for easier use.

### Layout & Containers

| Widget | Description | Documentation |
|--------|-------------|---------------|
| Box | Base container with borders, padding | [Box](./widgets/box.md) |
| Panel | Box with title bar, collapsible | [Panel](./widgets/panel.md) |
| Layout | Flex/grid layout container | [Layout](./widgets/layout.md) |
| Tabs | Tabbed container with content panels | [Tabs](./widgets/tabs.md) |
| ScrollableBox | Container with scroll support | [ScrollableBox](./widgets/scrollableBox.md) |

### Lists & Tables

| Widget | Description | Documentation |
|--------|-------------|---------------|
| Tree | Hierarchical tree view with expand/collapse | [Tree](./widgets/tree.md) |
| VirtualizedList | High-performance list for large datasets | [VirtualizedList](./widgets/virtualizedList.md) |
| ListTable | Selectable table with row navigation | [ListTable](./widgets/listTable.md) |
| Listbar | Horizontal navigation bar | [Listbar](./widgets/listbar.md) |

### Text & Display

| Widget | Description | Documentation |
|--------|-------------|---------------|
| Text | Text display with alignment, wrapping | [Text](./widgets/text.md) |
| BigText | Large ASCII art text display | [BigText](./widgets/bigText.md) |
| ScrollableText | Scrollable text area | [ScrollableText](./widgets/scrollableText.md) |
| Line | Horizontal/vertical separator | [Line](./widgets/line.md) |
| Loading | Loading indicator with spinner | [Loading](./widgets/loading.md) |
| HoverText | Tooltip/hover text display | [HoverText](./widgets/hoverText.md) |

### Widget Registry

| Module | Description | Documentation |
|--------|-------------|---------------|
| Registry | Widget type registration | [Registry](./widgets/registry.md) |

## Fonts

| Module | Description | Documentation |
|--------|-------------|---------------|
| Bitmap Fonts | Load and render bitmap fonts | [Fonts](./fonts.md) |

## Components

ECS components for game entities. Each component has a bitECS component definition and helper functions.

### Core Layout

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| Position | X, Y coordinates and z-index | [Position](./position.md) |
| Renderable | Colors, visibility, dirty tracking | [Renderable](./renderable.md) |
| Dimensions | Width, height, constraints | [Dimensions](./dimensions.md) |
| Hierarchy | Parent-child relationships | [Hierarchy](./hierarchy.md) |
| Border | Box borders | [Border](./border.md) |
| Padding | Inner spacing | [Padding](./padding.md) |
| Content | Text content and alignment | [Content](./content.md) |
| Label | Text labels | [Label](./label.md) |

### Interaction

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| Focusable | Keyboard focus and tab order | [Focusable](./focusable.md) |
| Interactive | Click, hover, drag states | [Interactive](./interactive.md) |
| Scrollable | Scroll position and content size | [Scrollable](./scrollable.md) |
| Input | Keyboard, mouse, text buffer state | [Input](./components/input.md) |

### Form Controls

| Component | Purpose | Documentation |
|-----------|---------|---------------|
| Form | Form container with field management | [Form](./components/form.md) |
| TextInput | Text entry with cursor, selection | [TextInput](./components/textInput.md) |
| Checkbox | Boolean toggle control | [Checkbox](./components/checkbox.md) |
| RadioButton | Single selection from group | [RadioButton](./components/radioButton.md) |
| Select | Dropdown selection menu | [Select](./components/select.md) |
| Slider | Range value selection | [Slider](./components/slider.md) |
| ProgressBar | Progress indicator | [ProgressBar](./components/progressBar.md) |

## Core

### Events

See [Events](./events.md) for the full API.

### Queries

See [Queries](./queries.md) for pre-built queries, filters, and sorting functions.

### World Adapter

See [World Adapter](./core/worldAdapter.md) for customizing renderable queries and storage backends.

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

## Entity Factories

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

## Systems

ECS systems process entities and update world state. Register with the scheduler for automatic execution.

### Core Systems

| System | Phase | Purpose | Documentation |
|--------|-------|---------|---------------|
| Input System | INPUT | Process input events, hit testing, focus | [Input System](./systems/input-system.md) |
| Focus System | INPUT | Keyboard focus management | [Focus System](./systems/focus.md) |
| Layout System | LAYOUT | Calculate entity positions and sizes | [Layout System](./systems/layout.md) |
| Render System | RENDER | Render entities to screen buffer | [Render System](./systems/render.md) |
| Output System | RENDER | Write buffer to terminal | [Output System](./systems/output.md) |

### Game Systems

| System | Phase | Purpose | Documentation |
|--------|-------|---------|---------------|
| Animation System | UPDATE | Update sprite animations | [Animation System](./systems/animationSystem.md) |
| Movement System | PHYSICS | Apply velocity to position | [Movement System](./systems/movementSystem.md) |
| Collision System | UPDATE | Detect entity collisions | [Collision System](./systems/collisionSystem.md) |
| Camera System | UPDATE | Camera following with smoothing | [Camera System](./systems/cameraSystem.md) |
| State Machine System | UPDATE | Track state age for transitions | [State Machine System](./systems/stateMachineSystem.md) |

### Interaction Systems

| System | Phase | Purpose | Documentation |
|--------|-------|---------|---------------|
| Drag System | - | Drag and drop with constraints | [Drag System](./systems/dragSystem.md) |
| Virtualized Render | RENDER | Render large content efficiently | [Virtualized Render](./systems/virtualizedRenderSystem.md) |

## Input Handling

### Input Stream Handler

See [Input Stream](./input-stream.md) for wrapping NodeJS readable streams.

### Input Parsing

```typescript
import { parseKeyBuffer, parseMouseSequence } from 'blecsd';

const key = parseKeyBuffer(buffer);
// { name: 'a', ctrl: false, meta: false, shift: false, sequence: 'a' }

const mouse = parseMouseSequence('\x1b[<0;10;5M');
// { action: 'mousedown', button: 0, x: 10, y: 5, ... }
```

## Terminal I/O

Low-level terminal control. Import from `blecsd/terminal`.

| Module | Purpose |
|--------|---------|
| [Terminfo](./terminfo.md) | Terminal capability access |
| [ANSI](./ansi.md) | Direct ANSI escape sequences |
| [Detection](./detection.md) | Terminal capability detection |
| [Program](./program.md) | High-level terminal control |
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

ColorStringSchema.parse('#ff0000');
DimensionSchema.parse('50%');
PositionValueSchema.parse('center');
PositiveIntSchema.parse(10);
```

## Utilities

### Box Rendering

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

### Text Wrapping

| Function | Purpose |
|----------|---------|
| `wrapText` | Wrap and align text with options |
| `wordWrap` | Wrap text at word boundaries |
| `alignLine` | Align a single line (left/center/right) |
| `truncate` | Truncate text with ellipsis |
| `padHeight` | Pad lines to a specific height |
| `getVisibleWidth` | Get text width excluding ANSI |
| `stripAnsi` | Remove ANSI escape sequences |

See [Text Wrapping](./utils/text-wrap.md) for the full API.

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
