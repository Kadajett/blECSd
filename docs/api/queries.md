# Queries API

Pre-built queries and filters for finding and sorting entities.

## Queries

Queries return arrays of entity IDs that have specific components.

### queryRenderable

Entities with the Renderable component.

```typescript
import { queryRenderable } from 'blecsd';

const entities = queryRenderable(world);
// [1, 2, 5, ...] entity IDs
```

### queryFocusable

Entities with the Focusable component.

```typescript
import { queryFocusable } from 'blecsd';

const entities = queryFocusable(world);
```

### queryInteractive

Entities with the Interactive component.

```typescript
import { queryInteractive } from 'blecsd';

const entities = queryInteractive(world);
```

### queryHierarchy

Entities with the Hierarchy component.

```typescript
import { queryHierarchy } from 'blecsd';

const entities = queryHierarchy(world);
```

### queryBorder

Entities with the Border component.

```typescript
import { queryBorder } from 'blecsd';

const entities = queryBorder(world);
```

### queryContent

Entities with the Content component.

```typescript
import { queryContent } from 'blecsd';

const entities = queryContent(world);
```

### queryPadding

Entities with the Padding component.

```typescript
import { queryPadding } from 'blecsd';

const entities = queryPadding(world);
```

### queryScrollable

Entities with the Scrollable component.

```typescript
import { queryScrollable } from 'blecsd';

const entities = queryScrollable(world);
```

## Filters

Filters take an array of entity IDs and return a filtered subset.

### filterVisible

Keep only visible entities.

```typescript
import { queryRenderable, filterVisible } from 'blecsd';

const all = queryRenderable(world);
const visible = filterVisible(world, all);
```

### filterDirty

Keep only entities marked dirty (needing redraw).

```typescript
import { queryRenderable, filterDirty } from 'blecsd';

const all = queryRenderable(world);
const dirty = filterDirty(world, all);
```

### filterVisibleDirty

Keep entities that are both visible and dirty.

```typescript
import { queryRenderable, filterVisibleDirty } from 'blecsd';

const toRender = filterVisibleDirty(world, queryRenderable(world));
```

### filterFocusable

Keep only focusable entities.

```typescript
import { queryFocusable, filterFocusable } from 'blecsd';

const focusable = filterFocusable(world, queryFocusable(world));
```

### filterClickable

Keep only clickable entities.

```typescript
import { queryInteractive, filterClickable } from 'blecsd';

const clickable = filterClickable(world, queryInteractive(world));
```

## Sorting

Sort functions return a new sorted array.

### sortByZIndex

Sort by z-index, lowest first.

```typescript
import { queryRenderable, filterVisible, sortByZIndex } from 'blecsd';

const entities = queryRenderable(world);
const visible = filterVisible(world, entities);
const sorted = sortByZIndex(world, visible);
// Lowest z-index first for proper render order
```

### sortByDepth

Sort by hierarchy depth, shallowest first.

```typescript
import { queryHierarchy, sortByDepth } from 'blecsd';

const entities = queryHierarchy(world);
const sorted = sortByDepth(world, entities);
// Root entities first, then children
```

### sortByTabIndex

Sort by tab index for focus navigation.

```typescript
import { queryFocusable, filterFocusable, sortByTabIndex } from 'blecsd';

const focusable = filterFocusable(world, queryFocusable(world));
const tabOrder = sortByTabIndex(world, focusable);
```

## Hierarchy Queries

### getRootEntities

Get entities with no parent.

```typescript
import { getRootEntities } from 'blecsd';

const roots = getRootEntities(world);
```

### getChildEntities

Get direct children of an entity.

```typescript
import { getChildEntities } from 'blecsd';

const children = getChildEntities(world, parentEntity);
```

### getDescendantEntities

Get all descendants of an entity (children, grandchildren, etc.).

```typescript
import { getDescendantEntities } from 'blecsd';

const descendants = getDescendantEntities(world, rootEntity);
```

## Patterns

### Render Pipeline

```typescript
import {
  queryRenderable,
  filterVisible,
  sortByZIndex,
} from 'blecsd';

function getRenderOrder(world) {
  const entities = queryRenderable(world);
  const visible = filterVisible(world, entities);
  return sortByZIndex(world, visible);
}
```

### Focus Navigation

```typescript
import {
  queryFocusable,
  filterFocusable,
  sortByTabIndex,
} from 'blecsd';

function getTabOrder(world) {
  const entities = queryFocusable(world);
  const focusable = filterFocusable(world, entities);
  return sortByTabIndex(world, focusable);
}
```

### Hit Testing

```typescript
import {
  queryInteractive,
  filterClickable,
  filterVisible,
  sortByZIndex,
  getPosition,
  getDimensions,
} from 'blecsd';

function getEntityAtPoint(world, x, y) {
  const entities = queryInteractive(world);
  const clickable = filterClickable(world, entities);
  const visible = filterVisible(world, clickable);
  const sorted = sortByZIndex(world, visible);

  // Check in reverse order (highest z-index first)
  for (let i = sorted.length - 1; i >= 0; i--) {
    const eid = sorted[i];
    const pos = getPosition(world, eid);
    const dims = getDimensions(world, eid);

    if (pos && dims) {
      if (x >= pos.x && x < pos.x + dims.width &&
          y >= pos.y && y < pos.y + dims.height) {
        return eid;
      }
    }
  }

  return null;
}
```
