# Widgets vs Components

This document clarifies the relationship between **widgets**, **components**, and **entity factories** in blECSd, and provides guidance on when to use each abstraction layer.

## Three Abstraction Layers

blECSd provides three layers of abstraction for building terminal UIs:

```
┌────────────────────────────────────┐
│  Layer 3: Widgets (Behavior)      │  High-level, stateful wrappers
├────────────────────────────────────┤
│  Layer 2: Entity Factories (Setup)│  Pre-configured entity creation
├────────────────────────────────────┤
│  Layer 1: Components (Data)        │  Raw ECS data containers
└────────────────────────────────────┘
```

### Layer 1: Components (Pure Data)

**Components** are the foundation - they hold data in typed arrays for efficient processing.

```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { Position, Dimensions, setContent } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Add components first
addComponent(world, eid, Position);
addComponent(world, eid, Dimensions);

// Components are just data containers
Position.x[eid] = 10;
Position.y[eid] = 5;
Dimensions.width[eid] = 40;
Dimensions.height[eid] = 10;

// Content uses a helper function (strings are stored separately from typed arrays)
setContent(world, eid, 'Hello, World!');
```

**Characteristics**:
- **Pure data** - no behavior, just typed arrays
- **Processed by systems** - systems iterate over component data
- **Lowest level** - direct access to ECS internals
- **Maximum flexibility** - compose any combination of components

**When to use**:
- Building a custom TUI framework on top of blECSd
- Performance-critical code that needs direct array access
- Custom entities with unique component combinations

---

### Layer 2: Entity Factories (Composition)

**Entity factories** create entities with pre-configured components. They return entity IDs.

```typescript
import { createWorld, createBoxEntity, createButtonEntity } from 'blecsd/core';
import { Position, setContent, BorderType } from 'blecsd/components';

const world = createWorld();

// Factory creates entity and sets up components
const box = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 40,
  height: 10,
  border: { type: BorderType.Line },
});

// box is just an entity ID (number)
console.log(typeof box);  // "number"

// You can still use component functions on it
Position.x[box] += 5;
setContent(world, box, 'New text');
```

**Characteristics**:
- **No behavior** - just entity creation and setup
- **Return entity IDs** - not objects with methods
- **Composable** - entities created by factories are just entities
- **Validated** - use Zod schemas to validate configuration

**When to use**:
- Creating standard UI elements (boxes, buttons, inputs)
- Rapid prototyping
- When you want ECS flexibility with convenience
- Building blocks for custom widgets

---

### Layer 3: Widgets (Behavior + State)

**Widgets** are higher-level wrappers that add methods and manage internal state.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createList } from 'blecsd/widgets';
import { getListState } from 'blecsd/components';

const world = createWorld();
const entity = addEntity(world);

// Widget returns an object with methods
const list = createList(world, entity, {
  items: ['Item 1', 'Item 2', 'Item 3'],
});

// Widget has methods
list.selectNext();
list.selectPrev();
list.addItem('Item 4');
list.removeItem(1);
list.getSelectedItem()?.text; // "Item 2"

// Widget state is accessed via component functions
const state = getListState(world, entity);
```

**Characteristics**:
- **Behavior + state** - methods and internal state management
- **Higher-level API** - simpler for common use cases
- **Built on components** - widgets use components under the hood
- **Less flexible** - trade flexibility for convenience

**When to use**:
- Rapid application development
- Complex UI patterns (modals, file managers, charts)
- When you need convenience over fine-grained control
- Prototyping

---

## Comparison Table

| Aspect | Components | Entity Factories | Widgets |
|--------|-----------|------------------|---------|
| **Abstraction Level** | Low | Medium | High |
| **Return Type** | N/A (direct array access) | Entity ID (number) | Widget object |
| **Behavior** | None (data only) | None (setup only) | Methods + state |
| **Flexibility** | Maximum | High | Limited |
| **Ease of Use** | Requires ECS knowledge | Moderate | Easy |
| **Performance** | Fastest (direct access) | Fast | Good |
| **Typical Use** | Framework building | App development | Rapid prototyping |

## When to Use Each

### Use Components When:

✅ **Building a custom TUI framework**

```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { Position } from 'blecsd/components';

