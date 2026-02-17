# Focus System API

ECS system for managing keyboard focus and tab navigation between interactive entities.

## Overview

The focus system handles:
- Tracking which entity currently has focus
- Tab/Shift+Tab navigation between focusable entities
- Focus order based on tabIndex and position
- Emitting focus/blur events
- Validating focus state (auto-blur hidden or disabled entities)

## Quick Start

```typescript
import { createWorld, addEntity, createScheduler, LoopPhase } from 'blecsd/core';
import { focusSystem, getFocused, getFocusEventBus, focusNext, focusPrev } from 'blecsd/systems';
import { focusEntity } from 'blecsd/components';

const world = createWorld();
const buttonEntity = addEntity(world);
const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.UPDATE, focusSystem);

// Subscribe to focus events
getFocusEventBus().on('focus', (e) => {
  console.log(`Entity ${e.entity} gained focus`);
});

// Navigate focus
focusNext(world);  // Focus next element
focusPrev(world);  // Focus previous element

// Direct focus
focusEntity(world, buttonEntity);

// Check current focus
const focused = getFocused(world);
void focused;
```

## Focus Management

### focusEntity

Focus a specific entity. Automatically blurs the previously focused entity.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { focusEntity } from 'blecsd/components';

const world = createWorld();
const buttonEntity = addEntity(world);
const success = focusEntity(world, buttonEntity);
if (success) {
  console.log('Focus set successfully');
}
```

**Returns:** `boolean` - true if focus was set, false if entity is not focusable or visible.

### getFocused

Get the currently focused entity.

```typescript
import { getFocused } from 'blecsd/systems';

const focused = getFocused(world);
if (focused) {
  console.log(`Entity ${focused} is focused`);
}
```

**Returns:** `Entity | null` - The focused entity or null if none.

### blurAll

Remove focus from all entities.

```typescript
import { blurAll } from 'blecsd/systems';

blurAll(world);
```

## Focus Navigation

### focusNext

Focus the next focusable entity in tab order. Wraps around to first.

```typescript
import { createWorld } from 'blecsd/core';
import { focusNext } from 'blecsd/systems';

const world = createWorld();
const key = 'Tab';
const shift = false;

// Handle Tab key
if (key === 'Tab' && !shift) {
  focusNext(world);
}
```

**Returns:** `Entity | null` - The newly focused entity.

### focusPrev

Focus the previous focusable entity in tab order. Wraps around to last.

```typescript
import { createWorld } from 'blecsd/core';
import { focusPrev } from 'blecsd/systems';

const world = createWorld();
const key = 'Tab';
const shift = true;

// Handle Shift+Tab
if (key === 'Tab' && shift) {
  focusPrev(world);
}
```

**Returns:** `Entity | null` - The newly focused entity.

### focusFirst

Focus the first focusable entity in tab order.

```typescript
import { focusFirst } from 'blecsd/systems';

focusFirst(world);
```

**Returns:** `Entity | null` - The focused entity or null if none available.

### focusLast

Focus the last focusable entity in tab order.

```typescript
import { focusLast } from 'blecsd/systems';

focusLast(world);
```

**Returns:** `Entity | null` - The focused entity or null if none available.

## Querying Focusable Entities

### getFocusableEntities

Get all focusable entities sorted by tab order.

```typescript
import { getFocusableEntities } from 'blecsd/systems';

const focusable = getFocusableEntities(world);
console.log(`${focusable.length} focusable entities`);
```

Entities are sorted by:
1. Positive tabIndex values (1, 2, 3...) in ascending order
2. tabIndex 0 entities sorted by position (top to bottom, left to right)
3. Entities with negative tabIndex are excluded

**Returns:** `Entity[]` - Sorted array of focusable entity IDs.

## Event Bus

### getFocusEventBus

Get the event bus to subscribe to focus events.

```typescript
import { getFocusEventBus } from 'blecsd/systems';

const bus = getFocusEventBus();

bus.on('focus', ({ entity, previousEntity }) => {
  console.log(`Entity ${entity} gained focus`);
  if (previousEntity) {
    console.log(`Previously focused: ${previousEntity}`);
  }
});

bus.on('blur', ({ entity, nextEntity }) => {
  console.log(`Entity ${entity} lost focus`);
  if (nextEntity) {
    console.log(`Next focused: ${nextEntity}`);
  }
});
```

### resetFocusEventBus

Reset the focus event bus (for testing).

```typescript
import { resetFocusEventBus } from 'blecsd/systems';

resetFocusEventBus();
```

## System Registration

### focusSystem

The focus system function. Validates current focus state.

```typescript
import { focusSystem } from 'blecsd/systems';
import { createScheduler, LoopPhase } from 'blecsd/core';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.UPDATE, focusSystem);
```

The system automatically:
- Blurs entities that become non-focusable
- Blurs entities that become hidden

### createFocusSystem

Create a new focus system instance.

```typescript
import { createScheduler, LoopPhase } from 'blecsd/core';
import { createFocusSystem } from 'blecsd/systems';

const scheduler = createScheduler();
const system = createFocusSystem();
scheduler.registerSystem(LoopPhase.UPDATE, system);
```

## Making Entities Focusable

Use the Interactive component to make entities focusable:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setInteractive, isFocused } from 'blecsd/components';

const world = createWorld();
const button = addEntity(world);

// Make an entity focusable
setInteractive(world, button, {
  focusable: true,
  tabIndex: 1,         // Tab order (0 = position-based)
  focusEffectFg: 0xff00ffff,  // Cyan focus highlight
  focusEffectBg: 0x00000000,
});

// Check if focused
if (isFocused(world, button)) {
  // Draw focus indicator
}
```

### tabIndex Values

