# blECSd Terminal UI Library

> **Note:** This library is being renamed from "blessed" to "blECSd" to reflect its ECS-first architecture and distinguish it from the original blessed library.

## Project Overview

This is a rewrite of the 11-year-old blessed node library into a modern, high-performance terminal UI library. blECSd uses an Entity Component System (ECS) architecture that enables building everything from simple CLI tools to complex dashboards to terminal games.

**This is NOT a backwards-compatible rewrite.** We are building a new library inspired by blessed's architecture.

### Why ECS for Terminal UIs?

ECS provides significant advantages for terminal applications:

- **Performance**: Structure-of-Arrays layout enables efficient batch processing of thousands of UI elements
- **Composition**: Build complex UIs by combining simple components rather than deep inheritance hierarchies
- **Flexibility**: Same architecture scales from a simple menu to a full IDE or game
- **Testability**: Pure functions operating on data are trivial to unit test

## Core Technologies

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Strict types everywhere (`strict: true`, `noUncheckedIndexedAccess: true`) |
| **bitecs** | Entity Component System for high-performance UI state management |
| **Zod** | Runtime validation for configuration, input, and data boundaries |
| **Biome** | Linting and formatting |
| **Vitest** | Testing framework |

## Architecture Principles

### Library-First Design (HARD REQUIREMENT)

**blECSd is a library, not a framework.** Users must be able to:

1. **Use components standalone** - Import Position, Renderable, etc. into their own bitecs world
2. **Skip the built-in update loop** - All systems are callable functions, not loop-dependent
3. **Mix and match** - Use our input parsing but their own rendering, or vice versa
4. **Control the world** - All functions take `world` as a parameter; we never own a global world

```typescript
// This must always work - user's loop, our components
import { createWorld, addEntity, setPosition, setRenderable } from 'blecsd';

const world = createWorld();  // User's world
const eid = addEntity(world);
setPosition(world, eid, 10, 5);  // Works without our update loop
```

**Never create implicit dependencies on the update loop.** Systems should be pure functions that transform world state.

### No Direct bitecs Imports (HARD REQUIREMENT)

**All ECS primitives must be imported from `'blecsd'`, never directly from `'bitecs'`.**

The only files allowed to import from `'bitecs'` are:
- `src/core/ecs.ts` - The ECS wrapper module
- `src/core/world.ts` - World creation utilities
- `src/core/types.ts` - Type definitions

All other code (components, systems, widgets, tests, examples) must import from either:
- `'blecsd'` (for external consumers and examples)
- `'../core/ecs'` or `'./ecs'` (for internal library code)

```typescript
// BANNED - direct bitecs import
import { addEntity, hasComponent } from 'bitecs';

// REQUIRED - import from blecsd
import { addEntity, hasComponent } from 'blecsd';

// REQUIRED - internal library code uses relative imports
import { addEntity, hasComponent } from '../core/ecs';
```

**Why:** This abstraction layer allows us to evolve the ECS implementation without breaking user code. It also enables future optimizations like packed entity stores or custom query strategies.

### Input Priority (HARD REQUIREMENT)

**Input must ALWAYS feel responsive and smooth.** This is a non-negotiable requirement for all controls and inputs in this library.

Default update loop order:
1. **INPUT** (always first, cannot be reordered)
2. EARLY_UPDATE
3. UPDATE
4. LATE_UPDATE
5. ANIMATION (physics, tweens, transitions)
6. LAYOUT
7. RENDER
8. POST_RENDER

The INPUT phase processes ALL pending input immediately every frame. No input events should ever be lost or delayed. Library users can customize other phases but cannot move INPUT from first position.

**Note on the ANIMATION phase:** This phase handles physics-based animations, spring dynamics, momentum scrolling, and other time-based transitions. While "physics" might sound game-specific, these patterns are increasingly common in modern UIs (think iOS bounce effects, Material Design transitions, or kinetic scrolling).

### Entity Component System (bitecs)

All UI elements are entities with components:

```typescript
// Components are typed data stores
const Position = defineComponent({ x: Types.f32, y: Types.f32 })
const Renderable = defineComponent({ char: Types.ui8, fg: Types.ui32, bg: Types.ui32 })
const Velocity = defineComponent({ x: Types.f32, y: Types.f32 })  // For animations, momentum scrolling

// Systems process entities with specific components
const animationSystem = defineSystem((world) => {
  const entities = animatedQuery(world)
  for (const eid of entities) {
    Position.x[eid] += Velocity.x[eid]
    Position.y[eid] += Velocity.y[eid]
  }
  return world
})
```

### Strict TypeScript

- All functions have explicit return types
- No `any` types (use `unknown` and type guards)
- All objects have defined interfaces
- Use branded types for IDs and special values
- Prefer `readonly` arrays and objects where possible

### Functional Programming (HARD REQUIREMENT)

