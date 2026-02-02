# Hierarchy Component

The Hierarchy component manages parent-child relationships between entities. Use it to build scene graphs, UI trees, or any structure where entities need to know their relationships. Child positions are relative to their parent, and visibility cascades down the tree.

## Component Structure

```typescript
import { Hierarchy } from 'blecsd';

Hierarchy.parent       // Uint32Array - Parent entity ID (0 = no parent)
Hierarchy.firstChild   // Uint32Array - First child entity ID
Hierarchy.nextSibling  // Uint32Array - Next sibling entity ID
Hierarchy.prevSibling  // Uint32Array - Previous sibling entity ID
Hierarchy.depth        // Uint16Array - Depth in hierarchy (0 = root)
```

### NULL_ENTITY

```typescript
import { NULL_ENTITY } from 'blecsd';

NULL_ENTITY;  // 0 (represents no entity)
```

---

## How do I check if an entity has hierarchy data?

### hasHierarchy

```typescript
import { hasHierarchy, setParent } from 'blecsd';

hasHierarchy(world, entity);  // false

setParent(world, child, parent);
hasHierarchy(world, child);   // true
```

---

## How do I create parent-child relationships?

### setParent

Sets an entity's parent. Adds Hierarchy component if needed. Removes from previous parent automatically.

```typescript
import { setParent, getParent } from 'blecsd';

setParent(world, child, parent);
getParent(world, child);  // parent entity ID
```

### appendChild

Adds an entity as the last child of a parent.

```typescript
import { appendChild, getChildren } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child2);
getChildren(world, parent);  // [child1, child2]
```

### prepend

Adds an entity as the first child of a parent.

```typescript
import { prepend, appendChild, getChildren } from 'blecsd';

appendChild(world, parent, child2);
prepend(world, parent, child1);
getChildren(world, parent);  // [child1, child2]
```

---

## How do I insert children at specific positions?

### insertAt

Inserts at a specific index. Negative indices count from the end.

```typescript
import { insertAt, appendChild, getChildren } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child3);
insertAt(world, parent, child2, 1);
getChildren(world, parent);  // [child1, child2, child3]

// Insert before last
insertAt(world, parent, newChild, -1);
```

### insertBefore

Inserts before a sibling.

```typescript
import { insertBefore, appendChild, getChildren } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child3);
insertBefore(world, child2, child3);
getChildren(world, parent);  // [child1, child2, child3]
```

### insertAfter

Inserts after a sibling.

```typescript
import { insertAfter, appendChild, getChildren } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child3);
insertAfter(world, child2, child1);
getChildren(world, parent);  // [child1, child2, child3]
```

---

## How do I remove children?

### removeChild

Removes a child from its parent.

```typescript
import { removeChild, getChildren } from 'blecsd';

removeChild(world, parent, child);
```

### detach

Convenience function to remove an entity from its parent.

```typescript
import { detach, appendChild, getParent, NULL_ENTITY } from 'blecsd';

appendChild(world, parent, child);
detach(world, child);
getParent(world, child);  // NULL_ENTITY
```

---

## How do I navigate the hierarchy?

### getParent

```typescript
import { getParent } from 'blecsd';

const parent = getParent(world, entity);
// Entity ID or undefined if no parent
```

### getChildren

Returns direct children only.

```typescript
import { getChildren } from 'blecsd';

const children = getChildren(world, parent);
// [childId1, childId2, ...]
```

### getDescendants

Returns all descendants (children, grandchildren, etc.) in depth-first order.

```typescript
import { getDescendants } from 'blecsd';

const all = getDescendants(world, root);
```

### getAncestors

Returns all ancestors, nearest first.

```typescript
import { getAncestors } from 'blecsd';

const ancestors = getAncestors(world, entity);
// [parent, grandparent, ...]
```

### getFirstChild / getLastChild

```typescript
import { getFirstChild, getLastChild, NULL_ENTITY } from 'blecsd';

const first = getFirstChild(world, parent);  // Entity ID or NULL_ENTITY
const last = getLastChild(world, parent);    // Entity ID or NULL_ENTITY
```

### getChildAt

```typescript
import { getChildAt, appendChild, NULL_ENTITY } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child2);
getChildAt(world, parent, 0);  // child1
getChildAt(world, parent, 1);  // child2
getChildAt(world, parent, 5);  // NULL_ENTITY (out of bounds)
```

### getChildIndex

```typescript
import { getChildIndex, appendChild } from 'blecsd';

appendChild(world, parent, child1);
appendChild(world, parent, child2);
getChildIndex(world, child1);  // 0
getChildIndex(world, child2);  // 1
getChildIndex(world, orphan);  // -1 (not a child)
```

### getNextSibling / getPrevSibling

```typescript
import { getNextSibling, getPrevSibling, NULL_ENTITY } from 'blecsd';

const next = getNextSibling(world, entity);  // Entity ID or NULL_ENTITY
const prev = getPrevSibling(world, entity);  // Entity ID or NULL_ENTITY
```

### getDepth

```typescript
import { getDepth } from 'blecsd';

getDepth(world, root);        // 0
getDepth(world, child);       // 1
getDepth(world, grandchild);  // 2
```

### isRoot / isLeaf

```typescript
import { isRoot, isLeaf } from 'blecsd';

isRoot(world, entity);  // true if no parent
isLeaf(world, entity);  // true if no children
```

### getHierarchy

Returns all hierarchy data for an entity.

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

---

## Types

### HierarchyData

```typescript
interface HierarchyData {
  readonly parent: Entity;        // NULL_ENTITY if no parent
  readonly firstChild: Entity;    // NULL_ENTITY if no children
  readonly nextSibling: Entity;   // NULL_ENTITY if last sibling
  readonly prevSibling: Entity;   // NULL_ENTITY if first sibling
  readonly childCount: number;
  readonly depth: number;         // 0 = root
}
```

---

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

getChildren(world, root);       // [child1, child2]
getDepth(world, root);          // 0
getDepth(world, child1);        // 1
getDepth(world, grandchild);    // 2
```

### Traversing Descendants

```typescript
import { getDescendants, getPosition, setPosition } from 'blecsd';

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

### Moving Between Parents

```typescript
import { detach, appendChild } from 'blecsd';

// Move child from parent1 to parent2
detach(world, child);
appendChild(world, parent2, child);
```

---

## Limitations

- **Depth limit**: Hierarchy depth is stored as Uint16, limiting to 65535 levels. In practice, deep hierarchies (>20 levels) may cause performance issues with cascading operations.
- **Cycle detection**: The library does not prevent creating cycles. Setting entity A as a child of entity B when B is already a descendant of A will create a cycle and cause infinite loops in traversal functions.
- **Single parent**: Each entity can have only one parent. Multi-parent graphs require a different approach.

---

## See Also

- [Position Component](./position.md) - Relative positioning uses parent position
- [Renderable Component](./renderable.md) - Visibility cascades through hierarchy
