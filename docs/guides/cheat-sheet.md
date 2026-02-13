# blECSd Cheat Sheet

Quick reference for the most common APIs and patterns in blECSd.

---

## Core ECS

```typescript
import { createWorld, addEntity, removeEntity } from 'blecsd';

// World management
const world = createWorld();               // Create ECS world
destroyWorld(world);                       // Destroy world and cleanup

// Entity lifecycle
const eid = addEntity(world);              // Create entity
removeEntity(world, eid);                  // Destroy entity
entityExists(world, eid);                  // Check if entity exists
```

---

## Widgets

### Common Widgets

```typescript
import { createBox, createPanel, createList, createText } from 'blecsd';

// Box - basic container
const box = createBox(world, {
  x: 10, y: 5, width: 30, height: 10,
  border: { type: 'single' },
  padding: { all: 1 }
});

// Panel - box with title
const panel = createPanel(world, {
  x: 2, y: 1, width: 40, height: 15,
  title: 'My Panel',
  border: { type: 'rounded' }
});

// List - selectable items
const list = createList(world, entity, {
  items: [
    { label: 'Item 1', value: 'val1' },
    { label: 'Item 2', value: 'val2' }
  ]
});

// Text - formatted text
const text = createText(world, {
  x: 5, y: 2, width: 20,
  content: 'Hello, world!',
  align: 'center'
});
```

### Form Controls

```typescript
import { createTextInput, createCheckbox, createSlider, createProgressBar } from 'blecsd';

// Text input
const input = createTextInput(world, {
  x: 5, y: 3, width: 30,
  placeholder: 'Enter text...'
});

// Checkbox
const checkbox = createCheckbox(world, {
  x: 5, y: 5,
  label: 'Enable feature',
  checked: false
});

// Slider
const slider = createSlider(world, {
  x: 5, y: 7, width: 20,
  min: 0, max: 100, value: 50
});

// Progress bar
const progress = createProgressBar(world, {
  x: 5, y: 9, width: 30,
  value: 75, max: 100,
  showPercentage: true
});
```

---

## Components

### Position & Layout

```typescript
import { setPosition, getPosition, moveBy, setDimensions, getDimensions } from 'blecsd';

// Position
setPosition(world, eid, 10, 5);            // Set x, y
const { x, y } = getPosition(world, eid); // Get position
moveBy(world, eid, 5, 0);                  // Move by offset
setZIndex(world, eid, 10);                 // Set rendering order

// Dimensions
setDimensions(world, eid, 30, 10);         // Set width, height
const { width, height } = getDimensions(world, eid);
setMinDimensions(world, eid, 10, 5);       // Set min constraints
setMaxDimensions(world, eid, 100, 50);     // Set max constraints
```

### Style & Appearance

```typescript
import { setRenderable, setBorder, setPadding, setContent } from 'blecsd';

// Colors and visibility
setRenderable(world, eid, {
  fg: 0xffffff,        // Foreground color (hex)
  bg: 0x000000,        // Background color (hex)
  visible: true
});

// Borders
setBorder(world, eid, {
  type: 'single',      // single, double, rounded, bold, ascii
  color: 0x0000ff
});

// Padding
setPadding(world, eid, { all: 1 });        // All sides
setPadding(world, eid, { top: 1, left: 2, right: 2, bottom: 1 });

// Content
setContent(world, eid, 'Hello!');
setContentAlign(world, eid, 'center');     // left, center, right
```

### Hierarchy

```typescript
import { appendChild, removeChild, getChildren, getParent } from 'blecsd';

// Parent-child relationships
appendChild(world, parent, child);         // Add child to parent
removeChild(world, parent, child);         // Remove child
const children = getChildren(world, parent); // Get all children
const parent = getParent(world, child);    // Get parent
```

### Focus & Interaction

```typescript
import { setFocusable, setFocus, getFocused, focusNext, focusPrev } from 'blecsd';

// Focus management
setFocusable(world, eid, true);            // Make focusable
setFocus(world, eid);                      // Give focus
const focused = getFocused(world);         // Get focused entity
focusNext(world);                          // Tab to next
focusPrev(world);                          // Shift+Tab to previous

// Interactive
setInteractive(world, eid, {
  onClick: (e) => console.log('Clicked'),
  onHover: (e) => console.log('Hover')
});
```

