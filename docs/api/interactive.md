# Interactive Component

The Interactive component enables mouse and keyboard interaction on entities. It tracks clickable, draggable, hoverable, and keyable states, along with hover visual effects.

## Constants

### DEFAULT_HOVER_FG

Default hover effect foreground color (white).

```typescript
import { DEFAULT_HOVER_FG } from 'blecsd';

DEFAULT_HOVER_FG; // 0xffffffff (white)
```

---

### DEFAULT_HOVER_BG

Default hover effect background color (transparent).

```typescript
import { DEFAULT_HOVER_BG } from 'blecsd';

DEFAULT_HOVER_BG; // 0x00000000 (transparent)
```

---

## Interactive Component

The Interactive component stores interaction metadata using bitecs SoA (Structure of Arrays) pattern.

```typescript
import { Interactive } from 'blecsd';

// Component arrays
Interactive.clickable     // Uint8Array  - Whether entity responds to clicks (0=no, 1=yes)
Interactive.draggable     // Uint8Array  - Whether entity can be dragged (0=no, 1=yes)
Interactive.hoverable     // Uint8Array  - Whether entity responds to hover (0=no, 1=yes)
Interactive.hovered       // Uint8Array  - Current hover state (0=no, 1=yes)
Interactive.pressed       // Uint8Array  - Current pressed state (0=no, 1=yes)
Interactive.keyable       // Uint8Array  - Whether entity receives key events (0=no, 1=yes)
Interactive.hoverEffectFg // Uint32Array - Hover effect foreground color
Interactive.hoverEffectBg // Uint32Array - Hover effect background color
```

---

## Functions

### setInteractive

Makes an entity interactive with the given options. Adds the Interactive component if not already present.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Make entity clickable and hoverable
setInteractive(world, entity, {
  clickable: true,
  hoverable: true,
});

// Configure with custom hover colors
setInteractive(world, entity, {
  clickable: true,
  hoverable: true,
  hoverEffectBg: 0x333333ff,
  hoverEffectFg: 0xffff00ff,
});

// Enable all interaction types
setInteractive(world, entity, {
  clickable: true,
  draggable: true,
  hoverable: true,
  keyable: true,
});
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `options` - Interactive configuration options
  - `clickable` - Whether entity responds to clicks
  - `draggable` - Whether entity can be dragged
  - `hoverable` - Whether entity responds to hover
  - `keyable` - Whether entity receives key events
  - `hoverEffectFg` - Hover effect foreground color
  - `hoverEffectBg` - Hover effect background color

**Returns:** The entity ID for chaining

---

### setClickable

Sets whether an entity is clickable.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setClickable, isClickable } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setClickable(world, entity, true);
isClickable(world, entity); // true

setClickable(world, entity, false);
isClickable(world, entity); // false
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `clickable` - Whether entity responds to clicks

**Returns:** The entity ID for chaining

---

### setDraggable

Sets whether an entity is draggable.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setDraggable, isDraggable } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setDraggable(world, entity, true);
isDraggable(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `draggable` - Whether entity can be dragged

**Returns:** The entity ID for chaining

---

### setHoverable

Sets whether an entity is hoverable.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setHoverable, isHoverable } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setHoverable(world, entity, true);
isHoverable(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `hoverable` - Whether entity responds to hover

**Returns:** The entity ID for chaining

---

### setKeyable

Sets whether an entity receives key events.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setKeyable, isKeyable } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setKeyable(world, entity, true);
isKeyable(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `keyable` - Whether entity receives key events

**Returns:** The entity ID for chaining

---

### isHovered

Checks if an entity is currently hovered.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, setHovered, isHovered } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setInteractive(world, entity, { hoverable: true });
isHovered(world, entity); // false

setHovered(world, entity, true);
isHovered(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `true` if entity is hovered, `false` otherwise

---

### isPressed

Checks if an entity is currently pressed.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, setPressed, isPressed } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setInteractive(world, entity, { clickable: true });
isPressed(world, entity); // false

setPressed(world, entity, true);
isPressed(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `true` if entity is pressed, `false` otherwise

---

### isClickable

Checks if an entity is clickable.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, isClickable } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

isClickable(world, entity); // false (no Interactive component)

setInteractive(world, entity, { clickable: true });
isClickable(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `true` if entity is clickable, `false` otherwise

---

### isDraggable

Checks if an entity is draggable.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, isDraggable } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

isDraggable(world, entity); // false

setInteractive(world, entity, { draggable: true });
isDraggable(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `true` if entity is draggable, `false` otherwise

---

### isHoverable

Checks if an entity is hoverable.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, isHoverable } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

isHoverable(world, entity); // false

