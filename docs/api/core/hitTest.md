# Hit Test API

Z-order aware hit testing for mouse interactions.

## Overview

The hit test system provides efficient point-in-entity testing with z-index awareness, ensuring the topmost (highest z-index) element receives mouse events first. It includes a caching system to optimize repeated hit tests.

## Quick Start

```typescript
import {
  createClickableCache,
  hitTest,
  hitTestAll,
  invalidateClickableCache,
} from 'blecsd';

// Create cache for efficient hit testing
const cache = createClickableCache();

// Hit test at mouse position - returns topmost entity
const topEntity = hitTest(world, mouseX, mouseY, cache);

// Get all entities under point, sorted by z-index (highest first)
const allEntities = hitTestAll(world, mouseX, mouseY, cache);

// Invalidate cache when hierarchy changes
invalidateClickableCache(cache);
```

## Cache Management

### createClickableCache

Creates a new cache for clickable element sorting.

```typescript
import { createClickableCache } from 'blecsd';

const cache = createClickableCache();
```

### invalidateClickableCache

Marks the cache as needing rebuild. Call when:
- Entities are added or removed
- Z-index values change
- Interactive state changes

```typescript
import { invalidateClickableCache } from 'blecsd';

// After adding a new clickable entity
invalidateClickableCache(cache);
```

### updateClickableCache

Rebuilds the cache if dirty.

```typescript
import { updateClickableCache } from 'blecsd';

updateClickableCache(world, cache);
```

### getClickableEntities

Gets all clickable/hoverable entities sorted by z-index.

```typescript
import { getClickableEntities } from 'blecsd';

const entities = getClickableEntities(world, cache);
// Returns entities sorted by z-index (highest first)
```

## Hit Testing

### hitTest

Returns the topmost entity at a point.

```typescript
import { hitTest, createClickableCache } from 'blecsd';

const cache = createClickableCache();

// Find topmost clickable entity under mouse
const entity = hitTest(world, mouseX, mouseY, cache);

if (entity !== null) {
  // Handle click on entity
}
```

**Options:**

```typescript
hitTest(world, x, y, cache, {
  useCachedPositions: true,  // Use position cache (default)
  clickableOnly: true,        // Only test clickables (default)
  hoverableOnly: false,       // Only test hoverables
  interactiveOnly: false,     // Test both clickable and hoverable
});
```

### hitTestAll

Returns all entities at a point, sorted by z-index.

```typescript
import { hitTestAll, createClickableCache } from 'blecsd';

const cache = createClickableCache();

const entities = hitTestAll(world, mouseX, mouseY, cache);

for (const eid of entities) {
  // Process from highest to lowest z-index
}
```

### hitTestDetailed

Returns detailed results including z-index values.

```typescript
import { hitTestDetailed, createClickableCache } from 'blecsd';

const cache = createClickableCache();

const results = hitTestDetailed(world, mouseX, mouseY, cache);

for (const { entity, zIndex } of results) {
  console.log(`Entity ${entity} at z=${zIndex}`);
}
```

## Convenience Functions

### hasClickableAt / hasHoverableAt

Check if any clickable/hoverable entity is at a point.

```typescript
import { hasClickableAt, hasHoverableAt } from 'blecsd';

if (hasClickableAt(world, x, y, cache)) {
  // Show pointer cursor
}

if (hasHoverableAt(world, x, y, cache)) {
  // Show hover state
}
```

### getClickableAt / getHoverableAt

Get the topmost clickable/hoverable at a point.

```typescript
import { getClickableAt, getHoverableAt } from 'blecsd';

const clickable = getClickableAt(world, mouseX, mouseY, cache);
const hoverable = getHoverableAt(world, mouseX, mouseY, cache);
```

### getAllClickablesAt / getAllHoverablesAt

Get all clickables/hoverables at a point.

```typescript
import { getAllClickablesAt, getAllHoverablesAt } from 'blecsd';

const clickables = getAllClickablesAt(world, x, y, cache);
const hoverables = getAllHoverablesAt(world, x, y, cache);
```

## Types

### ClickableCache

```typescript
interface ClickableCache {
  entities: Entity[];  // Sorted entities (highest z first)
  dirty: boolean;      // Whether cache needs rebuilding
  lastCount: number;   // Last known count
}
```

### HitTestResult

```typescript
interface HitTestResult {
  readonly entity: Entity;
  readonly zIndex: number;
}
```

### HitTestOptions

```typescript
interface HitTestOptions {
  useCachedPositions?: boolean;  // Use position cache (default: true)
  clickableOnly?: boolean;       // Only test clickables (default: true)
  hoverableOnly?: boolean;       // Only test hoverables (default: false)
  interactiveOnly?: boolean;     // Test both (default: false)
}
```

## Integration with Input System

```typescript
import {
  createClickableCache,
  hitTest,
  invalidateClickableCache,
  setHovered,
  setPressed,
} from 'blecsd';

// Create cache once
const clickableCache = createClickableCache();

// In input system
function handleMouseMove(world: World, x: number, y: number): void {
  // Find hoverable entity under cursor
  const entity = hitTest(world, x, y, clickableCache, {
    hoverableOnly: true,
    clickableOnly: false,
  });

  // Update hover states...
}

function handleMouseDown(world: World, x: number, y: number): void {
  const entity = hitTest(world, x, y, clickableCache);

  if (entity !== null) {
    setPressed(world, entity, true);
  }
}

// When hierarchy changes
function onEntityAdded(): void {
  invalidateClickableCache(clickableCache);
}
```

## Z-Order Priority

Higher z-index entities always receive events first:

```typescript
// Background at z=0
const background = createBox(world, { zIndex: 0 });

// Dialog at z=100
const dialog = createBox(world, { zIndex: 100 });

// Button in dialog at z=101
const button = createBox(world, { zIndex: 101 });

const cache = createClickableCache();

// Click on button area returns button (highest z)
hitTest(world, 50, 50, cache); // Returns button

// Click on dialog returns dialog
hitTest(world, 30, 30, cache); // Returns dialog

// Click on background returns background
hitTest(world, 5, 5, cache);   // Returns background
```

## Best Practices

1. **Create cache once** - Don't create a new cache every frame
2. **Invalidate on changes** - Call `invalidateClickableCache` when entities/z-indices change
3. **Use cached positions** - Position cache provides fastest hit testing
4. **Filter appropriately** - Use `clickableOnly` or `hoverableOnly` based on event type
5. **Handle null** - Always check for null return from `hitTest`
