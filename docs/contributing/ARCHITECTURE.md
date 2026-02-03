# Architecture Overview

This document describes the high-level architecture of blECSd.

## Design Philosophy

### Library, Not Framework

blECSd is designed as a library that you integrate into your application, not a framework that controls your application. This means:

1. **You own the world**: Create your own bitECS world, use our components
2. **You own the loop**: Call our systems when you want, or use our optional scheduler
3. **You choose what to use**: Mix our input parsing with your rendering, or vice versa
4. **No global state**: All functions take `world` as a parameter

### Entity Component System

blECSd uses bitECS for high-performance data management:

```
Entities     [0, 1, 2, 3, 4, ...]           // Just IDs
             ↓
Components   Position.x[eid] = 10           // Data stores (SoA)
             Position.y[eid] = 20
             Renderable.fg[eid] = 0xffffff
             ↓
Systems      positionSystem(world)          // Process entities
             renderSystem(world)
```

**Why ECS?**

- **Performance**: Structure-of-Arrays layout enables CPU cache-friendly batch processing
- **Composition**: Build complex UIs by combining simple components
- **Flexibility**: Same architecture works for simple menus and complex games
- **Testability**: Pure functions on data are easy to test

### Functional Programming

blECSd uses functional programming exclusively:

- **Pure functions**: Input → Output, no side effects
- **No classes**: Data is plain objects, behavior is functions
- **Immutable patterns**: Prefer creating new data over mutation
- **Composition**: Build complex behavior from simple functions

## Core Modules

### Terminal Layer (`src/terminal/`)

Low-level terminal I/O handling:

```
┌─────────────────────────────────────────────┐
│                 Application                  │
├─────────────────────────────────────────────┤
│              Terminal Layer                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────────┐ │
│  │ Program │  │  Input  │  │  Renderer   │ │
│  │ (tput)  │  │ Parser  │  │  (buffer)   │ │
│  └────┬────┘  └────┬────┘  └──────┬──────┘ │
│       │            │              │         │
├───────┼────────────┼──────────────┼─────────┤
│       ↓            ↓              ↓         │
│     stdout       stdin          buffer      │
│              Terminal (TTY)                 │
└─────────────────────────────────────────────┘
```

- **Program**: Terminal control (cursor, colors, modes)
- **Input Parser**: Keyboard and mouse event parsing
- **Renderer**: Screen buffer and output

### Components (`src/components/`)

ECS components for UI state:

| Component | Purpose |
|-----------|---------|
| Position | X/Y coordinates, z-index |
| Dimensions | Width, height, constraints |
| Renderable | Colors, visibility, dirty flag |
| Hierarchy | Parent-child relationships |
| Focusable | Keyboard focus state |
| Interactive | Mouse interaction state |
| Scrollable | Scroll position, content size |
| Border | Box border style |
| Content | Text content, alignment |
| Velocity | Movement for animations |
| Collision | Collision detection |

Components are Structure-of-Arrays (SoA):

```typescript
const Position = {
  x: new Float32Array(10000),
  y: new Float32Array(10000),
  z: new Int32Array(10000),
};

// Access: Position.x[entityId]
```

### Systems (`src/systems/`)

Functions that process entities with specific components:

```typescript
function movementSystem(world: World): World {
  const entities = movementQuery(world);

  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid];
    Position.y[eid] += Velocity.y[eid];
  }

  return world;
}
```

**System Order** (via Scheduler):

1. **INPUT**: Process keyboard/mouse (always first)
2. **EARLY_UPDATE**: Pre-update logic
3. **UPDATE**: Main update logic
4. **LATE_UPDATE**: Post-update logic
5. **ANIMATION**: Physics, tweens, transitions
6. **LAYOUT**: Calculate positions and sizes
7. **RENDER**: Write to screen buffer
8. **POST_RENDER**: Cleanup

### Widgets (`src/widgets/`)

High-level factory functions that create configured entities:

```typescript
const panel = createPanel(world, entity, {
  x: 10,
  y: 5,
  width: 40,
  height: 20,
  title: 'My Panel',
  border: 'rounded',
});
```

Widgets return interfaces with methods for common operations:

```typescript
panel.setTitle('New Title');
panel.show();
panel.destroy();
```

### Events (`src/core/events.ts`)

Type-safe event bus for application-level events:

