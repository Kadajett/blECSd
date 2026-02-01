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

### getNextSibling

Get the next sibling entity.

```typescript
import { getNextSibling } from 'blecsd';

const next = getNextSibling(world, entity);
// Entity ID or undefined
```

### getPrevSibling

Get the previous sibling entity.

```typescript
import { getPrevSibling } from 'blecsd';

const prev = getPrevSibling(world, entity);
// Entity ID or undefined
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
  readonly parent: number | null;
  readonly firstChild: number | null;
  readonly nextSibling: number | null;
  readonly prevSibling: number | null;
  readonly depth: number;
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
