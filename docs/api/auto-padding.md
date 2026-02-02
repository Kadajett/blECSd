# Auto-Padding API

Automatic padding system for elements with borders.

## Overview

When `autoPadding` is enabled on the Screen, entities with borders automatically receive 1 cell of padding on each bordered side. This prevents content from overlapping with border characters.

## Quick Start

```typescript
import {
  createScreenEntity,
  setAutoPadding,
  getEffectivePadding,
  hasAutoPadding,
} from 'blecsd';

// Enable auto-padding on screen creation
const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
  autoPadding: true,
});

// Or enable it later
setAutoPadding(world, screen, true);

// Check if auto-padding is enabled
if (hasAutoPadding(world)) {
  console.log('Auto-padding is enabled');
}

// Get effective padding (explicit + auto)
const padding = getEffectivePadding(world, boxEntity);
console.log(`Left padding: ${padding.left}`);
```

## How It Works

1. **Global setting**: Auto-padding is controlled by the Screen's `autoPadding` flag
2. **Per-side calculation**: Each side that has a border gets 1 cell of auto-padding
3. **Additive**: Auto-padding is added to any explicit padding you set
4. **Dynamic**: Calculated on-demand, not stored

```typescript
// Example: Box with border and explicit padding
setBorder(world, box, { type: BorderType.Line });
setPadding(world, box, { left: 2 });

// Without autoPadding: left = 2
// With autoPadding:    left = 2 + 1 = 3
```

## Functions

### hasAutoPadding

Check if auto-padding is enabled globally.

```typescript
import { hasAutoPadding } from 'blecsd';

if (hasAutoPadding(world)) {
  // Auto-padding is enabled on the screen
}
```

**Returns:** `boolean` - true if auto-padding is enabled.

### getAutoPadding

Get the auto-padding values for an entity based on its borders.

```typescript
import { getAutoPadding } from 'blecsd';

const auto = getAutoPadding(world, entity);
console.log(auto.left);   // 1 if left border exists, 0 otherwise
console.log(auto.top);    // 1 if top border exists, 0 otherwise
console.log(auto.right);  // 1 if right border exists, 0 otherwise
console.log(auto.bottom); // 1 if bottom border exists, 0 otherwise
```

**Returns:** `AutoPaddingData` with values 0 or 1 for each side.

### getEffectivePadding

Get the total effective padding (explicit + auto-padding).

```typescript
import { getEffectivePadding } from 'blecsd';

const effective = getEffectivePadding(world, entity);
console.log(effective.left);       // Total left padding
console.log(effective.horizontal); // left + right
console.log(effective.vertical);   // top + bottom
```

**Returns:** `EffectivePaddingData` with combined padding values.

### getTotalEffectivePadding

Get the sum of all effective padding.

```typescript
import { getTotalEffectivePadding } from 'blecsd';

const total = getTotalEffectivePadding(world, entity);
console.log(`Total padding: ${total}`);  // left + right + top + bottom
```

**Returns:** `number` - Sum of all padding.

### hasEntityAutoPadding

Check if an entity has any auto-padding applied.

```typescript
import { hasEntityAutoPadding } from 'blecsd';

if (hasEntityAutoPadding(world, entity)) {
  console.log('Entity has auto-padding from borders');
}
```

**Returns:** `boolean` - true if entity has auto-padding on any side.

## Types

### AutoPaddingData

```typescript
interface AutoPaddingData {
  readonly left: number;   // 0 or 1
  readonly top: number;    // 0 or 1
  readonly right: number;  // 0 or 1
  readonly bottom: number; // 0 or 1
}
```

### EffectivePaddingData

```typescript
interface EffectivePaddingData {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly horizontal: number;  // left + right
  readonly vertical: number;    // top + bottom
}
```

## Screen Configuration

Enable auto-padding when creating the screen:

```typescript
const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
  autoPadding: true,  // Enable auto-padding
});
```

Or toggle it at runtime:

```typescript
import { setAutoPadding, isAutoPadding } from 'blecsd';

// Enable
setAutoPadding(world, screen, true);

// Disable
setAutoPadding(world, screen, false);

// Check current state
const enabled = isAutoPadding(world, screen);
```

## Partial Borders

Auto-padding only applies to sides with borders:

```typescript
import { setBorder, BorderType, getAutoPadding } from 'blecsd';

// Border only on left and right
setBorder(world, entity, {
  type: BorderType.Line,
  left: true,
  top: false,
  right: true,
  bottom: false,
});

const auto = getAutoPadding(world, entity);
// auto.left = 1, auto.right = 1
// auto.top = 0, auto.bottom = 0
```

## Integration with Layout

The layout system uses effective padding when calculating inner dimensions:

```typescript
import { getInnerDimensions, getEffectivePadding } from 'blecsd';

// These account for both explicit padding and auto-padding
const inner = getInnerDimensions(world, entity);
const padding = getEffectivePadding(world, entity);

console.log(`Content area: ${inner.width}x${inner.height}`);
console.log(`Total padding: ${padding.horizontal}x${padding.vertical}`);
```

## Best Practices

1. **Enable at screen level** - Auto-padding is a global setting, not per-entity
2. **Combine with explicit padding** - Use explicit padding for additional spacing
3. **Works with all border types** - Line, Background, Custom all trigger auto-padding
4. **BorderType.None skips** - Entities with no visible border get no auto-padding
