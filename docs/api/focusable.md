# Focusable Component

The Focusable component manages keyboard focus for entities. Only one entity can have focus at a time. Entities can be organized into a tab order for keyboard navigation.

## Constants

### DEFAULT_FOCUS_FG

Default foreground color for focus effects (white).

```typescript
import { DEFAULT_FOCUS_FG } from 'blecsd';

DEFAULT_FOCUS_FG; // 0xffffffff (white)
```

### DEFAULT_FOCUS_BG

Default background color for focus effects (transparent).

```typescript
import { DEFAULT_FOCUS_BG } from 'blecsd';

DEFAULT_FOCUS_BG; // 0x00000000 (transparent)
```

---

## Focusable Component

The Focusable component stores focus metadata using bitecs SoA (Structure of Arrays) pattern.

```typescript
import { Focusable } from 'blecsd';

// Component arrays
Focusable.focusable     // Uint8Array  - Whether entity can receive focus (0=no, 1=yes)
Focusable.focused       // Uint8Array  - Whether entity currently has focus (0=no, 1=yes)
Focusable.tabIndex      // Int16Array  - Tab order (-1 = not in tab order, 0+ = order)
Focusable.focusEffectFg // Uint32Array - Focus effect foreground color
Focusable.focusEffectBg // Uint32Array - Focus effect background color
```

---

## Functions

### hasFocusable

Checks if an entity has a Focusable component.

```typescript
import { createWorld, hasFocusable, setFocusable } from 'blecsd';

const world = createWorld();
const eid = 1;

hasFocusable(world, eid); // false

setFocusable(world, eid, { focusable: true });
hasFocusable(world, eid); // true
```

---

### setFocusable

Makes an entity focusable with the given options. Adds the Focusable component if not already present.

```typescript
import { createWorld, setFocusable } from 'blecsd';

const world = createWorld();
const eid = 1;

// Set focusable with default options
setFocusable(world, eid, { focusable: true });

// Set focusable with tab index and custom focus colors
setFocusable(world, eid, {
  focusable: true,
  tabIndex: 1,
  focusEffectFg: 0xff00ffff, // Cyan
  focusEffectBg: 0x333333ff, // Dark gray
});
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `options` - Focusable configuration options
  - `focusable` - Whether entity can receive focus
  - `tabIndex` - Tab order (-1 = not in tab order)
  - `focusEffectFg` - Focus effect foreground color
  - `focusEffectBg` - Focus effect background color

**Returns:** The entity ID for chaining

---

### makeFocusable

Simple boolean setter for making an entity focusable or not. Adds the Focusable component if not already present.

```typescript
import { createWorld, makeFocusable, isFocusable } from 'blecsd';

const world = createWorld();
const eid = 1;

makeFocusable(world, eid, true);
isFocusable(world, eid); // true

makeFocusable(world, eid, false);
isFocusable(world, eid); // false
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `focusable` - Whether entity can receive focus

**Returns:** The entity ID for chaining

---

### isFocused

Checks if an entity is currently focused.

```typescript
import { createWorld, setFocusable, focus, isFocused } from 'blecsd';

const world = createWorld();
const eid = 1;

setFocusable(world, eid, { focusable: true });
isFocused(world, eid); // false

focus(world, eid);
isFocused(world, eid); // true
```

---

### isFocusable

Checks if an entity can receive focus.

```typescript
import { createWorld, setFocusable, isFocusable } from 'blecsd';

const world = createWorld();
const eid = 1;

isFocusable(world, eid); // false (no component)

setFocusable(world, eid, { focusable: true });
isFocusable(world, eid); // true

setFocusable(world, eid, { focusable: false });
isFocusable(world, eid); // false (disabled)
```

---

### focus

Focuses an entity, automatically unfocusing any previously focused entity. Only works if the entity is focusable.

```typescript
import { createWorld, setFocusable, focus, isFocused } from 'blecsd';

const world = createWorld();
const button1 = 1;
const button2 = 2;

setFocusable(world, button1, { focusable: true });
setFocusable(world, button2, { focusable: true });

focus(world, button1);
isFocused(world, button1); // true
isFocused(world, button2); // false

// Focusing another entity automatically blurs the previous one
focus(world, button2);
isFocused(world, button1); // false
isFocused(world, button2); // true
```

**Note:** Does nothing if the entity is not focusable.

**Returns:** The entity ID for chaining

---

### blur

Removes focus from an entity.

