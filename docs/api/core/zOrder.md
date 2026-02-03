# Z-Order Management API

Controls entity rendering order through z-index layering.

## Overview

The z-order system determines which entities appear on top of others during rendering. Higher z-index values render later (on top).

## Quick Start

```typescript
import {
  setZIndex,
  setFront,
  setBack,
  getZIndex,
  sortByZIndex,
} from 'blecsd';

// Set specific z-index
setZIndex(world, background, -10);
setZIndex(world, content, 0);
setZIndex(world, dialog, 100);

// Bring to front
setFront(world, dialogEntity);

// Get render order
const renderOrder = sortByZIndex(world, entities);
```

## Z-Index Functions

### setZIndex

Sets the z-index of an entity.

```typescript
import { setZIndex } from 'blecsd';

setZIndex(world, entity, 10);
setZIndex(world, background, -5);
```

### getZIndex

Gets the current z-index.

```typescript
import { getZIndex } from 'blecsd';

const z = getZIndex(world, entity);
```

### setFront

Brings entity to front (highest z among siblings).

```typescript
import { setFront } from 'blecsd';

setFront(world, dialog);
```

### setBack

Sends entity to back (lowest z among siblings).

```typescript
import { setBack } from 'blecsd';

setBack(world, background);
```

### moveUp / moveDown

Swaps z-index with adjacent sibling.

```typescript
import { moveUp, moveDown } from 'blecsd';

if (moveUp(world, entity)) {
  console.log('Moved up one layer');
}

if (moveDown(world, entity)) {
  console.log('Moved down one layer');
}
```

## Sorting Functions

### sortByZIndex

Sorts entities by z-index (lowest first).

```typescript
import { sortByZIndex } from 'blecsd';

const sorted = sortByZIndex(world, entities);
for (const entity of sorted) {
  render(entity);
}
```

### getChildrenByZIndex

Gets children sorted for rendering.

```typescript
import { getChildrenByZIndex } from 'blecsd';

const children = getChildrenByZIndex(world, container);
```

### normalizeZIndices

Normalizes z-indices to sequential values (0, 1, 2...).

```typescript
import { normalizeZIndices } from 'blecsd';

// After many operations, normalize to prevent drift
normalizeZIndices(world, container);
```

## Component

### ZOrder

Direct component access (low-level).

```typescript
import { ZOrder } from 'blecsd';

// Direct access
const z = ZOrder.zIndex[entity];
const localZ = ZOrder.localZ[entity];
```

## Constants

```typescript
import { DEFAULT_Z_INDEX, MAX_Z_INDEX, MIN_Z_INDEX } from 'blecsd';

DEFAULT_Z_INDEX  // 0
MAX_Z_INDEX      // 2147483647
MIN_Z_INDEX      // -2147483648
```

## Local Z-Index

For sibling-relative ordering:

```typescript
import { setLocalZ, getLocalZ } from 'blecsd';

setLocalZ(world, entity, 5);
const local = getLocalZ(world, entity);
```

## Best Practices

1. **Use semantic ranges** - Background (-100 to -1), content (0), overlays (1-100), modals (100+)
2. **Normalize periodically** - Call `normalizeZIndices` to prevent z-index drift
3. **Prefer setFront/setBack** - More intuitive than manual z-index
4. **Sort before rendering** - Always use `sortByZIndex` or `getChildrenByZIndex`
