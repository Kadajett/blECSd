# blECSd Cheat Sheet

Quick reference for the most common APIs and patterns in blECSd.

---

## Core ECS

```typescript
import { createWorld, addEntity, removeEntity, entityExists } from 'blecsd/core';

// World management
const world = createWorld();               // Create ECS world

// Entity lifecycle
const eid = addEntity(world);              // Create entity
removeEntity(world, eid);                  // Destroy entity
entityExists(world, eid);                  // Check if entity exists
```

**Note:** Core ECS functions like `createWorld`, `addEntity`, `removeEntity` are always imported from `'blecsd'`. Namespace imports are for components, systems, terminal, and utilities.

---

## Widgets

### Common Widgets

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createBox } from 'blecsd/widgets';

const world = createWorld();

// Box - basic container
const boxEntity = addEntity(world);
const box = createBox(world, boxEntity, {
  left: 10, top: 5, width: 30, height: 10,
  border: { type: 'line', ch: 'single' },
  padding: 1
});

// Box with title
const panelEntity = addEntity(world);
const panel = createBox(world, panelEntity, {
  left: 2, top: 1, width: 40, height: 15,
  border: { type: 'line', ch: 'rounded' },
  content: 'My Panel'
});
```

### Form Controls

```typescript
import { createWorld } from 'blecsd/core';
import { createCheckbox, createProgressBar } from 'blecsd/widgets';

const world = createWorld();