```typescript
import { createWorld, setFocusable, focus, blur, isFocused } from 'blecsd';

const world = createWorld();
const eid = 1;

setFocusable(world, eid, { focusable: true });
focus(world, eid);
isFocused(world, eid); // true

blur(world, eid);
isFocused(world, eid); // false
```

**Returns:** The entity ID for chaining

---

### getFocusable

Gets full focus data for an entity.

```typescript
import { createWorld, setFocusable, focus, getFocusable } from 'blecsd';

const world = createWorld();
const eid = 1;

getFocusable(world, eid); // undefined (no component)

setFocusable(world, eid, {
  focusable: true,
  tabIndex: 2,
  focusEffectFg: 0xffff00ff,
  focusEffectBg: 0x000000ff,
});

focus(world, eid);

const data = getFocusable(world, eid);
// data = {
//   focusable: true,
//   focused: true,
//   tabIndex: 2,
//   focusEffectFg: 0xffff00ff,
//   focusEffectBg: 0x000000ff
// }
```

**Returns:** `FocusableData | undefined`

---

### getFocusedEntity

Gets the currently focused entity globally.

```typescript
import { createWorld, setFocusable, focus, blur, getFocusedEntity } from 'blecsd';

const world = createWorld();
const eid = 1;

getFocusedEntity(); // null

setFocusable(world, eid, { focusable: true });
focus(world, eid);
getFocusedEntity(); // 1

blur(world, eid);
getFocusedEntity(); // null
```

**Returns:** The focused entity ID or `null` if none

---

### setTabIndex

Sets the tab index of an entity. Adds the Focusable component if not already present.

```typescript
import { createWorld, setFocusable, setTabIndex, getTabIndex } from 'blecsd';

const world = createWorld();
const eid = 1;

setFocusable(world, eid, { focusable: true });
setTabIndex(world, eid, 5);
getTabIndex(world, eid); // 5

// Set to -1 to remove from tab order
setTabIndex(world, eid, -1);
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `index` - Tab index (-1 = not in tab order)

**Returns:** The entity ID for chaining

---

### getTabIndex

Gets the tab index of an entity.

```typescript
import { createWorld, setFocusable, getTabIndex } from 'blecsd';

const world = createWorld();
const eid = 1;

getTabIndex(world, eid); // -1 (no component)

setFocusable(world, eid, { focusable: true, tabIndex: 3 });
getTabIndex(world, eid); // 3
```

**Returns:** Tab index or -1 if not in tab order

---

### isInTabOrder

Checks if an entity is in the tab order. An entity must be focusable and have a tabIndex >= 0.

```typescript
import { createWorld, setFocusable, isInTabOrder } from 'blecsd';

const world = createWorld();
const eid = 1;

isInTabOrder(world, eid); // false (no component)

setFocusable(world, eid, { focusable: true, tabIndex: 0 });
isInTabOrder(world, eid); // true

setFocusable(world, eid, { focusable: false, tabIndex: 0 });
isInTabOrder(world, eid); // false (not focusable)

setFocusable(world, eid, { focusable: true, tabIndex: -1 });
isInTabOrder(world, eid); // false (negative tabIndex)
```

---

### getTabOrder

Gets entities sorted by tab index (ascending). Only includes entities that are in the tab order.

```typescript
import { createWorld, setFocusable, getTabOrder } from 'blecsd';

const world = createWorld();
const button1 = 1;
const button2 = 2;
const button3 = 3;

setFocusable(world, button1, { focusable: true, tabIndex: 2 });
setFocusable(world, button2, { focusable: true, tabIndex: 0 });
setFocusable(world, button3, { focusable: true, tabIndex: 1 });

const allEntities = [button1, button2, button3];
const ordered = getTabOrder(world, allEntities);
// ordered = [button2, button3, button1] (sorted by tabIndex: 0, 1, 2)
```

**Parameters:**
- `world` - The ECS world
- `entities` - Array of entities to consider

**Returns:** Sorted array of entities in tab order

---

### focusNext

Focuses the next entity in tab order. Wraps around to the first entity when at the end.

```typescript
import { createWorld, setFocusable, focus, focusNext, getFocusedEntity } from 'blecsd';

const world = createWorld();
const button1 = 1;
const button2 = 2;
const button3 = 3;

setFocusable(world, button1, { focusable: true, tabIndex: 0 });
setFocusable(world, button2, { focusable: true, tabIndex: 1 });
setFocusable(world, button3, { focusable: true, tabIndex: 2 });

const entities = [button1, button2, button3];

focus(world, button1);
getFocusedEntity(); // 1