// Custom framework with unique layout system
const world = createWorld();
// Create multiple entities (e.g. 100) and attach components
const entities = Array.from({ length: 5 }, () => addEntity(world));
for (const eid of entities) {
  addComponent(world, eid, Position);
  // Attach your custom components as needed
}
```

✅ **Performance-critical code**

```typescript
import { createWorld, addEntity, query } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';

// Direct array access for tight loops
const world = createWorld();
const deltaTime = 1 / 60;
const entities = query(world, [Position, Velocity]);
for (const eid of entities) {
  Position.x[eid] += Velocity.x[eid] * deltaTime;
  Position.y[eid] += Velocity.y[eid] * deltaTime;
}
```

✅ **Custom entity types**

```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';

// Unique combination not provided by factories
const world = createWorld();
const customEntity = addEntity(world);
addComponent(world, customEntity, Position);
addComponent(world, customEntity, Velocity);
// Attach your custom components (e.g. ParticleEmitter, Trail)
```

---

### Use Entity Factories When:

✅ **Creating standard UI elements**

```typescript
import { createWorld, createBoxEntity, createButtonEntity, createTextboxEntity } from 'blecsd/core';

// Common UI patterns
const world = createWorld();
const box = createBoxEntity(world, { x: 10, y: 5, width: 40, height: 10 });
const button = createButtonEntity(world, { label: 'Click me' });
const input = createTextboxEntity(world, { placeholder: 'Enter text...' });
void box; void button; void input;
```

✅ **Building custom widgets**

```typescript
import { createWorld, createBoxEntity, createTextEntity, createButtonEntity } from 'blecsd/core';
import type { World, Entity } from 'blecsd/core';

// Use factories as building blocks
const createCustomWidget = (world: World): Entity => {
  const container = createBoxEntity(world, { width: 50, height: 20 });
  createTextEntity(world, { text: 'Title' });
  createButtonEntity(world, { label: 'OK' });

  return container;
};

const world = createWorld();
const widget = createCustomWidget(world);
void widget;
```

✅ **When you need ECS flexibility**

```typescript
import { createWorld, createBoxEntity, addComponent } from 'blecsd/core';
import { Velocity } from 'blecsd/components';

// Factory creates entity, then you customize with components
const world = createWorld();
const box = createBoxEntity(world, { x: 10, y: 5, width: 40, height: 10 });

// Add physics after creation
addComponent(world, box, Velocity);
Velocity.x[box] = 5;
Velocity.y[box] = 0;
```

---

### Use Widgets When:

✅ **Rapid application development**

```typescript
import { createWorld } from 'blecsd/core';
import { createFileManager } from 'blecsd/widgets';

// Widgets handle complex behavior for you
const world = createWorld();
const fileManager = createFileManager(world, {
  cwd: '/home/user',
});
fileManager.onSelect((entry) => console.log(`Selected: ${entry.name}`));

// Methods make it easy
fileManager.setCwd('/home/user/documents');
fileManager.refresh();
```

✅ **Complex UI patterns**

```typescript
import { createWorld } from 'blecsd/core';
import { createModal } from 'blecsd/widgets';

// Modal dialog with automatic focus management
const world = createWorld();
const modal = createModal(world, {
  content: 'Are you sure you want to proceed?',
  width: 40,
  height: 10,
  closeOnEscape: true,
});
modal.onClose(() => console.log('Modal closed'));

modal.show();
// modal.hide() when done
```

✅ **Prototyping**

```typescript
import { createWorld } from 'blecsd/core';
import { createLineChart } from 'blecsd/widgets';

