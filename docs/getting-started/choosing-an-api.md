# Choosing an API

blECSd provides **two different APIs** for building terminal applications. This guide helps you choose which one to use.

## Two Paths

```
┌─────────────────────────────────────────────────┐
│         Which API Should I Use?                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Do you need rapid development or full control? │
│                                                 │
│     Rapid Development      Full Control         │
│          │                   │                  │
│          ▼                   ▼                  │
│    Widget API           Low-Level ECS API       │
│  (Convenience)          (Maximum Flexibility)   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Option 1: Widget API (High-Level)

**Best for**: Rapid application development, complex UI patterns, prototyping

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createList, createModal } from 'blecsd/widgets';

const world = createWorld();
const listEntity = addEntity(world);

// Widgets provide methods and manage state
const list = createList(world, listEntity, {
  items: ['Option 1', 'Option 2', 'Option 3'],
  x: 10,
  y: 5,
});

// Use widget methods
list.selectNext();
list.selectPrev();

const modal = createModal(world, {
  title: 'Confirm',
  content: 'Are you sure?',
});

modal.show();
```

**Characteristics**:
- Simple, intuitive API
- Pre-built complex behaviors
- Methods for common operations
- Good for beginners
- Less flexibility
- Trade control for convenience

---

### Option 2: Low-Level ECS API

**Best for**: Custom frameworks, tools, complex TUIs, maximum control, performance-critical code

```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';
import { Position, Dimensions } from 'blecsd/components';

const world = createWorld();
const entity = addEntity(world);

// Direct component access
addComponent(world, entity, Position);
addComponent(world, entity, Dimensions);

setPosition(world, entity, 10, 5);
setDimensions(world, entity, 40, 10);

// Or use entity factories for convenience
import { createBoxEntity } from 'blecsd/core';
const box = createBoxEntity(world, { x: 10, y: 5, width: 40, height: 10 });
```

**Characteristics**:
- Maximum flexibility
- Direct ECS access
- Custom component combinations
- Performance control
- Steeper learning curve
- More boilerplate

---

## Decision Tree

### Use the **Widget API** if:

- You're building a **complex UI** (modals, file managers, charts)
- You want to **get started quickly**
- You're **new to ECS**
- You want **pre-built behaviors**
- You're **prototyping** an idea

**Example use cases**:
- File managers with pre-built navigation
- Modal dialogs
- Interactive menus and lists
- Dashboards with charts
- Prototypes

---

### Use the **Low-Level ECS API** if:

- You need **full control** over the ECS world
- You're building a **custom framework or tool**
- You need **custom component combinations**
- You're familiar with **ECS patterns**
- You need **maximum performance**

**Example use cases**:
- Custom TUI frameworks
- IDE-like applications
- Performance-critical terminal games
- Complex data visualization tools
- Applications with unique component needs

---

## Comparison

| Feature | Widget API | ECS API |
|---------|------------|---------|
| **Ease of Use** | Easy | Moderate |
| **Learning Curve** | Gentle | Steep |
| **Boilerplate** | Minimal | More |
| **Flexibility** | Limited | Maximum |
| **ECS Knowledge** | Not required | Required |
| **State Management** | Automatic | Manual |
| **Pre-built Behaviors** | Yes | No |
| **Performance** | Good | Best (with tuning) |
| **Custom Components** | Limited | Full control |

---

## Can I Mix Both?

**Yes!** Widgets are built on components and entity factories, so you can mix freely:

```typescript
import { createWorld, addEntity, addComponent } from 'blecsd/core';
import { createList } from 'blecsd/widgets';
import { Velocity, Position } from 'blecsd/components';

const world = createWorld();
const listEntity = addEntity(world);

// Use widget for complex behavior
const list = createList(world, listEntity, {
  items: ['Option 1', 'Option 2', 'Option 3'],
});

// Access underlying ECS components
addComponent(world, listEntity, Velocity);
Velocity.x[listEntity] = 5;

// Direct component access still works
Position.y[listEntity] += 10;
```

This gives you the **convenience of widgets** with the **power of the ECS API** when needed.

---

## Interoperability

### Widgets on Entity Factories

Widgets can wrap entities created by factories:

```typescript
import { createWorld, createListEntity } from 'blecsd/core';
import { createList } from 'blecsd/widgets';
import { Position } from 'blecsd/components';

const world = createWorld();

// Create entity with factory
const entity = createListEntity(world, { items: ['A', 'B', 'C'] });

// Add widget behavior
const listWidget = createList(world, entity, {});

// Now you have both: entity ID and widget methods
Position.x[entity] = 10;  // Use as entity
listWidget.selectNext();   // Use as widget
```

