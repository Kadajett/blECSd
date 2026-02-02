# Tabs Widget

The Tabs widget is a tabbed container that manages multiple content panels with a tab bar for navigation. It supports lazy loading, closable tabs, and keyboard navigation.

## Overview

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createTabs } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic tabs widget
const tabs = createTabs(world, eid, {
  left: 0,
  top: 0,
  width: 60,
  height: 20,
  tabs: [
    { label: 'Tab 1' },
    { label: 'Tab 2' },
    { label: 'Tab 3', closable: true },
  ],
});

// Navigate between tabs
tabs.nextTab();
tabs.setActiveTab(2);
```

---

## Factory Function

### createTabs

Creates a new Tabs widget with the specified configuration.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createTabs } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic tabs
const tabs = createTabs(world, eid, {
  tabs: [
    { label: 'Overview' },
    { label: 'Settings', closable: true },
  ],
  width: 60,
  height: 20,
});

// Tabs with bottom position and styling
const styledTabs = createTabs(world, addEntity(world), {
  tabs: [{ label: 'Tab 1' }, { label: 'Tab 2' }],
  position: 'bottom',
  style: {
    tab: { activeFg: '#ffffff', activeBg: '#0000ff' },
  },
});
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to wrap
- `config` - Optional configuration object (see TabsConfig)

**Returns:** `TabsWidget` interface

---

## Constants

```typescript
import {
  DEFAULT_TAB_POSITION,  // 'top'
  TAB_SEPARATOR,         // ' │ '
  TAB_CLOSE_CHAR,        // '✕'
} from 'blecsd';
```

---

## TabsWidget Interface

The tabs widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const tabs = createTabs(world, eid);
console.log(tabs.eid); // Entity ID number
```

### Visibility Methods

#### show

Shows the tabs widget.

```typescript
tabs.show();
```

**Returns:** `TabsWidget` for chaining

#### hide

Hides the tabs widget.

```typescript
tabs.hide();
```

**Returns:** `TabsWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
tabs.setPosition(20, 15);
```

**Returns:** `TabsWidget` for chaining

#### move

Moves the tabs by a relative amount.

```typescript
tabs.move(5, -3);
```

**Returns:** `TabsWidget` for chaining

---

### Tab Management Methods

#### addTab

Adds a new tab.

```typescript
tabs.addTab({ label: 'New Tab', closable: true });
```

**Returns:** `TabsWidget` for chaining

#### removeTab

Removes a tab by index.

```typescript
tabs.removeTab(1); // Remove second tab
```

**Returns:** `TabsWidget` for chaining

#### getActiveTab

Gets the active tab index.

```typescript
const index = tabs.getActiveTab(); // 0
```

**Returns:** `number`

#### setActiveTab

Sets the active tab by index.

```typescript
tabs.setActiveTab(2);
```

**Returns:** `TabsWidget` for chaining

#### getTabCount

Gets the number of tabs.

```typescript
const count = tabs.getTabCount(); // 3
```

**Returns:** `number`

#### getTab

Gets tab data by index.

```typescript
const tabData = tabs.getTab(0);
// { label: 'Tab 1', closable: false, ... }
```

**Returns:** `TabData | undefined`

#### setTabLabel

Sets the label of a tab.

```typescript
tabs.setTabLabel(0, 'New Label');
```

**Returns:** `TabsWidget` for chaining

---

### Navigation Methods

#### nextTab

Moves to the next tab (wraps around).

```typescript
tabs.nextTab();
```

**Returns:** `TabsWidget` for chaining

#### prevTab

Moves to the previous tab (wraps around).

```typescript
tabs.prevTab();
```

**Returns:** `TabsWidget` for chaining

---

### Focus Methods

#### focus

Focuses the tabs widget.

```typescript
tabs.focus();
```

**Returns:** `TabsWidget` for chaining

#### blur

Removes focus from the tabs widget.

```typescript
tabs.blur();
```

**Returns:** `TabsWidget` for chaining

#### isFocused

Checks if the tabs widget is currently focused.

