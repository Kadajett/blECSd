# Hover Text (Tooltip) System

The Hover Text system provides tooltips that display when users hover over entities. The tooltip follows the mouse cursor and shows after a configurable delay.

## Overview

The hover text system consists of:
- A global store mapping entities to tooltip text
- A manager that handles timing, positioning, and state
- Module-level functions for simple use cases

```typescript
import { createHoverTextManager, setHoverText } from 'blecsd/widgets';

// Create a manager for your application
const hoverManager = createHoverTextManager({
  showDelay: 500,
  screenWidth: 80,
  screenHeight: 24,
});

const buttonEntity = 1;
const entity = 2;

// Register hover text for an entity
hoverManager.setHoverText(buttonEntity, 'Click to submit');

// Or use module-level functions
setHoverText(entity, 'Hover text here');
```

---

## Constants

```typescript
import {
  // 500ms - Delay before showing
  DEFAULT_HIDE_DELAY,
  // 100ms - Delay before hiding
  DEFAULT_CURSOR_OFFSET_X,
  // 2 - X offset from cursor
  DEFAULT_CURSOR_OFFSET_Y,
  // 1 - Y offset from cursor
  DEFAULT_TOOLTIP_FG,
  // 0xffffffff - White
  DEFAULT_TOOLTIP_BG,
  // 0xff333333 - Dark gray
  DEFAULT_TOOLTIP_BORDER,
  DEFAULT_HOVER_DELAY,
} from 'blecsd/widgets';
```

---

## createHoverTextManager

Creates a hover text manager for handling tooltip state, timing, and positioning.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';

const hoverManager = createHoverTextManager({
  showDelay: 500,      // ms before showing tooltip
  hideDelay: 100,      // ms before hiding after mouse leaves
  offsetX: 2,          // X offset from cursor
  offsetY: 1,          // Y offset from cursor
  screenWidth: 80,     // For boundary checking
  screenHeight: 24,
  style: {
    fg: 0xffffffff,    // Foreground color
    bg: 0xff333333,    // Background color
    border: 0xff888888, // Border color
    padding: 1,        // Padding inside tooltip
  },
});
```

**Parameters:**
- `config` - Manager configuration
  - `showDelay` - Delay before showing tooltip (ms)
  - `hideDelay` - Delay before hiding tooltip (ms)
  - `offsetX` - X offset from cursor
  - `offsetY` - Y offset from cursor
  - `screenWidth` - Screen width for boundary checking
  - `screenHeight` - Screen height for boundary checking
  - `style` - Default tooltip style

**Returns:** `HoverTextManager`

---

## HoverTextManager Methods

### setHoverText

Sets hover text for an entity.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const entity = 1;

// Simple text
hoverManager.setHoverText(entity, 'Click to submit');

// With custom configuration
hoverManager.setHoverText(entity, {
  text: 'Danger zone!',
  style: { bg: 0xffff0000 },  // Red background
  delay: 200,                   // Custom delay
});
```

### clearHoverText

Clears hover text for an entity.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const entity = 1;
hoverManager.setHoverText(entity, 'test');
hoverManager.clearHoverText(entity);
```

### getHoverText

Gets the hover text config for an entity.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const entity = 1;
hoverManager.setHoverText(entity, 'Click me');
const config = hoverManager.getHoverText(entity);
if (config) {
  console.log(config.text);
}
```

### hasHoverText

Checks if an entity has hover text.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const entity = 1;
hoverManager.setHoverText(entity, 'test');
if (hoverManager.hasHoverText(entity)) {
  // Entity has hover text
}
```

### updateMouse

Updates the hover state based on mouse position. Call this when mouse moves or enters/leaves entities.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const entity = 1;
// In your input handler
const mouseX = 10;
const mouseY = 5;
hoverManager.updateMouse(mouseX, mouseY, entity);
```

### update