### Entity Factories Without Widgets

You can use factories without ever touching widgets:

```typescript
import { createWorld, createBoxEntity, createTextEntity } from 'blecsd/core';
import { Position } from 'blecsd/components';

const world = createWorld();

// Just use factories - no widgets needed
const box = createBoxEntity(world, { x: 10, y: 5, width: 20, height: 10 });
const text = createTextEntity(world, { parent: box, text: 'Hello' });

// Direct component access
Position.x[box] = 15;
```

---

## Examples

### Widget API Example: File Browser

```typescript
import { createWorld } from 'blecsd/core';
import { createFileManager } from 'blecsd/widgets';

const world = createWorld();

// Widget handles all the complexity
const fileManager = createFileManager(world, {
  cwd: '/home/user',
  width: 80,
  height: 24,
});

// Simple method calls
fileManager.show();
fileManager.refresh();
```

### ECS API Example: Custom File Manager

```typescript
import { createWorld, createBoxEntity, createListEntity, addComponent } from 'blecsd/core';
import { Position, Dimensions } from 'blecsd/components';

const world = createWorld();

// Build your own file manager with full control
const sidebar = createBoxEntity(world, { x: 0, y: 0, width: 20, height: 24 });
const fileList = createListEntity(world, {
  parent: sidebar,
  items: ['file1.txt', 'file2.txt', 'file3.txt'],
});

// Custom components for your specific needs
addComponent(world, fileList, Position);
Position.y[fileList] = 2;

// You control when systems run, what components exist, etc.
```

---

## Next Steps

### If you chose the **Widget API**:

1. Read: Widgets Reference
2. Try: [Widget Examples](../examples/)
3. Learn: [Widgets vs Components](../architecture/widgets-vs-components.md)

### If you chose the **ECS API**:

1. Read: [ECS API Getting Started](./ecs-api.md)
2. Read: [Understanding ECS](../guides/understanding-ecs.md)
3. Read: [Export Patterns](../guides/export-patterns.md) - Learn about namespace imports
4. Reference: [Entity Factories](../api/entities.md)
5. Reference: Components

---

## Import Patterns

blECSd provides two main import styles. **Subpath imports are recommended** for all applications.

### Recommended: Subpath Imports

Import from domain-specific subpaths for the best developer experience:

```typescript
// Core ECS functions
import { createWorld, addEntity } from 'blecsd/core';

// Components (position, velocity, dimensions, etc.)
import { setPosition, getPosition, setVelocity } from 'blecsd/components';

// Systems (output, render, input, etc.)
import { writeRaw, cursorHome, enterAlternateScreen, setOutputStream } from 'blecsd/systems';

// Terminal I/O (input parsing, program management)
import { parseKeyBuffer, createProgram } from 'blecsd/terminal';

// Utilities (cell buffers, text wrapping, colors)
import { createCellBuffer, renderText, packColor } from 'blecsd/utils';

// Widgets (high-level UI components)
import { createList, createModal } from 'blecsd/widgets';
```

Subpath imports provide:
- Clear organization by domain (components, systems, terminal, utils)
- Full access to every exported function
- Reduced naming conflicts
- Better code navigation and searchability

### Alternative: Main Entry (`'blecsd'`)

The main `'blecsd'` entry re-exports a curated subset of common functions:

```typescript
import { createWorld, addEntity, setPosition, clearScreen, writeRaw } from 'blecsd';
```

This is convenient for small scripts, but the subpath imports give you access to the full API surface. If an import fails from `'blecsd'`, check the subpath modules.

### Available Subpaths

| Subpath | Contents |
|---------|----------|
| `blecsd/core` | World, entities, ECS primitives, signals |
| `blecsd/components` | Position, velocity, dimensions, content, style |
| `blecsd/systems` | Output, render, input, layout, animation, focus |
| `blecsd/terminal` | Input parsing, program management, ANSI codes |
| `blecsd/utils` | Cell buffers, text wrapping, rope, colors |
| `blecsd/widgets` | High-level widgets (list, modal, table, etc.) |

See the [Export Patterns Guide](../guides/export-patterns.md) for complete details.

---

## Summary

- **Widget API**: Simple, beginner-friendly, great for rapid development and complex UI patterns
- **ECS API**: Powerful, flexible, best for custom tools and performance-critical applications
- **Both are valid**: Pick based on your needs, not dogma
- **You can mix them**: Widgets are built on components and can be combined with ECS code
