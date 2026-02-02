# Layout System

The layout system computes absolute positions and dimensions for all entities in tree order. It runs in the LAYOUT phase before rendering to pre-compute positions based on hierarchy, relative positioning, and percentage dimensions.

## Overview

The layout system:
- Computes absolute screen positions from relative parent offsets
- Resolves percentage dimensions against parent containers
- Respects min/max dimension constraints
- Processes entities in tree order (parents before children)
- Stores results in the ComputedLayout component for efficient rendering

## Basic Usage

```typescript
import { createScheduler, LoopPhase, layoutSystem } from 'blecsd';

const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);

// In game loop
scheduler.run(world, deltaTime);
```

## Computed Layout Component

After the layout system runs, each entity with a Position component has computed layout data:

```typescript
import { getComputedLayout, hasComputedLayout } from 'blecsd';

// Check if layout is computed
if (hasComputedLayout(world, entity)) {
  const layout = getComputedLayout(world, entity);
  console.log(`Position: (${layout?.x}, ${layout?.y})`);
  console.log(`Size: ${layout?.width}x${layout?.height}`);
}
```

## Positioning Modes

### Relative Positioning (Default)

Child positions are relative to their parent:

```typescript
import { setPosition, setDimensions, appendChild } from 'blecsd';

const parent = addEntity(world);
setPosition(world, parent, 10, 5);  // At (10, 5)
setDimensions(world, parent, 40, 20);

const child = addEntity(world);
setPosition(world, child, 5, 3);   // 5 right, 3 down from parent
setDimensions(world, child, 10, 5);
appendChild(world, parent, child);

// After layout: parent at (10, 5), child at (15, 8)
```

### Absolute Positioning

Entities can use absolute screen coordinates:

```typescript
import { setPosition, setAbsolute } from 'blecsd';

const overlay = addEntity(world);
setPosition(world, overlay, 50, 10);
setAbsolute(world, overlay, true);  // Uses screen coordinates directly

// Always at (50, 10) regardless of parent
```

## Percentage Dimensions

Dimensions can be specified as percentages of the parent container:

```typescript
import { setDimensions } from 'blecsd';

// 50% of parent width, fixed 10 height
setDimensions(world, entity, '50%', 10);

// Full parent width, 25% of parent height
setDimensions(world, entity, '100%', '25%');

// Auto (content-based) width
setDimensions(world, entity, 'auto', 10);
```

## Dimension Constraints

Set min/max constraints on dimensions:

```typescript
import { setDimensions, setConstraints } from 'blecsd';

setDimensions(world, entity, '100%', '100%');
setConstraints(world, entity, {
  minWidth: 20,
  maxWidth: 100,
  minHeight: 5,
  maxHeight: 30,
});
```

## Invalidating Layout

When positions or dimensions change outside the normal flow:

```typescript
import { invalidateLayout, invalidateAllLayouts } from 'blecsd';

// Invalidate single entity
invalidateLayout(world, entity);

// Invalidate all entities (after screen resize)
invalidateAllLayouts(world);
```

## On-Demand Layout Computation

Compute layout for a single entity immediately:

```typescript
import { computeLayoutNow, getComputedBounds } from 'blecsd';

// Compute layout for entity (and parents if needed)
const layout = computeLayoutNow(world, entity);
if (layout) {
  console.log(`Computed: (${layout.x}, ${layout.y}) ${layout.width}x${layout.height}`);
}

// Get bounding rectangle
const bounds = getComputedBounds(world, entity);
if (bounds) {
  console.log(`Bounds: (${bounds.left}, ${bounds.top}) to (${bounds.right}, ${bounds.bottom})`);
}
```

## Integration with Screen

The layout system uses the Screen entity's dimensions as the root container:

```typescript
import { createScreenEntity } from 'blecsd';

// Screen dimensions define the root container size
createScreenEntity(world, { width: 80, height: 24 });

// Root entities use screen as their container
const panel = addEntity(world);
setDimensions(world, panel, '100%', '100%');  // Full screen
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `layoutSystem(world)` | Main layout system (register with scheduler) |
| `createLayoutSystem()` | Factory function returning layoutSystem |
| `getComputedLayout(world, eid)` | Get computed layout data |
| `hasComputedLayout(world, eid)` | Check if entity has valid computed layout |
| `invalidateLayout(world, eid)` | Mark entity's layout for recalculation |
| `invalidateAllLayouts(world)` | Mark all layouts for recalculation |
| `computeLayoutNow(world, eid)` | Compute layout for single entity immediately |
| `getComputedBounds(world, eid)` | Get bounding rectangle in screen coords |

### ComputedLayout Component

```typescript
interface ComputedLayoutData {
  readonly x: number;       // Absolute X position (screen column)
  readonly y: number;       // Absolute Y position (screen row)
  readonly width: number;   // Computed width in cells
  readonly height: number;  // Computed height in cells
}
```

### ComputedLayout Component Store

```typescript
const ComputedLayout = {
  x: Float32Array,       // Absolute X position
  y: Float32Array,       // Absolute Y position
  width: Float32Array,   // Computed width
  height: Float32Array,  // Computed height
  valid: Uint8Array,     // 0 = needs recompute, 1 = valid
};
```

## Performance Tips

1. **Minimize layout invalidations** - batch changes before running layout
2. **Use the system** rather than `computeLayoutNow` for multiple entities
3. **Set constraints** to prevent expensive content-size calculations
4. **Avoid deep nesting** - flatter hierarchies compute faster

## See Also

- [Position Component](../position.md) - Position and z-index
- [Dimensions Component](../dimensions.md) - Size and constraints
- [Hierarchy Component](../hierarchy.md) - Parent/child relationships
- [Render System](./render.md) - Rendering after layout
