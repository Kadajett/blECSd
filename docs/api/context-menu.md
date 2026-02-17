# Context Menu

Right-click style context menus with keyboard navigation for terminal UIs. Provides popup menus with selectable items, separators, and automatic edge detection.

## Quick Start

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu, handleContextMenuKey } from 'blecsd/widgets';

const world = createWorld();

// Create context menu
const menu = createContextMenu(world, {
  x: 10,
  y: 5,
  termWidth: 80,
  termHeight: 24,
  items: [
    { label: 'Copy', action: () => console.log('Copy') },
    { label: 'Paste', action: () => console.log('Paste') },
    { separator: true },
    { label: 'Delete', action: () => console.log('Delete'), disabled: true },
  ],
});

// Handle keyboard input
const onKeyPress = (key: string) => {
  handleContextMenuKey(world, menu, key);
};
void onKeyPress;
```

## API Reference

### Types

#### ContextMenuItem

Context menu item definition.

**Properties:**
- `label` - Display label for the menu item
- `action?` - Optional callback function when item is selected
- `disabled?` - Whether item is disabled (default: false)
- `separator?` - Whether item is a separator line (default: false)

**Example:**
```typescript
import type { ContextMenuItem } from 'blecsd/widgets';

const items: ContextMenuItem[] = [
  { label: 'New File', action: () => console.log('createFile') },
  { label: 'Open', action: () => console.log('openFile') },
  { separator: true },
  { label: 'Save', action: () => console.log('saveFile') },
];
void items;
```

#### ContextMenuConfig

Context menu configuration.

**Properties:**
- `items` - Array of menu items
- `x` - X position (auto-adjusted if near edge)
- `y` - Y position (auto-adjusted if near edge)
- `termWidth?` - Terminal width for edge detection (default: 80)
- `termHeight?` - Terminal height for edge detection (default: 24)

### Functions

#### createContextMenu

Creates a context menu widget and returns the container entity.

**Parameters:**
- `world` - The ECS world
- `config` - Context menu configuration

**Returns:** `Entity` - The container entity ID

**Example:**
```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';

const world = createWorld();
const menu = createContextMenu(world, {
  x: 10,
  y: 5,
  items: [
    { label: 'Copy', action: () => console.log('Copy') },
    { label: 'Paste', action: () => console.log('Paste') },
    { separator: true },
    { label: 'Delete', action: () => console.log('Delete'), disabled: true },
  ],
});
void menu;
```

#### handleContextMenuKey

Handles keyboard input for context menu navigation and selection.

**Parameters:**
- `world` - The ECS world
- `eid` - The context menu entity
- `key` - The key pressed

**Returns:** `boolean` - True if key was handled, false otherwise

**Supported Keys:**
- `'up'` or `'k'` - Move selection up
- `'down'` or `'j'` - Move selection down
- `'enter'` - Select current item
- `'escape'` - Close menu

**Example:**
```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu, handleContextMenuKey } from 'blecsd/widgets';

const world = createWorld();
const menu = createContextMenu(world, { x: 0, y: 0, items: [{ label: 'A' }] });

const onKeyPress = (key: string) => {
  const handled = handleContextMenuKey(world, menu, key);
  if (!handled) {
    // Handle other keys
  }
};
void onKeyPress;
```

#### getContextMenuSelectedIndex

Gets the currently selected item index in the menu.

**Parameters:**
- `eid` - The context menu entity

**Returns:** `number` - The selected index (0-based)

**Example:**
```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu, getContextMenuSelectedIndex } from 'blecsd/widgets';

const world = createWorld();
const menu = createContextMenu(world, {
  x: 10,
  y: 5,
  items: [{ label: 'Cut' }, { label: 'Copy' }],
});
const selectedIndex = getContextMenuSelectedIndex(menu);
console.log(`Selected item: ${selectedIndex}`);
```

## Common Patterns

### Basic Context Menu

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';

const world = createWorld();
const mouseX = 10;
const mouseY = 5;

const menu = createContextMenu(world, {
  x: mouseX,
  y: mouseY,
  termWidth: 80,
  termHeight: 24,
  items: [
    { label: 'New', action: () => console.log('New') },
    { label: 'Open', action: () => console.log('Open') },
    { label: 'Save', action: () => console.log('Save') },
    { separator: true },
    { label: 'Exit', action: () => console.log('Exit') },
  ],
});
void menu;
```

