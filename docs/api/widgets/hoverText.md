# HoverText Widget

The HoverText system provides tooltips that display contextual information when hovering over entities. It manages timing, positioning, and rendering of hover text across your application.

## Import

```typescript
import {
  createHoverTextManager,
  setHoverText,
  getHoverText,
  hasHoverText,
  clearHoverText,
  clearAllHoverText,
} from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createHoverTextManager, setHoverText } from 'blecsd';

const world = createWorld();

// Create the hover text manager
const hoverManager = createHoverTextManager({
  showDelay: 500,
  screenWidth: 80,
  screenHeight: 24,
});

// Register hover text for entities
const buttonEntity = addEntity(world);
setHoverText(buttonEntity, 'Click to submit the form');

// In your input loop
function onMouseMove(x, y, hoveredEntity) {
  hoverManager.updateMouse(x, y, hoveredEntity);
}

// In your game loop
function update(deltaTime) {
  hoverManager.update(deltaTime);

  // Render tooltip if visible
  const tooltip = hoverManager.getRenderData();
  if (tooltip) {
    renderTooltip(tooltip);
  }
}
```

## Manager Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `showDelay` | `number` | `500` | Delay before showing (ms) |
| `hideDelay` | `number` | `100` | Delay before hiding (ms) |
| `offsetX` | `number` | `2` | X offset from cursor |
| `offsetY` | `number` | `1` | Y offset from cursor |
| `screenWidth` | `number` | `80` | Screen width for boundary |
| `screenHeight` | `number` | `24` | Screen height for boundary |
| `style` | `TooltipStyle` | - | Default tooltip style |

### TooltipStyle Interface

```typescript
interface TooltipStyle {
  fg?: number;       // Foreground color
  bg?: number;       // Background color
  border?: number;   // Border color
  padding?: number;  // Inner padding
}
```

## HoverTextConfig Interface

```typescript
interface HoverTextConfig {
  text: string;          // Text to display
  style?: TooltipStyle;  // Style override
  delay?: number;        // Custom show delay
}
```

## Manager Methods

### Registration

```typescript
// Simple text
hoverManager.setHoverText(entity, 'Tooltip text');

// With configuration
hoverManager.setHoverText(entity, {
  text: 'Warning: This action is irreversible',
  style: { bg: 0xff4444ff },
  delay: 200,
});

// Check and get
hoverManager.hasHoverText(entity);   // true/false
hoverManager.getHoverText(entity);   // HoverTextConfig | undefined

// Clear
hoverManager.clearHoverText(entity);
hoverManager.clearAll();
```

### Mouse Updates

```typescript
// Call when mouse moves or entity under cursor changes
hoverManager.updateMouse(mouseX, mouseY, hoveredEntity);

// hoveredEntity should be null if not over any entity
hoverManager.updateMouse(mouseX, mouseY, null);
```

### Frame Updates

```typescript
// Call every frame to handle show/hide timing
hoverManager.update(deltaTimeMs);
```

### Manual Control

```typescript
// Show immediately (bypass delay)
hoverManager.showNow(entity, mouseX, mouseY);

// Hide immediately
hoverManager.hideNow();
```

### State

```typescript
hoverManager.isVisible();   // Check if tooltip showing
hoverManager.getState();    // Get full state object

// State object
interface TooltipState {
  visible: boolean;
  sourceEntity: Entity | null;
  text: string;
  position: { x: number; y: number };
  hoverStartTime: number | null;
}
```

### Rendering

```typescript
const renderData = hoverManager.getRenderData();
if (renderData) {
  // renderData contains:
  // x, y: position
  // width, height: dimensions
  // text: full text
  // lines: pre-split lines
  // style: resolved style
}
```

### Screen Size

```typescript
// Update when terminal resizes
hoverManager.setScreenSize(newWidth, newHeight);
```

## Module-Level API

For simple use cases without a manager:

```typescript
import {
  setHoverText,
  getHoverText,
  hasHoverText,
  clearHoverText,
  clearAllHoverText,
  getHoverTextCount,
} from 'blecsd';

// Register hover text
setHoverText(entity, 'Tooltip text');
setHoverText(entity, { text: 'Custom', delay: 100 });

// Query
const config = getHoverText(entity);
const exists = hasHoverText(entity);
const count = getHoverTextCount();

// Clear
clearHoverText(entity);
clearAllHoverText();
```

## Example: Form Tooltips

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createHoverTextManager,
  createTextInput,
  createButton,
} from 'blecsd';

const world = createWorld();

const hoverManager = createHoverTextManager({
  showDelay: 300,
  screenWidth: 80,
  screenHeight: 24,
  style: {
    fg: 0xffffffff,
    bg: 0x333333ff,
    border: 0x666666ff,
    padding: 1,
  },
});

// Username field
const usernameInput = createTextInput(world, addEntity(world), {
  x: 10, y: 5,
  width: 30,
  placeholder: 'Username',
});
hoverManager.setHoverText(usernameInput.eid, 'Enter your username (3-20 characters)');

// Password field
const passwordInput = createTextInput(world, addEntity(world), {
  x: 10, y: 7,
  width: 30,
  secret: true,
  placeholder: 'Password',
});
hoverManager.setHoverText(passwordInput.eid, {
  text: 'Password must contain:\n- 8+ characters\n- 1 uppercase\n- 1 number',
  delay: 200,
});

// Submit button
const submitButton = createButton(world, addEntity(world), {
  x: 10, y: 9,
  text: 'Login',
});
hoverManager.setHoverText(submitButton.eid, 'Click to log in');
```

## Example: Dashboard with Tooltips

```typescript
const hoverManager = createHoverTextManager({
  screenWidth: 120,
  screenHeight: 40,
});

// CPU gauge
hoverManager.setHoverText(cpuGauge.eid, {
  text: 'CPU Usage\nCurrent: 45%\nAverage: 32%',
  style: { bg: 0x004488ff },
});

// Memory gauge
hoverManager.setHoverText(memoryGauge.eid, {
  text: 'Memory Usage\nUsed: 8.2 GB\nTotal: 16 GB',
  style: { bg: 0x448800ff },
});

// Error indicator
hoverManager.setHoverText(errorIcon.eid, {
  text: 'Warning: High memory usage',
  style: { bg: 0xff4400ff },
  delay: 0,  // Show immediately
});
```

## Example: Custom Rendering

```typescript
function renderTooltip(data: TooltipRenderData): void {
  const { x, y, width, height, lines, style } = data;

  // Draw background
  fillRect(x, y, width, height, style.bg);

  // Draw border
  drawBorder(x, y, width, height, style.border);

  // Draw text
  for (let i = 0; i < lines.length; i++) {
    drawText(x + style.padding, y + style.padding + i, lines[i], style.fg);
  }
}

// In render loop
const tooltip = hoverManager.getRenderData();
if (tooltip) {
  renderTooltip(tooltip);
}
```

## Constants

```typescript
import {
  DEFAULT_HOVER_DELAY,      // 500ms
  DEFAULT_HIDE_DELAY,       // 100ms
  DEFAULT_CURSOR_OFFSET_X,  // 2
  DEFAULT_CURSOR_OFFSET_Y,  // 1
  DEFAULT_TOOLTIP_FG,       // 0xffffffff (white)
  DEFAULT_TOOLTIP_BG,       // 0xff333333 (dark gray)
  DEFAULT_TOOLTIP_BORDER,   // 0xff888888 (light gray)
} from 'blecsd';
```

## Related

- [Interactive Component](../interactive.md) - Hover state detection
- [Button Component](../components/button.md) - Interactive buttons
- [Panel Widget](./panel.md) - Container with title