```typescript
const focused = tabs.isFocused(); // boolean
```

**Returns:** `boolean`

---

### Key Handling

#### handleKey

Handles key input, returns action taken or null.

```typescript
tabs.focus();
const action = tabs.handleKey('Tab');
// { type: 'next' }
```

**Supported Keys:**
- `Tab`, `right` - Next tab
- `S-Tab`, `left` - Previous tab
- `1`-`9` - Jump to specific tab

**Returns:** `TabsAction | null`

---

### Children Methods

#### getChildren

Gets all direct children of the content area.

```typescript
const children = tabs.getChildren();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
tabs.destroy();
```

---

## Helper Functions

### isTabs

Checks if an entity is a tabs widget.

```typescript
import { isTabs } from 'blecsd';

if (isTabs(world, entity)) {
  // Handle tabs-specific logic
}
```

**Returns:** `boolean`

---

### getActiveTabIndex

Gets the active tab index of a tabs entity.

```typescript
import { getActiveTabIndex } from 'blecsd';

const index = getActiveTabIndex(world, tabsEntity);
```

**Returns:** `number`

---

### getTabCount

Gets the tab count of a tabs entity.

```typescript
import { getTabCount } from 'blecsd';

const count = getTabCount(world, tabsEntity);
```

**Returns:** `number`

---

### getTabPosition

Gets the tab bar position of a tabs entity.

```typescript
import { getTabPosition } from 'blecsd';

const position = getTabPosition(world, tabsEntity);
// 'top' or 'bottom'
```

**Returns:** `TabPosition`

---

### renderTabBar

Renders the tab bar as a string.

```typescript
import { renderTabBar } from 'blecsd';

const tabBar = renderTabBar(world, tabsEntity, 60);
// "[Tab 1] │  Tab 2  │  Tab 3 ✕"
```

**Parameters:**
- `world` - The ECS world
- `eid` - The tabs entity ID
- `width` - Available width for the tab bar

**Returns:** `string`

---

## Types

### TabsConfig

Configuration for creating a tabs widget.

```typescript
interface TabsConfig {
  // Position
  readonly left?: PositionValue;
  readonly top?: PositionValue;
  readonly width?: DimensionValue;
  readonly height?: DimensionValue;

  // Tabs
  readonly tabs?: readonly TabConfig[];
  readonly activeTab?: number;
  readonly position?: TabPosition;

  // Style
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly style?: TabsStyleConfig;
}
```

### TabConfig

Individual tab configuration.

```typescript
interface TabConfig {
  readonly label: string;
  readonly content?: Entity | (() => Entity);
  readonly closable?: boolean;
}
```

### TabData

Tab data stored internally.

```typescript
interface TabData {
  label: string;
  contentEntity: Entity | null;
  lazyLoader: (() => Entity) | null;
  closable: boolean;
  loaded: boolean;
}
```

### TabPosition

Tab bar position type.

```typescript
type TabPosition = 'top' | 'bottom';
```

### TabsAction

Tab action types for events.

```typescript
type TabsAction =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'goto'; index: number }
  | { type: 'close'; index: number };
```

### TabsStyleConfig

Tabs style configuration.

```typescript
interface TabsStyleConfig {
  readonly tab?: TabStyleConfig;
  readonly content?: ContentStyleConfig;
  readonly border?: TabsBorderConfig;
}
```

### TabStyleConfig

Tab style configuration.

```typescript
interface TabStyleConfig {
  readonly activeFg?: string | number;
  readonly activeBg?: string | number;
  readonly inactiveFg?: string | number;
  readonly inactiveBg?: string | number;
}
```

### TabsWidget

The tabs widget interface.

