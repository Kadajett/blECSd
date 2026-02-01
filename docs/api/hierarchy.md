# Hierarchy Component

The Hierarchy component manages parent/child entity relationships using a linked list structure for efficient traversal. It enables building tree structures like UI layouts, scene graphs, or any nested entity organization.

## NULL_ENTITY Constant

Represents the absence of a parent, child, or sibling relationship.

```typescript
import { NULL_ENTITY } from 'blecsd';

// NULL_ENTITY is always 0
const hasParent = parent !== NULL_ENTITY;
```

---

## Hierarchy Component

The Hierarchy component stores tree structure data using bitecs SoA (Structure of Arrays) pattern.

```typescript
import { Hierarchy } from 'blecsd';

// Component arrays
Hierarchy.parent      // Uint32Array - Parent entity ID (0 = no parent)
Hierarchy.firstChild  // Uint32Array - First child entity
Hierarchy.nextSibling // Uint32Array - Next sibling entity
Hierarchy.prevSibling // Uint32Array - Previous sibling entity
Hierarchy.childCount  // Uint16Array - Number of direct children
Hierarchy.depth       // Uint16Array - Tree depth (0 = root level)
```

---

## Functions

### hasHierarchy

Checks if an entity has a Hierarchy component.

```typescript
import { createWorld, hasHierarchy, appendChild } from 'blecsd';

const world = createWorld();
const parent = 1;
const child = 2;

hasHierarchy(world, parent); // false

appendChild(world, parent, child);
hasHierarchy(world, parent); // true
hasHierarchy(world, child);  // true
```

---

### setParent

Sets the parent of an entity, removing it from any current parent.

```typescript
import { createWorld, setParent, NULL_ENTITY } from 'blecsd';

const world = createWorld();
const parent = 1;
const child = 2;

// Set a parent
setParent(world, child, parent);

// Make orphan (remove from parent)
setParent(world, child, NULL_ENTITY);
// or
setParent(world, child, 0);
```

**Parameters:**
- `world` - The ECS world
- `child` - The child entity
- `parent` - The new parent entity (0 or NULL_ENTITY for no parent)

**Returns:** The child entity for chaining

---

### appendChild

Appends a child to a parent entity. This is the most common way to build hierarchies.

```typescript
import { createWorld, appendChild, getChildren } from 'blecsd';

const world = createWorld();
const parent = 1;
const child1 = 2;
const child2 = 3;
const child3 = 4;

// Build a hierarchy
appendChild(world, parent, child1);
appendChild(world, parent, child2);
appendChild(world, parent, child3);

getChildren(world, parent); // [2, 3, 4]
```

**Parameters:**
- `world` - The ECS world
- `parent` - The parent entity
- `child` - The child entity to append

**Returns:** The parent entity for chaining

---

### removeChild

Removes a child from a parent entity. The child becomes an orphan (root level).

```typescript
import { createWorld, appendChild, removeChild, getChildren, isRoot } from 'blecsd';

const world = createWorld();
const parent = 1;
const child1 = 2;
const child2 = 3;

appendChild(world, parent, child1);
appendChild(world, parent, child2);

removeChild(world, parent, child1);

getChildren(world, parent); // [3]
isRoot(world, child1);      // true (orphaned)
```

**Parameters:**
- `world` - The ECS world
- `parent` - The parent entity
- `child` - The child entity to remove

**Returns:** The parent entity for chaining

**Note:** Does nothing if the child is not actually a child of the specified parent.

---

### getChildren

Gets all direct children of an entity.

```typescript
import { createWorld, appendChild, getChildren } from 'blecsd';

const world = createWorld();
const parent = 1;
const child1 = 2;
const child2 = 3;

getChildren(world, parent); // [] (no children yet)

appendChild(world, parent, child1);
appendChild(world, parent, child2);

const children = getChildren(world, parent);
// children = [2, 3]

for (const child of children) {
  console.log(`Processing child: ${child}`);
}
```

