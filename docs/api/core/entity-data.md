# Entity Data API

Arbitrary key-value data storage for entities. Store custom data on entities without creating new bitecs components. Useful for user-defined metadata, temporary state, or application-specific data.

## Quick Start

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityData, getEntityData, hasEntityData } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
// Store data on an entity
setEntityData(world, entity, 'name', 'Player 1');
setEntityData(world, entity, 'score', 100);

// Retrieve data
const name = getEntityData<string>(world, entity, 'name');
const score = getEntityData<number>(world, entity, 'score', 0);
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

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `key` - The key to retrieve
- `defaultValue` - Default value if key doesn't exist

**Returns:** The stored value or defaultValue.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getEntityData } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const score = getEntityData<number>(world, entity, 'score', 0);
```

### setEntityData

Sets a value on an entity.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityData } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setEntityData(world, entity, 'name', 'Player 1');
setEntityData(world, entity, 'inventory', { gold: 100, items: [] });
setEntityData(world, entity, 'onDeath', () => console.log('Game over'));
```

### hasEntityData

Checks if an entity has data stored for a specific key.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityData, hasEntityData } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setEntityData(world, entity, 'name', 'Player');
const has = hasEntityData(world, entity, 'name'); // true
```

### deleteEntityData

Deletes a specific key from an entity's data.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityData, deleteEntityData } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setEntityData(world, entity, 'temp', 'value');
deleteEntityData(world, entity, 'temp');
```

### getEntityDataKeys

Gets all keys stored on an entity.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityData, getEntityDataKeys } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setEntityData(world, entity, 'name', 'Player');
const keys = getEntityDataKeys(world, entity); // ['name']
```

### getAllEntityData

Gets all data stored on an entity as a plain object.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityData, getAllEntityData } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setEntityData(world, entity, 'name', 'Player');
const allData = getAllEntityData(world, entity);
```

### setEntityDataBulk

Sets multiple values on an entity at once.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityDataBulk } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setEntityDataBulk(world, entity, {
  name: 'Player 1',
  score: 0,
  lives: 3,
  powerups: [],
});
```

### clearEntityData

Clears all data stored on an entity.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityData, clearEntityData } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setEntityData(world, entity, 'name', 'Player');
clearEntityData(world, entity);
```

### clearAllEntityData

Clears all entity data from the global store.

```typescript
import { clearAllEntityData } from 'blecsd/core';

clearAllEntityData();
```

### getEntityDataCount

Gets the number of entities with stored data.

```typescript
import { getEntityDataCount } from 'blecsd/core';

const count = getEntityDataCount();
```

### hasAnyEntityData

Checks if an entity has any data stored.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityData, hasAnyEntityData } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
setEntityData(world, entity, 'name', 'Player');
const hasData = hasAnyEntityData(world, entity); // true
```

### updateEntityData

Updates a value on an entity using a transform function.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setEntityData, updateEntityData } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const newItem = 'sword';
setEntityData(world, entity, 'score', 0);
// Increment score
updateEntityData<number>(world, entity, 'score', (current) => (current ?? 0) + 10);

// Toggle boolean
updateEntityData<boolean>(world, entity, 'visible', (current) => !current);

// Append to array
updateEntityData<string[]>(world, entity, 'items', (current) => [...(current ?? []), newItem]);
```

## Usage Example

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  setEntityData,
  getEntityData,
  setEntityDataBulk,
  updateEntityData,
  clearEntityData,
  getAllEntityData,
} from 'blecsd/core';

const world = createWorld();
const playerEntity = addEntity(world);

// Initialize player data
setEntityDataBulk(world, playerEntity, {
  name: 'Hero',
  hp: 100,
  maxHp: 100,
  inventory: [],
  buffs: [],
});

// Game logic
function takeDamage(eid: number, amount: number) {
  updateEntityData<number>(world, eid, 'hp', (hp) => Math.max(0, (hp ?? 0) - amount));

  if (getEntityData<number>(world, eid, 'hp', 0) <= 0) {
    console.log('Entity died');
  }
}

function collectItem(eid: number, item: string) {
  updateEntityData<string[]>(world, eid, 'inventory', (inv) => [...(inv ?? []), item]);
}

takeDamage(playerEntity, 10);
collectItem(playerEntity, 'sword');

// Debug: inspect entity
const allData = getAllEntityData(world, playerEntity);
console.log(allData);

// Cleanup on entity destruction
clearEntityData(world, playerEntity);
```
