# Transparency & Alpha Blending API

Transparency support for semi-transparent elements and alpha compositing.

## Overview

The transparency system provides:
- Transparent backgrounds (show through to parent)
- Semi-transparent opacity (alpha blending)
- Hierarchical opacity compounding
- Color blending utilities

## Quick Start

```typescript
import {
  setStyle,
  setOpacity,
  setTransparent,
  isTransparent,
  getEffectiveOpacity,
  blendColors,
} from 'blecsd';

// Make background transparent
setStyle(world, entity, { transparent: true });

// Set 50% opacity
setStyle(world, entity, { opacity: 0.5 });

// Or use helpers
setOpacity(world, entity, 0.5);
setTransparent(world, entity, true);

// Check transparency
if (isTransparent(world, entity)) {
  // Background shows through
}

// Get effective opacity (including ancestors)
const opacity = getEffectiveOpacity(world, entity);
```

## Style Options

### transparent

When `true`, the entity's background is fully transparent. Content from parent elements shows through.

```typescript
setStyle(world, entity, { transparent: true });
```

### opacity

Opacity value from 0-1 where 1 is fully opaque and 0 is fully transparent.

```typescript
setStyle(world, entity, { opacity: 0.5 });  // 50% opaque
```

## Transparency Functions

### isTransparent

Check if an entity has a transparent background.

```typescript
import { isTransparent } from 'blecsd';

if (isTransparent(world, entity)) {
  // Skip background rendering
}
```

### hasPartialOpacity

Check if an entity has opacity less than 1.

```typescript
import { hasPartialOpacity } from 'blecsd';

if (hasPartialOpacity(world, entity)) {
  // Need to blend with background
}
```

### setTransparent

Set or clear transparent background flag.

```typescript
import { setTransparent } from 'blecsd';

setTransparent(world, entity, true);   // Make transparent
setTransparent(world, entity, false);  // Make opaque
```

## Opacity Functions

### getOpacity / setOpacity

Get or set entity opacity (0-1 scale).

```typescript
import { getOpacity, setOpacity } from 'blecsd';

const opacity = getOpacity(world, entity);
setOpacity(world, entity, 0.75);  // 75% opaque
```

### getEffectiveOpacity

Get the effective opacity considering parent hierarchy.

Opacity compounds through ancestors: a 50% opaque entity in a 50% opaque parent has an effective opacity of 25%.

```typescript
import { getEffectiveOpacity } from 'blecsd';

// Entity at 50%, parent at 50% = effective 25%
const effective = getEffectiveOpacity(world, entity);
```

## Color Blending

### blendColors

Blend two colors using alpha compositing.

```typescript
import { blendColors, packColor } from 'blecsd';

const red = packColor(255, 0, 0, 255);
const blue = packColor(0, 0, 255, 255);

// 50% blend of red over blue
const purple = blendColors(red, blue, 0.5);
```

### blendCellColors

Blend foreground and background colors for a cell with opacity.

```typescript
import { blendCellColors, packColor } from 'blecsd';

const fg = packColor(255, 255, 255, 255);
const bg = packColor(100, 100, 100, 255);
const parentBg = packColor(0, 0, 0, 255);

const { fg: blendedFg, bg: blendedBg } = blendCellColors(
  fg, bg, 0.5, parentBg
);
```

### getParentBackground

Get the background color to use for transparent elements.

```typescript
import { getParentBackground } from 'blecsd';

const parentBg = getParentBackground(world, entity);
// Use for blending transparent backgrounds
```

## Rendering Integration

### needsBlending

Check if alpha blending is needed for an entity.

```typescript
import { needsBlending } from 'blecsd';

if (needsBlending(world, entity)) {
  // Use blended rendering path
} else {
  // Use fast opaque rendering
}
```

## Premultiplied Alpha

For performance-critical rendering, use premultiplied alpha.

### toPremultiplied / fromPremultiplied

Convert between straight and premultiplied alpha formats.

```typescript
import { toPremultiplied, fromPremultiplied, packColor } from 'blecsd';

const color = packColor(255, 0, 0, 128);  // 50% red
const premult = toPremultiplied(color);    // RGB values halved
const straight = fromPremultiplied(premult); // RGB restored
```

### blendPremultiplied

Fast blend for premultiplied colors.

```typescript
import { blendPremultiplied, toPremultiplied, packColor } from 'blecsd';

const fg = toPremultiplied(packColor(255, 0, 0, 128));
const bg = toPremultiplied(packColor(0, 0, 255, 255));
const result = blendPremultiplied(fg, bg);
```

## Types

### BlendedColor

```typescript
interface BlendedColor {
  readonly fg: number;
  readonly bg: number;
}
```

### ColorWithAlpha

```typescript
interface ColorWithAlpha {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}
```

## Performance Tips

1. **Check needsBlending first** - Skip blending for opaque entities
2. **Use premultiplied alpha** - Faster for multiple blend operations
3. **Cache effective opacity** - Don't recalculate every frame
4. **Batch transparent entities** - Render opaque first, then transparent

## Example: Semi-Transparent Dialog

```typescript
import {
  setStyle,
  setOpacity,
  getEffectiveOpacity,
  needsBlending,
} from 'blecsd';

// Create dialog with semi-transparent background
function createDialog(world: World): Entity {
  const dialog = createBoxEntity(world, {
    width: 40,
    height: 10,
    border: BorderType.Line,
  });

  // 80% opaque dialog
  setStyle(world, dialog, {
    bg: '#333333',
    opacity: 0.8,
  });

  return dialog;
}

// Render with transparency
function renderEntity(world: World, entity: Entity): void {
  if (needsBlending(world, entity)) {
    const opacity = getEffectiveOpacity(world, entity);
    // Blend with parent background at this opacity
  } else {
    // Fast opaque render
  }
}
```
