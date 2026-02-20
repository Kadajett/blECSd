# Serialization API

ECS world state serialization and deserialization. Serialize world state to JSON and restore it, with support for component data, entity relationships, and custom serializers for complex data.

## Quick Start

```typescript
import { createWorld, serializeWorld, deserializeWorld } from 'blecsd/core';

const world = createWorld();

// Serialize world to snapshot (with no extra components)
const snapshot = serializeWorld(world, []);
const json = JSON.stringify(snapshot);
console.log(`Snapshot has ${snapshot.entityCount} entities`);

// Deserialize into a new world
const parsed = JSON.parse(json);
const newWorld = deserializeWorld(parsed);
console.log('Restored world entity count:', newWorld.entityCount);
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

### registerComponents

Registers components for serialization. Each descriptor needs `name`, `component` (bitecs component), and `fields`.

```typescript
import { registerComponents, getRegisteredComponents } from 'blecsd/core';

// Register custom components for serialization
// (component and fields are specific to each component's bitecs definition)
// Example: registerComponents([{ name: 'Position', component: PositionComponent, fields: ['x', 'y'] }])

const registered = getRegisteredComponents();
console.log('Registered components:', registered.length);
```

## Serialization Functions

### serializeWorld

Serializes ECS world state to a snapshot object. Pass an array of registered component descriptors as the second argument.

```typescript
import { createWorld, serializeWorld } from 'blecsd/core';

const world = createWorld();

// Serialize with no components (basic entity snapshot)
const snapshot = serializeWorld(world, []);
console.log('Snapshot entity count:', snapshot.entityCount);
```

### deserializeWorld

Deserializes a world snapshot back into an ECS world.

```typescript
import { createWorld, serializeWorld, deserializeWorld } from 'blecsd/core';

const world = createWorld();
const snapshot = serializeWorld(world, []);

// Deserialize creates a new world from the snapshot
const restored = deserializeWorld(snapshot);
console.log('Restored entity count:', restored.entityCount);
```

### Snapshot Round-Trip

```typescript
import { createWorld, serializeWorld, deserializeWorld } from 'blecsd/core';

const world = createWorld();

// Save to JSON
const snapshot = serializeWorld(world, []);
const json = JSON.stringify(snapshot);

// Restore from JSON
const parsed = JSON.parse(json);
const restored = deserializeWorld(parsed);
console.log(`Restored world with ${restored.entityCount} entities`);
```

## Constants

### SERIALIZATION_VERSION

Current serialization format version (currently `1`).

## Related

- [World](./world.md) - World creation and management
- [ECS](./ecs.md) - Core ECS primitives
