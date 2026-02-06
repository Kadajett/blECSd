# Interactive Component

The Interactive component tracks mouse interaction states: click, hover, drag.

## Component

```typescript
import { Interactive } from 'blecsd';

// Component arrays (bitECS SoA pattern)
Interactive.clickable     // Uint8Array  - Can be clicked
Interactive.draggable     // Uint8Array  - Can be dragged
Interactive.hoverable     // Uint8Array  - Responds to hover
Interactive.keyable       // Uint8Array  - Responds to keyboard
Interactive.hovered       // Uint8Array  - Currently hovered
Interactive.pressed       // Uint8Array  - Currently pressed
Interactive.hoverEffectFg // Uint32Array - Hover state foreground
Interactive.hoverEffectBg // Uint32Array - Hover state background
```

## Constants

```typescript
import { DEFAULT_HOVER_FG, DEFAULT_HOVER_BG } from 'blecsd';

DEFAULT_HOVER_FG; // Default hover foreground color
DEFAULT_HOVER_BG; // Default hover background color
```

## Functions

### hasInteractive

Check if an entity has the Interactive component.

```typescript
import { hasInteractive } from 'blecsd';

hasInteractive(world, entity); // true or false
```

### setInteractive

Set interaction options. Adds component if needed.

```typescript
import { setInteractive } from 'blecsd';

setInteractive(world, entity, {
  clickable: true,
  hoverable: true,
  draggable: false,
  keyable: true,
  hoverEffectFg: 0xffffffff,
  hoverEffectBg: 0x444444ff,
});
```

### setClickable

Enable or disable click handling.

```typescript
import { setClickable } from 'blecsd';

setClickable(world, entity, true);
```

### isClickable

Check if an entity is clickable.

```typescript
import { isClickable } from 'blecsd';

isClickable(world, entity); // true or false
```

### setHoverable

Enable or disable hover handling.

```typescript
import { setHoverable } from 'blecsd';

setHoverable(world, entity, true);
```

### isHoverable

Check if an entity responds to hover.

```typescript
import { isHoverable } from 'blecsd';

isHoverable(world, entity); // true or false
```

### setDraggable

Enable or disable drag handling.

```typescript
import { setDraggable } from 'blecsd';

setDraggable(world, entity, true);
```

### isDraggable

Check if an entity is draggable.

```typescript
import { isDraggable } from 'blecsd';

isDraggable(world, entity); // true or false
```

### setKeyable

Enable or disable keyboard handling.

```typescript
import { setKeyable } from 'blecsd';

setKeyable(world, entity, true);
```

### isKeyable

Check if an entity responds to keyboard input.

```typescript
import { isKeyable } from 'blecsd';

isKeyable(world, entity); // true or false
```

### setHovered

Set hover state.

```typescript
import { setHovered } from 'blecsd';

setHovered(world, entity, true);  // Mouse entered
setHovered(world, entity, false); // Mouse left
```

### isHovered

Check if an entity is currently hovered.

```typescript
import { isHovered } from 'blecsd';

isHovered(world, entity); // true or false
```

### setPressed

Set pressed state.

```typescript
import { setPressed } from 'blecsd';

setPressed(world, entity, true);  // Mouse down
setPressed(world, entity, false); // Mouse up
```

### isPressed

Check if an entity is currently pressed.

```typescript
import { isPressed } from 'blecsd';

isPressed(world, entity); // true or false
```

### clearInteractionState

Clear hover and pressed states (useful on mouse leave).

```typescript
import { clearInteractionState } from 'blecsd';

clearInteractionState(world, entity);
```

### getInteractive

Get all interaction data for an entity.

```typescript
import { getInteractive } from 'blecsd';

const data = getInteractive(world, entity);
// {
//   clickable: boolean,
//   draggable: boolean,
//   hoverable: boolean,
//   keyable: boolean,
//   hovered: boolean,
//   pressed: boolean,
//   hoverEffectFg: number,
//   hoverEffectBg: number
// }
```

## Types

### InteractiveData

```typescript
interface InteractiveData {
  readonly clickable: boolean;
  readonly draggable: boolean;
  readonly hoverable: boolean;
  readonly keyable: boolean;
  readonly hovered: boolean;
  readonly pressed: boolean;
  readonly hoverEffectFg: number;
  readonly hoverEffectBg: number;
}
```

### InteractiveOptions

```typescript
interface InteractiveOptions {
  clickable?: boolean;
  draggable?: boolean;
  hoverable?: boolean;
  keyable?: boolean;
  hoverEffectFg?: number;
  hoverEffectBg?: number;
}
```

## Examples

### Mouse Events

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  setInteractive,
  setHovered,
  setPressed,
  isClickable,
  isHovered,
  isPressed,
  getPosition,
  getDimensions,
} from 'blecsd';

// Make entity interactive
setInteractive(world, button, {
  clickable: true,
  hoverable: true,
});

// Handle mouse move
function onMouseMove(world, x, y) {
  const entities = queryInteractive(world);

  for (const eid of entities) {
    const pos = getPosition(world, eid);
    const dims = getDimensions(world, eid);

    if (pos && dims) {
      const inside = x >= pos.x && x < pos.x + dims.width &&
                     y >= pos.y && y < pos.y + dims.height;
      setHovered(world, eid, inside);
    }
  }
}

// Handle mouse down
function onMouseDown(world, x, y) {
  const hovered = findHoveredEntity(world);
  if (hovered && isClickable(world, hovered)) {
    setPressed(world, hovered, true);
  }
}

// Handle mouse up
function onMouseUp(world) {
  const entities = queryInteractive(world);
  for (const eid of entities) {
    if (isPressed(world, eid)) {
      setPressed(world, eid, false);
      // Trigger click event
      if (isHovered(world, eid)) {
        handleClick(world, eid);
      }
    }
  }
}
```

### Hover Styling

<!-- blecsd-doccheck:ignore -->
```typescript
import { setInteractive, isHovered, getStyle, getInteractive } from 'blecsd';

// Set hover colors
setInteractive(world, button, {
  hoverable: true,
  hoverEffectFg: 0xffffffff,
  hoverEffectBg: 0x555555ff,
});

// In render, use hover colors when hovered
function getEffectiveStyle(world, entity) {
  const style = getStyle(world, entity);
  const interactive = getInteractive(world, entity);

  if (interactive?.hovered) {
    return {
      ...style,
      fg: interactive.hoverEffectFg,
      bg: interactive.hoverEffectBg,
    };
  }

  return style;
}
```
