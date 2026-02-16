# Widget Registry

The Widget Registry provides centralized widget registration and creation by name. This is useful for dynamic UI building from configuration files, serialization/deserialization of UI layouts, and plugin systems.

## Overview

```typescript
import {
  createWidgetRegistry,
  registerBuiltinWidgets,
  defaultRegistry,
  getWidgetTypes,
  isWidgetType,
  getWidgetsByTag,
} from 'blecsd';

// Create and use a custom registry
const registry = createWidgetRegistry();
registerBuiltinWidgets(registry);

// Create widgets by name
const box = registry.create(world, 'box', { width: 20, height: 10 });
const panel = registry.create(world, 'panel', { title: 'Hello' });

// Or use the pre-configured default registry
const text = defaultRegistry.create(world, 'text', { content: 'Hello!' });
```

---

## Why a Widget Registry?

A widget registry is particularly useful for:

1. **Data-Driven UI** - Load UI layouts from JSON/YAML configuration files
2. **Editor Tools** - Game editors can create widgets dynamically by name
3. **Serialization** - Save and restore UI state by storing widget type names
4. **Plugin Systems** - Allow third-party code to register custom widgets
5. **Discoverability** - Query available widgets and their capabilities

### Example: Loading UI from Config

```typescript
import { createWidgetRegistry, registerBuiltinWidgets } from 'blecsd';

const registry = createWidgetRegistry();
registerBuiltinWidgets(registry);

// UI layout loaded from a config file
const layout = {
  type: 'panel',
  config: { title: 'Game Menu' },
  children: [
    { type: 'text', config: { content: 'Start Game' } },
    { type: 'text', config: { content: 'Options' } },
    { type: 'text', config: { content: 'Quit' } },
  ],
};

// Recursively create widgets from layout
function createFromLayout(world, layout) {
  const widget = registry.create(world, layout.type, layout.config);
  for (const child of layout.children ?? []) {
    const childWidget = createFromLayout(world, child);
    widget.append(childWidget.eid);
  }
  return widget;
}

const menu = createFromLayout(world, layout);
```

---

## Factory Function

### createWidgetRegistry

Creates a new empty widget registry.

```typescript
import { createWidgetRegistry } from 'blecsd';

const registry = createWidgetRegistry();
```

**Returns:** `WidgetRegistry`

---

## WidgetRegistry Interface

### register

Registers a widget factory with the registry.

```typescript
registry.register('myWidget', {
  factory: (world, entity, config) => createMyWidget(world, entity, config),
  description: 'My custom widget',
  tags: ['custom', 'ui'],
});
```

**Parameters:**
- `name` - Widget type name (case-insensitive)
- `registration` - Object with `factory`, optional `description`, optional `tags`

**Returns:** `WidgetRegistry` for chaining

### alias

Creates an alias for an existing widget type.

```typescript
// Register original
registry.register('scrollableText', { factory: createScrollableText });

// Create aliases
registry.alias('log', 'scrollableText');
registry.alias('textarea', 'scrollableText');

// Now all three names work
registry.create(world, 'log', config);
```

**Parameters:**
- `alias` - The alias name
- `target` - The target widget type name

**Returns:** `WidgetRegistry` for chaining

**Throws:** Error if target does not exist

### has

Checks if a widget type is registered.

```typescript
if (registry.has('panel')) {
  const panel = registry.create(world, 'panel', config);
}
```

**Parameters:**
- `name` - Widget type name (case-insensitive)

**Returns:** `boolean`

### get

Gets the registration information for a widget type.

```typescript
const reg = registry.get('box');
console.log(reg?.description); // 'Basic container widget...'
console.log(reg?.tags);        // ['container', 'layout', 'basic']
```

**Returns:** `WidgetRegistration | undefined`

### create

Creates a widget with a new entity.

```typescript
const box = registry.create(world, 'box', { width: 20, height: 10 });
```