**This is a purely functional codebase. OOP is permanently banned.**

**Prohibited patterns:**
- `class` keyword (no classes, ever)
- `this` keyword
- `new` keyword (except for built-ins like `Map`, `Set`, `Error`)
- Prototype manipulation
- Instance methods
- Inheritance hierarchies
- Stateful objects with methods

**Required patterns:**
- Pure functions that take data and return data
- Data as plain objects and arrays
- Composition over inheritance
- Explicit state passed as parameters
- Immutable data transformations

```typescript
// BANNED - OOP style
class Player {
  private x: number;
  private y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }
}

// REQUIRED - Functional style
interface Player {
  readonly x: number;
  readonly y: number;
}

function createPlayer(x: number, y: number): Player {
  return { x, y };
}

function movePlayer(player: Player, dx: number, dy: number): Player {
  return { x: player.x + dx, y: player.y + dy };
}
```

**Why:** ECS is inherently data-oriented. Classes create implicit coupling between data and behavior. Pure functions are easier to test, compose, and reason about. This aligns with bitecs' design philosophy.

### Code Style: Early Returns and Guard Clauses

**Always prefer early returns and guard clauses** to reduce nesting and improve readability.

```typescript
// BAD - deeply nested
function processEntity(world: World, eid: Entity): Result {
  if (hasComponent(world, Position, eid)) {
    if (hasComponent(world, Velocity, eid)) {
      if (isVisible(world, eid)) {
        // actual logic buried in nesting
        return doSomething(world, eid);
      } else {
        return { error: 'not visible' };
      }
    } else {
      return { error: 'no velocity' };
    }
  } else {
    return { error: 'no position' };
  }
}

// GOOD - guard clauses with early returns
function processEntity(world: World, eid: Entity): Result {
  if (!hasComponent(world, Position, eid)) {
    return { error: 'no position' };
  }
  if (!hasComponent(world, Velocity, eid)) {
    return { error: 'no velocity' };
  }
  if (!isVisible(world, eid)) {
    return { error: 'not visible' };
  }

  // actual logic at the end, not nested
  return doSomething(world, eid);
}
```

**Rules:**
- Handle error/edge cases first, then the happy path
- Maximum nesting depth of 2-3 levels
- Use early `return`, `continue`, or `break` to exit early
- Keep the main logic at the lowest indentation level

### Zod Validation

Use Zod at system boundaries:

```typescript
// Config validation
const ScreenConfigSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  title: z.string().optional(),
})

// Input validation
const KeyEventSchema = z.object({
  key: z.string(),
  ctrl: z.boolean(),
  meta: z.boolean(),
  shift: z.boolean(),
})
```

## Development Workflow

### Between Every Significant Change

1. **Write tests** for the new functionality
2. **Run tests**: `pnpm test`
3. **Lint**: `pnpm lint`
4. **Type check**: `pnpm typecheck`
5. **Build**: `pnpm build` - Run builds frequently, not just at the end. Builds can expose errors that tests, linting, and type checking miss (e.g., circular dependencies, export issues, bundler problems)
6. **Commit**: Create atomic commits with clear messages

### Issue Tracking

Tasks are tracked as markdown files in `.tasks/`:

- `.tasks/open/` - Open issues and epics
- `.tasks/closed/` - Completed issues and epics
- `.tasks/open/epics/{id}/` - Epic folder with all child tickets
- Each ticket is a markdown file named by its ID (e.g., `blessed-cbew.md`)

### Epic Completion Workflow (HARD REQUIREMENT)

**Complete entire epics before moving on.** Do not cherry-pick individual tasks across multiple epics.

**Rules:**

1. **Focus on one epic at a time** - Work on the highest priority epic until ALL of its tasks are complete (including P1, P2, etc. tasks within that epic)
2. **Only switch when blocked** - If all remaining tasks in the current epic are blocked by dependencies outside the epic, then:
   - First, try to unblock them by completing the blocking work
   - If the blockers are in a different epic, complete that epic first
   - Return to finish the original epic once unblocked
3. **Document as you go** - Every task with `[needs-docs]` must have documentation completed before the task is considered done
4. **Close the epic** - An epic is only complete when ALL child tasks are closed and documented

**Why:** Partially completed epics create technical debt, inconsistent APIs, and make it harder to reason about what features are actually usable. A half-finished widget system is worse than no widget system.

**Workflow:**

- Check open epics in `.tasks/open/epics/`
- Review each epic's `_epic.md` for children and their statuses
- Check "Blocked By" sections in individual tickets for dependency info
- Work on unblocking dependencies first

**Example:** If working on `blessed-ree` (Screen & Rendering):
- Complete ALL `blessed-ree.*` tasks (P0, P1, P2)
- If `blessed-ree.5` is blocked by `blessed-wlg.1`, complete `blessed-wlg.1` first
- Return to `blessed-ree` and finish remaining tasks
- Only move to the next epic when `blessed-ree` is fully closed

