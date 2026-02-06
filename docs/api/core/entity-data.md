# Entity Data API

Arbitrary key-value data storage for entities. Store custom data on entities without creating new bitecs components. Useful for user-defined metadata, temporary state, or application-specific data.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import { setEntityData, getEntityData, hasEntityData } from 'blecsd';

// Store data on an entity
setEntityData(entity, 'name', 'Player 1');
setEntityData(entity, 'score', 100);

// Retrieve data
const name = getEntityData<string>(entity, 'name');
const score = getEntityData<number>(entity, 'score', 0);
```

## Types

### DataValue

```typescript
type DataValue = unknown;
```

### EntityDataMap

```typescript
type EntityDataMap = Map<string, DataValue>;
```

## Functions

### getEntityData

Gets a value stored on an entity.

```typescript
function getEntityData<T = DataValue>(eid: Entity, key: string, defaultValue?: T): T;
```

**Parameters:**
- `eid` - The entity ID
- `key` - The key to retrieve
- `defaultValue` - Default value if key doesn't exist

**Returns:** The stored value or defaultValue.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getEntityData } from 'blecsd';

const score = getEntityData<number>(entity, 'score', 0);
```

### setEntityData

Sets a value on an entity.

```typescript
function setEntityData(eid: Entity, key: string, value: DataValue): void;
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { setEntityData } from 'blecsd';

setEntityData(entity, 'name', 'Player 1');
setEntityData(entity, 'inventory', { gold: 100, items: [] });
setEntityData(entity, 'onDeath', () => console.log('Game over'));
```

### hasEntityData

Checks if an entity has data stored for a specific key.

```typescript
function hasEntityData(eid: Entity, key: string): boolean;
```

### deleteEntityData

Deletes a specific key from an entity's data.

```typescript
function deleteEntityData(eid: Entity, key: string): boolean;
```

### getEntityDataKeys

Gets all keys stored on an entity.

```typescript
function getEntityDataKeys(eid: Entity): string[];
```

### getAllEntityData

Gets all data stored on an entity as a plain object.

```typescript
function getAllEntityData(eid: Entity): Record<string, DataValue>;
```

### setEntityDataBulk

Sets multiple values on an entity at once.

```typescript
function setEntityDataBulk(eid: Entity, data: Record<string, DataValue>): void;
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { setEntityDataBulk } from 'blecsd';

setEntityDataBulk(entity, {
  name: 'Player 1',
  score: 0,
  lives: 3,
  powerups: [],
});
```

### clearEntityData

Clears all data stored on an entity.

```typescript
function clearEntityData(eid: Entity): void;
```

### clearAllEntityData

Clears all entity data from the global store.

```typescript
function clearAllEntityData(): void;
```

### getEntityDataCount

Gets the number of entities with stored data.

```typescript
function getEntityDataCount(): number;
```

### hasAnyEntityData

Checks if an entity has any data stored.

```typescript
function hasAnyEntityData(eid: Entity): boolean;
```

### updateEntityData

Updates a value on an entity using a transform function.

```typescript
function updateEntityData<T = DataValue>(
  eid: Entity,
  key: string,
  transform: (current: T | undefined) => T
): void;
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { updateEntityData } from 'blecsd';

// Increment score
updateEntityData<number>(entity, 'score', (current) => (current ?? 0) + 10);

// Toggle boolean
updateEntityData<boolean>(entity, 'visible', (current) => !current);

// Append to array
updateEntityData<string[]>(entity, 'items', (current) => [...(current ?? []), newItem]);
```

## Usage Example

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  setEntityData,
  getEntityData,
  setEntityDataBulk,
  updateEntityData,
  clearEntityData,
  getAllEntityData,
} from 'blecsd';

// Initialize player data
setEntityDataBulk(playerEntity, {
  name: 'Hero',
  hp: 100,
  maxHp: 100,
  inventory: [],
  buffs: [],
});

// Game logic
function takeDamage(entity: Entity, amount: number) {
  updateEntityData<number>(entity, 'hp', (hp) => Math.max(0, (hp ?? 0) - amount));

  if (getEntityData<number>(entity, 'hp', 0) <= 0) {
    handleDeath(entity);
  }
}

function collectItem(entity: Entity, item: string) {
  updateEntityData<string[]>(entity, 'inventory', (inv) => [...(inv ?? []), item]);
}

// Debug: inspect entity
const allData = getAllEntityData(playerEntity);
console.log(allData);

// Cleanup on entity destruction
clearEntityData(playerEntity);
```
