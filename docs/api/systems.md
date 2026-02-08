# Systems API Reference

This document covers the core ECS systems in blECSd. Systems are pure functions that process entities with specific components, transforming world state frame by frame.

## Overview

All systems follow these patterns:
- **Pure functions** that take `World` and return `World`
- **Registered** to specific scheduler phases (INPUT, UPDATE, LAYOUT, RENDER, etc.)
- **Query-based** - find entities by component composition
- **Side-effect free** (except for system-specific state stores)

## Core Systems

### inputSystem

**Module:** `systems/inputSystem`
**Phase:** `INPUT` (always runs first)
**Purpose:** Processes keyboard and mouse events, handles hit testing and focus management

#### Main System Function

```typescript
function inputSystem(world: World): World
```

Processes all queued input events, performs hit testing, updates hover/press states, and dispatches events to UI components.

#### Event Queue Functions

```typescript
function queueKeyEvent(event: ParsedKeyEvent): void
function queueMouseEvent(event: ParsedMouseEvent): void
function getEventQueue(): readonly QueuedInputEvent[]
function clearEventQueue(): void
```

Queue input events for processing in the next frame.

**Example:**
```typescript
import { queueKeyEvent, inputSystem, createWorld } from 'blecsd';

const world = createWorld();

// Queue a key press
queueKeyEvent({
  name: 'a',
  ctrl: false,
  meta: false,
  shift: false,
  sequence: 'a',
  raw: new Uint8Array([97]),
});

// Process input (called automatically by game loop)
inputSystem(world);
```

#### Mouse Capture

```typescript
function captureMouseTo(entity: Entity | null): void
function releaseMouse(): void
function isMouseCaptured(): boolean
function getMouseCaptureEntity(): Entity | null
```

Capture mouse events to a specific entity (for drag operations).

**Example:**
```typescript
import { captureMouseTo, releaseMouse } from 'blecsd';

// Start drag
function onMouseDown(world: World, eid: Entity): void {
  captureMouseTo(eid);
}

// End drag
function onMouseUp(): void {
  releaseMouse();
}
```

#### Hit Testing

```typescript
function hitTest(world: World, x: number, y: number): HitTestResult | null
function pointInEntity(world: World, eid: Entity, x: number, y: number): boolean
function getInteractiveEntityAt(world: World, x: number, y: number): Entity | null
```

Test which entity is at a screen coordinate.

**Example:**
```typescript
import { hitTest } from 'blecsd';

const result = hitTest(world, mouseX, mouseY);
if (result) {
  console.log(`Hit entity ${result.entity} at local (${result.localX}, ${result.localY})`);
}
```

#### State Management

```typescript
function resetInputState(): void
function getInputEventBus(): EventBus<UIEventMap>
```

Reset input state (for testing) or access the global event bus.

#### Types

```typescript
interface QueuedKeyEvent {
  type: 'key';
  event: ParsedKeyEvent;
  timestamp: number;
}

interface QueuedMouseEvent {
  type: 'mouse';
  event: ParsedMouseEvent;
  timestamp: number;
}

interface HitTestResult {
  entity: Entity;
  localX: number;
  localY: number;
  zIndex: number;
}

interface InputSystemState {
  eventQueue: QueuedInputEvent[];
  capturedEntity: Entity | null;
  lastMouseX: number;
  lastMouseY: number;
  lastHoveredEntity: Entity | null;
  eventBus: EventBus<UIEventMap>;
}
```

---

### renderSystem

**Module:** `systems/renderSystem`
**Phase:** `RENDER`
**Purpose:** Draws entities to the screen buffer based on computed layout and renderable components

#### Main System Function

```typescript
function renderSystem(world: World): World
```

Renders all visible entities to the screen buffer in z-order (back to front).

#### Render Functions

```typescript
function renderBackground(ctx: RenderContext, eid: Entity, bounds: EntityBounds): void
function renderBorder(ctx: RenderContext, eid: Entity, bounds: EntityBounds): void
function renderContent(ctx: RenderContext, eid: Entity, bounds: EntityBounds): void
function renderScrollbar(ctx: RenderContext, eid: Entity, bounds: EntityBounds): void
function renderText(buffer: ScreenBufferData, x: number, y: number, text: string, fg: number, bg: number, attrs?: number): void
function renderRect(buffer: ScreenBufferData, x: number, y: number, width: number, height: number, fill: string, fg: number, bg: number): void
```

