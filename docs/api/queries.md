# Query Functions

Query functions find and filter entities based on component combinations. They provide efficient ways to select entities for systems and game logic.

## Query Functions

### queryRenderable

Returns entities with Position, Dimensions, and Renderable components.

```typescript
import { createWorld, queryRenderable, Position, Renderable } from 'blecsd';

const world = createWorld();
// ... create entities ...

const entities = queryRenderable(world);
for (const eid of entities) {
  const x = Position.x[eid];
  const y = Position.y[eid];
  const visible = Renderable.visible[eid];
}
```

---

### queryFocusable

Returns entities with the Focusable component.

```typescript
import { createWorld, queryFocusable, Focusable } from 'blecsd';

const world = createWorld();
// ... create focusable entities ...

const focusables = queryFocusable(world);
for (const eid of focusables) {
  if (Focusable.focusable[eid] === 1) {
    console.log(`Entity ${eid} is focusable`);
  }
}
```

---

### queryInteractive

Returns entities with the Interactive component.

```typescript
import { createWorld, queryInteractive, Interactive } from 'blecsd';

const world = createWorld();
const interactives = queryInteractive(world);

for (const eid of interactives) {
  if (Interactive.clickable[eid] === 1) {
    // Handle clickable entity
  }
}
```

---

### queryScrollable

Returns entities with the Scrollable component.

```typescript
import { createWorld, queryScrollable, Scrollable } from 'blecsd';

const world = createWorld();
const scrollables = queryScrollable(world);

for (const eid of scrollables) {
  const scrollY = Scrollable.scrollY[eid];
  const scrollHeight = Scrollable.scrollHeight[eid];
}
```

---

### queryContent

Returns entities with Position, Dimensions, Renderable, and Content components.

```typescript
import { createWorld, queryContent, getContent } from 'blecsd';

const world = createWorld();
const contentEntities = queryContent(world);

for (const eid of contentEntities) {
  const text = getContent(world, eid);
  console.log(`Entity ${eid} has content: ${text}`);
}
```

---

### queryBorder

Returns entities with Position, Dimensions, Renderable, and Border components.

```typescript
import { createWorld, queryBorder, Border } from 'blecsd';

const world = createWorld();
const borderedEntities = queryBorder(world);

for (const eid of borderedEntities) {
  const borderType = Border.type[eid];
  const hasBorder = Border.left[eid] || Border.right[eid] ||
                    Border.top[eid] || Border.bottom[eid];
}
```

---

### queryPadding

Returns entities with Position, Dimensions, Renderable, and Padding components.

```typescript
import { createWorld, queryPadding, Padding } from 'blecsd';

const world = createWorld();
const paddedEntities = queryPadding(world);

for (const eid of paddedEntities) {
  const totalHorizontal = Padding.left[eid] + Padding.right[eid];
  const totalVertical = Padding.top[eid] + Padding.bottom[eid];
}
```

---

### queryHierarchy

Returns entities with the Hierarchy component.

```typescript
import { createWorld, queryHierarchy, Hierarchy, NULL_ENTITY } from 'blecsd';

const world = createWorld();
const hierarchicalEntities = queryHierarchy(world);

for (const eid of hierarchicalEntities) {
  const parent = Hierarchy.parent[eid];
  if (parent === NULL_ENTITY) {
    console.log(`Entity ${eid} is a root entity`);
  }
}
```

---

## Filter Functions

Filter functions refine entity arrays based on specific conditions.

### filterVisible

Returns only entities where `Renderable.visible === 1`.

```typescript
import { createWorld, queryRenderable, filterVisible } from 'blecsd';

const world = createWorld();
const allRenderables = queryRenderable(world);
const visibleOnly = filterVisible(world, allRenderables);

for (const eid of visibleOnly) {
  // Only process visible entities
}
```

---

### filterDirty

Returns only entities where `Renderable.dirty === 1`.

```typescript
import { createWorld, queryRenderable, filterDirty } from 'blecsd';

const world = createWorld();
const allRenderables = queryRenderable(world);
const needsRedraw = filterDirty(world, allRenderables);

for (const eid of needsRedraw) {
  // Only redraw dirty entities
}
```