setInteractive(world, entity, { hoverable: true });
isHoverable(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `true` if entity is hoverable, `false` otherwise

---

### isKeyable

Checks if an entity receives key events.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, isKeyable } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

isKeyable(world, entity); // false

setInteractive(world, entity, { keyable: true });
isKeyable(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `true` if entity receives key events, `false` otherwise

---

### setHovered

Sets the hover state of an entity.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, setHovered, isHovered } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setInteractive(world, entity, { hoverable: true });

// Typically called by input system when mouse enters entity bounds
setHovered(world, entity, true);
isHovered(world, entity); // true

setHovered(world, entity, false);
isHovered(world, entity); // false
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `hovered` - Whether entity is hovered

**Returns:** The entity ID for chaining

---

### setPressed

Sets the pressed state of an entity.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, setPressed, isPressed } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setInteractive(world, entity, { clickable: true });

// Typically called by input system on mouse down
setPressed(world, entity, true);
isPressed(world, entity); // true

// Called on mouse up
setPressed(world, entity, false);
isPressed(world, entity); // false
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `pressed` - Whether entity is pressed

**Returns:** The entity ID for chaining

---

### getInteractive

Gets the interactive data of an entity.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, setHovered, getInteractive } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

getInteractive(world, entity); // undefined (no Interactive component)

setInteractive(world, entity, {
  clickable: true,
  hoverable: true,
  hoverEffectBg: 0x333333ff,
});
setHovered(world, entity, true);

const data = getInteractive(world, entity);
// data = {
//   clickable: true,
//   draggable: false,
//   hoverable: true,
//   hovered: true,
//   pressed: false,
//   keyable: false,
//   hoverEffectFg: 0xffffffff,
//   hoverEffectBg: 0x333333ff
// }
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `InteractiveData | undefined`

---

### hasInteractive

Checks if an entity has an Interactive component.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, hasInteractive } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

hasInteractive(world, entity); // false

setInteractive(world, entity, { clickable: true });
hasInteractive(world, entity); // true
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** `true` if entity has Interactive component, `false` otherwise

---

### clearInteractionState

Clears the hover and pressed states of an entity. Useful when an entity becomes disabled or hidden.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { setInteractive, setHovered, setPressed, clearInteractionState, isHovered, isPressed } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

setInteractive(world, entity, { clickable: true, hoverable: true });
setHovered(world, entity, true);
setPressed(world, entity, true);

isHovered(world, entity); // true
isPressed(world, entity); // true

clearInteractionState(world, entity);

isHovered(world, entity); // false
isPressed(world, entity); // false
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID

**Returns:** The entity ID for chaining

---

## Types

### InteractiveOptions

Options for configuring interactive behavior.

```typescript
interface InteractiveOptions {
  clickable?: boolean;     // Whether entity responds to clicks
  draggable?: boolean;     // Whether entity can be dragged
  hoverable?: boolean;     // Whether entity responds to hover
  keyable?: boolean;       // Whether entity receives key events
  hoverEffectFg?: number;  // Hover effect foreground color
  hoverEffectBg?: number;  // Hover effect background color
}
```

### InteractiveData

Data returned by getInteractive.

```typescript
interface InteractiveData {
  readonly clickable: boolean;     // Whether entity responds to clicks
  readonly draggable: boolean;     // Whether entity can be dragged
  readonly hoverable: boolean;     // Whether entity responds to hover
  readonly hovered: boolean;       // Current hover state
  readonly pressed: boolean;       // Current pressed state
  readonly keyable: boolean;       // Whether entity receives key events
  readonly hoverEffectFg: number;  // Hover effect foreground color
  readonly hoverEffectBg: number;  // Hover effect background color
}
```

---

## Usage Example

A complete example showing interactive button behavior.

```typescript
import { createWorld, addEntity } from 'bitecs';
import {
  setInteractive,
  isHovered,
  isPressed,
  setHovered,
  setPressed,
  clearInteractionState,
  DEFAULT_HOVER_FG,
} from 'blecsd';

const world = createWorld();
const button = addEntity(world);

// Configure button as clickable and hoverable
setInteractive(world, button, {
  clickable: true,
  hoverable: true,
  hoverEffectBg: 0x444444ff,
});

// In your render system
function renderButton(world, eid) {
  if (isPressed(world, eid)) {
    // Draw pressed state (darker)
  } else if (isHovered(world, eid)) {
    // Draw hovered state
  } else {
    // Draw normal state
  }
}

// When button is disabled
function disableButton(world, eid) {
  clearInteractionState(world, eid);
  setInteractive(world, eid, { clickable: false, hoverable: false });
}
```

---

## See Also

- [Components Reference](./components.md) - All component documentation
- [Position Component](./position.md) - Position for hit detection
- [Dimensions Component](./dimensions.md) - Size for hit detection bounds
