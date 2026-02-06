# Line Widget

The Line widget is a simple separator for creating horizontal or vertical lines. It's useful for dividing sections of a UI or creating visual boundaries.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLine } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Create a horizontal separator
const hLine = createLine(world, eid, {
  left: 0,
  top: 10,
  orientation: 'horizontal',
  length: 80,
});

// Create a vertical separator
const vLine = createLine(world, addEntity(world), {
  left: 40,
  top: 0,
  orientation: 'vertical',
  length: 24,
  char: '║',
  fg: '#00ff00',
});
```

---

## Factory Function

### createLine

Creates a new Line widget with the specified configuration.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLine } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic horizontal line (default)
const line = createLine(world, eid);

// Vertical line with custom styling
const verticalLine = createLine(world, eid, {
  left: 20,
  top: 0,
  orientation: 'vertical',
  length: 20,
  char: '│',
  fg: '#888888',
});
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to wrap
- `config` - Optional configuration object (see LineConfig)

**Returns:** `LineWidget` interface

---

## Constants

### Default Characters

```typescript
import {
  DEFAULT_HORIZONTAL_CHAR,  // '─'
  DEFAULT_VERTICAL_CHAR,    // '│'
  DEFAULT_LINE_LENGTH,      // 10
} from 'blecsd';
```

---

## LineWidget Interface

The line widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const line = createLine(world, eid);
console.log(line.eid); // Entity ID number
```

### Visibility Methods

#### show

Shows the line.

```typescript
line.show();
```

**Returns:** `LineWidget` for chaining

#### hide

Hides the line.

```typescript
line.hide();
```

**Returns:** `LineWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
line.setPosition(20, 15);
```

**Returns:** `LineWidget` for chaining

#### move

Moves the line by a relative amount.

```typescript
line.move(5, -3);
```

**Returns:** `LineWidget` for chaining

---

### Line-Specific Methods

#### setChar

Sets the line character.

```typescript
line.setChar('═'); // Use double horizontal line
```

**Returns:** `LineWidget` for chaining

#### getChar

Gets the current line character.

```typescript
const char = line.getChar(); // '─'
```

**Returns:** `string`

#### getOrientation

Gets the line orientation.

```typescript
const orientation = line.getOrientation(); // 'horizontal' | 'vertical'
```

**Returns:** `LineOrientation`

#### setLength

Sets the line length.

```typescript
line.setLength(100); // Make line 100 characters long
```

**Returns:** `LineWidget` for chaining

#### getLength

Gets the current line length.

```typescript
const length = line.getLength(); // 80
```

**Returns:** `number`

---

### Children Methods

#### append

Appends a child entity.

```typescript
const childEid = addEntity(world);
line.append(childEid);
```

**Returns:** `LineWidget` for chaining

#### getChildren

Gets all direct children.

```typescript
const children = line.getChildren();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
line.destroy();
```

---

## Helper Functions

### isLine

Checks if an entity is a line widget.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isLine } from 'blecsd';

if (isLine(world, entity)) {
  // Handle line-specific logic
}
```

**Returns:** `boolean`

---

### getLineChar

Gets the line character of a line entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getLineChar } from 'blecsd';

const char = getLineChar(world, lineEntity);
```

**Returns:** `string`

---

### setLineChar

Sets the line character of a line entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setLineChar } from 'blecsd';

setLineChar(world, lineEntity, '═');
```

**Returns:** `Entity` - For chaining

---

### getLineOrientation

Gets the orientation of a line entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getLineOrientation } from 'blecsd';

const orientation = getLineOrientation(world, lineEntity);
// 'horizontal' or 'vertical'
```

**Returns:** `LineOrientation`

---

## Types

### LineConfig

Configuration for creating a line widget.

```typescript
interface LineConfig {
  // Position
  readonly left?: PositionValue;
  readonly top?: PositionValue;

  // Orientation and size
  readonly orientation?: LineOrientation;  // Default: 'horizontal'
  readonly length?: number;                 // Default: 10

  // Style
  readonly char?: string;                   // Default: '─' or '│'
  readonly fg?: string | number;
  readonly bg?: string | number;
}
```

### LineOrientation

Line orientation type.

```typescript
type LineOrientation = 'horizontal' | 'vertical';
```

### LineWidget

The line widget interface.

```typescript
interface LineWidget {
  readonly eid: Entity;

  // Visibility
  show(): LineWidget;
  hide(): LineWidget;

  // Position
  move(dx: number, dy: number): LineWidget;
  setPosition(x: number, y: number): LineWidget;

  // Line-specific
  setChar(char: string): LineWidget;
  getChar(): string;
  getOrientation(): LineOrientation;
  setLength(length: number): LineWidget;
  getLength(): number;

  // Focus (lines are not focusable by default)
  focus(): LineWidget;
  blur(): LineWidget;
  isFocused(): boolean;

  // Children
  append(child: Entity): LineWidget;
  getChildren(): Entity[];

  // Lifecycle
  destroy(): void;
}
```

---

## Zod Schemas

<!-- blecsd-doccheck:ignore -->
```typescript
import { LineConfigSchema } from 'blecsd';

// Validate configuration
const result = LineConfigSchema.safeParse({
  orientation: 'horizontal',
  length: 80,
  char: '─',
});

if (result.success) {
  // Configuration is valid
}
```

---

## Examples

### Horizontal Separator

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLine } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const separator = createLine(world, eid, {
  left: 0,
  top: 10,
  orientation: 'horizontal',
  length: 80,
  fg: '#666666',
});
```

### Vertical Divider

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLine } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const divider = createLine(world, eid, {
  left: 40,
  top: 0,
  orientation: 'vertical',
  length: 24,
  char: '│',
});
```

### Double Line Border

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLine } from 'blecsd';

const world = createWorld();

// Top border
const topLine = createLine(world, addEntity(world), {
  left: 0,
  top: 0,
  orientation: 'horizontal',
  length: 60,
  char: '═',
});

// Bottom border
const bottomLine = createLine(world, addEntity(world), {
  left: 0,
  top: 20,
  orientation: 'horizontal',
  length: 60,
  char: '═',
});

// Left border
const leftLine = createLine(world, addEntity(world), {
  left: 0,
  top: 1,
  orientation: 'vertical',
  length: 19,
  char: '║',
});

// Right border
const rightLine = createLine(world, addEntity(world), {
  left: 59,
  top: 1,
  orientation: 'vertical',
  length: 19,
  char: '║',
});
```

### Dynamic Length

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLine } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const line = createLine(world, eid, {
  orientation: 'horizontal',
  length: 40,
});

// Resize the line based on terminal width
function onResize(terminalWidth: number) {
  line.setLength(terminalWidth);
}
```

### Method Chaining

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLine } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const line = createLine(world, eid, { left: 0, top: 0 })
  .setPosition(10, 5)
  .setChar('═')
  .setLength(60)
  .move(0, 5)
  .show();
```

---

## Line Characters Reference

Common Unicode box-drawing characters for lines:

| Style | Horizontal | Vertical |
|-------|------------|----------|
| Single | `─` (U+2500) | `│` (U+2502) |
| Double | `═` (U+2550) | `║` (U+2551) |
| Bold | `━` (U+2501) | `┃` (U+2503) |
| Dashed | `┄` (U+2504) | `┆` (U+2506) |
| ASCII | `-` | `|` |

---

## See Also

- [Box Widget](./box.md) - Container with borders
- [Panel Widget](./panel.md) - Container with title
- [Position Component](../components/position.md) - Entity positioning
- [Dimensions Component](../components/dimensions.md) - Widget sizing
