# Context Menu

Right-click style context menus with keyboard navigation for terminal UIs. Provides popup menus with selectable items, separators, and automatic edge detection.

## Quick Start

```typescript
import { createWorld, createContextMenu, handleContextMenuKey } from 'blecsd';

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
function onKeyPress(key: string) {
  handleContextMenuKey(world, menu, key);
}
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
const items: ContextMenuItem[] = [
  { label: 'New File', action: () => createFile() },
  { label: 'Open', action: () => openFile() },
  { separator: true },
  { label: 'Save', action: () => saveFile(), disabled: !hasChanges },
];
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
import { createContextMenu } from 'blecsd';

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
import { handleContextMenuKey } from 'blecsd';

function onKeyPress(key: string) {
  const handled = handleContextMenuKey(world, menu, key);
  if (!handled) {
    // Handle other keys
  }
}
```

#### getContextMenuSelectedIndex

Gets the currently selected item index in the menu.

**Parameters:**
- `eid` - The context menu entity

**Returns:** `number` - The selected index (0-based)

**Example:**
```typescript
import { getContextMenuSelectedIndex } from 'blecsd';

const selectedIndex = getContextMenuSelectedIndex(menu);
console.log(`Selected item: ${selectedIndex}`);
```

## Common Patterns

### Basic Context Menu

```typescript
import { createContextMenu } from 'blecsd';

const menu = createContextMenu(world, {
  x: mouseX,
  y: mouseY,
  termWidth: 80,
  termHeight: 24,
  items: [
    { label: 'New', action: () => handleNew() },
    { label: 'Open', action: () => handleOpen() },
    { label: 'Save', action: () => handleSave() },
    { separator: true },
    { label: 'Exit', action: () => handleExit() },
  ],
});
```

### File Operations Menu

```typescript
import { createContextMenu } from 'blecsd';

const fileMenu = createContextMenu(world, {
  x: 15,
  y: 10,
  items: [
    { label: 'New File', action: () => createNewFile() },
    { label: 'New Folder', action: () => createNewFolder() },
    { separator: true },
    { label: 'Open', action: () => openFileDialog() },
    { separator: true },
    { label: 'Rename', action: () => renameFile() },
    { label: 'Delete', action: () => deleteFile() },
  ],
});
```

### Conditional Items

```typescript
import { createContextMenu } from 'blecsd';

const hasSelection = selectedItems.length > 0;
const hasClipboard = clipboard.hasContent();

const editMenu = createContextMenu(world, {
  x: 20,
  y: 8,
  items: [
    { label: 'Copy', action: () => copy(), disabled: !hasSelection },
    { label: 'Cut', action: () => cut(), disabled: !hasSelection },
    { label: 'Paste', action: () => paste(), disabled: !hasClipboard },
    { separator: true },
    { label: 'Delete', action: () => deleteItems(), disabled: !hasSelection },
  ],
});
```

### Nested Actions

```typescript
import { createContextMenu } from 'blecsd';

function showFormatMenu() {
  const formatMenu = createContextMenu(world, {
    x: 30,
    y: 10,
    items: [
      { label: 'Bold', action: () => applyBold() },
      { label: 'Italic', action: () => applyItalic() },
      { label: 'Underline', action: () => applyUnderline() },
    ],
  });
}

const mainMenu = createContextMenu(world, {
  x: 20,
  y: 8,
  items: [
    { label: 'Format...', action: () => showFormatMenu() },
    { label: 'Insert...', action: () => showInsertMenu() },
    { separator: true },
    { label: 'Close', action: () => closeMenu() },
  ],
});
```

### Right-Click Menu

```typescript
import { createContextMenu } from 'blecsd';

function onRightClick(x: number, y: number, item: FileItem) {
  const menu = createContextMenu(world, {
    x,
    y,
    termWidth: terminalWidth,
    termHeight: terminalHeight,
    items: [
      { label: `Open ${item.name}`, action: () => openFile(item) },
      { separator: true },
      { label: 'Copy', action: () => copyItem(item) },
      { label: 'Rename', action: () => renameItem(item) },
      { label: 'Delete', action: () => deleteItem(item) },
      { separator: true },
      { label: 'Properties', action: () => showProperties(item) },
    ],
  });
}
```

### Keyboard Navigation

