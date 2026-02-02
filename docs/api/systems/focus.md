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
import {
  createScheduler,
  focusSystem,
  focusNext,
  focusPrev,
  focusEntity,
  getFocused,
  getFocusEventBus
} from 'blecsd';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.INPUT, focusSystem);

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
```

## Focus Management

### focusEntity

Focus a specific entity. Automatically blurs the previously focused entity.

```typescript
import { focusEntity } from 'blecsd';

const success = focusEntity(world, buttonEntity);
if (success) {
  console.log('Focus set successfully');
}
```

**Returns:** `boolean` - true if focus was set, false if entity is not focusable or visible.

### getFocused

Get the currently focused entity.

```typescript
import { getFocused } from 'blecsd';

const focused = getFocused(world);
if (focused) {
  console.log(`Entity ${focused} is focused`);
}
```

**Returns:** `Entity | null` - The focused entity or null if none.

### blurAll

Remove focus from all entities.

```typescript
import { blurAll } from 'blecsd';

blurAll(world);
```

## Focus Navigation

### focusNext

Focus the next focusable entity in tab order. Wraps around to first.

```typescript
import { focusNext } from 'blecsd';

// Handle Tab key
if (key === 'Tab' && !shift) {
  focusNext(world);
}
```

**Returns:** `Entity | null` - The newly focused entity.

### focusPrev

Focus the previous focusable entity in tab order. Wraps around to last.

```typescript
import { focusPrev } from 'blecsd';

// Handle Shift+Tab
if (key === 'Tab' && shift) {
  focusPrev(world);
}
```

**Returns:** `Entity | null` - The newly focused entity.

### focusFirst

Focus the first focusable entity in tab order.

```typescript
import { focusFirst } from 'blecsd';

focusFirst(world);
```

**Returns:** `Entity | null` - The focused entity or null if none available.

### focusLast

Focus the last focusable entity in tab order.

```typescript
import { focusLast } from 'blecsd';

focusLast(world);
```

**Returns:** `Entity | null` - The focused entity or null if none available.

## Querying Focusable Entities

### getFocusableEntities

Get all focusable entities sorted by tab order.

```typescript
import { getFocusableEntities } from 'blecsd';

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
import { getFocusEventBus } from 'blecsd';

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
import { resetFocusEventBus } from 'blecsd';

resetFocusEventBus();
```

## System Registration

### focusSystem

The focus system function. Validates current focus state.

```typescript
import { focusSystem, createScheduler, LoopPhase } from 'blecsd';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.INPUT, focusSystem);
```

The system automatically:
- Blurs entities that become non-focusable
- Blurs entities that become hidden

### createFocusSystem

Create a new focus system instance.

```typescript
import { createFocusSystem } from 'blecsd';

const system = createFocusSystem();
scheduler.registerSystem(LoopPhase.INPUT, system);
```

## Making Entities Focusable

Use the Interactive component to make entities focusable:

```typescript
import { setInteractive, isFocused } from 'blecsd';

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
  focusSystem,
  focusNext,
  focusPrev,
  focusEntity,
  getFocused,
  getFocusEventBus,
  setPosition,
  setDimensions,
  setStyle,
  setInteractive,
  isFocused
} from 'blecsd';

// Create world and scheduler
const world = createWorld();
const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.INPUT, focusSystem);

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

## Focus Styling

When rendering, check if an entity is focused to apply focus styling:

```typescript
import { isFocused, getFocusEffect } from 'blecsd';

function renderEntity(world: World, entity: Entity) {
  const style = getStyle(world, entity);
  let fg = style.fg;
  let bg = style.bg;

  // Apply focus effect
  if (isFocused(world, entity)) {
    const focusEffect = getFocusEffect(world, entity);
    if (focusEffect) {
      // Blend or replace colors
      fg = focusEffect.fg;
    }
  }

  // Render with final colors...
}
```
