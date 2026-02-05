# Box Widget

The Box widget is a basic container for building terminal UI elements. It provides borders, padding, content, and a chainable API for creating and manipulating UI components.

## Overview

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Create a box with content and border
const box = createBox(world, eid, {
  left: 10,
  top: 5,
  width: 40,
  height: 10,
  content: 'Hello, World!',
  border: { type: 'line' },
  padding: 1,
});

// Chain methods for further customization
box.setContent('Updated content').focus().show();
```

---

## Factory Function

### createBox

Creates a new Box widget with the specified configuration.

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic box
const box = createBox(world, eid);

// Full configuration
const styledBox = createBox(world, eid, {
  left: 5,
  top: 3,
  width: 50,
  height: 20,
  fg: '#ffffff',
  bg: '#000080',
  content: 'Box content here',
  align: 'center',
  valign: 'middle',
  border: {
    type: 'line',
    fg: '#00ff00',
    ch: 'double',
  },
  padding: {
    left: 2,
    top: 1,
    right: 2,
    bottom: 1,
  },
});
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to wrap
- `config` - Optional configuration object (see BoxConfig)

**Returns:** `BoxWidget` interface

---

## BoxWidget Interface

The box widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const box = createBox(world, eid);
console.log(box.eid); // Entity ID number
```

### Visibility Methods

#### show

Shows the box.

```typescript
box.show();
```

**Returns:** `BoxWidget` for chaining

#### hide

Hides the box.

```typescript
box.hide();
```

**Returns:** `BoxWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
box.setPosition(20, 15);
```

**Parameters:**
- `x` - X coordinate
- `y` - Y coordinate

**Returns:** `BoxWidget` for chaining

#### move

Moves the box by a relative amount.

```typescript
box.move(5, -3); // Move right 5, up 3
```

**Parameters:**
- `dx` - Horizontal delta
- `dy` - Vertical delta

**Returns:** `BoxWidget` for chaining

---

### Content Methods

#### setContent

Sets the text content of the box.

```typescript
box.setContent('New content');
```

**Parameters:**
- `text` - The text content

**Returns:** `BoxWidget` for chaining

#### getContent

Gets the current text content.

```typescript
const content = box.getContent(); // 'New content'
```

**Returns:** `string`

---

### Focus Methods

#### focus

Focuses the box.

```typescript
box.focus();
```

**Returns:** `BoxWidget` for chaining

#### blur

Removes focus from the box.

```typescript
box.blur();
```

**Returns:** `BoxWidget` for chaining

#### isFocused

Checks if the box is currently focused.

```typescript
const focused = box.isFocused(); // boolean
```

**Returns:** `boolean`

---

### Children Methods

#### append

Appends a child entity to this box.

```typescript
const childEid = addEntity(world);
box.append(childEid);
```

**Parameters:**
- `child` - Entity ID to append

**Returns:** `BoxWidget` for chaining

#### getChildren

Gets all direct children of this box.

```typescript
const children = box.getChildren(); // Entity[]
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget and removes it from the world.

```typescript
box.destroy();
```

---

## Helper Functions

### setBoxContent

Sets the content of a box entity.

```typescript
import { setBoxContent } from 'blecsd';

setBoxContent(world, boxEntity, 'Updated content');
```

**Parameters:**
- `world` - The ECS world
- `eid` - Entity ID
- `text` - Text content

**Returns:** `Entity` - The entity ID for chaining

---

### getBoxContent

Gets the content of a box entity.

```typescript
import { getBoxContent } from 'blecsd';

const content = getBoxContent(world, boxEntity); // string
```

**Parameters:**
- `world` - The ECS world
- `eid` - Entity ID

**Returns:** `string` - The text content or empty string

---

### isBox

Checks if an entity is a box widget.

```typescript
import { isBox } from 'blecsd';

if (isBox(world, entity)) {
  // Handle box-specific logic
}
```

**Parameters:**
- `world` - The ECS world
- `eid` - Entity ID

**Returns:** `boolean`

---

## Types

### BoxConfig

Configuration for creating a box widget.

```typescript
interface BoxConfig {
  // Position
  readonly left?: PositionValue;
  readonly top?: PositionValue;
  readonly right?: PositionValue;
  readonly bottom?: PositionValue;
  readonly width?: DimensionValue;
  readonly height?: DimensionValue;

  // Style
  readonly fg?: string | number;    // Foreground color
  readonly bg?: string | number;    // Background color
  readonly border?: BorderConfig;
  readonly padding?: PaddingConfig;

