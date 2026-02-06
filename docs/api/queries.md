# Queries API

Queries find subsets of entities for rendering, focus navigation, or hit testing. Without queries, you'd have to iterate all entities manually and check component membership yourself.

## What queries are available?

Queries return arrays of entity IDs that have specific components.

### queryRenderable

Entities with the Renderable component.

```typescript
import { queryRenderable } from 'blecsd';

const entities = queryRenderable(world);
// [1, 2, 5] - entity IDs with Renderable
```

### queryFocusable

```typescript
import { queryFocusable } from 'blecsd';

const entities = queryFocusable(world);
```

### queryInteractive

```typescript
import { queryInteractive } from 'blecsd';

const entities = queryInteractive(world);
```

### queryHierarchy

```typescript
import { queryHierarchy } from 'blecsd';

const entities = queryHierarchy(world);
```

### queryBorder

```typescript
import { queryBorder } from 'blecsd';

const entities = queryBorder(world);
```

### queryContent

```typescript
import { queryContent } from 'blecsd';

const entities = queryContent(world);
```

### queryPadding

```typescript
import { queryPadding } from 'blecsd';

const entities = queryPadding(world);
```

### queryScrollable

```typescript
import { queryScrollable } from 'blecsd';

const entities = queryScrollable(world);
```

---

## How do I filter entities?

Filters take an array of entity IDs and return a subset matching specific criteria.

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

---

## How do I sort entities?

Sort functions return a new sorted array (they don't mutate the input).

### sortByZIndex

Sort by z-index, lowest first. Use for render order.

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

---

## How do I query the hierarchy?

### getRootEntities

Entities with no parent.

```typescript
import { getRootEntities } from 'blecsd';

const roots = getRootEntities(world);
```

### getChildEntities

Direct children of an entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getChildEntities } from 'blecsd';

const children = getChildEntities(world, parentEntity);
```

### getDescendantEntities

All descendants (children, grandchildren, etc.).

<!-- blecsd-doccheck:ignore -->
```typescript
import { getDescendantEntities } from 'blecsd';

const descendants = getDescendantEntities(world, rootEntity);
```

---

## Common Patterns

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

---

## See Also

- [Renderable Component](./renderable.md) - Visibility and dirty state
- [Hierarchy Component](./hierarchy.md) - Parent-child relationships