```typescript
interface TabsWidget {
  readonly eid: Entity;

  // Visibility
  show(): TabsWidget;
  hide(): TabsWidget;

  // Position
  move(dx: number, dy: number): TabsWidget;
  setPosition(x: number, y: number): TabsWidget;

  // Tab management
  addTab(config: TabConfig): TabsWidget;
  removeTab(index: number): TabsWidget;
  getActiveTab(): number;
  setActiveTab(index: number): TabsWidget;
  getTabCount(): number;
  getTab(index: number): TabData | undefined;
  setTabLabel(index: number, label: string): TabsWidget;

  // Navigation
  nextTab(): TabsWidget;
  prevTab(): TabsWidget;

  // Focus
  focus(): TabsWidget;
  blur(): TabsWidget;
  isFocused(): boolean;

  // Children
  getChildren(): Entity[];

  // Key handling
  handleKey(key: string): TabsAction | null;

  // Lifecycle
  destroy(): void;
}
```

---

## Zod Schemas

```typescript
import { TabsConfigSchema } from 'blecsd';

// Validate configuration
const result = TabsConfigSchema.safeParse({
  tabs: [
    { label: 'Tab 1' },
    { label: 'Tab 2', closable: true },
  ],
  activeTab: 0,
});

if (result.success) {
  // Configuration is valid
}
```

---

## Examples

### Basic Tab Navigation

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createTabs } from 'blecsd';

const world = createWorld();

const tabs = createTabs(world, addEntity(world), {
  width: 60,
  height: 20,
  tabs: [
    { label: 'Home' },
    { label: 'Profile' },
    { label: 'Settings' },
  ],
});

// Navigate programmatically
tabs.nextTab(); // Go to Profile
tabs.setActiveTab(2); // Jump to Settings
tabs.prevTab(); // Back to Profile
```

### Closable Tabs

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createTabs } from 'blecsd';

const world = createWorld();

const tabs = createTabs(world, addEntity(world), {
  tabs: [
    { label: 'Main', closable: false },
    { label: 'Document 1', closable: true },
    { label: 'Document 2', closable: true },
  ],
});

// Remove a closable tab
tabs.removeTab(1); // Remove "Document 1"
```

### Lazy Content Loading

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createTabs, createBox } from 'blecsd';

const world = createWorld();

const tabs = createTabs(world, addEntity(world), {
  width: 60,
  height: 20,
  tabs: [
    { label: 'Tab 1' },
    {
      label: 'Heavy Tab',
      // Content is only created when tab is first activated
      content: () => {
        const content = createBox(world, addEntity(world), {
          width: 58,
          height: 18,
          content: 'Lazily loaded content!',
        });
        return content.eid;
      },
    },
  ],
});

// Content is created when tab is first selected
tabs.setActiveTab(1);
```

### Keyboard Navigation

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createTabs } from 'blecsd';

const world = createWorld();

const tabs = createTabs(world, addEntity(world), {
  tabs: [
    { label: 'Tab 1' },
    { label: 'Tab 2' },
    { label: 'Tab 3' },
  ],
});

tabs.focus();

// Handle keyboard input
function onKeyPress(key: string) {
  const action = tabs.handleKey(key);
  if (action) {
    console.log('Tab action:', action.type);
  }
}

onKeyPress('Tab');   // Goes to next tab
onKeyPress('2');     // Jumps to tab 2
onKeyPress('left');  // Goes to previous tab
```

### Dynamic Tab Management

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createTabs } from 'blecsd';

const world = createWorld();

const tabs = createTabs(world, addEntity(world), {
  width: 60,
  height: 20,
});

// Add tabs dynamically
tabs
  .addTab({ label: 'File 1' })
  .addTab({ label: 'File 2' })
  .addTab({ label: 'File 3', closable: true });

// Update tab labels
tabs.setTabLabel(0, 'Main File');

// Remove tabs
tabs.removeTab(2);
```

### Method Chaining

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createTabs } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const tabs = createTabs(world, eid, {
  left: 0,
  top: 0,
  width: 80,
  height: 24,
})
  .addTab({ label: 'Overview' })
  .addTab({ label: 'Details' })
  .addTab({ label: 'Settings', closable: true })
  .setPosition(10, 5)
  .setActiveTab(1)
  .show();
```

---

## See Also

- [Panel Widget](./panel.md) - Container with title bar
- [Box Widget](./box.md) - Basic container
- [Layout Widget](./layout.md) - Auto-arranging container