Individual rendering functions for different UI elements.

**Example:**
```typescript
import { renderBackground, renderBorder, renderContent } from 'blecsd';

// Render a complete entity
function renderEntity(ctx: RenderContext, eid: Entity): void {
  const bounds = getEntityBounds(world, eid);
  if (!bounds) return;

  renderBackground(ctx, eid, bounds);
  renderBorder(ctx, eid, bounds);
  renderContent(ctx, eid, bounds);
}
```

#### Buffer Management

```typescript
function getRenderBuffer(world: World): ScreenBufferData | null
function setRenderBuffer(world: World, buffer: ScreenBufferData): void
function clearRenderBuffer(world: World): void
function markAllDirty(world: World): void
```

Access and manage the render buffer.

#### Factory

```typescript
function createRenderSystem(): System
```

Creates a render system for registration.

#### Types

```typescript
interface RenderContext {
  readonly world: World;
  readonly buffer: ScreenBufferData;
  readonly doubleBuffer: DoubleBufferData;
}
```

---

### layoutSystem

**Module:** `systems/layoutSystem`
**Phase:** `LAYOUT`
**Purpose:** Computes final positions and dimensions for all entities based on constraints

#### Main System Function

```typescript
function layoutSystem(world: World): World
```

Computes layout for all entities that need it (dirty or first render).

#### Layout Computation

```typescript
function computeLayoutNow(world: World, eid: Entity): void
function invalidateLayout(world: World, eid: Entity): void
function invalidateAllLayouts(world: World): void
```

Manually trigger layout computation or mark entities as needing layout.

**Example:**
```typescript
import { invalidateLayout, computeLayoutNow } from 'blecsd';

// Mark entity layout as dirty
setDimensions(world, eid, 100, 50);
invalidateLayout(world, eid);

// Force immediate layout computation
computeLayoutNow(world, eid);
```

#### Layout Access

```typescript
function hasComputedLayout(world: World, eid: Entity): boolean
function getComputedLayout(world: World, eid: Entity): ComputedLayoutData | null
function getComputedBounds(world: World, eid: Entity): { x: number; y: number; width: number; height: number } | null
```

Check and retrieve computed layout data.

**Example:**
```typescript
import { getComputedBounds } from 'blecsd';

const bounds = getComputedBounds(world, eid);
if (bounds) {
  console.log(`Entity at (${bounds.x}, ${bounds.y}) with size ${bounds.width}x${bounds.height}`);
}
```

#### Component

```typescript
const ComputedLayout = defineComponent({
  x: Types.f32,
  y: Types.f32,
  width: Types.f32,
  height: Types.f32,
  contentX: Types.f32,
  contentY: Types.f32,
  contentWidth: Types.f32,
  contentHeight: Types.f32,
});
```

The ComputedLayout component stores the final computed position and dimensions after layout calculation.

#### Factory

```typescript
function createLayoutSystem(): System
```

#### Types

```typescript
interface ComputedLayoutData {
  x: number;
  y: number;
  width: number;
  height: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
}
```

---

### focusSystem

**Module:** `systems/focusSystem`
**Phase:** `UPDATE`
**Purpose:** Manages keyboard focus and focus navigation

#### Main System Function

```typescript
function focusSystem(world: World): World
```

Updates focus state and handles focus-related input.

#### Focus Management

```typescript
function focusEntity(world: World, eid: Entity): boolean
function focusNext(world: World): boolean
function focusPrev(world: World): boolean
function focusFirst(world: World): boolean
function focusLast(world: World): boolean
function focusOffset(world: World, offset: number): boolean
function blurAll(world: World): void
```

Control which entity has focus.

**Example:**
```typescript
import { focusEntity, focusNext, getFocused } from 'blecsd';

// Focus specific entity
focusEntity(world, buttonEntity);

// Navigate with Tab
focusNext(world);  // Move to next focusable

// Check current focus
const focused = getFocused(world);
if (focused !== null) {
  console.log(`Entity ${focused} has focus`);
}
```

#### Focus Stack

