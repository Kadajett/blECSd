# blECSd Terminal Game Library

> **Note:** This library is being renamed from "blessed" to "blECSd" to reflect its ECS-first architecture and distinguish it from the original blessed library.

## Project Overview

This is a rewrite of the 11-year-old blessed node library into a modern terminal game library built on curses. The rewrite prioritizes game development use cases over general TUI applications.

**This is NOT a backwards-compatible rewrite.** We are building a new library inspired by blessed's architecture.

## Core Technologies

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Strict types everywhere (`strict: true`, `noUncheckedIndexedAccess: true`) |
| **bitecs** | Entity Component System for game state management |
| **Zod** | Runtime validation for configuration, input, and data boundaries |
| **Biome** | Linting and formatting |
| **Vitest** | Testing framework |

## Architecture Principles

### Library-First Design (HARD REQUIREMENT)

**blECSd is a library, not a framework.** Users must be able to:

1. **Use components standalone** - Import Position, Renderable, etc. into their own bitecs world
2. **Skip the built-in game loop** - All systems are callable functions, not loop-dependent
3. **Mix and match** - Use our input parsing but their own rendering, or vice versa
4. **Control the world** - All functions take `world` as a parameter; we never own a global world

```typescript
// This must always work - user's loop, our components
import { setPosition, setRenderable } from 'blecsd';
import { createWorld, addEntity } from 'bitecs';

const world = createWorld();  // User's world
const eid = addEntity(world);
setPosition(world, eid, 10, 5);  // Works without our game loop
```

**Never create implicit dependencies on the game loop.** Systems should be pure functions that transform world state.

### Input Priority (HARD REQUIREMENT)

**Input must ALWAYS feel responsive and smooth.** This is a non-negotiable requirement for all controls and inputs in this library.

Default game loop order:
1. **INPUT** (always first, cannot be reordered)
2. EARLY_UPDATE
3. UPDATE
4. LATE_UPDATE
5. PHYSICS
6. LAYOUT
7. RENDER
8. POST_RENDER

The INPUT phase processes ALL pending input immediately every frame. No input events should ever be lost or delayed. Library users can customize other phases but cannot move INPUT from first position.

### Entity Component System (bitecs)

All game objects are entities with components:

```typescript
// Components are typed data stores
const Position = defineComponent({ x: Types.f32, y: Types.f32 })
const Renderable = defineComponent({ char: Types.ui8, fg: Types.ui32, bg: Types.ui32 })
const Velocity = defineComponent({ x: Types.f32, y: Types.f32 })

// Systems process entities with specific components
const movementSystem = defineSystem((world) => {
  const entities = movementQuery(world)
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
4. **Commit**: Create atomic commits with clear messages

### Issue Tracking with Beads

Track all work using beads (`bd`):

```bash
bd create              # Create new issue
bd list                # Show open issues
bd update <id> -s done # Close issue
bd show <id>           # View issue details
```

### Commit Message Format

```
<type>: <description>

[optional body]

Refs: blessed-<hash>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

## Module Structure

```
src/
├── core/              # Core systems
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
│   ├── velocity.ts
│   └── ...
├── systems/           # bitecs systems
│   ├── movement.ts
│   ├── collision.ts
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
- Backwards compatibility
- Widget-centric architecture (replaced by ECS)

## Testing Strategy

```typescript
// Unit tests for pure functions
describe('colors', () => {
  it('converts hex to rgb', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
  })
})

// Integration tests for systems
describe('movement system', () => {
  it('updates position based on velocity', () => {
    const world = createWorld()
    const eid = addEntity(world)
    addComponent(world, Position, eid)
    addComponent(world, Velocity, eid)
    Position.x[eid] = 0
    Velocity.x[eid] = 1

    movementSystem(world)

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
| `tsconfig.json` | TypeScript configuration (strict mode) |
| `biome.json` | Biome linter/formatter config |
| `vitest.config.ts` | Test configuration |
| `.beads/` | Issue tracking database |

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