```typescript
interface AppEvents {
  'item:selected': { id: string; value: unknown };
  'dialog:closed': { result: 'ok' | 'cancel' };
}

const events = createEventBus<AppEvents>();

events.on('item:selected', (e) => {
  console.log(e.id, e.value);
});

events.emit('item:selected', { id: 'item1', value: 42 });
```

## Data Flow

### Input Flow

```
Terminal Input (stdin)
        ↓
   Input Parser (parseKeyBuffer, parseMouseSequence)
        ↓
   Key/Mouse Event
        ↓
   Input System (LoopPhase.INPUT)
        ↓
   Component Updates (Focusable, Interactive, etc.)
        ↓
   Application Logic
```

### Render Flow

```
Application State
        ↓
   Layout System (calculate positions)
        ↓
   Render System (write to buffer)
        ↓
   Output System (flush to terminal)
        ↓
Terminal Output (stdout)
```

### Entity Lifecycle

```
1. Create Entity     addEntity(world)
2. Add Components    setPosition(world, eid, x, y)
                     setRenderable(world, eid, ...)
3. Systems Process   layoutSystem(world)
                     renderSystem(world)
4. Remove Entity     removeEntity(world, eid)
```

## Key Patterns

### Virtualization

For large datasets, only visible items become entities:

```
Data: [item0, item1, item2, ..., item9999]  (10,000 items)
                    ↓
Viewport: start=100, count=50
                    ↓
Entities: [eid100, eid101, ..., eid149]     (50 entities)
```

### Dirty Tracking

Only re-render changed entities:

```typescript
if (Renderable.dirty[eid]) {
  renderEntity(world, eid);
  Renderable.dirty[eid] = 0;
}
```

### Component Queries

Use bitECS queries for efficient entity filtering:

```typescript
const visibleQuery = defineQuery([Position, Renderable]);
const focusableQuery = defineQuery([Focusable]);

function renderSystem(world: World): World {
  for (const eid of visibleQuery(world)) {
    if (Renderable.visible[eid]) {
      render(eid);
    }
  }
  return world;
}
```

### Hierarchy Traversal

Parent-child relationships via Hierarchy component:

```typescript
function getChildren(world: World, eid: Entity): Entity[] {
  return Hierarchy.children[eid] ?? [];
}

function traverseTree(world: World, root: Entity, fn: (eid: Entity) => void): void {
  fn(root);
  for (const child of getChildren(world, root)) {
    traverseTree(world, child, fn);
  }
}
```

## Extension Points

### Custom Components

Create your own components:

```typescript
const MyComponent = {
  value: new Float32Array(10000),
};

function setMyComponent(world: World, eid: Entity, value: number): void {
  MyComponent.value[eid] = value;
}
```

### Custom Systems

Create systems that process your components:

```typescript
const myQuery = defineQuery([MyComponent, Position]);

function mySystem(world: World): World {
  for (const eid of myQuery(world)) {
    // Process entity
  }
  return world;
}
```

### Custom Widgets

Create factory functions for complex entities:

```typescript
function createMyWidget(world: World, entity: Entity, config: Config): MyWidget {
  // Set up components
  // Return widget interface
}
```

## Performance Considerations

### Entity Count

- Each entity is just an integer ID
- Components use typed arrays (fast, cache-friendly)
- Aim for < 10,000 entities for complex UIs
- Use virtualization for large datasets

### System Complexity

- Systems run every frame
- O(n) complexity per system is acceptable
- Avoid O(n²) operations in systems
- Use dirty tracking to skip unchanged entities

### Memory

- Typed arrays pre-allocate space
- Default capacity: 10,000 entities
- Increase capacity for entity-heavy applications
- Watch for memory leaks in event handlers

## Testing Strategy

### Unit Tests

Test pure functions in isolation:

```typescript
it('parses hex color', () => {
  expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
});
```

### Integration Tests

Test systems with real worlds:

```typescript
it('moves entity based on velocity', () => {
  const world = createWorld();
  const eid = addEntity(world);
  // Setup and test
});
```

### Widget Tests

Test widget behavior:

```typescript
it('panel shows title', () => {
  const world = createWorld();
  const panel = createPanel(world, addEntity(world), { title: 'Test' });
  expect(getPanelTitle(world, panel.eid)).toBe('Test');
});
```

## Related Documentation

- [Development Guide](./DEVELOPMENT.md): Setup and workflow
- [Contributing Guide](./CONTRIBUTING.md): How to contribute
- [API Reference](../api/): Component and system documentation