**Parameters:**
- `world` - The ECS world
- `name` - Widget type name (case-insensitive)
- `config` - Optional widget configuration

**Returns:** The created widget

**Throws:** Error if widget type is not registered

### createWithEntity

Creates a widget using a specific entity ID.

```typescript
const eid = addEntity(world);
const box = registry.createWithEntity(world, eid, 'box', { width: 20 });
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to use
- `name` - Widget type name
- `config` - Optional configuration

**Returns:** The created widget

### list

Lists all registered widget type names (sorted).

```typescript
const types = registry.list();
// ['box', 'layout', 'line', 'list', 'loading', 'panel', ...]
```

**Returns:** `readonly string[]`

### listByTag

Lists widget types that have a specific tag.

```typescript
const containers = registry.listByTag('container');
// ['box', 'layout', 'panel', 'scrollableBox', 'tabs']

const interactive = registry.listByTag('interactive');
// ['list', 'listTable', 'listbar', 'panel', 'tabs', 'tree']
```

**Returns:** `readonly string[]`

### unregister

Removes a widget type from the registry.

```typescript
registry.unregister('myWidget');
```

**Returns:** `boolean` - true if widget was removed

### clear

Removes all registrations and aliases.

```typescript
registry.clear();
```

---

## Builtin Widgets

### registerBuiltinWidgets

Registers all builtin blECSd widgets with a registry.

```typescript
import { createWidgetRegistry, registerBuiltinWidgets } from 'blecsd';

const registry = createWidgetRegistry();
registerBuiltinWidgets(registry);
```

**Registered Widgets:**

| Name | Aliases | Tags | Description |
|------|---------|------|-------------|
| `box` | - | container, layout, basic | Basic container with border/padding |
| `text` | - | display, text, basic | Simple text display |
| `line` | - | display, decoration, basic | Horizontal/vertical separator |
| `layout` | - | container, layout | Auto-arranging flex/grid/inline |
| `panel` | - | container, layout, interactive | Title bar with close/collapse |
| `tabs` | - | container, layout, navigation, interactive | Tabbed navigation |
| `scrollableBox` | scrollbox, scroll | container, scrolling | Scrollable container |
| `scrollableText` | log, textarea | display, text, scrolling | Scrollable text/logs |
| `list` | - | selection, interactive, data | Selectable list items |
| `listbar` | menubar, menu | navigation, interactive, menu | Horizontal menu bar |
| `table` | - | display, data | Data table |
| `listTable` | datatable, grid | selection, interactive, data | Selectable table |
| `tree` | treeview | selection, interactive, data, hierarchy | Tree view |
| `loading` | spinner, progress | display, feedback, animation | Loading indicator |
| `hoverText` | tooltip | feedback, tooltip | Tooltip manager |

---

## Default Registry

### defaultRegistry

A pre-configured registry with all builtin widgets registered.

```typescript
import { defaultRegistry } from 'blecsd';

// Use directly without setup
const box = defaultRegistry.create(world, 'box', { width: 20 });
const panel = defaultRegistry.create(world, 'panel', { title: 'Hello' });
```

---

## Utility Functions

### getWidgetTypes

Gets all widget type names from the default registry.

```typescript
import { getWidgetTypes } from 'blecsd';

const types = getWidgetTypes();
// ['box', 'hoverText', 'layout', 'line', 'list', ...]
```

### isWidgetType

Checks if a name is a valid widget type in the default registry.

```typescript
import { isWidgetType } from 'blecsd';

isWidgetType('box');     // true
isWidgetType('Box');     // true (case-insensitive)
isWidgetType('log');     // true (alias)
isWidgetType('custom');  // false
```

### getWidgetsByTag

Gets widget types by tag from the default registry.

```typescript
import { getWidgetsByTag } from 'blecsd';

getWidgetsByTag('container');
// ['box', 'layout', 'panel', 'scrollableBox', 'tabs']

