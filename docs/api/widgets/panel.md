# Panel Widget

The Panel widget is a container with a title bar at the top. It supports optional close and collapse functionality, making it ideal for dialog boxes, tool windows, and collapsible sections.

## Overview

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createPanel } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic panel with title
const panel = createPanel(world, eid, {
  left: 10,
  top: 5,
  width: 40,
  height: 15,
  title: 'My Panel',
});

// Panel with close and collapse buttons
const toolWindow = createPanel(world, addEntity(world), {
  left: 60,
  top: 5,
  width: 40,
  height: 15,
  title: 'Tool Window',
  closable: true,
  collapsible: true,
});
```

---

## Factory Function

### createPanel

Creates a new Panel widget with the specified configuration.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createPanel } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic panel
const panel = createPanel(world, eid, {
  title: 'Settings',
  width: 50,
  height: 20,
});

// Collapsible panel with styling
const styledPanel = createPanel(world, addEntity(world), {
  title: 'Options',
  width: 40,
  height: 15,
  collapsible: true,
  titleAlign: 'center',
  style: {
    border: { fg: '#888888' },
    title: { fg: '#ffffff', bg: '#0000ff' },
  },
});
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to wrap
- `config` - Optional configuration object (see PanelConfig)

**Returns:** `PanelWidget` interface

---

## Constants

### Button Characters

```typescript
import {
  CLOSE_BUTTON_CHAR,  // '✕'
  COLLAPSE_CHAR,      // '▼'
  EXPAND_CHAR,        // '▶'
  DEFAULT_PANEL_TITLE // ''
} from 'blecsd';
```

---

## PanelWidget Interface

The panel widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const panel = createPanel(world, eid);
console.log(panel.eid); // Entity ID number
```

### Visibility Methods

#### show

Shows the panel.

```typescript
panel.show();
```

**Returns:** `PanelWidget` for chaining

#### hide

Hides the panel.

```typescript
panel.hide();
```

**Returns:** `PanelWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
panel.setPosition(20, 15);
```

**Returns:** `PanelWidget` for chaining

#### move

Moves the panel by a relative amount.

```typescript
panel.move(5, -3);
```

**Returns:** `PanelWidget` for chaining

---

### Title Methods

#### setTitle

Sets the panel title.

```typescript
panel.setTitle('New Title');
```

**Returns:** `PanelWidget` for chaining

#### getTitle

Gets the current panel title.

```typescript
const title = panel.getTitle(); // 'My Panel'
```

**Returns:** `string`

---

### Content Methods

#### setContent

Sets the content text of the panel.

```typescript
panel.setContent('Panel content here');
```

**Returns:** `PanelWidget` for chaining

#### getContent

Gets the current content text.

```typescript
const content = panel.getContent();
```

**Returns:** `string`

---

### Collapse/Expand Methods

#### collapse

Collapses the panel to show only the title bar.

```typescript
panel.collapse();
```

**Returns:** `PanelWidget` for chaining

#### expand

Expands the panel to show full content.

```typescript
panel.expand();
```

**Returns:** `PanelWidget` for chaining

#### toggle

Toggles between collapsed and expanded states.

```typescript
panel.toggle();
```

**Returns:** `PanelWidget` for chaining

#### isCollapsed

Checks if the panel is collapsed.

```typescript
const collapsed = panel.isCollapsed(); // boolean
```

**Returns:** `boolean`

---

### Close Methods

#### isClosable

Checks if the panel has a close button.

```typescript
const closable = panel.isClosable(); // boolean
```

**Returns:** `boolean`

#### close

Closes the panel (hides it). Only works if the panel is closable.

```typescript
panel.close();
```

---

### Focus Methods

#### focus

Focuses the panel.

```typescript
panel.focus();
```

**Returns:** `PanelWidget` for chaining

#### blur

Removes focus from the panel.

```typescript
panel.blur();
```

**Returns:** `PanelWidget` for chaining

#### isFocused

Checks if the panel is currently focused.

```typescript
const focused = panel.isFocused(); // boolean
```

**Returns:** `boolean`

---

### Children Methods

#### append

Appends a child entity to the content area.

```typescript
const childEid = addEntity(world);
panel.append(childEid);
```

**Returns:** `PanelWidget` for chaining

#### getChildren

Gets all direct children.

```typescript
const children = panel.getChildren();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
panel.destroy();
```

---

## Helper Functions

### isPanel

Checks if an entity is a panel widget.

```typescript
import { isPanel } from 'blecsd';

if (isPanel(world, entity)) {
  // Handle panel-specific logic
}
```

**Returns:** `boolean`

---

### getPanelTitle

Gets the title of a panel entity.

```typescript
import { getPanelTitle } from 'blecsd';

const title = getPanelTitle(world, panelEntity);
```

**Returns:** `string`

---

### setPanelTitle

Sets the title of a panel entity.

```typescript
import { setPanelTitle } from 'blecsd';

setPanelTitle(world, panelEntity, 'New Title');
```

**Returns:** `Entity` - For chaining

---

### isPanelCollapsed

Gets the collapsed state of a panel entity.

```typescript
import { isPanelCollapsed } from 'blecsd';

const collapsed = isPanelCollapsed(world, panelEntity);
```

**Returns:** `boolean`

---

### getPanelTitleAlign

Gets the title alignment of a panel entity.

