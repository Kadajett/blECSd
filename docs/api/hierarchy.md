# Hierarchy Component

The Hierarchy component manages parent-child relationships between entities.

## Component

```typescript
import { Hierarchy } from 'blecsd';

// Component arrays (bitECS SoA pattern)
Hierarchy.parent       // Uint32Array - Parent entity ID (0 = no parent)
Hierarchy.firstChild   // Uint32Array - First child entity ID
Hierarchy.nextSibling  // Uint32Array - Next sibling entity ID
Hierarchy.prevSibling  // Uint32Array - Previous sibling entity ID
Hierarchy.depth        // Uint16Array - Depth in hierarchy (0 = root)
```

## Constants

### NULL_ENTITY

Represents no entity (used for root entities with no parent).

```typescript
import { NULL_ENTITY } from 'blecsd';

NULL_ENTITY; // 0
```

## Functions

### hasHierarchy

Check if an entity has the Hierarchy component.

```typescript
import { hasHierarchy } from 'blecsd';

hasHierarchy(world, entity); // true or false
```

### setParent

Set an entity's parent. Adds Hierarchy component if needed.

```typescript
import { setParent } from 'blecsd';

setParent(world, child, parent);
```

Removes from previous parent if already parented.

### appendChild

Add an entity as the last child of a parent.

```typescript
import { appendChild } from 'blecsd';

appendChild(world, parent, child);
```

### removeChild

Remove an entity from its parent.

```typescript
import { removeChild } from 'blecsd';

removeChild(world, parent, child);
```

### prepend

Add an entity as the first child of a parent.

```typescript
import { prepend, getChildren } from 'blecsd';

appendChild(world, parent, child2);
prepend(world, parent, child1);
getChildren(world, parent); // [child1, child2]
```

### insertAt

Insert an entity at a specific index in the parent's children.

```typescript
import { insertAt, getChildren } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child3);
insertAt(world, parent, child2, 1);
getChildren(world, parent); // [child1, child2, child3]

// Negative indices count from end
insertAt(world, parent, child, -1); // Insert before last
```

### insertBefore

Insert an entity before a sibling.

```typescript
import { insertBefore, getChildren } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child3);
insertBefore(world, child2, child3);
getChildren(world, parent); // [child1, child2, child3]
```

### insertAfter

Insert an entity after a sibling.

```typescript
import { insertAfter, getChildren } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child3);
insertAfter(world, child2, child1);
getChildren(world, parent); // [child1, child2, child3]
```

### detach

Remove an entity from its parent (convenience for setParent to NULL_ENTITY).

```typescript
import { detach, getParent, NULL_ENTITY } from 'blecsd';

appendChild(world, parent, child);
detach(world, child);
getParent(world, child); // NULL_ENTITY
```

### getParent

Get an entity's parent ID.

```typescript
import { getParent } from 'blecsd';

const parent = getParent(world, entity);
// Entity ID or undefined if no parent
```

### getChildren

Get all direct children of an entity.

```typescript
import { getChildren } from 'blecsd';

const children = getChildren(world, parent);
// [childId1, childId2, ...]
```

### getDescendants

Get all descendants (children, grandchildren, etc.).

```typescript
import { getDescendants } from 'blecsd';

const all = getDescendants(world, root);
// Depth-first order
```

### getAncestors

Get all ancestors (parent, grandparent, etc.).

```typescript
import { getAncestors } from 'blecsd';

const ancestors = getAncestors(world, entity);
// [parent, grandparent, ...] nearest first
```

### getFirstChild

Get the first child of an entity.

```typescript
import { getFirstChild, NULL_ENTITY } from 'blecsd';

const first = getFirstChild(world, parent);
// Entity ID or NULL_ENTITY if no children
```

### getLastChild

Get the last child of an entity.

```typescript
import { getLastChild, NULL_ENTITY } from 'blecsd';

const last = getLastChild(world, parent);
// Entity ID or NULL_ENTITY if no children
```

### getChildAt

Get a child at a specific index.

