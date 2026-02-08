# UserData Component API

Store arbitrary application-specific data on entities. Provides blessed-compatible `_data` storage for attaching custom metadata, state, or references to any entity.

## How do I store user data on an entity?

### setUserData

```typescript
import { setUserData } from 'blecsd';

setUserData(world, entity, {
  customId: 'player1',
  inventory: ['sword', 'shield'],
  stats: { hp: 100, mp: 50 }
});
```

**Parameters:** `world` (ECS world), `eid` (entity ID), `data` (object with any key-value pairs)

**Returns:** Entity ID for chaining

---

## How do I retrieve user data?

### getUserData

Get user data for an entity. Returns `undefined` if the entity has no user data.

```typescript
import { getUserData } from 'blecsd';

const data = getUserData(world, entity);
if (data) {
  console.log('Custom ID:', data.customId);
}
```

**Parameters:** `world` (ECS world), `eid` (entity ID)

**Returns:** User data object or `undefined`

### getOrCreateUserData

Get existing user data or create an empty object if none exists. Useful for lazy initialization.

```typescript
import { getOrCreateUserData } from 'blecsd';

const data = getOrCreateUserData(world, entity);
data.newProperty = 'value'; // Safe to assign
```

**Parameters:** `world` (ECS world), `eid` (entity ID)

**Returns:** User data object (existing or new)

---

## How do I check if an entity has user data?

### hasUserData

```typescript
import { hasUserData } from 'blecsd';

if (hasUserData(world, entity)) {
  console.log('Entity has custom data');
}
```

**Parameters:** `world` (ECS world), `eid` (entity ID)

**Returns:** `true` if the entity has user data

---

## How do I remove user data?

### removeUserData

```typescript
import { removeUserData } from 'blecsd';

removeUserData(world, entity);
```

**Parameters:** `world` (ECS world), `eid` (entity ID)

**Returns:** `true` if data was removed, `false` if entity had no data

---

## How do I clear all user data?

### clearAllUserData

Remove user data from all entities. Useful for testing or cleanup.

```typescript
import { clearAllUserData } from 'blecsd';

clearAllUserData();
```

### getUserDataCount

Get the total number of entities with user data. Useful for debugging and metrics.

```typescript
import { getUserDataCount } from 'blecsd';

console.log(`${getUserDataCount()} entities have user data`);
```

**Returns:** Number of entities with user data

---

## Types

### UserDataObject

```typescript
type UserDataObject = Record<string, unknown>;
```

Any object with string keys and any values.

---

## Common Patterns

### Entity Metadata

Store metadata that doesn't fit into components:

```typescript
const player = addEntity(world);

setUserData(world, player, {
  playerName: 'Alice',
  sessionId: 'abc-123',
  createdAt: new Date(),
  preferences: {
    difficulty: 'hard',
    soundEnabled: true
  }
});
```

### Cross-System References

Share data between systems without tight coupling:

```typescript
// System A stores a reference
const dialogEntity = addEntity(world);
setUserData(world, dialogEntity, {
  callbacks: {
    onConfirm: () => saveGame(),
    onCancel: () => closeDialog()
  }
});

// System B retrieves and uses it
const data = getUserData(world, dialogEntity);
if (data?.callbacks?.onConfirm) {
  data.callbacks.onConfirm();
}
```

### Temporary State

Store state that doesn't need a dedicated component:

```typescript
// During drag operation
setUserData(world, draggedEntity, {
  dragStartX: mouseX,
  dragStartY: mouseY,
  isDragging: true
});

// On drop
removeUserData(world, draggedEntity);
```

### Lazy Initialization

Initialize data only when needed:

```typescript
function getEntityCache(world: World, eid: Entity): Cache {
  const data = getOrCreateUserData(world, eid);

  if (!data.cache) {
    data.cache = new Map();
  }

  return data.cache as Cache;
}
```

---

## blessed.js Compatibility

In blessed.js, elements had `_data`, `__`, and `$` properties for user data. In blECSd:

```javascript
// blessed.js
element._data = { id: 'foo' };
element.__ = element._data;  // Alias
element.$ = element._data;   // Alias

// blECSd equivalent
setUserData(world, entity, { id: 'foo' });
const data = getUserData(world, entity);
```

The ECS approach provides:
- Type safety with TypeScript
- No property name conflicts
- Explicit get/set semantics
- Better memory management

---

## Performance Notes

- User data is stored in a `Map<Entity, UserDataObject>` for fast lookups
- Setting user data multiple times replaces the entire object (not merged)
- Remove user data when no longer needed to free memory
- Use `getUserDataCount()` to monitor memory usage

---

## See Also

- [Components](../../getting-started/components.md) - Understanding ECS components
- [Entity Data](../core/entity-data.md) - Alternative typed storage