```typescript
import { getPanelTitleAlign } from 'blecsd';

const align = getPanelTitleAlign(world, panelEntity);
// 'left', 'center', or 'right'
```

**Returns:** `TitleAlign`

---

### renderPanelTitleBar

Renders the panel title bar as a string.

```typescript
import { renderPanelTitleBar } from 'blecsd';

const titleBar = renderPanelTitleBar(world, panelEntity, 40);
// Returns formatted title bar with buttons
```

**Parameters:**
- `world` - The ECS world
- `eid` - The panel entity ID
- `width` - Available width for the title bar

**Returns:** `string`

---

## Types

### PanelConfig

Configuration for creating a panel widget.

```typescript
interface PanelConfig {
  // Position
  readonly left?: PositionValue;
  readonly top?: PositionValue;
  readonly width?: DimensionValue;
  readonly height?: DimensionValue;

  // Title
  readonly title?: string;
  readonly titleAlign?: TitleAlign;

  // Features
  readonly closable?: boolean;
  readonly collapsible?: boolean;
  readonly collapsed?: boolean;

  // Style
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly style?: PanelStyleConfig;
  readonly padding?: PaddingConfig;

  // Content
  readonly content?: string;
}
```

### TitleAlign

Title alignment type.

```typescript
type TitleAlign = 'left' | 'center' | 'right';
```

### PanelStyleConfig

Panel style configuration.

```typescript
interface PanelStyleConfig {
  readonly title?: PanelTitleStyle;
  readonly content?: PanelContentStyle;
  readonly border?: PanelBorderConfig;
}
```

### PanelTitleStyle

Style configuration for the title bar.

```typescript
interface PanelTitleStyle {
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly align?: TitleAlign;
}
```

### PanelContentStyle

Style configuration for the content area.

```typescript
interface PanelContentStyle {
  readonly fg?: string | number;
  readonly bg?: string | number;
}
```

### PanelBorderConfig

Border configuration for panels.

```typescript
interface PanelBorderConfig {
  readonly type?: 'line' | 'bg' | 'none';
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}
```

### PanelAction

Panel action types for events.

```typescript
type PanelAction = 'close' | 'collapse' | 'expand' | 'toggle';
```

### PanelWidget

The panel widget interface.

```typescript
interface PanelWidget {
  readonly eid: Entity;

  // Visibility
  show(): PanelWidget;
  hide(): PanelWidget;

  // Position
  move(dx: number, dy: number): PanelWidget;
  setPosition(x: number, y: number): PanelWidget;

  // Title
  setTitle(title: string): PanelWidget;
  getTitle(): string;

  // Content
  setContent(text: string): PanelWidget;
  getContent(): string;

  // Collapse/Expand
  collapse(): PanelWidget;
  expand(): PanelWidget;
  toggle(): PanelWidget;
  isCollapsed(): boolean;

  // Close
  isClosable(): boolean;
  close(): void;

  // Focus
  focus(): PanelWidget;
  blur(): PanelWidget;
  isFocused(): boolean;

  // Children
  append(child: Entity): PanelWidget;
  getChildren(): Entity[];

  // Lifecycle
  destroy(): void;
}
```

---

## Zod Schemas

```typescript
import { PanelConfigSchema } from 'blecsd';

// Validate configuration
const result = PanelConfigSchema.safeParse({
  title: 'My Panel',
  closable: true,
  collapsible: true,
});

if (result.success) {
  // Configuration is valid
}
```

---

## Examples

### Dialog Panel

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createPanel } from 'blecsd';

const world = createWorld();

const dialog = createPanel(world, addEntity(world), {
  left: 20,
  top: 5,
  width: 50,
  height: 15,
  title: 'Confirm Action',
  closable: true,
  titleAlign: 'center',
  content: 'Are you sure you want to proceed?',
});

// Handle close action
if (dialog.isClosable()) {
  // User can close with the X button
}
```

### Collapsible Section

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createPanel } from 'blecsd';

const world = createWorld();

const section = createPanel(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 60,
  height: 10,
  title: 'Advanced Options',
  collapsible: true,
  collapsed: false,
});

// Toggle on user action
section.toggle();

// Check state
if (section.isCollapsed()) {
  console.log('Section is collapsed');
}
```

### Styled Tool Window

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createPanel } from 'blecsd';

const world = createWorld();

const toolWindow = createPanel(world, addEntity(world), {
  left: 70,
  top: 2,
  width: 30,
  height: 20,
  title: 'Properties',
  closable: true,
  collapsible: true,
  titleAlign: 'left',
  style: {
    title: {
      fg: '#ffffff',
      bg: '#336699',
    },
    border: {
      type: 'line',
      fg: '#336699',
      ch: 'rounded',
    },
  },
  padding: 1,
});
```

### Method Chaining

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createPanel } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const panel = createPanel(world, eid, {
  left: 0,
  top: 0,
  width: 40,
  height: 15,
  collapsible: true,
})
  .setTitle('Chained Panel')
  .setContent('Content set via chaining')
  .setPosition(10, 5)
  .show();

// Later...
panel
  .collapse()
  .move(5, 0);
```

---

## See Also

- [Box Widget](./box.md) - Basic container without title
- [Layout Widget](./layout.md) - Auto-arranging container
- [Position Component](../components/position.md) - Entity positioning
- [Dimensions Component](../components/dimensions.md) - Widget sizing