**Parameters:**
- `world` - The ECS world
- `parent` - The parent entity

**Returns:** Array of child entities (empty if no children or no Hierarchy component)

---

### getAncestors

Gets all ancestors of an entity (parent, grandparent, etc.).

```typescript
import { createWorld, appendChild, getAncestors } from 'blecsd';

const world = createWorld();
const grandparent = 1;
const parent = 2;
const child = 3;

appendChild(world, grandparent, parent);
appendChild(world, parent, child);

const ancestors = getAncestors(world, child);
// ancestors = [2, 1] (immediate parent first)

const myParent = ancestors[0];      // 2
const myGrandparent = ancestors[1]; // 1
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity

**Returns:** Array of ancestor entities (immediate parent first, then grandparent, etc.)

---

### getDescendants

Gets all descendants of an entity (children, grandchildren, etc.) in depth-first order.

```typescript
import { createWorld, appendChild, getDescendants } from 'blecsd';

const world = createWorld();
const root = 1;
const child1 = 2;
const child2 = 3;
const grandchild1 = 4;
const grandchild2 = 5;

appendChild(world, root, child1);
appendChild(world, root, child2);
appendChild(world, child1, grandchild1);
appendChild(world, child1, grandchild2);

const descendants = getDescendants(world, root);
// descendants = [2, 4, 5, 3] (depth-first order)
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity

**Returns:** Array of descendant entities in depth-first order

---

### getParent

Gets the parent of an entity.

```typescript
import { createWorld, appendChild, getParent, NULL_ENTITY } from 'blecsd';

const world = createWorld();
const parent = 1;
const child = 2;

getParent(world, child); // 0 (NULL_ENTITY, no parent)

appendChild(world, parent, child);

const myParent = getParent(world, child);
// myParent = 1

if (myParent !== NULL_ENTITY) {
  console.log(`Parent is entity ${myParent}`);
}
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity

**Returns:** Parent entity or NULL_ENTITY (0) if no parent

---

### getHierarchy

Gets full hierarchy data for an entity.

```typescript
import { createWorld, appendChild, getHierarchy } from 'blecsd';

const world = createWorld();
const parent = 1;
const child1 = 2;
const child2 = 3;

getHierarchy(world, parent); // undefined (no Hierarchy component)

appendChild(world, parent, child1);
appendChild(world, parent, child2);

const data = getHierarchy(world, parent);
// data = {
//   parent: 0,      // no parent (root)
//   firstChild: 2,  // first child is entity 2
//   nextSibling: 0, // no next sibling
//   prevSibling: 0, // no prev sibling
//   childCount: 2,  // two children
//   depth: 0        // root level
// }
```

**Returns:** `HierarchyData | undefined`

---

### isRoot

Checks if an entity is a root (has no parent).

```typescript
import { createWorld, appendChild, isRoot } from 'blecsd';

const world = createWorld();
const parent = 1;
const child = 2;

isRoot(world, parent); // true (no Hierarchy component = root)
isRoot(world, child);  // true (no Hierarchy component = root)

appendChild(world, parent, child);

isRoot(world, parent); // true (has no parent)
isRoot(world, child);  // false (has a parent)
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity

**Returns:** true if entity has no parent

---

### isLeaf

Checks if an entity is a leaf (has no children).

```typescript
import { createWorld, appendChild, isLeaf } from 'blecsd';

const world = createWorld();
const parent = 1;
const child = 2;

isLeaf(world, parent); // true (no Hierarchy component = leaf)

appendChild(world, parent, child);

isLeaf(world, parent); // false (has children)
isLeaf(world, child);  // true (no children)
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity

**Returns:** true if entity has no children

---

### getDepth

Gets the depth of an entity in the tree.

```typescript
import { createWorld, appendChild, getDepth } from 'blecsd';

const world = createWorld();
const root = 1;
const child = 2;
const grandchild = 3;

appendChild(world, root, child);
appendChild(world, child, grandchild);

