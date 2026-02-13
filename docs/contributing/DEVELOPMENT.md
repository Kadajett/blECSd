# Development Guide

This guide covers setting up and working with the blECSd codebase.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+ (package manager)
- **Git** 2.30+

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Kadajett/blECSd.git
cd blECSd

# Install dependencies
pnpm install

# Build the library
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint
```

## Project Structure

```
blessed/
├── src/                    # Source code
│   ├── core/               # Core systems (world, scheduler, events)
│   ├── terminal/           # Terminal I/O (program, input, renderer)
│   ├── components/         # ECS components (position, renderable, etc.)
│   ├── systems/            # ECS systems (animation, layout, render)
│   ├── widgets/            # High-level widgets (box, panel, list, etc.)
│   ├── schemas/            # Zod validation schemas
│   └── index.ts            # Public API exports
├── docs/                   # Documentation
│   ├── api/                # API reference
│   ├── guides/             # How-to guides
│   ├── tutorials/          # Step-by-step tutorials
│   └── contributing/       # Contributor guides
├── tests/                  # Test files (mirrors src/ structure)
├── package.json
├── tsconfig.json
├── biome.json              # Linter/formatter config
└── vitest.config.ts        # Test config
```

## Development Commands

### Build

```bash
pnpm build          # Production build
pnpm build:watch    # Watch mode for development
```

### Testing

```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
pnpm test:coverage  # Coverage report
pnpm test:ui        # Visual test UI
```

### Linting & Formatting

```bash
pnpm lint           # Check for issues
pnpm lint:fix       # Auto-fix issues
pnpm format         # Format code
```

### Type Checking

```bash
pnpm typecheck      # Run TypeScript compiler
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout main
git pull
git checkout -b feature/my-feature
```

### 2. Make Changes

Edit source files in `src/`. The codebase follows these principles:

- **Functional programming**: No classes, pure functions only
- **ECS architecture**: Data in components, logic in systems
- **Library-first**: Everything works standalone, no forced patterns

### 3. Write Tests

Add tests in the corresponding location under `tests/` or as `.test.ts` files alongside the source:

```typescript
// src/components/position.test.ts
import { describe, it, expect } from 'vitest';
import { setPosition, getPosition } from './position';
import { createWorld, addEntity } from 'blecsd';

describe('Position component', () => {
  it('sets and gets position', () => {
    const world = createWorld();
    const eid = addEntity(world);

    setPosition(world, eid, 10, 20);
    const pos = getPosition(world, eid);

    expect(pos.x).toBe(10);
    expect(pos.y).toBe(20);
  });
});
```

### 4. Run Checks

Before committing, ensure everything passes:

```bash
pnpm test && pnpm lint && pnpm typecheck && pnpm build
```

### 5. Commit

Write clear commit messages:

```bash
git add .
git commit -m "feat: add horizontal slider orientation"
```

### 6. Push & PR

```bash
git push -u origin feature/my-feature
```

Then open a pull request on GitHub.

## Working with ECS

### Creating a Component

Components are data containers defined with bitecs:

```typescript
// src/components/myComponent.ts
import { defineComponent, Types } from 'blecsd';

/** Default capacity for component stores */
const DEFAULT_CAPACITY = 10000;

/**
 * MyComponent stores example data.
 */
export const MyComponent = {
  /** First value */
  value1: new Float32Array(DEFAULT_CAPACITY),
  /** Second value */
  value2: new Uint32Array(DEFAULT_CAPACITY),
};

/**
 * Sets MyComponent values on an entity.
 */
export function setMyComponent(
  world: World,
  eid: Entity,
  value1: number,
  value2: number
): void {
  MyComponent.value1[eid] = value1;
  MyComponent.value2[eid] = value2;
}

/**
 * Gets MyComponent values from an entity.
 */
export function getMyComponent(
  world: World,
  eid: Entity
): { value1: number; value2: number } {
  return {
    value1: MyComponent.value1[eid],
    value2: MyComponent.value2[eid],
  };
}
```

### Creating a System

Systems are functions that process entities:

```typescript
// src/systems/mySystem.ts
import { defineQuery, hasComponent } from 'blecsd';
import { MyComponent } from '../components/myComponent';
import { Position } from '../components/position';

/** Query for entities with both components */
const myQuery = defineQuery([MyComponent, Position]);

/**
 * MySystem processes entities with MyComponent and Position.
 */
export function mySystem(world: World): World {
  const entities = myQuery(world);

  for (const eid of entities) {
    // Read component data
    const value = MyComponent.value1[eid];

    // Update based on logic
    Position.x[eid] += value;
  }

  return world;
}
```

### Creating a Widget

Widgets are factory functions that create configured entities:

```typescript
// src/widgets/myWidget.ts
import { addEntity } from 'blecsd';
import { setPosition } from '../components/position';
import { setDimensions } from '../components/dimensions';
import { setBorder } from '../components/border';

export interface MyWidgetConfig {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
}

export interface MyWidget {
  readonly eid: Entity;
  show(): MyWidget;
  hide(): MyWidget;
  destroy(): void;
}

export function createMyWidget(
  world: World,
  entity: Entity,
  config: MyWidgetConfig = {}
): MyWidget {
  const eid = entity;

  // Set up components
  setPosition(world, eid, config.x ?? 0, config.y ?? 0);
  setDimensions(world, eid, config.width ?? 10, config.height ?? 5);
  setBorder(world, eid, 'single');

  // Return widget interface
  return {
    eid,
    show() {
      setVisible(world, eid, true);
      return this;
    },
    hide() {
      setVisible(world, eid, false);
      return this;
    },
    destroy() {
      removeEntity(world, eid);
    },
  };
}
```

## Examples

Examples are maintained in a separate repository: [blECSd-Examples](https://github.com/Kadajett/blECSd-Examples).

To contribute a new example, open a PR against that repository.

## Debugging

### VS Code

The project includes VS Code launch configurations:

1. Open the project in VS Code
2. Go to Run and Debug (Ctrl+Shift+D)
3. Select a configuration and press F5

### Console Logging

For terminal output during development:

```typescript
// Write to stderr to avoid interfering with terminal output
console.error('Debug:', value);

// Or use a debug flag
if (process.env.DEBUG) {
  console.error('Debug:', value);
}
```

### Inspecting ECS State

```typescript
import { getAllEntities } from 'blecsd';
import { Position } from './components/position';

function debugWorld(world: World): void {
  const entities = getAllEntities(world);
  console.error(`Total entities: ${entities.length}`);

  for (const eid of entities.slice(0, 10)) {
    console.error(`Entity ${eid}: x=${Position.x[eid]}, y=${Position.y[eid]}`);
  }
}
```

## Performance Testing

### Benchmarks

Run performance benchmarks:

```bash
pnpm bench
```

### Profiling

For CPU profiling:

```bash
node --prof dist/index.js
node --prof-process isolate-*.log > profile.txt
```

## Common Issues

### "Cannot find module 'blecsd'"

Run `pnpm build` first. The library needs to be built before examples can import it.

### Tests Fail with Timeout

Terminal tests may need longer timeouts. Increase in the test file:

```typescript
it('handles large input', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Biome Formatting Conflicts

Run `pnpm lint:fix` to auto-fix most issues. For persistent conflicts, check `biome.json` configuration.

## Resources

- [bitecs Documentation](https://github.com/NateTheGreatt/bitECS)
- [Zod Documentation](https://zod.dev)
- [Vitest Documentation](https://vitest.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