// Checkbox
const checkbox = createCheckbox(world, {
  x: 5, y: 5,
  label: 'Enable feature',
  checked: false
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
import { createWorld, addEntity } from 'blecsd/core';
import { setPosition, getPosition, setDimensions, getDimensions, setZIndex } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Position
setPosition(world, eid, 10, 5);            // Set x, y
const { x, y } = getPosition(world, eid); // Get position
setZIndex(world, eid, 10);                 // Set rendering order

// Dimensions
setDimensions(world, eid, 30, 10);         // Set width, height
const { width, height } = getDimensions(world, eid);
```

**Using namespaces:**

```typescript
import { position, dimensions } from 'blecsd/components';

// Position
position.set(world, eid, 10, 5);           // Set x, y
const { x, y } = position.get(world, eid); // Get position
position.moveBy(world, eid, 5, 0);         // Move by offset
position.zIndex.set(world, eid, 10);       // Set rendering order

// Dimensions
dimensions.set(world, eid, 30, 10);
const { width, height } = dimensions.get(world, eid);
```

### Style & Appearance

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createBox } from 'blecsd/widgets';
import { setContent } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
createBox(world, eid, { x: 0, y: 0, width: 10, height: 5 });

// Borders
setBorder(world, eid, {
  type: 'single',      // single, double, rounded, bold, ascii
  color: 0x0000ff
});

// Padding
setPadding(world, eid, { all: 1 });        // All sides
setPadding(world, eid, { top: 1, left: 2, right: 2, bottom: 1 });

// Content
setContent(world, eid, 'Hello!', TextAlign.Center);     // left, center, right
```

**Using namespaces:**

```typescript
import { border, padding, content } from 'blecsd/components';

// Borders
border.set(world, eid, {
  type: 'single',      // single, double, rounded, bold, ascii
  color: 0x0000ff
});

// Padding
padding.set(world, eid, { all: 1 });       // All sides
padding.set(world, eid, { top: 1, left: 2, right: 2, bottom: 1 });

// Content
content.setText(world, eid, 'Hello!');
content.setAlign(world, eid, TextAlign.Center);
```

### Hierarchy

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setParent } from 'blecsd/components';

const world = createWorld();
const parent = addEntity(world);
const child = addEntity(world);

// Parent-child relationships
appendChild(world, parent, child);         // Add child to parent
removeChild(world, parent, child);         // Remove child
const children = getChildren(world, parent); // Get all children
const parentEid = getParent(world, child);    // Get parent
```

**Using namespaces:**

```typescript
import { hierarchy } from 'blecsd/components';

// Parent-child relationships
hierarchy.appendChild(world, parent, child);
hierarchy.removeChild(world, parent, child);
const children = hierarchy.getChildren(world, parent);
const parentEid = hierarchy.getParent(world, child);
```

### Focus & Interaction

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setFocusable, getFocusedEntity, focusNext, focusPrev } from 'blecsd/components';
import { setUserFocus } from 'blecsd/terminal';
import { createBox } from 'blecsd/widgets';

const world = createWorld();
const eid = addEntity(world);
createBox(world, eid, { x: 0, y: 0, width: 10, height: 5 });

// Focus management
setFocusable(world, eid, true);            // Make focusable
setUserFocus(world, eid);                  // Give focus
const focused = getFocusedEntity(world);   // Get focused entity
focusNext(world);                          // Tab to next
focusPrev(world);                          // Shift+Tab to previous
```

**Using namespaces:**

```typescript
import { focus } from 'blecsd/components';

// Focus management
focus.makeFocusable(world, eid);
focus.focus(world, eid);
const focused = focus.getFocused(world);
focus.next(world);
focus.prev(world);
```

### Scrolling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setScrollable, scrollBy, scrollToTop, scrollToBottom, scrollToLine } from 'blecsd/components';
import { setContent } from 'blecsd/components';
import { createBox } from 'blecsd/widgets';

const world = createWorld();
const eid = addEntity(world);
createBox(world, eid, { x: 0, y: 0, width: 20, height: 10 });
setContent(world, eid, 'Line 1\nLine 2\nLine 3');

// Scrollable content
setScrollable(world, eid, true);

scrollBy(world, eid, 5);                   // Scroll by delta
scrollToTop(world, eid);                   // Jump to top
scrollToBottom(world, eid);                // Jump to bottom
scrollToLine(world, eid, 2);               // Jump to line
```

**Using namespaces:**

```typescript
import { scroll } from 'blecsd/components';

// Scrollable content
scroll.set(world, eid, true);
scroll.by(world, eid, 0, 5);
scroll.toTop(world, eid);
scroll.toBottom(world, eid);
scroll.viewport.toLine(world, eid, 2);
```

---

## Queries

```typescript
import { createWorld, addEntity, getAllEntities, filterVisible, queryFocusable } from 'blecsd/core';
import { getPosition } from 'blecsd/components';
import { createBox } from 'blecsd/widgets';

const world = createWorld();
const eid = addEntity(world);
createBox(world, eid, { x: 10, y: 5, width: 10, height: 5 });

// Find all entities
const entities = getAllEntities(world);

// Filter by visibility
const visible = filterVisible(world);

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
import { createWorld } from 'blecsd/core';
import { enableInput, disableInput } from 'blecsd/components';
import { createEventBus } from 'blecsd/core';

const world = createWorld();

// Enable input handling
enableInput(world);

// Subscribe to key events
const inputBus = createEventBus();
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
import { renderSystem, outputSystem } from 'blecsd/systems';
import { beginFrame, endFrame } from 'blecsd/core';

// High-level rendering (most common)
renderSystem(world);                       // Render to screen buffer
outputSystem(world);                       // Flush buffer to terminal

// Low-level rendering control
beginFrame(world);                         // Start render frame
// ... custom rendering
endFrame(world);                           // End frame and flush
```

---

## Game Loop

```typescript
import { createGameLoop } from 'blecsd/core';

// Start default game loop (60 FPS)
const loop = createGameLoop(world, {
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
loop.stop();
```

---

## Systems

```typescript
import { createWorld } from 'blecsd/core';
import { inputSystem, layoutSystem, renderSystem, focusSystem, animationSystem } from 'blecsd/systems';

const world = createWorld();

// Execute systems manually
inputSystem(world);                        // Process input
layoutSystem(world);                       // Calculate layout
renderSystem(world);                       // Render to buffer
focusSystem(world);                        // Update focus state
animationSystem(world);                    // Update animations
```

---

## Events

```typescript
import { createEventBus } from 'blecsd/core';

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
import { setVelocity, registerAnimation, playAnimation } from 'blecsd/components';

// Physics-based movement
setVelocity(world, eid, {
  x: 5,                // Speed in x direction
  y: 0,
  friction: 0.9,       // Slow down over time
  maxSpeed: 10
});

// Sprite animation: register then play
const animId = registerAnimation({
  name: 'walk',
  frames: [
    { index: 0, duration: 100 },
    { index: 1, duration: 100 },
    { index: 2, duration: 100 },
    { index: 3, duration: 100 },
  ],
});
playAnimation(world, eid, animId, { loop: true });
```

---

## Collision Detection

```typescript
import { setCollider } from 'blecsd/components';
import { detectCollisions } from 'blecsd/systems';

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

## Namespace Imports

For larger applications, use namespace imports to organize related functions and avoid naming conflicts:

### Component Namespaces

```typescript
import { position, dimensions, content, border, padding } from 'blecsd/components';
import { scroll, focus, hierarchy, renderable } from 'blecsd/components';

// Position operations
position.set(world, eid, 10, 5);
position.moveBy(world, eid, 2, 0);
const pos = position.get(world, eid);

// Dimensions operations
dimensions.set(world, eid, 40, 10);
const size = dimensions.get(world, eid);

// Content operations
content.setText(world, eid, 'Hello!');
content.setAlign(world, eid, TextAlign.Center);
const text = content.getText(world, eid);

// Border and padding
border.set(world, eid, { type: BorderType.Single });
padding.set(world, eid, { all: 1 });

// Scrolling
scroll.by(world, eid, 0, 5);
scroll.toTop(world, eid);

// Focus management
focus.makeFocusable(world, eid);
focus.next(world);

// Hierarchy
hierarchy.appendChild(world, parent, child);
const children = hierarchy.getChildren(world, parent);
```

### System Namespaces

```typescript
import { layout, render } from 'blecsd/systems';
import { animation } from 'blecsd/components';
import { input, output, spring } from 'blecsd/systems';
import { collision } from 'blecsd/components';

// Run systems manually
input.processInput(world);
animation.updateAnimations(world);
layout.calculateLayout(world);
render.renderEntities(world);
output.flushOutput(world);

// Collision detection
collision.detectCollisions(world);
const collisions = collision.getCollisions(world);

// Spring physics
spring.updateSprings(world, deltaTime);
```

### Terminal Namespaces

```typescript
import { cursor, screen, graphics } from 'blecsd/terminal';

// Cursor operations
cursor.hide();
cursor.show();
cursor.to(10, 5);

// Screen management
screen.clear();
screen.alternateOn();
screen.alternateOff();

// Graphics drawing
graphics.drawLine(world, x1, y1, x2, y2, char);
graphics.fillRect(world, x, y, width, height, char);
```

### Utility Namespaces

```typescript
import { colors, textWrap, unicode } from 'blecsd/utils';

// Color utilities
const packed = colors.hexToColor('#ff0000');
const hex = colors.colorToHex(packed);

// Text wrapping
const wrapped = textWrap.wrap('Long text...', 40);
const lines = textWrap.wrapLines('Text', 40);

// Unicode handling
const width = unicode.stringWidth('Hello 世界');
const truncated = unicode.truncate('Long string', 20);
```

### When to Use Namespaces

Use flat imports from `'blecsd'` for:
- Small scripts and prototypes
- Simple applications with few imports
- When you know exactly what you need

Use namespace imports from `'blecsd/components'`, `'blecsd/systems'`, etc. for:
- Larger applications with many components
- When you want to organize imports by domain
- To avoid naming conflicts
- When building reusable modules

---

## Common Patterns

### Pattern 1: Basic App Structure

```typescript
import { createWorld, createListEntity, addEntity } from 'blecsd/core';
import { enableInput } from 'blecsd/components';
import { renderSystem } from 'blecsd/systems';
import { createPanel } from 'blecsd/widgets';
import { createEventBus } from 'blecsd/core';

// Setup
const world = createWorld();
enableInput(world);

// Create UI
const panel = createPanel(world, {
  x: 2, y: 1, width: 40, height: 15,
  title: 'My App'
});

const entity = addEntity(world);
const list = createListEntity(world, entity, {
  items: [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' }
  ]
});

// Input handling
const inputBus = createEventBus();
inputBus.on('key', (e) => {
  if (e.name === 'q') process.exit(0);
});

// Render
render(world);
```

### Pattern 2: Interactive List

```typescript
// Create list with selection handling
const list = createListEntity(world, entity, { items: [...] });

const inputBus = createEventBus();
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
import { createFormEntity, createTextareaEntity, createCheckboxEntity } from 'blecsd/core';

const form = createFormEntity(world, {
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

const inputBus = createEventBus();
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
const box = createBoxEntity(world, {
  x: 5, y: 2, width: 50, height: 20
});

setScrollable(world, box, {
  contentHeight: 100,
  scrollbarVisible: true
});

// Handle scroll input
const inputBus = createEventBus();
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
const overlay = createBoxEntity(world, {
  x: 0, y: 0,
  width: '100%', height: '100%',
  style: { bg: 0x000000, opacity: 0.7 }
});

const dialog = createPanelEntity(world, {
  x: '50%-20', y: '50%-10',  // Center on screen
  width: 40, height: 10,
  title: 'Confirm',
  border: { type: 'rounded' }
});

// Make dialog focus trap
setFocusTrap(world, dialog, true);

// Handle close
const inputBus = createEventBus();
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
import { hexToColor, colorToHex } from 'blecsd/components';
import { parseColor } from 'blecsd/utils';

// Convert between formats
const color = hexToColor('#ff0000');       // Packed color
const hex = colorToHex(color);             // '#ff0000'

// Parse various formats
parseColor('#ff0000');                     // 0xff0000
parseColor('red');                         // Named color
parseColor('rgb(255, 0, 0)');              // RGB format
```

---

## Debug Utilities

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { dumpWorld, inspectEntity } from 'blecsd/debug';

const world = createWorld();
const eid = addEntity(world);

// Debug world state
dumpWorld(world);                          // Print all entities

// Inspect entity
const inspection = inspectEntity(world, eid);  // Get entity inspection
console.log('Components:', inspection.components);
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
import type { BoxConfig, ListConfig } from 'blecsd/core';

const config: BoxConfig = {
  x: 10,
  y: 5,
  width: 30,
  height: 10
};

// Type-safe events
import { createEventBus } from 'blecsd/core';

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

- [Getting Started](../getting-started/installation.md) - Build your first app
- [ECS Architecture](./understanding-ecs.md) - Understanding ECS
- [Export Patterns](./export-patterns.md) - Import paths guide
- [Migrating from blessed](./migrating-from-blessed.md) - Migration guide
- [API Reference](/docs/api/) - Full API documentation

---

## Quick Links

- **GitHub**: https://github.com/Kadajett/blECSd
- **npm**: https://www.npmjs.com/package/blecsd
- **Issues**: https://github.com/Kadajett/blECSd/issues
- **Examples**: https://github.com/Kadajett/blECSd-Examples

---

**Tip**: Press `Ctrl+F` in your browser to quickly search this page for specific APIs.
