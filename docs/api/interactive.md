# Interactive Component

The Interactive component tracks mouse interaction states: click, hover, drag.

## Component

```typescript
import { Interactive } from 'blecsd/components';

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
import { DEFAULT_HOVER_FG, DEFAULT_HOVER_BG } from 'blecsd/components';

DEFAULT_HOVER_FG; // Default hover foreground color
DEFAULT_HOVER_BG; // Default hover background color
```

## Functions

### hasInteractive

Check if an entity has the Interactive component.

```typescript
import { hasInteractive } from 'blecsd/components';

hasInteractive(world, entity); // true or false
```

### setInteractive

Set interaction options. Adds component if needed.

```typescript
import { setInteractive } from 'blecsd/components';

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
import { setClickable } from 'blecsd/components';

setClickable(world, entity, true);
```

### isClickable

Check if an entity is clickable.

```typescript
import { isClickable } from 'blecsd/components';

isClickable(world, entity); // true or false
```

### setHoverable

Enable or disable hover handling.

```typescript
import { setHoverable } from 'blecsd/components';

setHoverable(world, entity, true);
```

### isHoverable

Check if an entity responds to hover.

```typescript
import { isHoverable } from 'blecsd/components';

isHoverable(world, entity); // true or false
```

### setDraggable

Enable or disable drag handling.

```typescript
import { setDraggable } from 'blecsd/components';

setDraggable(world, entity, true);
```

### isDraggable

Check if an entity is draggable.

```typescript
import { isDraggable } from 'blecsd/components';

isDraggable(world, entity); // true or false
```

### setKeyable

Enable or disable keyboard handling.

```typescript
import { setKeyable } from 'blecsd/components';

setKeyable(world, entity, true);
```

### isKeyable

Check if an entity responds to keyboard input.

```typescript
import { isKeyable } from 'blecsd/components';

isKeyable(world, entity); // true or false
```

### setHovered

Set hover state.

```typescript
import { setHovered } from 'blecsd/components';

setHovered(world, entity, true);  // Mouse entered
setHovered(world, entity, false); // Mouse left
```

### isHovered

Check if an entity is currently hovered.

```typescript
import { isHovered } from 'blecsd/components';

isHovered(world, entity); // true or false
```

### setPressed

Set pressed state.

```typescript
import { setPressed } from 'blecsd/components';

setPressed(world, entity, true);  // Mouse down
setPressed(world, entity, false); // Mouse up
```

### isPressed

Check if an entity is currently pressed.

```typescript
import { isPressed } from 'blecsd/components';

isPressed(world, entity); // true or false
```

### clearInteractionState

Clear hover and pressed states (useful on mouse leave).

```typescript
import { clearInteractionState } from 'blecsd/components';

clearInteractionState(world, entity);
```

### getInteractive

Get all interaction data for an entity.

```typescript
import { getInteractive } from 'blecsd/components';

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

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { queryInteractive } from 'blecsd/core';
import {
  setInteractive,
  setHovered,
  setPressed,
  isClickable,
  isHovered,
  isPressed,
  getPosition,
  getDimensions,
} from 'blecsd/components';

const world = createWorld();
const button = addEntity(world);

// Make entity interactive
setInteractive(world, button, {
  clickable: true,
  hoverable: true,
});

// Handle mouse move
function onMouseMove(w: typeof world, x: number, y: number) {
  const entities = queryInteractive(w);

  for (const eid of entities) {
    const pos = getPosition(w, eid);
    const dims = getDimensions(w, eid);

    if (pos && dims) {
      const inside = x >= pos.x && x < pos.x + dims.width &&
                     y >= pos.y && y < pos.y + dims.height;
      setHovered(w, eid, inside);
    }
  }
}

// Handle mouse down
function onMouseDown(w: typeof world, x: number, y: number) {
  const entities = queryInteractive(w);
  const hovered = entities.find(eid => isHovered(w, eid));
  if (hovered && isClickable(w, hovered)) {
    setPressed(w, hovered, true);
  }
}

// Handle mouse up
function onMouseUp(w: typeof world) {
  const entities = queryInteractive(w);
  for (const eid of entities) {
    if (isPressed(w, eid)) {
      setPressed(w, eid, false);
    }
  }
}

onMouseMove(world, 0, 0);
onMouseDown(world, 0, 0);
onMouseUp(world);
```

### Hover Styling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setInteractive, isHovered, getStyle, getInteractive } from 'blecsd/components';

const world = createWorld();
const button = addEntity(world);

// Set hover colors
setInteractive(world, button, {
  hoverable: true,
  hoverEffectFg: 0xffffffff,
  hoverEffectBg: 0x555555ff,
});

// In render, use hover colors when hovered
function getEffectiveStyle(w: typeof world, entity: number) {
  const style = getStyle(w, entity);
  const interactive = getInteractive(w, entity);

  if (interactive?.hovered) {
    return {
      ...style,
      fg: interactive.hoverEffectFg,
      bg: interactive.hoverEffectBg,
    };
  }

  return style;
}

getEffectiveStyle(world, button);
```
