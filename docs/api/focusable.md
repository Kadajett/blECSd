# Focusable Component

The Focusable component enables keyboard focus and tab navigation.

## Component

```typescript
import { Focusable } from 'blecsd/components';

// Component arrays (bitECS SoA pattern)
Focusable.focusable     // Uint8Array  - 0 = not focusable, 1 = focusable
Focusable.focused       // Uint8Array  - 0 = not focused, 1 = focused
Focusable.tabIndex      // Int16Array  - Tab order (-1 = not in tab order)
Focusable.focusEffectFg // Uint32Array - Focus state foreground color
Focusable.focusEffectBg // Uint32Array - Focus state background color
```

## Constants

```typescript
import { DEFAULT_FOCUS_FG, DEFAULT_FOCUS_BG } from 'blecsd/components';

DEFAULT_FOCUS_FG; // Default focus foreground color
DEFAULT_FOCUS_BG; // Default focus background color
```

## Functions

### hasFocusable

Check if an entity has the Focusable component.

```typescript
import { hasFocusable } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
hasFocusable(world, entity); // true or false
```

### makeFocusable

Make an entity focusable. Adds Focusable component if needed.

```typescript
import { makeFocusable } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
makeFocusable(world, entity, true);
```

### setFocusable

Set focusable state and options.

```typescript
import { setFocusable } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setFocusable(world, entity, {
  focusable: true,
  tabIndex: 0,
  focusEffectFg: 0xffffffff,
  focusEffectBg: 0x0066ccff,
});
```

### isFocusable

Check if an entity can receive focus.

```typescript
import { isFocusable } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
isFocusable(world, entity); // true or false
```

### focus

Focus an entity. Blurs the previously focused entity.

```typescript
import { focusEntity } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
focusEntity(world, entity);
```

### blur

Remove focus from an entity.

```typescript
import { blur } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
blur(world, entity);
```

### isFocused

Check if an entity has focus.

```typescript
import { isFocused } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
isFocused(world, entity); // true or false
```

### getFocusedEntity

Get the currently focused entity.

```typescript
import { getFocusedEntity } from 'blecsd/components';

const focused = getFocusedEntity();
// Entity ID or null if nothing focused
```

### focusNext

Focus the next entity in tab order.

```typescript
import { focusNext } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const e1 = addEntity(world);
const e2 = addEntity(world);
focusNext(world, [e1, e2]);
// Focuses next focusable entity, wraps around
```

### focusPrev

Focus the previous entity in tab order.

```typescript
import { focusPrev } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const e1 = addEntity(world);
const e2 = addEntity(world);
focusPrev(world, [e1, e2]);
// Focuses previous focusable entity, wraps around
```

### setTabIndex

Set an entity's tab order index.

```typescript
import { setTabIndex } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setTabIndex(world, entity, 0);  // First in tab order
setTabIndex(world, entity, -1); // Remove from tab order
```

### getTabIndex

Get an entity's tab order index.

```typescript
import { getTabIndex } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const index = getTabIndex(world, entity);
// number or undefined
console.log('tab index:', index);
```

### isInTabOrder

Check if an entity is in the tab order.

```typescript
import { isInTabOrder } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
isInTabOrder(world, entity); // true if tabIndex >= 0
```

### getTabOrder

Get all entities in tab order, sorted.

```typescript
import { getTabOrder } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const e1 = addEntity(world);
const e2 = addEntity(world);
const entities = getTabOrder(world, [e1, e2]);
// [entityA, entityB, ...] sorted by tabIndex
console.log('tab order entity count:', entities.length);
```

### getFocusable

Get all focusable data for an entity.

```typescript
import { getFocusable } from 'blecsd/components';
import { createWorld, addEntity } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const data = getFocusable(world, entity);
// {
//   focusable: boolean,
//   focused: boolean,
//   tabIndex: number,
//   focusEffectFg: number,
//   focusEffectBg: number
// }
console.log('focusable data:', data?.focusable, data?.focused);
```

### resetFocusState

Clear all focus state (useful on screen change).

```typescript
import { resetFocusState } from 'blecsd/components';

resetFocusState();
```

## Types

### FocusableData

```typescript
interface FocusableData {
  readonly focusable: boolean;
  readonly focused: boolean;
  readonly tabIndex: number;
  readonly focusEffectFg: number;
  readonly focusEffectBg: number;
}
```

### FocusableOptions

```typescript
interface FocusableOptions {
  focusable?: boolean;
  tabIndex?: number;
  focusEffectFg?: number;
  focusEffectBg?: number;
}
```

## Examples

### Basic Focus Handling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { makeFocusable, focusEntity, isFocused, blur } from 'blecsd/components';

const world = createWorld();
const button = addEntity(world);

makeFocusable(world, button, true);
focusEntity(world, button);

isFocused(world, button); // true

blur(world, button);
isFocused(world, button); // false
```

### Tab Navigation

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  makeFocusable,
  setTabIndex,
  focusNext,
  focusPrev,
} from 'blecsd/components';

const world = createWorld();

// Create focusable elements with tab order
const button1 = addEntity(world);
const button2 = addEntity(world);
const button3 = addEntity(world);
const allButtons = [button1, button2, button3];

makeFocusable(world, button1, true);
makeFocusable(world, button2, true);
makeFocusable(world, button3, true);

setTabIndex(world, button1, 0);
setTabIndex(world, button2, 1);
setTabIndex(world, button3, 2);

// Navigate with Tab/Shift+Tab
const handleKey = (key: { name: string; shift: boolean }) => {
  if (key.name === 'tab') {
    if (key.shift) {
      focusPrev(world, allButtons);
    } else {
      focusNext(world, allButtons);
    }
  }
};

handleKey({ name: 'tab', shift: false });
```

### Focus Styling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setFocusable, isFocused, getStyle, getFocusable } from 'blecsd/components';

const world = createWorld();
const button = addEntity(world);

// Set focus colors
setFocusable(world, button, {
  focusable: true,
  tabIndex: 0,
  focusEffectFg: 0xffffffff,
  focusEffectBg: 0x3399ffff,
});

// In render, use focus colors when focused
const getEffectiveStyle = (w: typeof world, entity: number) => {
  const style = getStyle(w, entity);
  const focusData = getFocusable(w, entity);

  if (focusData?.focused) {
    return {
      ...style,
      fg: focusData.focusEffectFg,
      bg: focusData.focusEffectBg,
    };
  }

  return style;
};

console.log('button focused:', isFocused(world, button));
console.log('effective style:', getEffectiveStyle(world, button));
```
