# Zod Validation Schemas

blECSd uses [Zod](https://zod.dev) for runtime validation of configuration objects, ensuring type safety at system boundaries.

---

## Overview

All blECSd configuration objects have corresponding Zod schemas for validation. This provides:

- **Runtime type safety** - Catch configuration errors at runtime
- **Clear error messages** - Zod provides detailed validation errors
- **Type inference** - TypeScript types can be inferred from schemas
- **Documentation** - Schemas serve as machine-readable API contracts

**Usage Pattern:**
```typescript
import { WorkerPoolConfigSchema } from 'blecsd';

const config = {
  maxWorkers: 4,
  taskTimeout: 5000
};

// Validate config
const result = WorkerPoolConfigSchema.safeParse(config);
if (!result.success) {
  console.error('Invalid config:', result.error);
} else {
  // Config is validated and typed
  useConfig(result.data);
}
```

---

## Core Schemas

### TabSizeSchema

Validates tab character width in text content (1-16 spaces).

```typescript
import { TabSizeSchema } from 'blecsd';

const tabSize = 4;
const validated = TabSizeSchema.parse(tabSize);
```

**Schema:** `z.number().int().min(1).max(16)`

**Valid range:** 1-16 (inclusive)

**See:** [Tab Size API](/docs/api/text/tab-size.md)

---

## System Configuration Schemas

### WorkerPoolConfigSchema

Configuration for worker pool system.

```typescript
import { WorkerPoolConfigSchema } from 'blecsd';

const config = {
  maxWorkers: 4,
  taskTimeout: 5000,
  retryAttempts: 3
};

const validated = WorkerPoolConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  maxWorkers: z.number().int().positive().max(16).optional(),
  taskTimeout: z.number().int().positive().optional(),
  retryAttempts: z.number().int().nonnegative().optional()
})
```

**Fields:**
- `maxWorkers` - Maximum worker threads (1-16, default: CPU cores)
- `taskTimeout` - Task timeout in milliseconds (default: 30000)
- `retryAttempts` - Retry attempts on failure (default: 3)

---

### FrameBudgetConfigSchema

Configuration for frame budget system (frame time limiting).

```typescript
import { FrameBudgetConfigSchema } from 'blecsd';

const config = {
  targetFPS: 60,
  maxFrameTime: 16.67,
  enabled: true
};

const validated = FrameBudgetConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  targetFPS: z.number().positive().max(240).optional(),
  maxFrameTime: z.number().positive().optional(),
  enabled: z.boolean().optional()
})
```

**Fields:**
- `targetFPS` - Target frames per second (1-240, default: 60)
- `maxFrameTime` - Maximum frame time in milliseconds (default: 16.67)
- `enabled` - Whether frame budget is enabled (default: true)

---

### BehaviorSystemConfigSchema

Configuration for behavior tree system.

```typescript
import { BehaviorSystemConfigSchema } from 'blecsd';

const config = {
  maxDepth: 10,
  ticksPerFrame: 1,
  enableProfiling: false
};

const validated = BehaviorSystemConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  maxDepth: z.number().int().positive().optional(),
  ticksPerFrame: z.number().int().positive().optional(),
  enableProfiling: z.boolean().optional()
})
```

**Fields:**
- `maxDepth` - Maximum behavior tree depth (default: 10)
- `ticksPerFrame` - Behavior tree ticks per frame (default: 1)
- `enableProfiling` - Enable performance profiling (default: false)

---

### SpatialHashConfigSchema

Configuration for spatial hash collision system.

```typescript
import { SpatialHashConfigSchema } from 'blecsd';

const config = {
  cellSize: 32,
  worldBounds: {
    minX: 0, minY: 0,
    maxX: 1000, maxY: 1000
  }
};

const validated = SpatialHashConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  cellSize: z.number().positive().optional(),
  worldBounds: z.object({
    minX: z.number(),
    minY: z.number(),
    maxX: z.number(),
    maxY: z.number()
  }).optional()
})
```

**Fields:**
- `cellSize` - Spatial hash cell size in pixels (default: 64)
- `worldBounds` - World boundary coordinates (optional)

---

### ParticleSystemConfigSchema

Configuration for particle system.

```typescript
import { ParticleSystemConfigSchema } from 'blecsd';

const config = {
  maxParticles: 1000,
  emissionRate: 10,
  gravity: { x: 0, y: 9.8 }
};

const validated = ParticleSystemConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  maxParticles: z.number().int().positive().optional(),
  emissionRate: z.number().positive().optional(),
  gravity: z.object({
    x: z.number(),
    y: z.number()
  }).optional()
})
```

**Fields:**
- `maxParticles` - Maximum active particles (default: 1000)
- `emissionRate` - Particles emitted per second (default: 10)
- `gravity` - Gravity vector (default: { x: 0, y: 0 })

---

### ScrollPhysicsConfigSchema

Configuration for smooth scroll physics.

```typescript
import { ScrollPhysicsConfigSchema } from 'blecsd';

const config = {
  friction: 0.9,
  springStrength: 0.1,
  velocityThreshold: 0.1
};

const validated = ScrollPhysicsConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  friction: z.number().min(0).max(1).optional(),
  springStrength: z.number().min(0).max(1).optional(),
  velocityThreshold: z.number().positive().optional()
})
```

**Fields:**
- `friction` - Friction coefficient (0-1, default: 0.9)
- `springStrength` - Spring force strength (0-1, default: 0.1)
- `velocityThreshold` - Minimum velocity before stopping (default: 0.1)

---

### PanelMoveConfigSchema

Configuration for panel movement system.

```typescript
import { PanelMoveConfigSchema } from 'blecsd';

const config = {
  dragThreshold: 5,
  snapToGrid: true,
  gridSize: 8
};

const validated = PanelMoveConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  dragThreshold: z.number().int().nonnegative().optional(),
  snapToGrid: z.boolean().optional(),
  gridSize: z.number().int().positive().optional()
})
```

**Fields:**
- `dragThreshold` - Minimum drag distance in pixels (default: 5)
- `snapToGrid` - Enable grid snapping (default: false)
- `gridSize` - Grid size in pixels (default: 8)

---

## Widget Configuration Schemas

### LineRenderConfigSchema

Configuration for virtualized line rendering.

```typescript
import { LineRenderConfigSchema } from 'blecsd';

const config = {
  defaultChar: ' ',
  defaultFg: 0xffffff,
  defaultBg: 0x000000,
  defaultAttrs: 0
};

const validated = LineRenderConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  defaultChar: z.string().length(1).optional(),
  defaultFg: z.number().int().min(0).max(0xffffffff).optional(),
  defaultBg: z.number().int().min(0).max(0xffffffff).optional(),
  defaultAttrs: z.number().int().min(0).max(0xffff).optional()
})
```

**Fields:**
- `defaultChar` - Default character (default: ' ')
- `defaultFg` - Default foreground color (default: 0xffffff)
- `defaultBg` - Default background color (default: 0x000000)
- `defaultAttrs` - Default text attributes (default: 0)

---

## Terminal Schemas

### ClipboardManagerConfigSchema

Configuration for clipboard manager.

```typescript
import { ClipboardManagerConfigSchema } from 'blecsd';

const config = {
  maxSize: 10 * 1024 * 1024,  // 10 MB
  timeout: 5000
};

const validated = ClipboardManagerConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  maxSize: z.number().int().positive().optional(),
  timeout: z.number().int().positive().optional()
})
```

**Fields:**
- `maxSize` - Maximum clipboard size in bytes (default: 10MB)
- `timeout` - Operation timeout in milliseconds (default: 5000)

---

### HoverTextConfigSchema

Configuration for hover text tooltips.

```typescript
import { HoverTextConfigSchema } from 'blecsd';

const config = {
  delay: 500,
  duration: 3000,
  offset: { x: 0, y: 1 }
};

const validated = HoverTextConfigSchema.parse(config);
```

**Schema:**
```typescript
z.object({
  delay: z.number().int().nonnegative().optional(),
  duration: z.number().int().positive().optional(),
  offset: z.object({
    x: z.number().int(),
    y: z.number().int()
  }).optional()
})
```

**Fields:**
- `delay` - Hover delay before showing tooltip (default: 500ms)
- `duration` - Tooltip display duration (default: 3000ms, 0 for infinite)
- `offset` - Tooltip offset from target (default: { x: 0, y: 1 })

---

## Event Schemas

### WarningEventSchema

Schema for warning event validation.

```typescript
import { WarningEventSchema } from 'blecsd';

const event = {
  type: 'terminal-too-small',
  message: 'Terminal is too small',
  metadata: { width: 40, height: 15, minWidth: 80, minHeight: 24 },
  timestamp: Date.now()
};

const validated = WarningEventSchema.parse(event);
```

**See:** [Warning Events](/docs/api/events.md#warning-events)

---

### EmitDescendantsOptionsSchema

Schema for emitDescendants options validation.

```typescript
import { EmitDescendantsOptionsSchema } from 'blecsd';

const options = {
  maxDepth: 5,
  includeRoot: true
};

const validated = EmitDescendantsOptionsSchema.parse(options);
```

**See:** [Event Bubbling - emitDescendants](/docs/api/core/event-bubbling.md#emitdescendants)

---

## Using Schemas

### Basic Validation

```typescript
import { WorkerPoolConfigSchema } from 'blecsd';

const config = {
  maxWorkers: 4,
  taskTimeout: 5000
};

// Throws ZodError if invalid
const validated = WorkerPoolConfigSchema.parse(config);

// Safe parsing (returns result object)
const result = WorkerPoolConfigSchema.safeParse(config);
if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Errors:', result.error.errors);
}
```

---

### Partial Validation

Many schemas accept optional fields:

```typescript
import { FrameBudgetConfigSchema } from 'blecsd';

// All fields optional
const minimal = {};
const validated = FrameBudgetConfigSchema.parse(minimal);
// Uses defaults

// Partial config
const partial = { targetFPS: 30 };
const validated2 = FrameBudgetConfigSchema.parse(partial);
// Other fields use defaults
```

---

### Type Inference

Infer TypeScript types from schemas:

```typescript
import { WorkerPoolConfigSchema } from 'blecsd';
import type { z } from 'zod';

type WorkerPoolConfig = z.infer<typeof WorkerPoolConfigSchema>;
// Equivalent to:
// {
//   maxWorkers?: number;
//   taskTimeout?: number;
//   retryAttempts?: number;
// }
```

---

### Error Handling

```typescript
import { ParticleSystemConfigSchema } from 'blecsd';
import { ZodError } from 'zod';

try {
  const config = ParticleSystemConfigSchema.parse({
    maxParticles: -100  // Invalid!
  });
} catch (err) {
  if (err instanceof ZodError) {
    console.error('Validation errors:');
    for (const issue of err.errors) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
  }
}
```

---

### Custom Validation

Extend schemas with additional validation:

```typescript
import { FrameBudgetConfigSchema } from 'blecsd';
import { z } from 'zod';

const ExtendedSchema = FrameBudgetConfigSchema.extend({
  onFrameDrop: z.function().optional()
}).refine(
  (config) => {
    // Custom validation logic
    if (config.targetFPS && config.maxFrameTime) {
      return config.maxFrameTime <= 1000 / config.targetFPS;
    }
    return true;
  },
  {
    message: 'maxFrameTime must be <= 1000/targetFPS'
  }
);
```

---

### Async Validation

For async validation (e.g., checking file existence):

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  configPath: z.string()
}).refine(
  async (data) => {
    // Async validation
    const exists = await fileExists(data.configPath);
    return exists;
  },
  {
    message: 'Config file does not exist'
  }
);

// Use parseAsync
const validated = await ConfigSchema.parseAsync(config);
```

---

## Schema List

| Schema | Module | Purpose |
|--------|--------|---------|
| `TabSizeSchema` | `blecsd` | Tab size validation (1-16) |
| `WorkerPoolConfigSchema` | `blecsd/systems` | Worker pool configuration |
| `FrameBudgetConfigSchema` | `blecsd/systems` | Frame budget configuration |
| `BehaviorSystemConfigSchema` | `blecsd/systems` | Behavior tree configuration |
| `SpatialHashConfigSchema` | `blecsd/systems` | Spatial hash configuration |
| `ParticleSystemConfigSchema` | `blecsd/systems` | Particle system configuration |
| `ScrollPhysicsConfigSchema` | `blecsd/systems` | Scroll physics configuration |
| `PanelMoveConfigSchema` | `blecsd/systems` | Panel movement configuration |
| `LineRenderConfigSchema` | `blecsd/systems` | Virtualized rendering configuration |
| `ClipboardManagerConfigSchema` | `blecsd/terminal` | Clipboard manager configuration |
| `HoverTextConfigSchema` | `blecsd/widgets` | Hover text configuration |
| `WarningEventSchema` | `blecsd` | Warning event validation |
| `EmitDescendantsOptionsSchema` | `blecsd` | Emit descendants options |

---

## See Also

- [Zod Documentation](https://zod.dev) - Zod library documentation
- [Configuration](/docs/guides/configuration.md) - Configuration guide
- [Type Safety](/docs/guides/typescript.md) - TypeScript usage guide