```typescript
import { getChildAt, NULL_ENTITY } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child2);
getChildAt(world, parent, 0); // child1
getChildAt(world, parent, 1); // child2
getChildAt(world, parent, 5); // NULL_ENTITY (out of bounds)
```

### getChildIndex

Get the index of a child within its parent's children.

```typescript
import { getChildIndex } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child2);
getChildIndex(world, child1); // 0
getChildIndex(world, child2); // 1
getChildIndex(world, orphan); // -1 (not a child)
```

### getNextSibling

Get the next sibling entity.

```typescript
import { getNextSibling } from 'blecsd';

const next = getNextSibling(world, entity);
// Entity ID or NULL_ENTITY
```

### getPrevSibling

Get the previous sibling entity.

```typescript
import { getPrevSibling, NULL_ENTITY } from 'blecsd';

const prev = getPrevSibling(world, entity);
// Entity ID or NULL_ENTITY
```

### getDepth

Get an entity's depth in the hierarchy.

```typescript
import { getDepth } from 'blecsd';

const depth = getDepth(world, entity);
// 0 for root, 1 for children of root, etc.
```

### isRoot

Check if an entity has no parent.

```typescript
import { isRoot } from 'blecsd';

isRoot(world, entity); // true if no parent
```

### isLeaf

Check if an entity has no children.

```typescript
import { isLeaf } from 'blecsd';

isLeaf(world, entity); // true if no children
```

### getHierarchy

Get all hierarchy data for an entity.

```typescript
import { getHierarchy } from 'blecsd';

const data = getHierarchy(world, entity);
// {
//   parent: number | null,
//   firstChild: number | null,
//   nextSibling: number | null,
//   prevSibling: number | null,
//   depth: number
// }
```

## Types

### HierarchyData

```typescript
interface HierarchyData {
  readonly parent: Entity;        // NULL_ENTITY if no parent
  readonly firstChild: Entity;    // NULL_ENTITY if no children
  readonly nextSibling: Entity;   // NULL_ENTITY if last sibling
  readonly prevSibling: Entity;   // NULL_ENTITY if first sibling
  readonly childCount: number;    // Number of direct children
  readonly depth: number;         // Depth in hierarchy (0 = root)
}
```

## Examples

### Building a Tree

```typescript
import { createWorld, addEntity } from 'bitecs';
import { appendChild, getChildren, getDepth } from 'blecsd';

const world = createWorld();

const root = addEntity(world);
const child1 = addEntity(world);
const child2 = addEntity(world);
const grandchild = addEntity(world);

appendChild(world, root, child1);
appendChild(world, root, child2);
appendChild(world, child1, grandchild);

getChildren(world, root);      // [child1, child2]
getDepth(world, root);         // 0
getDepth(world, child1);       // 1
getDepth(world, grandchild);   // 2
```

### Traversing Descendants

```typescript
import { getDescendants, getPosition } from 'blecsd';

function moveEntityAndDescendants(world, entity, dx, dy) {
  const entities = [entity, ...getDescendants(world, entity)];

  for (const eid of entities) {
    const pos = getPosition(world, eid);
    if (pos) {
      setPosition(world, eid, pos.x + dx, pos.y + dy);
    }
  }
}
```

### Finding Root

```typescript
import { getAncestors, isRoot } from 'blecsd';

function getRoot(world, entity) {
  if (isRoot(world, entity)) return entity;

  const ancestors = getAncestors(world, entity);
  return ancestors[ancestors.length - 1];
}
```

### Reordering Children

```typescript
import {
  appendChild,
  insertBefore,
  insertAfter,
  getFirstChild,
  getLastChild
} from 'blecsd';

// Build initial list
appendChild(world, list, item1);
appendChild(world, list, item2);
appendChild(world, list, item3);

// Move item3 to beginning
const first = getFirstChild(world, list);
insertBefore(world, item3, first);
// Now: [item3, item1, item2]

// Move item1 to end
const last = getLastChild(world, list);
insertAfter(world, item1, last);
// Now: [item3, item2, item1]
```

### Moving Between Parents

```typescript
import { detach, appendChild } from 'blecsd';

// Move child from parent1 to parent2
detach(world, child);
appendChild(world, parent2, child);
```