### Scrolling

```typescript
import { setScrollable, scrollBy, scrollToTop, scrollToBottom } from 'blecsd';

// Scrollable content
setScrollable(world, eid, {
  contentHeight: 100,
  scrollbarVisible: true
});

scrollBy(world, eid, 5);                   // Scroll by delta
scrollToTop(world, eid);                   // Jump to top
scrollToBottom(world, eid);                // Jump to bottom
scrollToLine(world, eid, 25);              // Jump to line
```

---

## Queries

```typescript
import { query, filterVisible, queryFocusable } from 'blecsd';

// Find entities with specific components
const entities = query(world, [Position, Renderable]);

// Filter by visibility
const visible = filterVisible(world, entities);

// Find focusable entities
const focusable = queryFocusable(world);

// Iterate results
for (const eid of entities) {
  const pos = getPosition(world, eid);
  // ... process entity
}
```

---

## Input Handling

### Keyboard

```typescript
import { getInputEventBus, enableInput, disableInput } from 'blecsd';

// Enable input handling
enableInput(world);

// Subscribe to key events
const inputBus = getInputEventBus(world);
inputBus.on('key', (event) => {
  if (event.name === 'q' && event.ctrl) {
    process.exit(0);  // Ctrl+Q to quit
  }
  if (event.name === 'up') {
    // Handle up arrow
  }
});

// Disable input
disableInput(world);
```

### Mouse

```typescript
// Subscribe to mouse events
inputBus.on('mouse', (event) => {
  if (event.action === 'press' && event.button === 'left') {
    console.log(`Clicked at ${event.x}, ${event.y}`);
  }
  if (event.action === 'move') {
    console.log(`Mouse moved to ${event.x}, ${event.y}`);
  }
});

// Enable mouse tracking
enableMouse(world);
```

---

## Rendering

```typescript
import { render, flush, beginFrame, endFrame } from 'blecsd';

// High-level rendering (most common)
render(world);                             // Render to screen buffer
flush(world);                              // Flush buffer to terminal

// Low-level rendering control
beginFrame(world);                         // Start render frame
// ... custom rendering
endFrame(world);                           // End frame and flush
```

---

## Game Loop

```typescript
import { startGameLoop, stopGameLoop } from 'blecsd';

// Start default game loop (60 FPS)
const loop = startGameLoop(world, {
  fps: 60,
  systems: [
    inputSystem,
    layoutSystem,
    renderSystem
  ]
});

// Custom game loop
function customLoop() {
  inputSystem(world);
  updateGameLogic(world);
  renderSystem(world);

  if (running) {
    setTimeout(customLoop, 16);  // ~60 FPS
  }
}
customLoop();

// Stop game loop
stopGameLoop(loop);
```

---

## Systems

```typescript
import {
  inputSystem,
  layoutSystem,
  renderSystem,
  focusSystem,
  scrollSystem,
  animationSystem,
  collisionSystem
} from 'blecsd';

// Execute systems manually
inputSystem(world);                        // Process input
layoutSystem(world);                       // Calculate layout
renderSystem(world);                       // Render to buffer
focusSystem(world);                        // Update focus state
scrollSystem(world);                       // Handle scrolling
animationSystem(world);                    // Update animations
collisionSystem(world);                    // Detect collisions
```

---

## Events

```typescript
import { createEventBus } from 'blecsd';

// Create typed event bus
interface AppEvents {
  'menu:select': { item: string };
  'dialog:close': { confirmed: boolean };
}

const events = createEventBus<AppEvents>();

// Subscribe to events
const unsubscribe = events.on('menu:select', (e) => {
  console.log(`Selected: ${e.item}`);
});

// Emit events
events.emit('menu:select', { item: 'File' });

// Unsubscribe
unsubscribe();
```

---

## Animation

```typescript
import { setVelocity, setAnimation } from 'blecsd';

// Physics-based movement
setVelocity(world, eid, {
  x: 5,                // Speed in x direction
  y: 0,
  friction: 0.9,       // Slow down over time
  maxSpeed: 10
});

// Sprite animation
setAnimation(world, eid, {
  frames: [0, 1, 2, 3],
  fps: 10,
  loop: true
});
```