// Quick UI for testing ideas
const protoWorld = createWorld();
const chart = createLineChart(protoWorld, {
  series: [{ label: 'Revenue', data: [1, 3, 2, 5, 4] }],
  width: 60,
  height: 20,
});

chart.appendToSeries(0, 6);
chart.setSeries([{ label: 'Revenue', data: [2, 4, 3, 6, 5] }]);
```

---

## Interoperability

**All three layers are interoperable** - you can mix and match freely.

### Widgets Are Built on Components

Widgets use components under the hood:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { moveBy, setStyle, setDimensions } from 'blecsd/components';
import { createList } from 'blecsd/widgets';

const listWorld = createWorld();
const listEid = addEntity(listWorld);
const list = createList(listWorld, listEid, { items: ['A', 'B', 'C'] });

// listEid is just an entity ID, so all component functions work
moveBy(listWorld, listEid, 10, 0);
setStyle(listWorld, listEid, { fg: 0xff0000ff });
setDimensions(listWorld, listEid, 50, 20);
```

### Entity Factories Return Entity IDs

Entity IDs can be used with any component function:

```typescript
import { createWorld, createBoxEntity, createButtonEntity, addComponent, removeComponent } from 'blecsd/core';
import { Velocity, Border, setParent } from 'blecsd/components';

const btnWorld = createWorld();
const container = createBoxEntity(btnWorld, { x: 0, y: 0, width: 80, height: 24 });
const button = createButtonEntity(btnWorld, { label: 'Click me' });

// button is just an entity ID (number)
addComponent(btnWorld, button, Velocity);  // Add physics
setParent(btnWorld, button, container);    // Re-parent
removeComponent(btnWorld, button, Border); // Remove border
```

### Mixing All Three Layers

```typescript
import { createWorld, createBoxEntity, addComponent } from 'blecsd/core';
import { Position, Velocity } from 'blecsd/components';
import { createLineChart } from 'blecsd/widgets';

const mixWorld = createWorld();

// Use a factory to create the container
const mixContainer = createBoxEntity(mixWorld, {
  x: 10,
  y: 5,
  width: 80,
  height: 30,
});

// Use a widget for complex behavior
// createLineChart creates its own entity, returns a widget object
const mixChart = createLineChart(mixWorld, {
  data: [1, 2, 3, 4, 5],
  width: 60,
  height: 15,
});

// Use components for direct control on the chart's entity
const chartEid = mixChart.eid;
Position.x[chartEid] = 15;
addComponent(mixWorld, chartEid, Velocity); // Add animation component
```

---

## Common Questions

### Q: Can I access components on widget entities?

**Yes.** Widgets are built on components - the entity they manage is a regular ECS entity.

```typescript
import { createWorld } from 'blecsd/core';
import { Position, Dimensions, setContent } from 'blecsd/components';
import { createModal } from 'blecsd/widgets';

const modalWorld = createWorld();
const modal = createModal(modalWorld, { content: 'Hello' });
const modalEid = modal.eid;

// You can access components directly
Position.x[modalEid] = 50;
Dimensions.width[modalEid] = 60;

// Or use helper functions
setContent(modalWorld, modalEid, 'New title');
```

### Q: Should I use factories or widgets?

**It depends on your needs**:

- **Factories**: When you want ECS flexibility and don't need complex behavior
- **Widgets**: When you want convenience and pre-built behavior

Most applications use **both** - factories for simple elements, widgets for complex ones.

### Q: Can I create custom entity factories?

**Yes.** Entity factories are just functions:

```typescript
import { addEntity, addComponent } from 'blecsd/core';
import { Position, Dimensions } from 'blecsd/components';

export function createCustomPanelEntity(
  world: World,
  config: CustomPanelConfig,
): Entity {
  const eid = addEntity(world);

  addComponent(world, eid, Position);
  addComponent(world, eid, Dimensions);
  // ... add more components

  Position.x[eid] = config.x ?? 0;
  Position.y[eid] = config.y ?? 0;

  return eid;
}
```