getDepth(world, root);       // 0 (root level)
getDepth(world, child);      // 1
getDepth(world, grandchild); // 2
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity

**Returns:** Tree depth (0 = root level)

---

### getNextSibling

Gets the next sibling of an entity.

```typescript
import { createWorld, appendChild, getNextSibling, NULL_ENTITY } from 'blecsd';

const world = createWorld();
const parent = 1;
const child1 = 2;
const child2 = 3;
const child3 = 4;

appendChild(world, parent, child1);
appendChild(world, parent, child2);
appendChild(world, parent, child3);

getNextSibling(world, child1); // 3
getNextSibling(world, child2); // 4
getNextSibling(world, child3); // 0 (NULL_ENTITY, no next sibling)

// Iterate through siblings
let current = child1;
while (current !== NULL_ENTITY) {
  console.log(`Sibling: ${current}`);
  current = getNextSibling(world, current);
}
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity

**Returns:** Next sibling entity or NULL_ENTITY (0)

---

### getPrevSibling

Gets the previous sibling of an entity.

```typescript
import { createWorld, appendChild, getPrevSibling, NULL_ENTITY } from 'blecsd';

const world = createWorld();
const parent = 1;
const child1 = 2;
const child2 = 3;
const child3 = 4;

appendChild(world, parent, child1);
appendChild(world, parent, child2);
appendChild(world, parent, child3);

getPrevSibling(world, child1); // 0 (NULL_ENTITY, no prev sibling)
getPrevSibling(world, child2); // 2
getPrevSibling(world, child3); // 3
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity

**Returns:** Previous sibling entity or NULL_ENTITY (0)

---

## Types

### HierarchyData

Data returned by getHierarchy.

```typescript
interface HierarchyData {
  readonly parent: Entity;      // Parent entity (0 = no parent)
  readonly firstChild: Entity;  // First child entity
  readonly nextSibling: Entity; // Next sibling entity
  readonly prevSibling: Entity; // Previous sibling entity
  readonly childCount: number;  // Number of direct children
  readonly depth: number;       // Tree depth (0 = root)
}
```

---

## Usage Examples

### Building a UI Layout Tree

```typescript
import { createWorld, appendChild, getChildren, getDepth } from 'blecsd';

const world = createWorld();

// Create entity IDs (in practice, use addEntity from bitecs)
const window = 1;
const header = 2;
const body = 3;
const footer = 4;
const title = 5;
const content = 6;

// Build the tree
appendChild(world, window, header);
appendChild(world, window, body);
appendChild(world, window, footer);
appendChild(world, header, title);
appendChild(world, body, content);

// Window
//   Header
//     Title
//   Body
//     Content
//   Footer

getDepth(world, window);  // 0
getDepth(world, header);  // 1
getDepth(world, title);   // 2
getDepth(world, content); // 2
```

### Traversing the Entire Tree

```typescript
import { createWorld, appendChild, getDescendants, getDepth } from 'blecsd';

const world = createWorld();
const root = 1;

// ... build tree ...

// Process all entities in depth-first order
for (const entity of getDescendants(world, root)) {
  const depth = getDepth(world, entity);
  const indent = '  '.repeat(depth);
  console.log(`${indent}Entity ${entity}`);
}
```

### Finding the Root of Any Entity

```typescript
import { createWorld, getAncestors } from 'blecsd';

function getRoot(world: World, eid: Entity): Entity {
  const ancestors = getAncestors(world, eid);
  return ancestors.length > 0 ? ancestors[ancestors.length - 1] : eid;
}
```

### Reparenting Entities

```typescript
import { createWorld, appendChild, setParent, getParent } from 'blecsd';

const world = createWorld();
const parent1 = 1;
const parent2 = 2;
const child = 3;

appendChild(world, parent1, child);
getParent(world, child); // 1

// Move child to a different parent
setParent(world, child, parent2);
getParent(world, child); // 2
```

---

## See Also

- [Components Reference](./components.md) - All component documentation
- [Entity Factories](./entities.md) - Creating entities with components