---

## Collision Detection

```typescript
import { setCollider, detectCollisions } from 'blecsd';

// Add AABB collider
setCollider(world, eid, {
  type: 'aabb',
  width: 10,
  height: 5,
  layer: 1,
  mask: 0b11          // Collide with layers 0 and 1
});

// Detect collisions
const collisions = detectCollisions(world);
for (const { entityA, entityB } of collisions) {
  console.log(`${entityA} collided with ${entityB}`);
}
```

---

## Terminal I/O (Low-Level)

```typescript
import { cursor, style, screen } from 'blecsd/terminal';

// Cursor control
cursor.hide();
cursor.show();
cursor.to(10, 5);                          // Move to x, y
cursor.up(3);
cursor.down(2);

// Styling
console.log(style.bold('Bold text'));
console.log(style.color(255, 0, 0)('Red text'));
console.log(style.bg(0, 255, 0)('Green background'));

// Screen control
screen.clear();                            // Clear screen
screen.alternateBuffer();                  // Enter alternate buffer
screen.restoreBuffer();                    // Restore main buffer
```

---

## Common Patterns

### Pattern 1: Basic App Structure

```typescript
import { createWorld, createPanel, createList, enableInput, render, getInputEventBus } from 'blecsd';

// Setup
const world = createWorld();
enableInput(world);

// Create UI
const panel = createPanel(world, {
  x: 2, y: 1, width: 40, height: 15,
  title: 'My App'
});

const list = createList(world, entity, {
  items: [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' }
  ]
});

// Input handling
const inputBus = getInputEventBus(world);
inputBus.on('key', (e) => {
  if (e.name === 'q') process.exit(0);
});

// Render
render(world);
```

### Pattern 2: Interactive List

```typescript
// Create list with selection handling
const list = createList(world, entity, { items: [...] });

const inputBus = getInputEventBus(world);
inputBus.on('key', (e) => {
  if (e.name === 'up') {
    selectPrevious(world, list);
  }
  if (e.name === 'down') {
    selectNext(world, list);
  }
  if (e.name === 'return') {
    const selected = getSelectedItem(world, list);
    console.log('Selected:', selected);
  }
  render(world);
});
```

### Pattern 3: Form with Validation

```typescript
import { createForm, createTextInput, createCheckbox } from 'blecsd';

const form = createForm(world, {
  fields: [
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      validate: (val) => val.length >= 3
    },
    {
      name: 'agree',
      type: 'checkbox',
      label: 'I agree to terms'
    }
  ]
});

const inputBus = getInputEventBus(world);
inputBus.on('key', (e) => {
  if (e.name === 'return') {
    const values = getFormValues(world, form);
    if (validateForm(world, form)) {
      submitForm(values);
    }
  }
});
```

### Pattern 4: Scrollable Content

```typescript
// Create scrollable text area
const box = createBox(world, {
  x: 5, y: 2, width: 50, height: 20
});

setScrollable(world, box, {
  contentHeight: 100,
  scrollbarVisible: true
});

// Handle scroll input
const inputBus = getInputEventBus(world);
inputBus.on('key', (e) => {
  if (e.name === 'up') {
    scrollBy(world, box, -1);
  }
  if (e.name === 'down') {
    scrollBy(world, box, 1);
  }
  if (e.name === 'pageup') {
    scrollBy(world, box, -10);
  }
  if (e.name === 'pagedown') {
    scrollBy(world, box, 10);
  }
  render(world);
});
```

### Pattern 5: Dynamic Content Updates

```typescript
// Update text content
setContent(world, textBox, 'Updated text');
markDirty(world, textBox);                 // Mark for re-render

// Update list items
setListItems(world, list, [
  { label: 'New Item 1', value: '1' },
  { label: 'New Item 2', value: '2' }
]);

// Re-render
render(world);
```

### Pattern 6: Modal Dialog