focusNext(world, entities);
getFocusedEntity(); // 2

focusNext(world, entities);
getFocusedEntity(); // 3

focusNext(world, entities);
getFocusedEntity(); // 1 (wrapped around)
```

**Parameters:**
- `world` - The ECS world
- `entities` - Array of entities in the focusable set

**Returns:** The newly focused entity or `null` if none

---

### focusPrev

Focuses the previous entity in tab order. Wraps around to the last entity when at the beginning.

```typescript
import { createWorld, setFocusable, focus, focusPrev, getFocusedEntity } from 'blecsd';

const world = createWorld();
const button1 = 1;
const button2 = 2;
const button3 = 3;

setFocusable(world, button1, { focusable: true, tabIndex: 0 });
setFocusable(world, button2, { focusable: true, tabIndex: 1 });
setFocusable(world, button3, { focusable: true, tabIndex: 2 });

const entities = [button1, button2, button3];

focus(world, button2);
getFocusedEntity(); // 2

focusPrev(world, entities);
getFocusedEntity(); // 1

focusPrev(world, entities);
getFocusedEntity(); // 3 (wrapped around)
```

**Parameters:**
- `world` - The ECS world
- `entities` - Array of entities in the focusable set

**Returns:** The newly focused entity or `null` if none

---

### resetFocusState

Resets the focus state. Primarily used for testing.

```typescript
import { resetFocusState } from 'blecsd';

beforeEach(() => {
  resetFocusState();
});
```

---

## Types

### FocusableOptions

Options for configuring a focusable entity.

```typescript
interface FocusableOptions {
  focusable?: boolean;     // Whether entity can receive focus
  tabIndex?: number;       // Tab order (-1 = not in tab order)
  focusEffectFg?: number;  // Focus effect foreground color
  focusEffectBg?: number;  // Focus effect background color
}
```

### FocusableData

Data returned by getFocusable.

```typescript
interface FocusableData {
  readonly focusable: boolean;     // Whether entity can receive focus
  readonly focused: boolean;       // Whether entity currently has focus
  readonly tabIndex: number;       // Tab order
  readonly focusEffectFg: number;  // Focus effect foreground color
  readonly focusEffectBg: number;  // Focus effect background color
}
```

---

## Usage Examples

### Basic Focus Management

```typescript
import {
  createWorld,
  setFocusable,
  focus,
  blur,
  isFocused,
  getFocusedEntity,
} from 'blecsd';

const world = createWorld();
const inputField = 1;

// Make the input field focusable
setFocusable(world, inputField, { focusable: true });

// Focus the input field
focus(world, inputField);

// Check if focused
if (isFocused(world, inputField)) {
  console.log('Input field is focused');
}

// Get the currently focused entity
const focused = getFocusedEntity();
console.log(`Focused entity: ${focused}`);

// Remove focus
blur(world, inputField);
```

### Tab Navigation

```typescript
import {
  createWorld,
  setFocusable,
  focusNext,
  focusPrev,
  getFocusedEntity,
} from 'blecsd';

const world = createWorld();

// Create a form with multiple fields
const nameField = 1;
const emailField = 2;
const submitButton = 3;

setFocusable(world, nameField, { focusable: true, tabIndex: 0 });
setFocusable(world, emailField, { focusable: true, tabIndex: 1 });
setFocusable(world, submitButton, { focusable: true, tabIndex: 2 });

const formEntities = [nameField, emailField, submitButton];

// Handle Tab key
function onTab() {
  focusNext(world, formEntities);
  console.log(`Now focused: ${getFocusedEntity()}`);
}

// Handle Shift+Tab
function onShiftTab() {
  focusPrev(world, formEntities);
  console.log(`Now focused: ${getFocusedEntity()}`);
}
```

### Custom Focus Effects

```typescript
import { createWorld, setFocusable, focus, getFocusable } from 'blecsd';

const world = createWorld();
const button = 1;

// Configure custom focus colors
setFocusable(world, button, {
  focusable: true,
  tabIndex: 0,
  focusEffectFg: 0x00ff00ff, // Bright green foreground
  focusEffectBg: 0x003300ff, // Dark green background
});

focus(world, button);

// Use focus data in render system
const data = getFocusable(world, button);
if (data?.focused) {
  // Apply focusEffectFg and focusEffectBg colors
}
```

---

## See Also

- [Components Reference](./components.md) - All component documentation
- [Entity Factories](./entities.md) - Creating entities with components
- [Input Handling](./input.md) - Keyboard and mouse input