```typescript
function focusPush(world: World): void
function focusPop(world: World): boolean
function saveFocus(world: World): number | null
function restoreFocus(world: World, eid: number): boolean
function rewindFocus(world: World, count: number): boolean
function peekFocusStack(): number | null
function getFocusStackDepth(): number
function clearFocusStack(): void
```

Save and restore focus (useful for modals, menus).

**Example:**
```typescript
import { focusPush, focusPop } from 'blecsd';

// Open modal - save current focus
focusPush(world);
focusEntity(world, modalEntity);

// Close modal - restore previous focus
focusPop(world);
```

#### Query

```typescript
function getFocused(world: World): Entity | null
function getFocusableEntities(world: World): readonly Entity[]
```

#### Events

```typescript
function getFocusEventBus(): EventBus<FocusEventMap>
function resetFocusEventBus(): void
```

#### Factory

```typescript
function createFocusSystem(): System
```

#### Types

```typescript
interface FocusEventData {
  entity: Entity;
  previous: Entity | null;
}

type FocusEventType = 'focus' | 'blur';

interface FocusEventMap {
  focus: FocusEventData;
  blur: FocusEventData;
}
```

---

### outputSystem

**Module:** `systems/outputSystem`
**Phase:** `POST_RENDER`
**Purpose:** Generates terminal output from the rendered buffer and writes to stdout

#### Main System Function

```typescript
function outputSystem(world: World): World
```

Generates terminal escape sequences from the rendered buffer and writes to the output stream.

#### Output Generation

```typescript
function generateOutput(world: World): string
function writeRaw(data: string): void
```

Generate output string or write directly to terminal.

**Example:**
```typescript
import { generateOutput, writeRaw } from 'blecsd';

// Generate escape sequences
const output = generateOutput(world);

// Write to terminal
writeRaw(output);
```

#### Screen Control

```typescript
function clearScreen(): void
function cursorHome(): void
function hideCursor(): void
function showCursor(): void
function enterAlternateScreen(): void
function leaveAlternateScreen(): void
function resetAttributes(): void
```

Low-level terminal control functions.

**Example:**
```typescript
import { enterAlternateScreen, leaveAlternateScreen, clearScreen } from 'blecsd';

// Setup
enterAlternateScreen();
clearScreen();

// ... app runs ...

// Cleanup
leaveAlternateScreen();
```

#### Buffer & Stream Access

```typescript
function getOutputBuffer(): string[]
function setOutputBuffer(buffer: string[]): void
function clearOutputBuffer(): void
function getOutputStream(): NodeJS.WriteStream
function setOutputStream(stream: NodeJS.WriteStream): void
function clearOutputStream(): void
```

Access and modify output buffer/stream.

#### State Management

```typescript
function createOutputState(): OutputState
function getOutputState(): OutputState
function resetOutputState(): void
function cleanup(): void
```

#### Factory

```typescript
function createOutputSystem(): System
```

#### Types

```typescript
interface OutputState {
  buffer: string[];
  stream: NodeJS.WriteStream;
  alternateScreen: boolean;
  cursorVisible: boolean;
}
```

---

### animationSystem

**Module:** `systems/animationSystem`
**Phase:** `ANIMATION`
**Purpose:** Updates sprite animation frames based on elapsed time

#### Main System Function

```typescript
function animationSystem(world: World): World
```

Updates all entities with Animation components based on delta time.

#### Animation Management

```typescript
function updateAnimations(world: World, deltaMs: number): void
function queryAnimation(world: World): number[]
function hasAnimationSystem(world: World, eid: number): boolean
function registerAnimationSystem(world: World): void
```

Control animation processing.

**Example:**
```typescript
import { createAnimation, animationSystem } from 'blecsd';

// Create animated sprite
const spriteEntity = addEntity(world);
setPosition(world, spriteEntity, 10, 10);

createAnimation(world, spriteEntity, {
  frames: [0, 1, 2, 3],  // Frame indices
  frameDuration: 100,     // 100ms per frame
  loop: true,
  playing: true,
});

// System updates automatically
animationSystem(world);  // Called by game loop
```

#### Factory

```typescript
function createAnimationSystem(): System
```

The animation system reads delta time from the scheduler and updates frame indices based on elapsed time.

---

### movementSystem

**Module:** `systems/movementSystem`
**Phase:** `ANIMATION`
**Purpose:** Updates entity positions based on velocity (physics/momentum)