---

### filterVisibleDirty

Returns only entities that are both visible AND dirty. Optimized for render systems.

```typescript
import { createWorld, queryRenderable, filterVisibleDirty } from 'blecsd';

const world = createWorld();
const allRenderables = queryRenderable(world);
const toRender = filterVisibleDirty(world, allRenderables);

for (const eid of toRender) {
  // Render only visible entities that need redrawing
}
```

---

### filterFocusable

Returns only entities where `Focusable.focusable === 1`.

```typescript
import { createWorld, queryFocusable, filterFocusable } from 'blecsd';

const world = createWorld();
const allFocusables = queryFocusable(world);
const enabledFocusables = filterFocusable(world, allFocusables);

for (const eid of enabledFocusables) {
  // Process only enabled focusable entities
}
```

---

### filterClickable

Returns only entities where `Interactive.clickable === 1`.

```typescript
import { createWorld, queryInteractive, filterClickable } from 'blecsd';

const world = createWorld();
const allInteractives = queryInteractive(world);
const clickables = filterClickable(world, allInteractives);

for (const eid of clickables) {
  // Process only clickable entities
}
```

---

## Hierarchy Functions

Functions for working with the entity hierarchy.

### getChildEntities

Gets all direct child entities of a parent.

```typescript
import { createWorld, createBoxEntity, getChildEntities } from 'blecsd';

const world = createWorld();
const parent = createBoxEntity(world, { x: 0, y: 0 });
const child1 = createBoxEntity(world, { parent, x: 1, y: 1 });
const child2 = createBoxEntity(world, { parent, x: 2, y: 2 });

const children = getChildEntities(world, parent);
// children = [child1, child2]
```

---

### getDescendantEntities

Gets all descendant entities (children, grandchildren, etc.).

```typescript
import { createWorld, createBoxEntity, getDescendantEntities } from 'blecsd';

const world = createWorld();
const root = createBoxEntity(world, { x: 0, y: 0 });
const child = createBoxEntity(world, { parent: root, x: 1, y: 1 });
const grandchild = createBoxEntity(world, { parent: child, x: 2, y: 2 });

const descendants = getDescendantEntities(world, root);
// descendants = [child, grandchild]
```

---

### getRootEntities

Gets all entities with no parent (root entities).

```typescript
import { createWorld, createBoxEntity, getRootEntities } from 'blecsd';

const world = createWorld();
const root1 = createBoxEntity(world, { x: 0, y: 0 });
const root2 = createBoxEntity(world, { x: 10, y: 0 });
const child = createBoxEntity(world, { parent: root1, x: 1, y: 1 });

const roots = getRootEntities(world);
// roots = [root1, root2]
```

---

## Sort Functions

Functions for sorting entity arrays.

### sortByZIndex

Sorts entities by z-index for proper layering during rendering. Higher z-index entities are rendered later (on top).

```typescript
import { createWorld, queryRenderable, sortByZIndex } from 'blecsd';

const world = createWorld();
const renderables = queryRenderable(world);
const sortedForRender = sortByZIndex(world, renderables);

for (const eid of sortedForRender) {
  // Render in correct z-order
}
```

---

### sortByTabIndex

Sorts entities by tab index for focus navigation. Entities with lower tabIndex are focused first.

```typescript
import { createWorld, queryFocusable, sortByTabIndex, filterFocusable } from 'blecsd';

const world = createWorld();
const focusables = queryFocusable(world);
const enabled = filterFocusable(world, focusables);
const tabOrder = sortByTabIndex(world, enabled);

// tabOrder is now in correct focus navigation order
```

---

### sortByDepth

Sorts entities by hierarchy depth (ancestors first). Useful for processing in parent-to-child order.

```typescript
import { createWorld, queryHierarchy, sortByDepth } from 'blecsd';

const world = createWorld();
const hierarchical = queryHierarchy(world);
const topDown = sortByDepth(world, hierarchical);

for (const eid of topDown) {
  // Process parent before children
}
```

---

## See Also

- [Entity Factories](./entities.md) - Creating entities
- [Components Reference](./components.md) - Component documentation