```typescript
// Create modal overlay
const overlay = createBox(world, {
  x: 0, y: 0,
  width: '100%', height: '100%',
  style: { bg: 0x000000, opacity: 0.7 }
});

const dialog = createPanel(world, {
  x: '50%-20', y: '50%-10',  // Center on screen
  width: 40, height: 10,
  title: 'Confirm',
  border: { type: 'rounded' }
});

// Make dialog focus trap
setFocusTrap(world, dialog, true);

// Handle close
const inputBus = getInputEventBus(world);
inputBus.on('key', (e) => {
  if (e.name === 'escape') {
    removeEntity(world, overlay);
    removeEntity(world, dialog);
    render(world);
  }
});
```

---

## Keyboard Shortcuts

Common key names for input handling:

| Key | Name | Notes |
|-----|------|-------|
| Enter | `'return'` | Main enter key |
| Escape | `'escape'` | ESC key |
| Tab | `'tab'` | Tab key |
| Space | `'space'` | Spacebar |
| Arrows | `'up'`, `'down'`, `'left'`, `'right'` | Arrow keys |
| Page | `'pageup'`, `'pagedown'` | Page navigation |
| Home/End | `'home'`, `'end'` | Line navigation |
| Function | `'f1'`, `'f2'`, ... `'f12'` | Function keys |
| Delete | `'delete'`, `'backspace'` | Deletion keys |

Modifiers:
```typescript
event.ctrl   // Ctrl key held
event.shift  // Shift key held
event.alt    // Alt key held
event.meta   // Cmd (Mac) or Win (Windows)
```

---

## Color Utilities

```typescript
import { hexToRgb, rgbToHex, parseColor } from 'blecsd';

// Convert between formats
const rgb = hexToRgb('#ff0000');           // { r: 255, g: 0, b: 0 }
const hex = rgbToHex(255, 0, 0);           // 0xff0000

// Parse various formats
parseColor('#ff0000');                     // 0xff0000
parseColor('red');                         // Named color
parseColor('rgb(255, 0, 0)');              // RGB format
```

---

## Debug Utilities

```typescript
import { dumpWorld, inspectEntity, getComponentNames } from 'blecsd/debug';

// Debug world state
dumpWorld(world);                          // Print all entities

// Inspect entity
inspectEntity(world, eid);                 // Print entity components

// Get component list
const components = getComponentNames(world, eid);
console.log('Components:', components);
```

---

## Performance Tips

1. **Use queries efficiently**: Cache query results when iterating multiple times per frame
2. **Mark entities dirty**: Only re-render changed entities with `markDirty()`
3. **Batch updates**: Update multiple entities, then render once
4. **Use VirtualizedList**: For lists with 1000+ items
5. **Disable culling cautiously**: Visibility culling improves performance for large UIs
6. **Pool entities**: Reuse entities instead of creating/destroying frequently

---

## TypeScript Tips

```typescript
// Type-safe widget config
import type { BoxConfig, ListConfig } from 'blecsd';

const config: BoxConfig = {
  x: 10,
  y: 5,
  width: 30,
  height: 10
};

// Type-safe events
import { createEventBus } from 'blecsd';

interface MyEvents {
  'action:complete': { id: number };
}

const bus = createEventBus<MyEvents>();
bus.emit('action:complete', { id: 42 });  // Type-checked
```

---

## CLI Commands

```bash
# Create new blECSd project
npx blecsd init my-app

# Run examples
npm run example dashboard
npm run example game
npm run example form

# Development
npm run dev          # Watch mode
npm test            # Run tests
npm run lint        # Lint code
npm run build       # Build for production
```

---

## Related Guides

- [Getting Started](/docs/guides/getting-started.md) - Build your first app
- [ECS Architecture](/docs/guides/ecs-architecture.md) - Understanding ECS
- [Export Patterns](/docs/guides/export-patterns.md) - Import paths guide
- [Migrating from blessed](/docs/guides/migrating-from-blessed.md) - Migration guide
- [API Reference](/docs/api/) - Full API documentation

---

## Quick Links

- **GitHub**: https://github.com/Kadajett/blECSd
- **npm**: https://www.npmjs.com/package/blecsd
- **Issues**: https://github.com/Kadajett/blECSd/issues
- **Examples**: https://github.com/Kadajett/blECSd-Examples

---

**Tip**: Press `Ctrl+F` in your browser to quickly search this page for specific APIs.