Updates tooltip timing. Call each frame to handle show/hide delays.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
// In your game loop
const gameLoop = (deltaTime: number) => {
  hoverManager.update(deltaTime);
  // ... rest of update
};
gameLoop(0.016);
```

### showNow

Shows the tooltip immediately, bypassing the delay.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const entity = 1;
const mouseX = 10;
const mouseY = 5;
hoverManager.setHoverText(entity, 'test');
hoverManager.showNow(entity, mouseX, mouseY);
```

### hideNow

Hides the tooltip immediately.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
hoverManager.hideNow();
```

### getState

Gets the current tooltip state.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const state = hoverManager.getState();
// state = {
//   visible: true,
//   sourceEntity: 42,
//   text: 'Click me',
//   position: { x: 15, y: 8 },
//   hoverStartTime: 1234567890,
// }
void state;
```

### isVisible

Checks if the tooltip is currently visible.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
if (hoverManager.isVisible()) {
  // Tooltip is showing
}
```

### getRenderData

Gets the tooltip render data. Use this to render the tooltip in your game loop.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const tooltip = hoverManager.getRenderData();
if (tooltip) {
  // Render the tooltip
  console.log(`Render box at ${tooltip.x},${tooltip.y} size ${tooltip.width}x${tooltip.height}`);
  for (let i = 0; i < tooltip.lines.length; i++) {
    console.log(`Line ${i}: ${tooltip.lines[i]}`);
  }
}
```

**Returns:** `TooltipRenderData | null`

### setScreenSize

Updates screen dimensions for boundary checking.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
hoverManager.setScreenSize(120, 40);
```

### clearAll

Clears all hover text registrations.

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
hoverManager.clearAll();
```

---

## Module-Level Functions

For simple use cases, you can use module-level functions that operate on a global store.

### setHoverText

Sets hover text for an entity in the global store.

```typescript
import { setHoverText } from 'blecsd/widgets';

const entity = 1;
setHoverText(entity, 'Click here to submit');
```

### clearHoverText

Clears hover text for an entity.

```typescript
import { clearHoverText, setHoverText } from 'blecsd/widgets';

const entity = 1;
setHoverText(entity, 'test');
clearHoverText(entity);
```

### getHoverText

Gets hover text config for an entity.

```typescript
import { getHoverText, setHoverText } from 'blecsd/widgets';

const entity = 1;
setHoverText(entity, 'test');
const config = getHoverText(entity);
void config;
```

### hasHoverText

Checks if an entity has hover text.

```typescript
import { hasHoverText, setHoverText } from 'blecsd/widgets';

const entity = 1;
setHoverText(entity, 'test');
if (hasHoverText(entity)) {
  // entity has hover text
}
```

### clearAllHoverText

Clears all hover text registrations.

```typescript
import { clearAllHoverText } from 'blecsd/widgets';

clearAllHoverText();
```

### getHoverTextCount

Gets the number of entities with hover text registered.

```typescript
import { getHoverTextCount } from 'blecsd/widgets';

const count = getHoverTextCount();
```

### resetHoverTextStore

Resets the hover text store. For testing purposes.

```typescript
import { resetHoverTextStore } from 'blecsd/widgets';

resetHoverTextStore();
```

---

## Types

### TooltipPosition

```typescript
interface TooltipPosition {
  readonly x: number;
  readonly y: number;
}
```

### TooltipStyle

```typescript
interface TooltipStyle {
  readonly fg?: number;      // Foreground color
  readonly bg?: number;      // Background color
  readonly border?: number;  // Border color
  readonly padding?: number; // Padding inside tooltip
}
```

### HoverTextConfig

```typescript
interface HoverTextConfig {
  readonly text: string;         // The text to display
  readonly style?: TooltipStyle; // Optional style override
  readonly delay?: number;       // Custom delay (overrides global)
}
```

### HoverTextManagerConfig

