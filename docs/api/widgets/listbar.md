# Listbar Widget

The Listbar widget provides a horizontal menu bar with keyboard shortcuts and mouse support. It's commonly used for application menu bars, tab bars, and horizontal navigation.

## Import

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  createListbar,
  isListbarWidget,
  createPanel,
} from 'blecsd/widgets';

const world = createWorld();
const eid = addEntity(world);

const menubar = createListbar(world, eid, {
  x: 0,
  y: 0,
  items: [
    { text: 'File', key: 'f' },
    { text: 'Edit', key: 'e' },
    { text: 'View', key: 'v' },
    { text: 'Help', key: 'h' },
  ],
});

menubar.focus();
menubar.onActivate((index, item) => {
  console.log(`Activated: ${item.text}`);
});
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `width` | `number` | auto | Width (calculated from items if omitted) |
| `items` | `ListbarItem[]` | `[]` | Menu items |
| `selected` | `number` | `0` | Initially selected index |
| `style` | `ListbarStyleConfig` | - | Style configuration |
| `autoCommandKeys` | `boolean` | `true` | Auto-assign 1-9 keys |
| `mouse` | `boolean` | `true` | Enable mouse input |
| `keys` | `boolean` | `true` | Enable keyboard input |

### ListbarItem Interface

```typescript
interface ListbarItem {
  text: string;             // Display text
  key?: string;             // Keyboard shortcut
  callback?: () => void;    // Activation callback
  value?: string;           // Optional identifier
}
```

### ListbarStyleConfig Interface

```typescript
interface ListbarStyleConfig {
  item?: { fg?: number; bg?: number };       // Regular item style
  selected?: { fg?: number; bg?: number };   // Selected item style
  prefix?: { fg?: number; bg?: number };     // Key hint style ([1], [f])
  separator?: string;                         // Separator between items
}
```

## Keyboard Bindings

When focused and `keys: true`:

| Key | Action |
|-----|--------|
| `Left` / `h` | Select previous item |
| `Right` / `l` | Select next item |
| `Home` | Jump to first item |
| `End` | Jump to last item |
| `Enter` / `Space` | Activate selected item |
| `Escape` | Blur listbar |
| `1-9` | Jump to item by number (if `autoCommandKeys: true`) |
| Custom keys | Jump to item with matching key |

## Methods

### Visibility

```typescript
menubar.show();   // Show the listbar
menubar.hide();   // Hide the listbar
```

### Position

```typescript
const dx = 5; const dy = 0; const x = 10; const y = 0;
menubar.move(dx, dy);        // Move by offset
menubar.setPosition(x, y);   // Set absolute position
```

### Focus

```typescript
menubar.focus();  // Focus the listbar
menubar.blur();   // Remove focus
```

### Items

```typescript
const items = [{ text: 'Item 1' }, { text: 'Item 2' }];
menubar.setItems(items);      // Replace all items
menubar.getItems();           // Get all items
menubar.addItem({ text: 'New Item' });  // Add item to end
menubar.removeItem(2);        // Remove item at index
menubar.getItemCount();       // Get total item count
```

### Selection

```typescript
menubar.select(2);            // Select item at index
menubar.getSelectedIndex();   // Get selected index
menubar.getSelectedItem();    // Get selected item object
menubar.selectPrev();         // Select previous (wraps)
menubar.selectNext();         // Select next (wraps)
menubar.selectFirst();        // Select first item
menubar.selectLast();         // Select last item
menubar.selectByKey('f');     // Select by shortcut key
menubar.activate();           // Trigger activation callback
```

### State

```typescript
menubar.getState();           // Returns 'idle' or 'focused'
```

### Display

```typescript
const style = {};
menubar.setStyle(style);      // Update style configuration
menubar.getSeparator();       // Get separator string
menubar.setSeparator(' | ');  // Set separator string
```

### Rendering

```typescript
const line = menubar.renderLine();    // Get rendered text
const width = menubar.calculateWidth(); // Calculate total width
void line; void width;
```

### Events

```typescript
// Selection changed
const unsubSelect = menubar.onSelect((index, item) => {
  console.log(`Selected: ${item.text}`);
});

// Item activated (Enter pressed or callback triggered)
const unsubActivate = menubar.onActivate((index, item) => {
  console.log(`Activated: ${item.text}`);
  console.log(`Action value: ${item.value}`);
});

// Cleanup
unsubSelect();
unsubActivate();
```

### Key Handling

```typescript
// In your input loop
const action = menubar.handleKey('right');
if (action) {
  console.log(`Action: ${action.type}`);
}
```

### Lifecycle

```typescript
menubar.destroy();  // Remove entity and cleanup
```

## Example: Application Menu

```typescript
// Menu bar at top of screen
const menuEntity = addEntity(world);
const menu = createListbar(world, menuEntity, {
  x: 0,
  y: 0,
  items: [
    {
      text: 'File',
      key: 'f',
      callback: () => { console.log('File menu'); },
    },
    {
      text: 'Edit',
      key: 'e',
      callback: () => { console.log('Edit menu'); },
    },
    {
      text: 'View',
      key: 'v',
      callback: () => { console.log('View menu'); },
    },
    {
      text: 'Help',
      key: '?',
      callback: () => { console.log('Help'); },
    },
  ],
  style: {
    item: { fg: 0xccccccff, bg: 0x333333ff },
    selected: { fg: 0x000000ff, bg: 0x00ffffff },
    prefix: { fg: 0xffff00ff },
    separator: ' ',
  },
});

menu.focus();
```

## Example: Tab Bar

```typescript
const tabs = createListbar(world, addEntity(world), {
  x: 1,
  y: 1,
  items: [
    { text: 'General', value: 'general' },
    { text: 'Advanced', value: 'advanced' },
    { text: 'About', value: 'about' },
  ],
  autoCommandKeys: true,
  style: {
    separator: ' │ ',
  },
});

tabs.onSelect((index, item) => {
  console.log(`Showing tab: ${item.value}`);
});
```

## Example: Button Bar

```typescript
const buttons = createListbar(world, addEntity(world), {
  x: 5,
  y: 20,
  items: [
    { text: 'Save', key: 's', callback: () => { console.log('save'); } },
    { text: 'Cancel', key: 'c', callback: () => { console.log('cancel'); } },
    { text: 'Help', key: 'h', callback: () => { console.log('help'); } },
  ],
  style: {
    selected: { fg: 0xffffffff, bg: 0x0066ccff },
  },
});
void buttons;
```

## Related

- [Tabs Widget](./tabs.md) - Tabbed container with content panels
- [List Widget](./list.md) - Vertical selectable list
- [Panel Widget](./panel.md) - Container with title
