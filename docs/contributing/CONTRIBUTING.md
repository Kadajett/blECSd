# Contributing to blECSd

Thank you for your interest in contributing to blECSd! This guide will help you get started.

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.

## Ways to Contribute

### Report Bugs

Found a bug? Open an issue with:

- A clear title describing the problem
- Steps to reproduce
- Expected vs actual behavior
- Terminal and Node.js version
- Code snippet if applicable

### Suggest Features

Have an idea? Open an issue with:

- Clear description of the feature
- Use case (why is this useful?)
- Proposed API (if applicable)
- Willingness to implement

### Submit Code

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes (see [Development Guide](./DEVELOPMENT.md))
4. Run tests and linting
5. Commit with a clear message
6. Push and open a pull request

## Pull Request Guidelines

### Before Submitting

- [ ] All tests pass (`pnpm test`)
- [ ] Linting passes (`pnpm lint`)
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] New code has tests
- [ ] New public API has JSDoc comments

### PR Title Format

```
<type>: <description>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

Examples:
- `feat: add horizontal slider orientation`
- `fix: correct focus trap in modal dialogs`
- `docs: add tree widget documentation`

### PR Description

Include:

- **What**: Brief description of the change
- **Why**: Motivation or issue being fixed
- **How**: High-level approach (for complex changes)
- **Testing**: How you tested the change

## Code Style

### TypeScript

- Strict mode enabled (`strict: true`)
- No `any` types (use `unknown` and type guards)
- Explicit return types on all functions
- Use `readonly` for immutable data

### Functional Programming

blECSd follows functional programming principles:

```typescript
// Good: Pure function
function moveEntity(world: World, eid: Entity, dx: number, dy: number): void {
  Position.x[eid] += dx;
  Position.y[eid] += dy;
}

// Bad: Class with methods
class Entity {
  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }
}
```

See [CLAUDE.md](../../CLAUDE.md) for detailed coding standards.

### Early Returns

Prefer guard clauses over nested conditionals:

```typescript
// Good
function process(world: World, eid: Entity): Result {
  if (!hasComponent(world, Position, eid)) {
    return { error: 'no position' };
  }
  if (!isVisible(world, eid)) {
    return { error: 'not visible' };
  }
  return doSomething(world, eid);
}

// Bad
function process(world: World, eid: Entity): Result {
  if (hasComponent(world, Position, eid)) {
    if (isVisible(world, eid)) {
      return doSomething(world, eid);
    } else {
      return { error: 'not visible' };
    }
  } else {
    return { error: 'no position' };
  }
}
```

## Documentation Requirements

All public API changes require documentation:

| Change Type | Required Docs |
|-------------|---------------|
| New public function | JSDoc + API page + example |
| New widget | JSDoc + API page + example + guide section |
| New component | JSDoc + API page + example |
| New system | JSDoc + API page + example |
| Config option added | JSDoc + API page update |
| Behavior change | Guide update |

### JSDoc Standard

Every public export needs:

```typescript
/**
 * Brief description of what this does.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param value - Description of the value
 * @returns Description of return value
 *
 * @example
 * ```typescript
 * import { myFunction } from 'blecsd';
 *
 * const result = myFunction(world, eid, 42);
 * ```
 */
export function myFunction(world: World, eid: Entity, value: number): Result {
  // ...
}
```

## Testing

### Unit Tests

Test pure functions in isolation:

```typescript
describe('hexToRgb', () => {
  it('converts hex to rgb', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('handles short hex', () => {
    expect(hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
  });
});
```

### Integration Tests

Test systems with real ECS worlds:

```typescript
describe('animationSystem', () => {
  it('updates position from velocity', () => {
    const world = createWorld();
    const eid = addEntity(world);
    addComponent(world, Position, eid);
    addComponent(world, Velocity, eid);

    Position.x[eid] = 0;
    Velocity.x[eid] = 1;

    animationSystem(world);

    expect(Position.x[eid]).toBe(1);
  });
});
```

### Run Tests

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test -- --coverage # Coverage report
```

## Architecture Decisions

For significant changes, consider writing an Architecture Decision Record (ADR):

1. Create a file in `docs/architecture/decisions/`
2. Describe the context, decision, and consequences
3. Reference it in your PR

## Getting Help

- Open an issue for questions
- Check existing issues and discussions
- Read the [Architecture Guide](./ARCHITECTURE.md)

## Recognition

Contributors are recognized in:

- The CHANGELOG for their contributions
- The README's contributors section (for significant contributions)

Thank you for contributing!