### File Operations Menu

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';

const world = createWorld();

const fileMenu = createContextMenu(world, {
  x: 15,
  y: 10,
  items: [
    { label: 'New File', action: () => console.log('new') },
    { label: 'New Folder', action: () => console.log('folder') },
    { separator: true },
    { label: 'Open', action: () => console.log('open') },
    { separator: true },
    { label: 'Rename', action: () => console.log('rename') },
    { label: 'Delete', action: () => console.log('delete') },
  ],
});
void fileMenu;
```

### Conditional Items

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';

const world = createWorld();
const selectedItems = ['file1.txt', 'file2.txt'];
const clipboardHasContent = true;
const hasSelection = selectedItems.length > 0;

const editMenu = createContextMenu(world, {
  x: 20,
  y: 8,
  items: [
    { label: 'Copy', action: () => console.log('copy'), disabled: !hasSelection },
    { label: 'Cut', action: () => console.log('cut'), disabled: !hasSelection },
    { label: 'Paste', action: () => console.log('paste'), disabled: !clipboardHasContent },
    { separator: true },
    { label: 'Delete', action: () => console.log('delete'), disabled: !hasSelection },
  ],
});
void editMenu;
```

### Nested Actions

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';

const world = createWorld();

const showFormatMenu = () => {
  const formatMenu = createContextMenu(world, {
    x: 30,
    y: 10,
    items: [
      { label: 'Bold', action: () => console.log('bold') },
      { label: 'Italic', action: () => console.log('italic') },
      { label: 'Underline', action: () => console.log('underline') },
    ],
  });
  void formatMenu;
};

const mainMenu = createContextMenu(world, {
  x: 20,
  y: 8,
  items: [
    { label: 'Format...', action: () => showFormatMenu() },
    { label: 'Close', action: () => console.log('close') },
  ],
});
void mainMenu;
```

### Right-Click Menu

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';

interface FileItem { name: string }

const world = createWorld();
const terminalWidth = 80;
const terminalHeight = 24;

const onRightClick = (x: number, y: number, item: FileItem) => {
  const menu = createContextMenu(world, {
    x,
    y,
    termWidth: terminalWidth,
    termHeight: terminalHeight,
    items: [
      { label: `Open ${item.name}`, action: () => console.log('open', item.name) },
      { separator: true },
      { label: 'Copy', action: () => console.log('copy') },
      { label: 'Delete', action: () => console.log('delete') },
    ],
  });
  void menu;
};
void onRightClick;
```

### Keyboard Navigation

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu, handleContextMenuKey, getContextMenuSelectedIndex } from 'blecsd/widgets';
import type { Entity } from 'blecsd/core';

const world = createWorld();

let currentMenu: Entity | null = createContextMenu(world, {
  x: 0,
  y: 0,
  items: [{ label: 'Item 1' }, { label: 'Item 2' }],
});

const updateMenuHighlight = (_idx: number) => {};

const onKeyPress = (key: string) => {
  if (!currentMenu) return;

  const handled = handleContextMenuKey(world, currentMenu, key);

  if (handled) {
    // Update visual highlight based on selection
    const selectedIndex = getContextMenuSelectedIndex(currentMenu);
    updateMenuHighlight(selectedIndex);
  }
};
void onKeyPress;
```

### Dynamic Menu Items

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';
import type { ContextMenuItem } from 'blecsd/widgets';

const world = createWorld();

const createDynamicMenu = (selectedFiles: string[]) => {
  const items: ContextMenuItem[] = [];

  // Always available actions
  items.push({ label: 'New File', action: () => console.log('new') });
  items.push({ separator: true });

  // Conditional actions based on selection
  if (selectedFiles.length === 1) {
    items.push({ label: 'Rename', action: () => console.log('rename', selectedFiles[0]) });
  }

  if (selectedFiles.length > 0) {
    items.push({ label: `Delete (${selectedFiles.length})`, action: () => console.log('delete') });
  }

  return createContextMenu(world, {
    x: 10,
    y: 5,
    items,
  });
};

void createDynamicMenu;
```

