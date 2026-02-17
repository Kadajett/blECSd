# HoverText Widget

The HoverText system provides tooltips that display contextual information when hovering over entities. It manages timing, positioning, and rendering of hover text across your application.

## Import

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  createHoverTextManager,
  setHoverText,
  getHoverText,
  hasHoverText,
  clearHoverText,
  clearAllHoverText,
  getHoverTextCount,
  DEFAULT_HOVER_DELAY,
} from 'blecsd/widgets';

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

void DEFAULT_HOVER_DELAY;
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
const regEntity = addEntity(world);
// Simple text
hoverManager.setHoverText(regEntity, 'Tooltip text');

// With configuration
hoverManager.setHoverText(regEntity, {
  text: 'Warning: This action is irreversible',
  style: { bg: 0xff4444ff },
  delay: 200,
});

// Check and get
const hh = hoverManager.hasHoverText(regEntity);
void hh;
const hg = hoverManager.getHoverText(regEntity);
void hg;

// Clear
hoverManager.clearHoverText(regEntity);
hoverManager.clearAll();
```

### Mouse Updates

```typescript
const mouseX = 10; const mouseY = 5; const hoveredEntity = addEntity(world);
// Call when mouse moves or entity under cursor changes
hoverManager.updateMouse(mouseX, mouseY, hoveredEntity);

// hoveredEntity should be null if not over any entity
hoverManager.updateMouse(mouseX, mouseY, null);
```

### Frame Updates

```typescript
// Call every frame to handle show/hide timing
const deltaTimeMs = 16;
hoverManager.update(deltaTimeMs);
```

### Manual Control

```typescript
const showEntity = addEntity(world);
hoverManager.setHoverText(showEntity, 'Manual show');
// Show immediately (bypass delay)
hoverManager.showNow(showEntity, 5, 5);

// Hide immediately
hoverManager.hideNow();
```

### State

```typescript
const isVis = hoverManager.isVisible();
void isVis;
const hmState = hoverManager.getState();
void hmState;
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
  void renderData;
}
```

### Screen Size

```typescript
// Update when terminal resizes
hoverManager.setScreenSize(120, 40);
```

## Module-Level API

For simple use cases without a manager:

```typescript
const moduleEntity = addEntity(world);

// Register hover text
setHoverText(moduleEntity, 'Tooltip text');
setHoverText(moduleEntity, { text: 'Custom', delay: 100 });

// Query
const config = getHoverText(moduleEntity);
void config;
const exists = hasHoverText(moduleEntity);
void exists;
const count = getHoverTextCount();
void count;

// Clear
clearHoverText(moduleEntity);
clearAllHoverText();
```

## Example: Dashboard with Tooltips

```typescript
const dashboardManager = createHoverTextManager({
  screenWidth: 120,
  screenHeight: 40,
});

// Create entities to represent UI elements
const cpuGaugeEid = addEntity(world);
const memoryGaugeEid = addEntity(world);
const errorIconEid = addEntity(world);

dashboardManager.setHoverText(cpuGaugeEid, {
  text: 'CPU Usage\nCurrent: 45%\nAverage: 32%',
  style: { bg: 0x004488ff },
});

dashboardManager.setHoverText(memoryGaugeEid, {
  text: 'Memory Usage\nUsed: 8.2 GB\nTotal: 16 GB',
  style: { bg: 0x448800ff },
});

dashboardManager.setHoverText(errorIconEid, {
  text: 'Warning: High memory usage',
  style: { bg: 0xff4400ff },
  delay: 10,  // Show quickly (minimum delay is >0)
});
```

## Constants

```typescript
// Default values used by the hover text manager:
// DEFAULT_HOVER_DELAY = 500ms (show delay)
void DEFAULT_HOVER_DELAY;
```

## Related

- [Interactive Component](../interactive.md) - Hover state detection
- [Panel Widget](./panel.md) - Container with title