#### Main System Function

```typescript
function movementSystem(world: World): World
```

Applies velocity to position for all entities with both components.

#### Movement Management

```typescript
function updateMovements(world: World, deltaMs: number): void
function queryMovement(world: World): number[]
function hasMovementSystem(world: World, eid: number): boolean
function registerMovementSystem(world: World): void
```

**Example:**
```typescript
import { setPosition, setVelocity, movementSystem } from 'blecsd';

// Create moving entity
const entity = addEntity(world);
setPosition(world, entity, 0, 0);
setVelocity(world, entity, 5, 0);  // 5 pixels/frame to the right

// System updates position automatically
movementSystem(world);  // Position.x[entity] is now 5
```

#### Factory

```typescript
function createMovementSystem(): System
```

The movement system applies simple Euler integration: `position += velocity * deltaTime`.

---

## System Registration

Systems must be registered with the scheduler to run automatically:

```typescript
import { createScheduler, LoopPhase } from 'blecsd';
import {
  createInputSystem,
  createLayoutSystem,
  createRenderSystem,
  createOutputSystem,
} from 'blecsd';

const scheduler = createScheduler(world, {
  targetFPS: 60,
});

// Register systems to specific phases
scheduler.addSystem(LoopPhase.INPUT, createInputSystem());
scheduler.addSystem(LoopPhase.LAYOUT, createLayoutSystem());
scheduler.addSystem(LoopPhase.RENDER, createRenderSystem());
scheduler.addSystem(LoopPhase.POST_RENDER, createOutputSystem());

// Start game loop
scheduler.start();
```

## System Execution Order

Systems run in this order each frame:

1. **INPUT** - inputSystem (processes keyboard/mouse)
2. **EARLY_UPDATE** - (custom game logic)
3. **UPDATE** - focusSystem, custom systems
4. **LATE_UPDATE** - (custom post-update logic)
5. **ANIMATION** - animationSystem, movementSystem (physics)
6. **LAYOUT** - layoutSystem (compute positions/sizes)
7. **RENDER** - renderSystem (draw to buffer)
8. **POST_RENDER** - outputSystem (write to terminal)

See [System Execution Order Guide](../guides/system-execution-order.md) for details.

## Writing Custom Systems

```typescript
import { defineSystem, query, World } from 'blecsd';
import { Position, Velocity, Health } from 'blecsd';

// Define a system
const damageOverTimeSystem = defineSystem((world: World) => {
  const entities = query(world, [Position, Health]);

  for (const eid of entities) {
    // Apply damage
    Health.current[eid] = Math.max(0, (Health.current[eid] ?? 0) - 1);
  }

  return world;
});

// Register it
scheduler.addSystem(LoopPhase.UPDATE, damageOverTimeSystem);
```

### System Best Practices

1. **Keep systems pure** - no side effects except to world state
2. **Use queries** - let the ECS find matching entities
3. **Batch operations** - process all entities in one pass
4. **Respect phases** - input first, layout before render
5. **Handle edge cases** - check for undefined component values
6. **Profile performance** - use frameBudget system to track timing

## See Also

### Specialized Systems

The following systems are available for advanced use cases:

- **collisionSystem** - AABB collision detection and trigger zones
- **dragSystem** - Mouse drag and drop operations
- **spatialHashSystem** - Spatial partitioning for large worlds
- **smoothScrollSystem** - Physics-based smooth scrolling
- **particleSystem** - Particle effects (explosions, trails, etc.)
- **behaviorSystem** - AI behavior trees
- **cameraSystem** - Viewport and camera control
- **tilemapRendererSystem** - Efficient tilemap rendering
- **stateMachineSystem** - State machine processing
- **virtualizedRenderSystem** - Efficient rendering of large scrollable content
- **visibilityCullingSystem** - Only render visible entities
- **workerPoolSystem** - Offload work to background threads
- **panelMovementSystem** - Window dragging and resizing
- **frameBudgetSystem** - Performance monitoring and budget management

Full documentation for these systems will be added in a future update (tracked in #1103).

## Related Documentation

- [Understanding ECS](../guides/understanding-ecs.md)
- [System Execution Order](../guides/system-execution-order.md)
- [Testing Systems](../guides/testing.md#testing-ecs-systems)
- [Components API](./components.md)