```typescript
interface HoverTextManagerConfig {
  readonly showDelay?: number;     // Delay before showing (ms)
  readonly hideDelay?: number;     // Delay before hiding (ms)
  readonly offsetX?: number;       // X offset from cursor
  readonly offsetY?: number;       // Y offset from cursor
  readonly screenWidth?: number;   // Screen width for boundary checking
  readonly screenHeight?: number;  // Screen height for boundary checking
  readonly style?: TooltipStyle;   // Default tooltip style
}
```

### TooltipState

```typescript
interface TooltipState {
  readonly visible: boolean;
  readonly sourceEntity: Entity | null;
  readonly text: string;
  readonly position: TooltipPosition;
  readonly hoverStartTime: number | null;
}
```

### TooltipRenderData

```typescript
interface TooltipRenderData {
  readonly x: number;                       // X position on screen
  readonly y: number;                       // Y position on screen
  readonly width: number;                   // Width of tooltip box
  readonly height: number;                  // Height of tooltip box
  readonly text: string;                    // Text to display
  readonly lines: readonly string[];        // Lines of text (pre-split)
  readonly style: Required<TooltipStyle>;   // Style to use
}
```

---

## Examples

### Basic Usage

```typescript
import { createHoverTextManager } from 'blecsd/widgets';

const hoverManager = createHoverTextManager({
  showDelay: 500,
  screenWidth: 80,
  screenHeight: 24,
});

const saveButton = 1;
const deleteButton = 2;

// Register hover text for entities
hoverManager.setHoverText(saveButton, 'Save your changes');
hoverManager.setHoverText(deleteButton, {
  text: 'Delete this item permanently',
  style: { bg: 0xffcc0000 }, // Red background for warnings
});

// In your input handler
const onMouseMove = (x: number, y: number) => {
  hoverManager.updateMouse(x, y, null);
};

// In your game loop
const update = (dt: number) => {
  hoverManager.update(dt);
};

// In your render loop
const render = () => {
  // ... render game objects ...
  const tooltip = hoverManager.getRenderData();
  if (tooltip) {
    console.log(`Tooltip: ${tooltip.text} at ${tooltip.x},${tooltip.y}`);
  }
};

onMouseMove(5, 5);
update(0.016);
render();
```

### Multi-line Tooltips

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const helpButton = 1;
hoverManager.setHoverText(helpButton, {
  text: 'Help Center\nPress F1 for more info\nVisit docs.example.com',
});
```

### Custom Styling Per Entity

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const infoIcon = 1;
const warningIcon = 2;
const errorIcon = 3;

// Info tooltip (blue)
hoverManager.setHoverText(infoIcon, {
  text: 'Information',
  style: {
    fg: 0xffffffff,
    bg: 0xff0066cc,
    border: 0xff0088ff,
  },
});

// Warning tooltip (yellow)
hoverManager.setHoverText(warningIcon, {
  text: 'Warning: This action cannot be undone',
  style: {
    fg: 0xff000000,
    bg: 0xffffcc00,
    border: 0xffff9900,
  },
  delay: 200, // Show faster for warnings
});

// Error tooltip (red)
hoverManager.setHoverText(errorIcon, {
  text: 'Error: Invalid input',
  style: {
    fg: 0xffffffff,
    bg: 0xffcc0000,
    border: 0xffff0000,
  },
});
```

### Rendering a Tooltip

```typescript
import { createHoverTextManager } from 'blecsd/widgets';
import type { TooltipRenderData } from 'blecsd/widgets';

const renderTooltip = (tooltip: TooltipRenderData) => {
  const { x, y, lines } = tooltip;

  // Draw text lines
  for (let i = 0; i < lines.length; i++) {
    console.log(`Line at ${x},${y + i}: ${lines[i]}`);
  }
};

const hoverManager = createHoverTextManager({ screenWidth: 80, screenHeight: 24 });
const tooltip = hoverManager.getRenderData();
if (tooltip) {
  renderTooltip(tooltip);
}
```

---

## See Also

- [Input System](./systems/input-system.md) - Mouse event handling
- [Position Component](./position.md) - Entity positioning
