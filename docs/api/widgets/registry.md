# Widget Registry

The Widget Registry provides centralized widget registration and creation by name. This is useful for dynamic UI building from configuration files, serialization/deserialization of UI layouts, and plugin systems.

## Overview

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  createWidgetRegistry,
  registerBuiltinWidgets,
  defaultRegistry,
  getWidgetTypes,
  isWidgetType,
  getWidgetsByTag,
  createBox,
  createScrollableText,
} from 'blecsd/widgets';

const world = createWorld();

// Create and use a custom registry
const registry = createWidgetRegistry();
registerBuiltinWidgets(registry);

// Create widgets by name
const box = registry.create(world, 'box', { width: 20, height: 10 });
const panel = registry.create(world, 'panel', { title: 'Hello' });

// Or use the pre-configured default registry
const text = defaultRegistry.create(world, 'text', { content: 'Hello!' });

void box; void panel; void text;
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
// UI layout from a config file
const uiConfig = [
  { type: 'text', config: { content: 'Start Game' } },
  { type: 'text', config: { content: 'Options' } },
  { type: 'text', config: { content: 'Quit' } },
];

// Create widgets from config
const menuWidgets = uiConfig.map((item) =>
  registry.create(world, item.type, item.config)
);
void menuWidgets;
```

---

## Factory Function

### createWidgetRegistry

Creates a new empty widget registry.

```typescript
const myRegistry = createWidgetRegistry();
void myRegistry;
```

**Returns:** `WidgetRegistry`

---

## WidgetRegistry Interface

### register

Registers a widget factory with the registry.

```typescript
const customRegistry = createWidgetRegistry();
customRegistry.register('myWidget', {
  factory: (w, entity, config) => createBox(w, entity, { width: (config as { width?: number })?.width ?? 10, height: 3 }),
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
const aliasRegistry = createWidgetRegistry();
aliasRegistry.register('scrollableText', { factory: (w, e, cfg) => createScrollableText(w, e, cfg as Parameters<typeof createScrollableText>[2]) });

// Create aliases
aliasRegistry.alias('log', 'scrollableText');
aliasRegistry.alias('textarea', 'scrollableText');

const logWidget = aliasRegistry.create(world, 'log', {});
void logWidget;
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
  const panelWidget = registry.create(world, 'panel', { title: 'Hello' });
  void panelWidget;
}
```

**Parameters:**
- `name` - Widget type name (case-insensitive)

**Returns:** `boolean`

### get

Gets the registration information for a widget type.

```typescript
const reg = registry.get('box');
console.log(reg?.description);
console.log(reg?.tags);
```

**Returns:** `WidgetRegistration | undefined`

### create

Creates a widget with a new entity.

```typescript
const boxWidget = registry.create(world, 'box', { width: 20, height: 10 });
void boxWidget;
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
const cwEntity = addEntity(world);
const cwBox = registry.createWithEntity(world, cwEntity, 'box', { width: 20 });
void cwBox;
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
void types;
```

**Returns:** `readonly string[]`

### listByTag

Lists widget types that have a specific tag.

```typescript
const containers = registry.listByTag('container');
const interactive = registry.listByTag('interactive');
void containers; void interactive;
```

**Returns:** `readonly string[]`

### unregister

Removes a widget type from the registry.

```typescript
const tempRegistry = createWidgetRegistry();
tempRegistry.register('tempWidget', {
  factory: (w, e) => createBox(w, e, { width: 5, height: 1 }),
});
tempRegistry.unregister('tempWidget');
```

**Returns:** `boolean` - true if widget was removed

### clear

Removes all registrations and aliases.

```typescript
const clearableRegistry = createWidgetRegistry();
registerBuiltinWidgets(clearableRegistry);
clearableRegistry.clear();
```

---

## Builtin Widgets

### registerBuiltinWidgets

Registers all builtin blECSd widgets with a registry.

```typescript
const builtinRegistry = createWidgetRegistry();
registerBuiltinWidgets(builtinRegistry);
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
const drBox = defaultRegistry.create(world, 'box', { width: 20 });
const drPanel = defaultRegistry.create(world, 'panel', { title: 'Hello' });
void drBox; void drPanel;
```

---

## Utility Functions

### getWidgetTypes

Gets all widget type names from the default registry.

```typescript
const types2 = getWidgetTypes();
void types2;
```

### isWidgetType

Checks if a name is a valid widget type in the default registry.

```typescript
const checkBox = isWidgetType('box');
const checkBoxU = isWidgetType('Box');
const checkLog = isWidgetType('log');
const checkCustom = isWidgetType('custom');
void checkBox; void checkBoxU; void checkLog; void checkCustom;
```

### getWidgetsByTag

Gets widget types by tag from the default registry.

```typescript
const containers2 = getWidgetsByTag('container');
const scrolling = getWidgetsByTag('scrolling');
void containers2; void scrolling;
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
const customReg = createWidgetRegistry();
registerBuiltinWidgets(customReg);

customReg.register('healthBar', {
  factory: (w, entity, config) => {
    const healthBox = createBox(w, entity, {
      width: (config as { width?: number })?.width ?? 20,
      height: 1,
    });
    return healthBox;
  },
  description: 'Health bar for game characters',
  tags: ['game', 'ui', 'status'],
});

const health = customReg.create(world, 'healthBar', { width: 30 });
void health;
```

### UI Theming

```typescript
function createThemedRegistry(theme: 'dark' | 'light') {
  const themedReg = createWidgetRegistry();

  const colors = theme === 'dark'
    ? { fg: '#ffffff', bg: '#1a1a1a', border: '#444444' }
    : { fg: '#000000', bg: '#ffffff', border: '#cccccc' };

  themedReg.register('box', {
    factory: (w, entity, config) => createBox(w, entity, {
      fg: colors.fg,
      bg: colors.bg,
      border: { type: 'line', fg: colors.border },
      ...(config as object),
    }),
    tags: ['container', 'themed'],
  });

  return themedReg;
}

const darkRegistry = createThemedRegistry('dark');
const lightRegistry = createThemedRegistry('light');
void darkRegistry; void lightRegistry;
```

---

## See Also

- [Box Widget](./box.md) - Basic container
- [Panel Widget](./panel.md) - Container with title bar
- Widgets Overview - All widget documentation
