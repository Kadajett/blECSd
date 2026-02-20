# Hit Test API

Z-order aware hit testing for mouse interactions.

## Overview

The hit test system provides efficient point-in-entity testing with z-index awareness, ensuring the topmost (highest z-index) element receives mouse events first. It includes a caching system to optimize repeated hit tests.

## Quick Start

```typescript
import { createWorld } from 'blecsd/core';
import {
  createClickableCache,
  hitTest,
  hitTestAll,
  invalidateClickableCache,
} from 'blecsd/core';

const world = createWorld();
const mouseX = 10; const mouseY = 10;

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
import { createClickableCache } from 'blecsd/core';

const cache = createClickableCache();
```

### invalidateClickableCache

Marks the cache as needing rebuild. Call when:
- Entities are added or removed
- Z-index values change
- Interactive state changes

```typescript
import { createClickableCache, invalidateClickableCache } from 'blecsd/core';

const cache = createClickableCache();
// After adding a new clickable entity
invalidateClickableCache(cache);
```

### updateClickableCache

Rebuilds the cache if dirty.

```typescript
import { createWorld } from 'blecsd/core';
import { createClickableCache, updateClickableCache } from 'blecsd/core';

const world = createWorld();
const cache = createClickableCache();
updateClickableCache(world, cache);
```

### getClickableEntities

Gets all clickable/hoverable entities sorted by z-index.

```typescript
import { createWorld } from 'blecsd/core';
import { createClickableCache, getClickableEntities } from 'blecsd/core';

const world = createWorld();
const cache = createClickableCache();
const entities = getClickableEntities(world, cache);
// Returns entities sorted by z-index (highest first)
```

## Hit Testing

### hitTest

Returns the topmost entity at a point.

```typescript
import { createWorld } from 'blecsd/core';
import { hitTest, createClickableCache } from 'blecsd/core';

const world = createWorld();
const mouseX = 10; const mouseY = 10;
const cache = createClickableCache();

// Find topmost clickable entity under mouse
const entity = hitTest(world, mouseX, mouseY, cache);

if (entity !== null) {
  // Handle click on entity
}
```

**Options:**

```typescript
import { createWorld } from 'blecsd/core';
import { hitTest, createClickableCache } from 'blecsd/core';

const world = createWorld();
const x = 10; const y = 10;
const cache = createClickableCache();
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
import { createWorld } from 'blecsd/core';
import { hitTestAll, createClickableCache } from 'blecsd/core';

const world = createWorld();
const mouseX = 10; const mouseY = 10;
const cache = createClickableCache();

const entities = hitTestAll(world, mouseX, mouseY, cache);

for (const eid of entities) {
  // Process from highest to lowest z-index
}
```

### hitTestDetailed

Returns detailed results including z-index values.

```typescript
import { createWorld } from 'blecsd/core';
import { hitTestDetailed, createClickableCache } from 'blecsd/core';

const world = createWorld();
const mouseX = 10; const mouseY = 10;
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
import { createWorld } from 'blecsd/core';
import { createClickableCache, hasClickableAt, hasHoverableAt } from 'blecsd/core';

const world = createWorld();
const x = 10; const y = 10;
const cache = createClickableCache();
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
import { createWorld } from 'blecsd/core';
import { createClickableCache, getClickableAt, getHoverableAt } from 'blecsd/core';

const world = createWorld();
const mouseX = 10; const mouseY = 10;
const cache = createClickableCache();
const clickable = getClickableAt(world, mouseX, mouseY, cache);
const hoverable = getHoverableAt(world, mouseX, mouseY, cache);
```

### getAllClickablesAt / getAllHoverablesAt

Get all clickables/hoverables at a point.

```typescript
import { createWorld } from 'blecsd/core';
import { createClickableCache, getAllClickablesAt, getAllHoverablesAt } from 'blecsd/core';

const world = createWorld();
const x = 10; const y = 10;
const cache = createClickableCache();
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
import { createWorld } from 'blecsd/core';
import { createClickableCache, hitTest, invalidateClickableCache } from 'blecsd/core';
import { setPressed } from 'blecsd/components';

const world = createWorld();
// Create cache once
const clickableCache = createClickableCache();

// In input system
function handleMouseMove(x: number, y: number): void {
  // Find hoverable entity under cursor
  const entity = hitTest(world, x, y, clickableCache, {
    hoverableOnly: true,
    clickableOnly: false,
  });
  // Update hover states...
  if (entity !== null) console.log('hovering entity', entity);
}

function handleMouseDown(x: number, y: number): void {
  const entity = hitTest(world, x, y, clickableCache);

  if (entity !== null) {
    setPressed(world, entity, true);
  }
}

// When hierarchy changes
function onEntityAdded(): void {
  invalidateClickableCache(clickableCache);
}

handleMouseMove(10, 10);
handleMouseDown(10, 10);
onEntityAdded();
```

## Z-Order Priority

Higher z-index entities always receive events first:

```typescript
import { createWorld } from 'blecsd/core';
import { createClickableCache, hitTest, updateClickableCache } from 'blecsd/core';

const world = createWorld();
const cache = createClickableCache();

// After entities are set up with z-index values via setZOrder/setClickable...
// (entities with higher z-index are returned first in hit tests)
updateClickableCache(world, cache);

// Click at various positions returns topmost entity at that point
const top1 = hitTest(world, 50, 50, cache);
const top2 = hitTest(world, 30, 30, cache);
const top3 = hitTest(world, 5, 5, cache);
console.log(top1, top2, top3);
```

## Best Practices

1. **Create cache once** - Don't create a new cache every frame
2. **Invalidate on changes** - Call `invalidateClickableCache` when entities/z-indices change
3. **Use cached positions** - Position cache provides fastest hit testing
4. **Filter appropriately** - Use `clickableOnly` or `hoverableOnly` based on event type
5. **Handle null** - Always check for null return from `hitTest`