### Commit Message Format

```
<type>: <description>

[optional body]

```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

## Module Structure

```
src/
├── core/              # Core systems
│   ├── ecs.ts         # ECS wrapper (ONLY file that imports bitecs)
│   ├── world.ts       # bitecs world setup
│   ├── scheduler.ts   # System execution order
│   └── events.ts      # Event bus
├── terminal/          # Terminal I/O
│   ├── program.ts     # Low-level terminal control
│   ├── tput.ts        # Terminfo capabilities
│   ├── input.ts       # Keyboard/mouse input
│   └── renderer.ts    # Screen rendering
├── components/        # bitecs components
│   ├── position.ts
│   ├── renderable.ts
│   ├── velocity.ts    # For animations, transitions
│   └── ...
├── systems/           # bitecs systems
│   ├── animation.ts   # Physics-based animations
│   ├── layout.ts      # UI layout calculation
│   ├── render.ts
│   └── ...
├── widgets/           # High-level UI widgets (optional)
│   ├── box.ts
│   ├── text.ts
│   └── ...
├── schemas/           # Zod schemas
│   ├── config.ts
│   ├── input.ts
│   └── ...
└── index.ts           # Public API
```

## Migration from Original Blessed

### What We Keep
- Terminal capability detection (tput/terminfo)
- Unicode handling
- Color system foundations
- Input parsing logic

### What Changes
- Prototypal inheritance → ECS + TypeScript classes
- Mutable state → Immutable components + systems
- Event callbacks → Typed event bus
- Manual tests → Vitest unit/integration tests
- JSHint/JSCS → Biome

### What We Drop
- Browser support (terminal-only)
- Backwards compatibility with original blessed
- Widget-centric class hierarchies (replaced by ECS composition)

## Testing Strategy

```typescript
// Unit tests for pure functions
describe('colors', () => {
  it('converts hex to rgb', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
  })
})

// Integration tests for systems
describe('animation system', () => {
  it('updates position based on velocity', () => {
    const world = createWorld()
    const eid = addEntity(world)
    addComponent(world, eid, Position)
    addComponent(world, eid, Velocity)
    Position.x[eid] = 0
    Velocity.x[eid] = 1

    animationSystem(world)

    expect(Position.x[eid]).toBe(1)
  })
})
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Development mode
pnpm build            # Build for production
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm lint             # Run Biome linter
pnpm lint:fix         # Fix linting issues
pnpm typecheck        # TypeScript type checking
```

## Key Files

| File | Purpose |
|------|---------|
| `src/core/ecs.ts` | ECS wrapper (only file that imports bitecs directly) |
| `tsconfig.json` | TypeScript configuration (strict mode) |
| `biome.json` | Biome linter/formatter config |
| `vitest.config.ts` | Test configuration |
| `.tasks/` | Issue tracking (markdown files) |

## Documentation Requirements

### Rule: No Ticket Without Docs

Every ticket that adds or modifies public API MUST include documentation updates.
A ticket is NOT complete until:

1. **JSDoc comments** are added/updated for all public exports
2. **API reference** page is created/updated in `docs/api/`
3. **Code examples** are added (at least one per function/class)
4. **Guide updates** are made if the feature affects existing guides

### Documentation Checklist (for every PR)

- [ ] JSDoc comments added/updated with @example
- [ ] API reference page added/updated
- [ ] Code examples are complete and runnable
- [ ] Related guides updated (if applicable)

### What Requires Documentation

| Change Type | Required Docs |
|-------------|---------------|
| New public function | JSDoc + API page + example |
| New widget | JSDoc + API page + example + guide section |
| New component | JSDoc + API page + ECS guide update |
| New system | JSDoc + API page + example |
| Config option added | JSDoc + API page update |
| Behavior change | Guide update + changelog |
| Bug fix (public API) | Changelog only |
| Internal refactor | None |

### JSDoc Standard

Every public export must have:

```typescript
/**
 * Brief description of what this does.
 *
 * @param paramName - Description of parameter
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * // Complete runnable example
 * import { thisFunction } from 'blecsd';
 * const result = thisFunction(value);
 * ```
 */
```

### Ticket Documentation Tracking

When creating tickets that affect public API:
- Add `[needs-docs]` label
- Include "Documentation Notes" section describing what docs are needed

When closing tickets:
- Verify JSDoc exists for new exports
- Verify API reference page exists
- Remove `[needs-docs]` label only when docs are complete

## Resources

- [bitecs documentation](https://github.com/NateTheGreatt/bitECS)
- [Zod documentation](https://zod.dev)
- [Original blessed source](./lib/) (reference only)
- [ncurses documentation](https://invisible-island.net/ncurses/)
- [Documentation](./docs/) - Library documentation
