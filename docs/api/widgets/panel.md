# Panel Widget

The Panel widget is a container with a title bar at the top. It supports optional close and collapse functionality, making it ideal for dialog boxes, tool windows, and collapsible sections.

## Overview

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  createPanel,
  isPanel,
  getPanelTitle,
  setPanelTitle,
  isPanelCollapsed,
  getPanelTitleAlign,
  renderPanelTitleBar,
  PanelConfigSchema,
  COLLAPSE_CHAR,
  EXPAND_CHAR,
  DEFAULT_PANEL_TITLE,
  CLOSE_BUTTON_CHAR,
} from 'blecsd/widgets';

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

console.log('panel entity:', panel.eid);
console.log('tool window entity:', toolWindow.eid);
```

---

## Factory Function

### createPanel

Creates a new Panel widget with the specified configuration.

```typescript
// Basic panel
const panelA = createPanel(world, addEntity(world), {
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
console.log('panelA entity:', panelA.eid);
console.log('styledPanel entity:', styledPanel.eid);
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
console.log('collapse char:', COLLAPSE_CHAR);    // '▼'
console.log('expand char:', EXPAND_CHAR);      // '▶'
console.log('default panel title:', DEFAULT_PANEL_TITLE);
console.log('close button char:', CLOSE_BUTTON_CHAR); // '✕'
```

---

## PanelWidget Interface

The panel widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const panelB = createPanel(world, addEntity(world));
console.log(panelB.eid); // Entity ID number
panelB.destroy();
```

### Visibility Methods

#### show

Shows the panel.

```typescript
const panelC = createPanel(world, addEntity(world));
panelC.show();
panelC.destroy();
```

**Returns:** `PanelWidget` for chaining

#### hide

Hides the panel.

```typescript
const panelD = createPanel(world, addEntity(world));
panelD.hide();
panelD.destroy();
```

**Returns:** `PanelWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
const panelE = createPanel(world, addEntity(world));
panelE.setPosition(20, 15);
panelE.destroy();
```

**Returns:** `PanelWidget` for chaining

#### move

Moves the panel by a relative amount.

```typescript
const panelF = createPanel(world, addEntity(world));
panelF.move(5, -3);
panelF.destroy();
```

**Returns:** `PanelWidget` for chaining

---

### Title Methods

#### setTitle

Sets the panel title.

```typescript
const panelG = createPanel(world, addEntity(world));
panelG.setTitle('New Title');
panelG.destroy();
```

**Returns:** `PanelWidget` for chaining

#### getTitle

Gets the current panel title.

```typescript
const panelH = createPanel(world, addEntity(world), { title: 'My Panel' });
const title = panelH.getTitle(); // 'My Panel'
console.log('panel title:', title);
panelH.destroy();
```

**Returns:** `string`

---

### Content Methods

#### setContent

Sets the content text of the panel.

```typescript
const panelI = createPanel(world, addEntity(world));
panelI.setContent('Panel content here');
panelI.destroy();
```

**Returns:** `PanelWidget` for chaining

#### getContent

Gets the current content text.

```typescript
const panelJ = createPanel(world, addEntity(world));
const content = panelJ.getContent();
console.log('panel content:', content);
panelJ.destroy();
```

**Returns:** `string`

---

### Collapse/Expand Methods

#### collapse

Collapses the panel to show only the title bar.

```typescript
const panelK = createPanel(world, addEntity(world), { collapsible: true });
panelK.collapse();
panelK.destroy();
```

**Returns:** `PanelWidget` for chaining

#### expand

Expands the panel to show full content.

```typescript
const panelL = createPanel(world, addEntity(world), { collapsible: true });
panelL.expand();
panelL.destroy();
```

**Returns:** `PanelWidget` for chaining

#### toggle

Toggles between collapsed and expanded states.

```typescript
const panelM = createPanel(world, addEntity(world), { collapsible: true });
panelM.toggle();
panelM.destroy();
```

**Returns:** `PanelWidget` for chaining

#### isCollapsed

Checks if the panel is collapsed.

```typescript
const panelN = createPanel(world, addEntity(world), { collapsible: true });
const collapsed = panelN.isCollapsed(); // boolean
console.log('panel collapsed:', collapsed);
panelN.destroy();
```

**Returns:** `boolean`

---

### Close Methods

#### isClosable

Checks if the panel has a close button.

```typescript
const panelO = createPanel(world, addEntity(world), { closable: true });
const closable = panelO.isClosable(); // boolean
console.log('panel closable:', closable);
panelO.destroy();
```

**Returns:** `boolean`

#### close

Closes the panel (hides it). Only works if the panel is closable.

```typescript
const panelP = createPanel(world, addEntity(world), { closable: true });
panelP.close();
panelP.destroy();
```

---

### Focus Methods

#### focus

Focuses the panel.

```typescript
const panelQ = createPanel(world, addEntity(world));
panelQ.focus();
panelQ.destroy();
```

**Returns:** `PanelWidget` for chaining

#### blur

Removes focus from the panel.

```typescript
const panelR = createPanel(world, addEntity(world));
panelR.blur();
panelR.destroy();
```

**Returns:** `PanelWidget` for chaining

#### isFocused

Checks if the panel is currently focused.

```typescript
const panelS = createPanel(world, addEntity(world));
const focused = panelS.isFocused(); // boolean
console.log('panel focused:', focused);
panelS.destroy();
```

**Returns:** `boolean`

---

### Children Methods

#### append

Appends a child entity to the content area.

```typescript
const panelT = createPanel(world, addEntity(world));
const childEid = addEntity(world);
panelT.append(childEid);
panelT.destroy();
```

**Returns:** `PanelWidget` for chaining

#### getChildren

Gets all direct children.

```typescript
const panelU = createPanel(world, addEntity(world));
const children = panelU.getChildren();
console.log('panel children:', children.length);
panelU.destroy();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
const panelV = createPanel(world, addEntity(world));
panelV.destroy();
```

---

## Helper Functions

### isPanel

Checks if an entity is a panel widget.

```typescript
const panelW = createPanel(world, addEntity(world));
if (isPanel(world, panelW.eid)) {
  // Handle panel-specific logic
}
panelW.destroy();
```

**Returns:** `boolean`

---

### getPanelTitle

Gets the title of a panel entity.

```typescript
const panelX = createPanel(world, addEntity(world), { title: 'Test' });
const panelTitle = getPanelTitle(world, panelX.eid);
console.log('panel title from ECS:', panelTitle);
panelX.destroy();
```

**Returns:** `string`

---

### setPanelTitle

Sets the title of a panel entity.

```typescript
const panelY = createPanel(world, addEntity(world));
setPanelTitle(world, panelY.eid, 'New Title');
panelY.destroy();
```

**Returns:** `Entity` - For chaining

---

### isPanelCollapsed

Gets the collapsed state of a panel entity.

```typescript
const panelZ = createPanel(world, addEntity(world), { collapsible: true });
const panelCollapsed = isPanelCollapsed(world, panelZ.eid);
console.log('panel collapsed from ECS:', panelCollapsed);
panelZ.destroy();
```

**Returns:** `boolean`

---

### getPanelTitleAlign

Gets the title alignment of a panel entity.

```typescript
const panelAA = createPanel(world, addEntity(world), { titleAlign: 'center' });
const align = getPanelTitleAlign(world, panelAA.eid);
console.log('panel title alignment:', align);
// 'left', 'center', or 'right'
panelAA.destroy();
```

**Returns:** `TitleAlign`

---

### renderPanelTitleBar

Renders the panel title bar as a string.

```typescript
const panelAB = createPanel(world, addEntity(world), { title: 'My Panel', width: 40 });
const titleBar = renderPanelTitleBar(world, panelAB.eid, 40);
console.log('rendered title bar:', titleBar);
// Returns formatted title bar with buttons
panelAB.destroy();
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
  readonly left?: number;
  readonly top?: number;
  readonly width?: number;
  readonly height?: number;

  // Title
  readonly title?: string;
  readonly titleAlign?: 'left' | 'center' | 'right';

  // Features
  readonly closable?: boolean;
  readonly collapsible?: boolean;
  readonly collapsed?: boolean;

  // Style
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly style?: {
    readonly title?: { readonly fg?: string | number; readonly bg?: string | number };
    readonly content?: { readonly fg?: string | number; readonly bg?: string | number };
    readonly border?: { readonly type?: string; readonly fg?: string | number };
  };
  readonly padding?: number;

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
  readonly title?: { readonly fg?: string | number; readonly bg?: string | number };
  readonly content?: { readonly fg?: string | number; readonly bg?: string | number };
  readonly border?: { readonly type?: string; readonly fg?: string | number };
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
  readonly eid: number;

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
  append(child: number): PanelWidget;
  getChildren(): number[];

  // Lifecycle
  destroy(): void;
}
```

---

## Zod Schemas

```typescript
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
dialog.destroy();
```

### Collapsible Section

```typescript
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
section.destroy();
```

### Styled Tool Window

```typescript
const styledToolWindow = createPanel(world, addEntity(world), {
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
    },
  },
  padding: 1,
});
styledToolWindow.destroy();
```

### Method Chaining

```typescript
const chainedPanel = createPanel(world, addEntity(world), {
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
chainedPanel
  .collapse()
  .move(5, 0);
chainedPanel.destroy();
```

---

## See Also

- [Box Widget](./box.md) - Basic container without title
- [Layout Widget](./layout.md) - Auto-arranging container
- [Position Component](../position.md) - Entity positioning
- [Dimensions Component](../dimensions.md) - Widget sizing