- `tabIndex > 0`: Explicit tab order (1 comes before 2)
- `tabIndex = 0`: Natural order based on position
- `tabIndex < 0`: Skip in tab navigation (but can be programmatically focused)

## Types

### FocusEventType

```typescript
type FocusEventType = 'focus' | 'blur';
```

### FocusEventData

```typescript
interface FocusEventData {
  readonly entity: Entity;
  readonly previousEntity: Entity | null;
  readonly nextEntity: Entity | null;
}
```

### FocusEventMap

```typescript
interface FocusEventMap {
  focus: FocusEventData;
  blur: FocusEventData;
}
```

## Integration Example

Complete example with focus management:

```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  LoopPhase,
} from 'blecsd/core';
import { focusSystem, getFocused, getFocusEventBus, focusNext, focusPrev } from 'blecsd/systems';
import {
  focusEntity,
  setPosition,
  setDimensions,
  setStyle,
  setInteractive,
  isFocused,
} from 'blecsd/components';

// Create world and scheduler
const world = createWorld();
const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.UPDATE, focusSystem);

// Create focusable buttons
const button1 = addEntity(world);
setPosition(world, button1, 10, 5);
setDimensions(world, button1, 20, 3);
setStyle(world, button1, { fg: 0xffffffff, bg: 0xff333333 });
setInteractive(world, button1, { focusable: true, tabIndex: 1 });

const button2 = addEntity(world);
setPosition(world, button2, 10, 10);
setDimensions(world, button2, 20, 3);
setStyle(world, button2, { fg: 0xffffffff, bg: 0xff333333 });
setInteractive(world, button2, { focusable: true, tabIndex: 2 });

// Subscribe to focus events
getFocusEventBus().on('focus', ({ entity }) => {
  console.log(`Focused: ${entity}`);
});

// Handle keyboard input
function handleKey(key: string, shift: boolean) {
  if (key === 'Tab') {
    if (shift) {
      focusPrev(world);
    } else {
      focusNext(world);
    }
  } else if (key === 'Enter') {
    const focused = getFocused(world);
    if (focused) {
      console.log(`Activated: ${focused}`);
    }
  }
}

// Run in game loop
setInterval(() => {
  scheduler.run(world, 1/60);
}, 16);
```

## Focus Stack Management

The focus system includes a stack mechanism for managing focus in modal/popup scenarios. This allows you to push focus when opening a modal and restore the previous focus when closing it.

### focusPush

Push current focus onto the stack and focus a new entity.

```typescript
import { focusPush } from 'blecsd/systems';

// Open modal - save current focus and focus modal
function openModal(world: World, modalEntity: Entity): void {
  focusPush(world, modalEntity);
}
```

**Returns:** `boolean` - true if push was successful.

### focusPop

Pop the focus stack and restore the previous focus.

```typescript
import { focusPop } from 'blecsd/systems';

// Close modal - restore previous focus
const previousFocus = focusPop(world);
if (previousFocus) {
  console.log(`Focus restored to entity ${previousFocus}`);
}
```

**Returns:** `Entity | null` - The restored entity, or null if stack was empty.

### focusOffset

Move focus by a specified offset in the tab order.

```typescript
import { focusOffset } from 'blecsd/systems';

// Move focus forward by 2
focusOffset(world, 2);

// Move focus backward by 1
focusOffset(world, -1);
```

**Returns:** `Entity | null` - The newly focused entity.

### saveFocus / restoreFocus

Save and restore focus without using the stack (for temporary changes).

```typescript
import { saveFocus, restoreFocus } from 'blecsd/systems';

// Save current focus before temporary change
saveFocus(world);

// ... do something that changes focus ...

// Restore the saved focus
const restored = restoreFocus(world);
```

### rewindFocus

Rewind focus to the last valid entity in the stack when the current entity is destroyed.

```typescript
import { rewindFocus } from 'blecsd/systems';

// After destroying a focused entity
rewindFocus(world);
```

**Returns:** `Entity | null` - The entity that received focus, or null if none found.

### Stack Utilities

```typescript
import { getFocusStackDepth, clearFocusStack, peekFocusStack } from 'blecsd/systems';

// Get stack depth
const depth = getFocusStackDepth(world);

// Peek at top of stack without popping
const top = peekFocusStack(world);

// Clear the entire stack
clearFocusStack(world);
```

### Modal Pattern Example

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  focusPush,
  focusPop,
  focusFirst,
  getFocusStackDepth,
} from 'blecsd/systems';

const world = createWorld();

// Open modal - push focus stack
function openModal(w: typeof world, modal: number): void {
  focusPush(w, modal);
  // Focus first element in modal
  focusFirst(w);
}

// Close modal - pop focus stack
function closeModal(w: typeof world): void {
  focusPop(w);
}

// Nested modals work naturally
const dialog1 = addEntity(world);
const dialog2 = addEntity(world);
openModal(world, dialog1);  // depth = 1
openModal(world, dialog2);  // depth = 2
closeModal(world);          // restores to dialog1
closeModal(world);          // restores to original focus
void getFocusStackDepth(world);
```

## Focus Styling

When rendering, check if an entity is focused to apply focus styling:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { isFocused, getFocusEffect, getStyle } from 'blecsd/components';

const world = createWorld();

function renderEntity(w: typeof world, entity: number) {
  const style = getStyle(w, entity);
  let fg = style?.fg ?? 0;
  let bg = style?.bg ?? 0;

  // Apply focus effect
  if (isFocused(w, entity)) {
    const focusEffect = getFocusEffect(w, entity);
    if (focusEffect) {
      // Blend or replace colors
      fg = focusEffect.fg;
    }
  }

  void fg;
  void bg;
  // Render with final colors...
}
```