```typescript
import { handleContextMenuKey, getContextMenuSelectedIndex } from 'blecsd';

let currentMenu: Entity | null = null;

function onKeyPress(key: string) {
  if (!currentMenu) return;

  const handled = handleContextMenuKey(world, currentMenu, key);

  if (handled) {
    // Update visual highlight based on selection
    const selectedIndex = getContextMenuSelectedIndex(currentMenu);
    updateMenuHighlight(selectedIndex);
  }
}
```

### Dynamic Menu Items

```typescript
import { createContextMenu } from 'blecsd';

function createDynamicMenu(selectedFiles: File[]) {
  const items: ContextMenuItem[] = [];

  // Always available actions
  items.push({ label: 'New File', action: () => createFile() });
  items.push({ separator: true });

  // Conditional actions based on selection
  if (selectedFiles.length === 1) {
    items.push({ label: 'Rename', action: () => rename(selectedFiles[0]) });
  }

  if (selectedFiles.length > 0) {
    items.push({ label: `Delete (${selectedFiles.length})`, action: () => deleteAll(selectedFiles) });
  }

  return createContextMenu(world, {
    x: 10,
    y: 5,
    items,
  });
}
```

### Auto-Closing Menu

```typescript
import { createContextMenu, handleContextMenuKey, removeEntity } from 'blecsd';

let activeMenu: Entity | null = null;

function showMenu(x: number, y: number) {
  // Close existing menu
  if (activeMenu) {
    removeEntity(world, activeMenu);
  }

  // Create new menu
  activeMenu = createContextMenu(world, {
    x,
    y,
    items: [...],
  });
}

function onKeyPress(key: string) {
  if (activeMenu) {
    const handled = handleContextMenuKey(world, activeMenu, key);

    // Menu closes itself on escape or selection
    if (key === 'escape' || key === 'enter') {
      activeMenu = null;
    }
  }
}
```

### Menu with Keyboard Shortcuts

```typescript
import { createContextMenu } from 'blecsd';

const menu = createContextMenu(world, {
  x: 10,
  y: 5,
  items: [
    { label: 'Save (Ctrl+S)', action: () => save() },
    { label: 'Open (Ctrl+O)', action: () => open() },
    { label: 'Find (Ctrl+F)', action: () => find() },
    { separator: true },
    { label: 'Quit (Ctrl+Q)', action: () => quit() },
  ],
});
```

## Edge Detection

Context menus automatically adjust their position to avoid rendering outside the terminal bounds:

```typescript
// Menu near right edge - will shift left
const menu = createContextMenu(world, {
  x: 75,          // Near right edge
  y: 10,
  termWidth: 80,
  termHeight: 24,
  items: [...],
});
// Menu will be repositioned to fit within terminal width

// Menu near bottom edge - will shift up
const menu2 = createContextMenu(world, {
  x: 10,
  y: 22,          // Near bottom edge
  termWidth: 80,
  termHeight: 24,
  items: [...],
});
// Menu will be repositioned to fit within terminal height
```

## Accessibility

Context menus are automatically configured with accessibility features:

- Container has `role="menu"` and is focusable
- Each item has `role="menuitem"` with appropriate label
- Separators and disabled items are not focusable
- Keyboard navigation follows standard conventions

```typescript
import { getAccessibleRole, getAccessibleLabel } from 'blecsd';

const menu = createContextMenu(world, {
  x: 10,
  y: 5,
  items: [
    { label: 'Copy', action: () => copy() },
  ],
});

// Menu container is accessible
console.log(getAccessibleRole(world, menu)); // "menu"
```

## Integration with Input System

```typescript
import { createContextMenu, handleContextMenuKey } from 'blecsd';

class ContextMenuManager {
  private activeMenu: Entity | null = null;

  show(world: World, x: number, y: number, items: ContextMenuItem[]) {
    this.hide(world);
    this.activeMenu = createContextMenu(world, { x, y, items });
  }

  hide(world: World) {
    if (this.activeMenu) {
      removeEntity(world, this.activeMenu);
      this.activeMenu = null;
    }
  }

  handleKey(world: World, key: string): boolean {
    if (!this.activeMenu) return false;

    const handled = handleContextMenuKey(world, this.activeMenu, key);

    if (key === 'escape' || key === 'enter') {
      this.hide(world);
    }

    return handled;
  }
}
```