### Q: What's the difference between a widget and a factory?

**Factories** return entity IDs and do no state management:

```typescript
const box = createBoxEntity(world, { x: 10, y: 5, width: 40, height: 10 });
console.log(typeof box);  // "number"
```

**Widgets** return objects with methods and manage state:

```typescript
const list = createList(world, entity, { items: ['A', 'B', 'C'] });
console.log(typeof list);  // "object"
list.selectNext();  // Widget has methods
```

### Q: Can I turn a factory-created entity into a widget?

**Yes**, by attaching widget behavior:

```typescript
import { createWorld, createListEntity } from 'blecsd/core';
import { Position } from 'blecsd/components';
import { createList } from 'blecsd/widgets';

const listFactoryWorld = createWorld();

// Create entity with factory
const listFactoryEntity = createListEntity(listFactoryWorld, { items: ['A', 'B', 'C'] });

// Add widget behavior
const listWidget = createList(listFactoryWorld, listFactoryEntity, {});

// Now you have both: entity ID and widget methods
Position.x[listFactoryEntity] = 10;  // Use as entity
listWidget.selectNext();  // Use as widget
```

---

## Design Philosophy

blECSd follows a **library-first design** philosophy:

1. **Components** give you the raw building blocks
2. **Entity factories** provide convenient setup
3. **Widgets** add optional high-level behavior

You can use any layer without being forced into the others. Pick the abstraction level that fits your needs.

**Example**:

```typescript
import { createWorld, addEntity, addComponent, createBoxEntity } from 'blecsd/core';
import { Position } from 'blecsd/components';
import { createModal } from 'blecsd/widgets';

const exWorld = createWorld();

// Low-level: Direct component access
const eid = addEntity(exWorld);
addComponent(exWorld, eid, Position);
Position.x[eid] = 10;

// Mid-level: Entity factory
const box = createBoxEntity(exWorld, { x: 10, y: 5, width: 40, height: 10 });
void box;

// High-level: Widget
const modal = createModal(exWorld, { content: 'Hello' });
void modal;
```

All three approaches are valid - choose based on your requirements.

---

## Examples

### Building a Simple Dashboard

Mix factories and components:

```typescript
import { createWorld, createBoxEntity, createTextEntity, createButtonEntity, addEntity } from 'blecsd/core';

const world = createWorld();

// Container (factory)
const dashboard = createBoxEntity(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 24,
});

// Title (factory)
const title = createTextEntity(world, {
  parent: dashboard,
  x: 2,
  y: 1,
  text: 'Dashboard',
});

// Other widgets can be added later if needed
const button = createButtonEntity(world, {
  parent: dashboard,
  label: 'Refresh',
});
```

### Building a Custom Framework

Use components directly:

```typescript
import { addEntity, addComponent } from 'blecsd/core';
import { Position } from 'blecsd/components';

// Framework creates entities with unique components
function createFrameworkElement(world: World): Entity {
  const eid = addEntity(world);

  addComponent(world, eid, Position);
  // Add your own custom components here

  return eid;
}
```

### Rapid Prototyping

Use widgets for quick iteration:

```typescript
import { createWorld } from 'blecsd/core';
import { createFileManager, createModal } from 'blecsd/widgets';

const world = createWorld();

// Quick prototype with pre-built widgets
const fileManager = createFileManager(world, {
  cwd: '/home/user',
});
void fileManager;

const modal = createModal(world, {
  content: 'File uploaded successfully.',
  width: 40,
  height: 8,
});
void modal;
```

---

## See Also

- [Entity Factories API](../api/entities.md) - Entity factory documentation
- Components Reference - Component documentation
- Widgets Reference - Widget documentation
- [Understanding ECS](../guides/understanding-ecs.md) - ECS concepts guide
