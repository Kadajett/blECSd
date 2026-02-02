# Effects System API

Visual effects management for focus, hover, press, and disabled states.

## Overview

The effects system provides:
- Focus effects (highlight when focused)
- Hover effects (highlight on mouse over)
- Press effects (visual feedback on click)
- Disabled effects (grayed out appearance)
- Original style preservation and restoration
- Dynamic effect values via functions

## Quick Start

```typescript
import {
  setEffects,
  applyFocusEffect,
  removeFocusEffect,
  syncEffects,
  packColor,
} from 'blecsd';

// Configure all effects for a button
setEffects(world, buttonEntity, {
  focus: { fg: packColor(255, 255, 0) },    // Yellow when focused
  hover: { bg: packColor(80, 80, 80) },     // Gray when hovered
  press: { bg: packColor(40, 40, 40) },     // Dark when pressed
  disabled: { fg: packColor(128, 128, 128) }, // Gray when disabled
});

// Effects are automatically applied based on entity state
// Or apply manually:
applyFocusEffect(world, entity);
removeFocusEffect(world, entity);

// Sync effects with current state
syncEffects(world, entity);
```

## setEffects

Configure all effects for an entity in one call.

```typescript
import { setEffects } from 'blecsd';

setEffects(world, entity, {
  focus: { fg: 0xffff00ff, bold: true },
  hover: { bg: 0x333333ff },
  press: { bg: 0x222222ff },
  disabled: { fg: 0x808080ff },
});
```

### EffectsConfig

```typescript
interface EffectsConfig {
  focus?: EffectConfig;    // Applied when focused
  hover?: EffectConfig;    // Applied on mouse hover
  press?: EffectConfig;    // Applied when pressed
  disabled?: EffectConfig; // Applied when disabled
  combineEffects?: boolean; // Layer effects vs replace
}
```

## Focus Effects

### applyFocusEffect / removeFocusEffect

Apply or remove focus styling.

```typescript
import { applyFocusEffect, removeFocusEffect } from 'blecsd';

// When entity gains focus
applyFocusEffect(world, entity);

// When entity loses focus
removeFocusEffect(world, entity);
```

### hasFocusEffectApplied

Check if focus effect is active.

```typescript
import { hasFocusEffectApplied } from 'blecsd';

if (hasFocusEffectApplied(entity)) {
  // Focus styling is applied
}
```

## Hover Effects

### applyHoverEffect / removeHoverEffect

Apply or remove hover styling.

```typescript
import { applyHoverEffect, removeHoverEffect } from 'blecsd';

// When mouse enters
applyHoverEffect(world, entity);

// When mouse leaves
removeHoverEffect(world, entity);
```

### hasHoverEffectApplied

Check if hover effect is active.

```typescript
import { hasHoverEffectApplied } from 'blecsd';

if (hasHoverEffectApplied(entity)) {
  // Hover styling is applied
}
```

## Press Effects

### applyPressEffect / removePressEffect

Apply or remove press/active styling.

```typescript
import { applyPressEffect, removePressEffect } from 'blecsd';

// On mouse down
applyPressEffect(world, entity);

// On mouse up
removePressEffect(world, entity);
```

### hasPressEffectApplied

Check if press effect is active.

```typescript
import { hasPressEffectApplied } from 'blecsd';

if (hasPressEffectApplied(entity)) {
  // Press styling is applied
}
```

## Disabled Effects

### applyDisabledEffect / removeDisabledEffect

Apply or remove disabled styling.

```typescript
import { applyDisabledEffect, removeDisabledEffect } from 'blecsd';

// When entity becomes disabled
applyDisabledEffect(world, entity);

// When entity becomes enabled
removeDisabledEffect(world, entity);
```

### hasDisabledEffectApplied

Check if disabled effect is active.

```typescript
import { hasDisabledEffectApplied } from 'blecsd';

if (hasDisabledEffectApplied(entity)) {
  // Disabled styling is applied
}
```

## Custom Effects

### applyCustomEffect

Apply arbitrary effect configuration.

```typescript
import { applyCustomEffect, packColor } from 'blecsd';

// Static effect
applyCustomEffect(world, entity, {
  fg: packColor(255, 0, 0),
  bold: true,
});

// Dynamic effect
applyCustomEffect(world, entity, {
  fg: (world, eid) => {
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 2) * 0.5 + 0.5;
    return packColor(255, Math.floor(pulse * 255), 0);
  },
});
```

## State Management

### syncEffects

Synchronize effects with current entity state.

```typescript
import { syncEffects } from 'blecsd';

// After changing focus/hover state programmatically
syncEffects(world, entity);
```

### removeAllEffects

Remove all active effects and restore original style.

```typescript
import { removeAllEffects } from 'blecsd';

removeAllEffects(world, entity);
```

### getEffectState

Get current effect state for an entity.

```typescript
import { getEffectState } from 'blecsd';

const state = getEffectState(entity);
// state = { focus: true, hover: false, press: false, disabled: false }
```

### hasAnyEffectApplied

Check if any effect is active.

```typescript
import { hasAnyEffectApplied } from 'blecsd';

if (hasAnyEffectApplied(entity)) {
  // At least one effect is applied
}
```

## Style Preservation

### getOriginalStyle

Get the original style before effects were applied.

```typescript
import { getOriginalStyle } from 'blecsd';

const original = getOriginalStyle(world, entity);
// original.fg is the color before effects
```

### getComputedEffectStyle

Get the current style (with effects applied).

```typescript
import { getComputedEffectStyle } from 'blecsd';

const current = getComputedEffectStyle(world, entity);
// current.fg is the effective color now
```

## Types

### EffectConfig

```typescript
interface EffectConfig {
  fg?: DynamicValue<number>;
  bg?: DynamicValue<number>;
  bold?: DynamicValue<boolean>;
  underline?: DynamicValue<boolean>;
  blink?: DynamicValue<boolean>;
  inverse?: DynamicValue<boolean>;
}
```

### DynamicValue

Values can be static or functions that compute at render time.

```typescript
type DynamicValue<T> = T | ((world: World, entity: Entity) => T);
```

## Example: Interactive Button

```typescript
import {
  createBoxEntity,
  setEffects,
  applyFocusEffect,
  removeFocusEffect,
  applyHoverEffect,
  removeHoverEffect,
  applyPressEffect,
  removePressEffect,
  packColor,
} from 'blecsd';

// Create button
const button = createBoxEntity(world, {
  width: 20,
  height: 3,
  content: ' Click Me ',
});

// Configure effects
setEffects(world, button, {
  focus: { fg: packColor(255, 255, 0), bold: true },
  hover: { bg: packColor(60, 60, 60) },
  press: { bg: packColor(30, 30, 30) },
});

// Handle input events
function onMouseEnter(entity: Entity) {
  applyHoverEffect(world, entity);
}

function onMouseLeave(entity: Entity) {
  removeHoverEffect(world, entity);
}

function onMouseDown(entity: Entity) {
  applyPressEffect(world, entity);
}

function onMouseUp(entity: Entity) {
  removePressEffect(world, entity);
}

function onFocus(entity: Entity) {
  applyFocusEffect(world, entity);
}

function onBlur(entity: Entity) {
  removeFocusEffect(world, entity);
}
```

## Cleanup

### clearEffects

Clear effects config and remove all effects.

```typescript
import { clearEffects } from 'blecsd';

clearEffects(world, entity);
```

### clearEffectState

Clear all effect-related state for an entity. Call when destroying entities.

```typescript
import { clearEffectState } from 'blecsd';

clearEffectState(entity);
```
