# List Widget

The List widget provides a selectable, scrollable list with keyboard and mouse support. Commonly used for menus, file browsers, command palettes, and option selection.

## Import

```typescript
import { createList, isListWidget } from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createList } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const list = createList(world, eid, {
  x: 5,
  y: 5,
  width: 30,
  height: 10,
  items: ['Option 1', 'Option 2', 'Option 3'],
});

list.focus();
list.onSelect((index, item) => {
  console.log(`Selected: ${item.text} at index ${index}`);
});
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `width` | `number` | `20` | Width of the list |
| `height` | `number` | `10` | Height (number of visible items) |
| `items` | `string[]` | `[]` | Items to display |
| `selected` | `number` | `0` | Initially selected index |
| `style` | `ListStyleConfig` | - | Style configuration |
| `interactive` | `boolean` | `true` | Whether the list responds to input |
| `mouse` | `boolean` | `true` | Enable mouse input |
| `keys` | `boolean` | `true` | Enable keyboard input |
| `search` | `boolean` | `false` | Enable search/filter mode |

### ListStyleConfig

```typescript
interface ListStyleConfig {
  item?: { fg?: number; bg?: number };
  selected?: { fg?: number; bg?: number; prefix?: string };
  unselectedPrefix?: string;
  disabledFg?: number;
}
```

## Keyboard Bindings

| Key | Action |
|-----|--------|
| `Up` / `k` | Select previous item |
| `Down` / `j` | Select next item |
| `Enter` / `Space` | Activate (confirm) selection |
| `Escape` | Cancel / blur |
| `g` | Jump to first item |
| `G` | Jump to last item |
| `PageUp` | Scroll up one page |
| `PageDown` | Scroll down one page |
| `/` | Enter search mode (if enabled) |

### Search Mode Keys

When search is enabled and active:

| Key | Action |
|-----|--------|
| Any character | Append to search query |
| `Backspace` | Delete last search character |
| `Escape` | Exit search mode |
| `Enter` / `n` | Jump to next match |

## Methods

All methods return the widget for chaining (except getters).

### Visibility

```typescript
list.show();    // Show the list
list.hide();    // Hide the list
```

### Position

```typescript
list.setPosition(10, 20);  // Set absolute position
list.move(5, 0);           // Move relative
```

### Focus

```typescript
list.focus();   // Focus the list (enables key handling)
list.blur();    // Remove focus
```

### Items

```typescript
// Set all items
list.setItems(['Apple', 'Banana', 'Cherry']);

// Get all items
const items = list.getItems();
// [{ text: 'Apple', value: 'Apple' }, ...]

// Add/remove items
list.addItem('Date');
list.addItem('Fig', 'custom-value');  // With custom value
list.removeItem(2);                    // Remove by index
list.clearItems();                     // Remove all
```

### Selection

```typescript
list.select(2);             // Select by index
list.selectNext();           // Select next item
list.selectPrev();           // Select previous item
list.selectFirst();          // Select first item
list.selectLast();           // Select last item
list.activate();             // Confirm current selection

const index = list.getSelectedIndex();
const item = list.getSelectedItem();
// { text: 'Option 2', value: 'Option 2' }
```

### Scrolling

```typescript
list.pageUp();    // Scroll up one page
list.pageDown();  // Scroll down one page
```

### Search

```typescript
list.startSearch();                   // Enter search mode
const query = list.getSearchQuery();  // Get current query
const searching = list.isSearching(); // Check if searching
list.endSearch();                     // Exit search mode
```

### State

```typescript
const state = list.getState();
// { items, selectedIndex, scrollOffset, focused, ... }
```

### Key Handling

```typescript
// Process a key press (returns the action taken, or null)
const action = list.handleKey('down');
// { type: 'selectNext' }
```

## Events

### onSelect

Fires when the selected item changes (via keyboard/mouse navigation).

```typescript
const unsubscribe = list.onSelect((index, item) => {
  console.log(`Now on: ${item.text} (index ${index})`);
});

// Later: stop listening
unsubscribe();
```

### onActivate

Fires when an item is activated (Enter/Space or double-click).

```typescript
list.onActivate((index, item) => {
  console.log(`Activated: ${item.text}`);
});
```

### onSearchChange

Fires when the search query changes (search mode only).

```typescript
list.onSearchChange((query) => {
  console.log(`Search: ${query}`);
});
```

## Examples

### File Browser

```typescript
const fileBrowser = createList(world, eid, {
  x: 0, y: 0,
  width: 40, height: 20,
  items: ['..', 'src/', 'package.json', 'README.md'],
  style: {
    selected: { fg: 0x000000ff, bg: 0x00ff00ff, prefix: '> ' },
    unselectedPrefix: '  ',
  },
});

fileBrowser.onActivate((index, item) => {
  if (item.text.endsWith('/')) {
    navigateToDirectory(item.text);
  } else {
    openFile(item.text);
  }
});
```

### Searchable Command Palette

```typescript
const palette = createList(world, eid, {
  x: 10, y: 2,
  width: 60, height: 15,
  items: commands.map(c => c.label),
  search: true,
  style: {
    selected: { fg: 0xffffffff, bg: 0x0066ccff },
  },
});

palette.focus().startSearch();
```

## Type Guard

```typescript
import { isListWidget } from 'blecsd';

if (isListWidget(world, eid)) {
  // Entity has list behavior attached
}
```

## Lifecycle

```typescript
// Clean up when done
list.destroy();
```

Destroying a list removes the entity and clears all callbacks.

## Validation

Configuration is validated using Zod:

<!-- blecsd-doccheck:ignore -->
```typescript
import { ListWidgetConfigSchema } from 'blecsd';

const result = ListWidgetConfigSchema.safeParse(config);
if (!result.success) {
  console.error(result.error);
}
```