### Auto-Closing Menu

```typescript
import { createWorld, removeEntity } from 'blecsd/core';
import { createContextMenu, handleContextMenuKey } from 'blecsd/widgets';
import type { Entity } from 'blecsd/core';

const world = createWorld();
let activeMenu: Entity | null = null;

const showMenu = (x: number, y: number) => {
  // Close existing menu
  if (activeMenu) {
    removeEntity(world, activeMenu);
  }

  // Create new menu
  activeMenu = createContextMenu(world, {
    x,
    y,
    items: [
      { label: 'Option 1', action: () => console.log('1') },
      { label: 'Option 2', action: () => console.log('2') },
    ],
  });
};

const onKeyPress = (key: string) => {
  if (activeMenu) {
    handleContextMenuKey(world, activeMenu, key);

    // Menu closes itself on escape or selection
    if (key === 'escape' || key === 'enter') {
      activeMenu = null;
    }
  }
};

void showMenu; void onKeyPress;
```

### Menu with Keyboard Shortcuts

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';

const world = createWorld();

const menu = createContextMenu(world, {
  x: 10,
  y: 5,
  items: [
    { label: 'Save (Ctrl+S)', action: () => console.log('save') },
    { label: 'Open (Ctrl+O)', action: () => console.log('open') },
    { label: 'Find (Ctrl+F)', action: () => console.log('find') },
    { separator: true },
    { label: 'Quit (Ctrl+Q)', action: () => console.log('quit') },
  ],
});
void menu;
```

## Edge Detection

Context menus automatically adjust their position to avoid rendering outside the terminal bounds:

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';

const world = createWorld();

// Menu near right edge - will shift left
const menu = createContextMenu(world, {
  x: 75,          // Near right edge
  y: 10,
  termWidth: 80,
  termHeight: 24,
  items: [{ label: 'Option 1' }, { label: 'Option 2' }],
});

// Menu near bottom edge - will shift up
const menu2 = createContextMenu(world, {
  x: 10,
  y: 22,          // Near bottom edge
  termWidth: 80,
  termHeight: 24,
  items: [{ label: 'Option 1' }, { label: 'Option 2' }],
});

void menu; void menu2;
```

## Accessibility

Context menus are automatically configured with accessibility features:

- Container has `role="menu"` and is focusable
- Each item has `role="menuitem"` with appropriate label
- Separators and disabled items are not focusable
- Keyboard navigation follows standard conventions

```typescript
import { createWorld } from 'blecsd/core';
import { createContextMenu } from 'blecsd/widgets';
import { getAccessibleRole, getAccessibleLabel } from 'blecsd/components';

const world = createWorld();
const menu = createContextMenu(world, {
  x: 10,
  y: 5,
  items: [
    { label: 'Copy', action: () => console.log('copy') },
  ],
});

// Menu container is accessible
console.log(getAccessibleRole(world, menu)); // "menu"
void getAccessibleLabel;
```

## Integration with Input System

```typescript
import { createWorld, removeEntity } from 'blecsd/core';
import { createContextMenu, handleContextMenuKey } from 'blecsd/widgets';
import type { Entity } from 'blecsd/core';
import type { ContextMenuItem } from 'blecsd/widgets';

const world = createWorld();
let _activeMenu: Entity | null = null;

const showContextMenu = (w: typeof world, x: number, y: number, items: ContextMenuItem[]) => {
  if (_activeMenu) {
    removeEntity(w, _activeMenu);
  }
  _activeMenu = createContextMenu(w, { x, y, items });
};

const hideContextMenu = (w: typeof world) => {
  if (_activeMenu) {
    removeEntity(w, _activeMenu);
    _activeMenu = null;
  }
};

const handleKey = (w: typeof world, key: string): boolean => {
  if (!_activeMenu) return false;
  const handled = handleContextMenuKey(w, _activeMenu, key);
  if (key === 'escape' || key === 'enter') {
    hideContextMenu(w);
  }
  return handled;
};

void showContextMenu; void hideContextMenu; void handleKey;
```
