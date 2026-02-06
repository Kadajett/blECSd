# Serialization API

ECS world state serialization and deserialization. Serialize world state to JSON and restore it, with support for component data, entity relationships, and custom serializers for complex data.

## Quick Start

```typescript
import {
  registerSerializable,
  serializeWorld,
  deserializeWorld,
  createWorld,
  Position,
} from 'blecsd';

// Register components for serialization
registerSerializable({ name: 'Position', store: Position });

// Serialize
const snapshot = serializeWorld(world);
const json = JSON.stringify(snapshot);

// Deserialize
const newWorld = createWorld();
const result = deserializeWorld(snapshot, newWorld);
console.log(`Restored ${result.entityCount} entities`);
```

## Types

### ComponentDescriptor

A registered component descriptor for serialization.

```typescript
interface ComponentDescriptor {
  readonly name: string;
  readonly store: Record<string, any>;
  readonly serialize?: (eid: Entity) => unknown;
  readonly deserialize?: (eid: Entity, data: unknown) => void;
}
```

### SerializedEntity

```typescript
interface SerializedEntity {
  readonly id: number;
  readonly components: Record<string, SerializedComponentData>;
}
```

### SerializedComponentData

```typescript
interface SerializedComponentData {
  readonly fields: Record<string, number>;
  readonly custom?: unknown;
}
```

### SerializedWorld

Complete serialized world snapshot.

```typescript
interface SerializedWorld {
  readonly version: number;
  readonly timestamp: number;
  readonly entities: readonly SerializedEntity[];
  readonly metadata?: Record<string, unknown>;
}
```

### SerializeOptions

```typescript
interface SerializeOptions {
  readonly entityFilter?: readonly Entity[];
  readonly componentFilter?: readonly string[];
  readonly metadata?: Record<string, unknown>;
}
```

### DeserializeOptions

```typescript
interface DeserializeOptions {
  readonly clearWorld?: boolean;   // default: false
  readonly createNew?: boolean;    // default: false
}
```

### DeserializeResult

```typescript
interface DeserializeResult {
  readonly world: World;
  readonly entityMap: ReadonlyMap<number, Entity>;
  readonly entityCount: number;
  readonly componentCount: number;
}
```

## Component Registry Functions

### registerSerializable

Registers a component for serialization.

```typescript
function registerSerializable(descriptor: ComponentDescriptor): void;
```

```typescript
import { registerSerializable, Position } from 'blecsd';

registerSerializable({ name: 'Position', store: Position });
```

### unregisterSerializable

Unregisters a component from serialization.

```typescript
function unregisterSerializable(name: string): boolean;
```

### getSerializable

Gets a registered component descriptor by name.

```typescript
function getSerializable(name: string): ComponentDescriptor | undefined;
```

### getRegisteredComponents

Gets all registered component names.

```typescript
function getRegisteredComponents(): readonly string[];
```

### clearSerializableRegistry

Clears all registered serializable components.

```typescript
function clearSerializableRegistry(): void;
```

## Serialization Functions

### serializeWorld

Serializes ECS world state to a snapshot object.

```typescript
function serializeWorld(world: World, options?: SerializeOptions): SerializedWorld;
```

### serializeWorldToJSON

Serializes ECS world state to a JSON string.

```typescript
function serializeWorldToJSON(world: World, options?: SerializeOptions): string;
```

### deserializeWorld

Deserializes a world snapshot back into an ECS world.

```typescript
function deserializeWorld(
  snapshot: SerializedWorld,
  world: World,
  options?: DeserializeOptions
): DeserializeResult;
```

### deserializeWorldFromJSON

Deserializes a JSON string back into an ECS world.

```typescript
function deserializeWorldFromJSON(
  json: string,
  world: World,
  options?: DeserializeOptions
): DeserializeResult;
```

### cloneSnapshot

Creates a deep clone of a serialized world snapshot.

```typescript
function cloneSnapshot(snapshot: SerializedWorld): SerializedWorld;
```

## Constants

### SERIALIZATION_VERSION

Current serialization format version (currently `1`).

## Usage Example

### Save/Load with Custom Serializers

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  registerSerializable,
  serializeWorldToJSON,
  deserializeWorldFromJSON,
  createWorld,
  addEntity,
  setPosition,
  Position,
} from 'blecsd';

// Register with custom serializer for non-typed-array data
registerSerializable({
  name: 'Position',
  store: Position,
});

registerSerializable({
  name: 'Inventory',
  store: Inventory,
  serialize: (eid) => getInventoryItems(eid),
  deserialize: (eid, data) => setInventoryItems(eid, data as Item[]),
});

// Create and populate world
const world = createWorld();
const player = addEntity(world);
setPosition(world, player, 100, 200);

// Save to JSON
const json = serializeWorldToJSON(world, {
  metadata: { levelName: 'forest', saveSlot: 1 },
});

// Load into new world
const newWorld = createWorld();
const result = deserializeWorldFromJSON(json, newWorld);

// Entity IDs may differ; use entityMap for relationship fixup
const newPlayerId = result.entityMap.get(player);

// Selective serialization
const partialJson = serializeWorldToJSON(world, {
  componentFilter: ['Position'],
  entityFilter: [player],
});
```