getWidgetsByTag('scrolling');
// ['scrollableBox', 'scrollableText']
```

---

## Types

### WidgetFactory

```typescript
type WidgetFactory<TConfig = unknown, TWidget = unknown> = (
  world: World,
  entity: Entity,
  config?: TConfig,
) => TWidget;
```

### WidgetRegistration

```typescript
interface WidgetRegistration<TConfig = unknown, TWidget = unknown> {
  readonly factory: WidgetFactory<TConfig, TWidget>;
  readonly description?: string;
  readonly tags?: readonly string[];
}
```

### WidgetRegistry

```typescript
interface WidgetRegistry {
  register(name: string, registration: WidgetRegistration): WidgetRegistry;
  alias(alias: string, target: string): WidgetRegistry;
  has(name: string): boolean;
  get(name: string): WidgetRegistration | undefined;
  create<T>(world: World, name: string, config?: unknown): T;
  createWithEntity<T>(world: World, entity: Entity, name: string, config?: unknown): T;
  list(): readonly string[];
  listByTag(tag: string): readonly string[];
  unregister(name: string): boolean;
  clear(): void;
}
```

---

## Examples

### Custom Widget Registration

```typescript
import { createWidgetRegistry, registerBuiltinWidgets, createBox } from 'blecsd';

const registry = createWidgetRegistry();
registerBuiltinWidgets(registry);

// Register a custom widget
registry.register('healthBar', {
  factory: (world, entity, config) => {
    const box = createBox(world, entity, {
      width: config?.width ?? 20,
      height: 1,
      fg: '#00ff00',
      bg: '#333333',
    });
    // Add custom behavior...
    return box;
  },
  description: 'Health bar for game characters',
  tags: ['game', 'ui', 'status'],
});

// Use the custom widget
const health = registry.create(world, 'healthBar', { width: 30 });
```

### Plugin System

```typescript
// Plugin interface
interface WidgetPlugin {
  name: string;
  widgets: Array<{
    name: string;
    factory: WidgetFactory;
    description?: string;
    tags?: string[];
  }>;
}

// Register plugin widgets
function registerPlugin(registry: WidgetRegistry, plugin: WidgetPlugin) {
  for (const widget of plugin.widgets) {
    registry.register(`${plugin.name}:${widget.name}`, {
      factory: widget.factory,
      description: widget.description,
      tags: [...(widget.tags ?? []), 'plugin', plugin.name],
    });
  }
}

// Usage
const inventoryPlugin: WidgetPlugin = {
  name: 'inventory',
  widgets: [
    { name: 'slot', factory: createInventorySlot, tags: ['game'] },
    { name: 'grid', factory: createInventoryGrid, tags: ['game'] },
  ],
};

registerPlugin(registry, inventoryPlugin);

// Create plugin widgets
const slot = registry.create(world, 'inventory:slot', { size: 32 });
```

### UI Theming

```typescript
import { createWidgetRegistry, registerBuiltinWidgets } from 'blecsd';

// Create themed registry
function createThemedRegistry(theme: 'dark' | 'light') {
  const registry = createWidgetRegistry();

  const colors = theme === 'dark'
    ? { fg: '#ffffff', bg: '#1a1a1a', border: '#444444' }
    : { fg: '#000000', bg: '#ffffff', border: '#cccccc' };

  // Register themed versions of widgets
  registry.register('box', {
    factory: (world, entity, config) => createBox(world, entity, {
      fg: colors.fg,
      bg: colors.bg,
      border: { type: 'line', fg: colors.border },
      ...config,
    }),
    tags: ['container', 'themed'],
  });

  // ... register other themed widgets

  return registry;
}

const darkRegistry = createThemedRegistry('dark');
const lightRegistry = createThemedRegistry('light');
```

---

## See Also

- [Box Widget](./box.md) - Basic container
- [Panel Widget](./panel.md) - Container with title bar
- [Widgets Overview](./index.md) - All widget documentation
