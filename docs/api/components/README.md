# Components

blECSd components store entity data in efficient SOA (Structure of Arrays) format. All components are backed by typed arrays for cache-friendly iteration.

## Import Patterns

blECSd provides two ways to import and use component functions:

### Named Imports (Traditional)

Import individual functions directly:

```typescript
import {
  getPosition,
  setPosition,
  getContent,
  setContent,
  playAnimationByName,
} from 'blecsd/components';

setPosition(world, entity, 10, 5);
const pos = getPosition(world, entity);
setContent(world, entity, 'Hello');
playAnimationByName(world, entity, 'fadeIn');
```

### Namespace Objects (Recommended)

Import namespace objects for better discoverability and organization:

```typescript
import { position, content, animation } from 'blecsd/components';

position.set(world, entity, 10, 5);
const pos = position.get(world, entity);
content.setText(world, entity, 'Hello');
animation.playByName(world, entity, 'fadeIn');
```

**Benefits:**
- **Discoverability**: Autocomplete shows all related functions grouped together
- **Cleaner imports**: One import per component instead of multiple function imports
- **No name conflicts**: `position.set()` vs `dimensions.set()` are clearly distinct
- **Functional**: These are NOT classes — just frozen objects grouping functions

## Available Namespaces

| Namespace | Description |
|-----------|-------------|
| `position` | Entity screen coordinates (x, y, z-index) |
| `dimensions` | Entity size (width, height, constraints) |
| `content` | Text content and rendering |
| `style` | Visual styling (colors, transparency, attributes) |
| `border` | Border configuration and styles |
| `animation` | Animation playback and management |
| `collision` | Collision detection and bounds |
| `scroll` | Scroll state and navigation |
| `interactive` | Click/hover handling |
| `focus` | Focus management |
| `camera` | Camera/viewport control |
| `behavior` | Entity lifecycle behaviors |
| `accessibility` | Screen reader and a11y features |
| `health` | Game entity health/damage |
| `button` | Button widget utilities |
| `checkbox` | Checkbox widget utilities |
| `form` | Form field management |
| `label` | Label widget utilities |
| `progress` | Progress bar utilities |
| `radio` | Radio button utilities |
| `select` | Select/dropdown utilities |
| `slider` | Slider widget utilities |
| `sprite` | Sprite rendering |
| `text` | Text input utilities |
| `textarea` | Multi-line text input |
| `tile` | Tilemap rendering |
| `hierarchy` | Parent/child relationships |
| `lifecycle` | Creation/destruction tracking |
| `ordering` | Sibling order management |
| `layout` | Layout computation |
| `visibility` | Visibility flags |

## Namespace API Pattern

All namespace objects follow consistent naming:

```typescript
// Creation
component.create(world, entity, ...args)

// Getters
component.get(world, entity)
component.has(world, entity)
component.is...(world, entity)

// Setters
component.set(world, entity, ...values)
component.set...(world, entity, value)

// Actions
component.play(world, entity)
component.stop(world, entity)
component.toggle(world, entity)
```

## Example: Position Component

Both patterns are equivalent:

```typescript
// Traditional named imports
import {
  getPosition,
  setPosition,
  getPositionX,
  setPositionX,
  hasPosition,
} from 'blecsd/components';

setPosition(world, entity, 10, 5);
setPositionX(world, entity, 15);
const pos = getPosition(world, entity);
const x = getPositionX(world, entity);
const exists = hasPosition(world, entity);
```

```typescript
// Namespace pattern (recommended)
import { position } from 'blecsd/components';

position.set(world, entity, 10, 5);
position.setX(world, entity, 15);
const pos = position.get(world, entity);
const x = position.getX(world, entity);
const exists = position.has(world, entity);
```

## Migration

The traditional named imports are NOT deprecated — both patterns are fully supported. Use whichever fits your codebase:

- **New code**: Prefer namespace objects for cleaner organization
- **Existing code**: No need to migrate — named imports will always work
- **Mixed**: You can use both patterns in the same file

## TypeScript Support

All namespace objects are fully typed:

```typescript
import type { PositionModule, AnimationModule } from 'blecsd/components';

// Namespace types available for generic functions
function logPosition<T extends PositionModule>(
  pos: T,
  world: World,
  entity: number,
) {
  const { x, y } = pos.get(world, entity);
  console.log(`Position: ${x}, ${y}`);
}
```

## See Also

- [Position Component](./position.md)
- [Dimensions Component](./dimensions.md)
- [Content Component](./content.md)
- [Animation Component](./animation.md)
