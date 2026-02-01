# Focusable Component

The Focusable component enables keyboard focus and tab navigation.

## Component

```typescript
import { Focusable } from 'blecsd';

// Component arrays (bitECS SoA pattern)
Focusable.focusable     // Uint8Array  - 0 = not focusable, 1 = focusable
Focusable.focused       // Uint8Array  - 0 = not focused, 1 = focused
Focusable.tabIndex      // Int16Array  - Tab order (-1 = not in tab order)
Focusable.focusEffectFg // Uint32Array - Focus state foreground color
Focusable.focusEffectBg // Uint32Array - Focus state background color
```

## Constants

```typescript
import { DEFAULT_FOCUS_FG, DEFAULT_FOCUS_BG } from 'blecsd';

DEFAULT_FOCUS_FG; // Default focus foreground color
DEFAULT_FOCUS_BG; // Default focus background color
```

## Functions

### hasFocusable

Check if an entity has the Focusable component.

```typescript
import { hasFocusable } from 'blecsd';

hasFocusable(world, entity); // true or false
```

### makeFocusable

Make an entity focusable. Adds Focusable component if needed.

```typescript
import { makeFocusable } from 'blecsd';

makeFocusable(world, entity);
```

### setFocusable

Set focusable state and options.

```typescript
import { setFocusable } from 'blecsd';

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
import { isFocusable } from 'blecsd';

isFocusable(world, entity); // true or false
```

### focus

Focus an entity. Blurs the previously focused entity.

```typescript
import { focus } from 'blecsd';

focus(world, entity);
```

### blur

Remove focus from an entity.

```typescript
import { blur } from 'blecsd';

blur(world, entity);
```

### isFocused

Check if an entity has focus.

```typescript
import { isFocused } from 'blecsd';

isFocused(world, entity); // true or false
```

### getFocusedEntity

Get the currently focused entity.

```typescript
import { getFocusedEntity } from 'blecsd';

const focused = getFocusedEntity(world);
// Entity ID or undefined if nothing focused
```

### focusNext

Focus the next entity in tab order.

```typescript
import { focusNext } from 'blecsd';

focusNext(world);
// Focuses next focusable entity, wraps around
```

### focusPrev

Focus the previous entity in tab order.

```typescript
import { focusPrev } from 'blecsd';

focusPrev(world);
// Focuses previous focusable entity, wraps around
```

### setTabIndex

Set an entity's tab order index.

```typescript
import { setTabIndex } from 'blecsd';

setTabIndex(world, entity, 0);  // First in tab order
setTabIndex(world, entity, -1); // Remove from tab order
```

### getTabIndex

Get an entity's tab order index.

```typescript
import { getTabIndex } from 'blecsd';

const index = getTabIndex(world, entity);
// number or undefined
```

### isInTabOrder

Check if an entity is in the tab order.

```typescript
import { isInTabOrder } from 'blecsd';

isInTabOrder(world, entity); // true if tabIndex >= 0
```

### getTabOrder

Get all entities in tab order, sorted.

```typescript
import { getTabOrder } from 'blecsd';

const entities = getTabOrder(world);
// [entityA, entityB, ...] sorted by tabIndex
```

### getFocusable

Get all focusable data for an entity.

```typescript
import { getFocusable } from 'blecsd';

const data = getFocusable(world, entity);
// {
//   focusable: boolean,
//   focused: boolean,
//   tabIndex: number,
//   focusEffectFg: number,
//   focusEffectBg: number
// }
```

### resetFocusState

Clear all focus state (useful on screen change).

```typescript
import { resetFocusState } from 'blecsd';

resetFocusState(world);
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
import { createWorld, addEntity } from 'bitecs';
import { makeFocusable, focus, isFocused, blur } from 'blecsd';

const world = createWorld();
const button = addEntity(world);

makeFocusable(world, button);
focus(world, button);

isFocused(world, button); // true

blur(world, button);
isFocused(world, button); // false
```

### Tab Navigation

```typescript
import {
  makeFocusable,
  setTabIndex,
  focusNext,
  focusPrev,
  getFocusedEntity,
} from 'blecsd';

// Create focusable elements with tab order
const button1 = addEntity(world);
const button2 = addEntity(world);
const button3 = addEntity(world);

makeFocusable(world, button1);
makeFocusable(world, button2);
makeFocusable(world, button3);

setTabIndex(world, button1, 0);
setTabIndex(world, button2, 1);
setTabIndex(world, button3, 2);

// Navigate with Tab/Shift+Tab
function handleKey(key) {
  if (key.name === 'tab') {
    if (key.shift) {
      focusPrev(world);
    } else {
      focusNext(world);
    }
  }
}
```

### Focus Styling

```typescript
import { setFocusable, isFocused, getStyle, getFocusable } from 'blecsd';

// Set focus colors
setFocusable(world, button, {
  focusable: true,
  tabIndex: 0,
  focusEffectFg: 0xffffffff,
  focusEffectBg: 0x3399ffff,
});

// In render, use focus colors when focused
function getEffectiveStyle(world, entity) {
  const style = getStyle(world, entity);
  const focusData = getFocusable(world, entity);

  if (focusData?.focused) {
    return {
      ...style,
      fg: focusData.focusEffectFg,
      bg: focusData.focusEffectBg,
    };
  }

  return style;
}
```