  // Content
  readonly content?: string;
  readonly align?: Align;           // 'left' | 'center' | 'right'
  readonly valign?: VAlign;         // 'top' | 'middle' | 'bottom'
}
```

### PositionValue

Position value that can be absolute, percentage, or keyword.

```typescript
type PositionValue = number | `${number}%` | 'center' | 'left' | 'right' | 'top' | 'bottom';
```

### DimensionValue

Dimension value that can be absolute, percentage, or auto.

```typescript
type DimensionValue = number | `${number}%` | 'auto';
```

### BorderConfig

Border configuration for boxes.

```typescript
interface BorderConfig {
  readonly type?: 'line' | 'bg' | 'none';
  readonly fg?: string | number;
  readonly bg?: string | number;
  readonly ch?: 'single' | 'double' | 'rounded' | 'bold' | 'ascii' | BorderCharset;
}
```

### PaddingConfig

Padding configuration (uniform or per-side).

```typescript
type PaddingConfig =
  | number
  | {
      readonly left?: number;
      readonly top?: number;
      readonly right?: number;
      readonly bottom?: number;
    };
```

### Align

Horizontal text alignment.

```typescript
type Align = 'left' | 'center' | 'right';
```

### VAlign

Vertical text alignment.

```typescript
type VAlign = 'top' | 'middle' | 'bottom';
```

### BoxWidget

The box widget interface.

```typescript
interface BoxWidget {
  readonly eid: Entity;
  show(): BoxWidget;
  hide(): BoxWidget;
  move(dx: number, dy: number): BoxWidget;
  setPosition(x: number, y: number): BoxWidget;
  setContent(text: string): BoxWidget;
  getContent(): string;
  focus(): BoxWidget;
  blur(): BoxWidget;
  isFocused(): boolean;
  append(child: Entity): BoxWidget;
  getChildren(): Entity[];
  destroy(): void;
}
```

---

## Zod Schemas

Zod schemas are provided for runtime validation.

```typescript
import { BoxConfigSchema } from 'blecsd';

// Validate configuration
const result = BoxConfigSchema.safeParse({
  left: 10,
  top: 5,
  width: '50%',
  height: 20,
  content: 'Hello',
  border: { type: 'line' },
});

if (result.success) {
  // Configuration is valid
}
```

---

## Examples

### Basic Container

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const box = createBox(world, eid, {
  left: 0,
  top: 0,
  width: 80,
  height: 24,
  content: 'Welcome to my app!',
});
```

### Styled Box with Border

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const dialog = createBox(world, eid, {
  left: 'center',
  top: 'center',
  width: 40,
  height: 10,
  fg: '#ffffff',
  bg: '#333333',
  content: 'Are you sure?',
  align: 'center',
  valign: 'middle',
  border: {
    type: 'line',
    fg: '#00ff00',
    ch: 'double',
  },
  padding: 2,
});
```

### Nested Boxes

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createBox } from 'blecsd';

const world = createWorld();

// Parent container
const parentEid = addEntity(world);
const parent = createBox(world, parentEid, {
  left: 0,
  top: 0,
  width: 80,
  height: 24,
  border: { type: 'line' },
});

// Child box
const childEid = addEntity(world);
const child = createBox(world, childEid, {
  left: 2,
  top: 2,
  width: 30,
  height: 10,
  content: 'I am a child box',
});

// Add child to parent
parent.append(childEid);
```

### Method Chaining

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const box = createBox(world, eid, { left: 0, top: 0 })
  .setPosition(10, 10)
  .move(5, 5)
  .setContent('Chained!')
  .focus()
  .show();

// Position is now (15, 15)
// Content is 'Chained!'
// Box is focused and visible
```

### Focus Management

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createBox } from 'blecsd';

const world = createWorld();

const box1 = createBox(world, addEntity(world), { left: 0, top: 0, width: 20, height: 5 });
const box2 = createBox(world, addEntity(world), { left: 25, top: 0, width: 20, height: 5 });

// Focus first box
box1.focus();
console.log(box1.isFocused()); // true
console.log(box2.isFocused()); // false

// Switch focus
box1.blur();
box2.focus();
console.log(box1.isFocused()); // false
console.log(box2.isFocused()); // true
```

### Dynamic Content Update

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createBox, setBoxContent, getBoxContent } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);
const status = createBox(world, eid, {
  left: 0,
  top: 0,
  width: 40,
  height: 3,
  content: 'Status: Initializing...',
});

// Update via widget method
status.setContent('Status: Loading...');

// Or use utility function
setBoxContent(world, eid, 'Status: Ready!');

// Read content
const current = getBoxContent(world, eid); // 'Status: Ready!'
```

---

## See Also

- [Border Component](../components/border.md) - Border styling
- [Content Component](../components/content.md) - Text content management
- [Position Component](../components/position.md) - Entity positioning
- [Dimensions Component](../components/dimensions.md) - Widget sizing
- [Focusable Component](../components/focusable.md) - Focus management
