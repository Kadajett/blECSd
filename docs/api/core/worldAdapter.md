# World Adapter

World adapters let you customize how systems query entities without exposing the underlying ECS implementation. This is the entry point for packed-store backends or precomputed render lists.

## Overview

World adapters are registered per world. If no adapter is registered, the default adapter uses `bitecs` queries internally.

## API

### `createWorldAdapter`

Creates an adapter by overriding default behavior.

```typescript
import { createWorldAdapter, setWorldAdapter } from 'blecsd';

const renderables: number[] = [];
const adapter = createWorldAdapter({
  type: 'custom',
  queryRenderables: () => renderables,
});

setWorldAdapter(world, adapter);
```

### `setWorldAdapter`

Registers a world adapter for a specific world.

```typescript
import { createWorld, createWorldAdapter, setWorldAdapter } from 'blecsd';

const world = createWorld();
const adapter = createWorldAdapter();
setWorldAdapter(world, adapter);
```

### `getWorldAdapter`

Gets the adapter for a world (falls back to default).

```typescript
import { getWorldAdapter } from 'blecsd';

const adapter = getWorldAdapter(world);
const entities = adapter.queryRenderables(world);
```

### `clearWorldAdapter`

Removes any custom adapter and restores the default.

```typescript
import { clearWorldAdapter } from 'blecsd';

clearWorldAdapter(world);
```

## Types

### `WorldAdapter`

```typescript
interface WorldAdapter {
  readonly type: 'bitecs' | 'custom';
  readonly queryRenderables: (world: World) => readonly Entity[];
}
```

## Notes

- The adapter currently only customizes renderable queries. Additional hooks will be added as packed-store migration proceeds.
- Adapters should return stable arrays when possible to reduce per-frame allocations.
