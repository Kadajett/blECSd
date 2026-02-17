# Line Widget

The Line widget is a simple separator for creating horizontal or vertical lines. It's useful for dividing sections of a UI or creating visual boundaries.

## Overview

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  createLine,
  isLine,
  getLineChar,
  setLineChar,
  getLineOrientation,
  LineConfigSchema,
  DEFAULT_HORIZONTAL_CHAR,
  DEFAULT_VERTICAL_CHAR,
  DEFAULT_LINE_LENGTH,
} from 'blecsd/widgets';

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

void hLine; void vLine;
```

---

## Factory Function

### createLine

Creates a new Line widget with the specified configuration.

```typescript
// Basic horizontal line (default)
const line = createLine(world, eid);

// Vertical line with custom styling
const verticalLine = createLine(world, addEntity(world), {
  left: 20,
  top: 0,
  orientation: 'vertical',
  length: 20,
  char: '│',
  fg: '#888888',
});
void line; void verticalLine;
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
void DEFAULT_HORIZONTAL_CHAR; // '─'
void DEFAULT_VERTICAL_CHAR;   // '│'
void DEFAULT_LINE_LENGTH;
```

---

## LineWidget Interface

The line widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const lineA = createLine(world, addEntity(world));
console.log(lineA.eid); // Entity ID number
lineA.destroy();
```

### Visibility Methods

#### show

Shows the line.

```typescript
const lineB = createLine(world, addEntity(world));
lineB.show();
lineB.destroy();
```

**Returns:** `LineWidget` for chaining

#### hide

Hides the line.

```typescript
const lineC = createLine(world, addEntity(world));
lineC.hide();
lineC.destroy();
```

**Returns:** `LineWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
const lineD = createLine(world, addEntity(world));
lineD.setPosition(20, 15);
lineD.destroy();
```

**Returns:** `LineWidget` for chaining

#### move

Moves the line by a relative amount.

```typescript
const lineE = createLine(world, addEntity(world));
lineE.move(5, -3);
lineE.destroy();
```

**Returns:** `LineWidget` for chaining

---

### Line-Specific Methods

#### setChar

Sets the line character.

```typescript
const lineF = createLine(world, addEntity(world));
lineF.setChar('═'); // Use double horizontal line
lineF.destroy();
```

**Returns:** `LineWidget` for chaining

#### getChar

Gets the current line character.

```typescript
const lineG = createLine(world, addEntity(world));
const char = lineG.getChar(); // '─'
void char;
lineG.destroy();
```

**Returns:** `string`

#### getOrientation

Gets the line orientation.

```typescript
const lineH = createLine(world, addEntity(world));
const orientation = lineH.getOrientation(); // 'horizontal' | 'vertical'
void orientation;
lineH.destroy();
```

**Returns:** `LineOrientation`

#### setLength

Sets the line length.

```typescript
const lineI = createLine(world, addEntity(world));
lineI.setLength(100); // Make line 100 characters long
lineI.destroy();
```

**Returns:** `LineWidget` for chaining

#### getLength

Gets the current line length.

```typescript
const lineJ = createLine(world, addEntity(world));
const length = lineJ.getLength(); // 10
void length;
lineJ.destroy();
```

**Returns:** `number`

---

### Children Methods

#### append

Appends a child entity.

```typescript
const lineK = createLine(world, addEntity(world));
const childEid = addEntity(world);
lineK.append(childEid);
lineK.destroy();
```

**Returns:** `LineWidget` for chaining

#### getChildren

Gets all direct children.

```typescript
const lineL = createLine(world, addEntity(world));
const children = lineL.getChildren();
void children;
lineL.destroy();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
const lineM = createLine(world, addEntity(world));
lineM.destroy();
```

---

## Helper Functions

### isLine

Checks if an entity is a line widget.

```typescript
const lineN = createLine(world, addEntity(world));
if (isLine(world, lineN.eid)) {
  // Handle line-specific logic
}
lineN.destroy();
```

**Returns:** `boolean`

---

### getLineChar

Gets the line character of a line entity.

```typescript
const lineO = createLine(world, addEntity(world));
const lineChar = getLineChar(world, lineO.eid);
void lineChar;
lineO.destroy();
```

**Returns:** `string`

---

### setLineChar

Sets the line character of a line entity.

```typescript
const lineP = createLine(world, addEntity(world));
setLineChar(world, lineP.eid, '═');
lineP.destroy();
```

**Returns:** `Entity` - For chaining

---

### getLineOrientation

Gets the orientation of a line entity.

```typescript
const lineQ = createLine(world, addEntity(world));
const lineOri = getLineOrientation(world, lineQ.eid);
void lineOri;
// 'horizontal' or 'vertical'
lineQ.destroy();
```

**Returns:** `LineOrientation`

---

## Types

### LineConfig

Configuration for creating a line widget.

```typescript
interface LineConfig {
  // Position
  readonly left?: number;
  readonly top?: number;

  // Orientation and size
  readonly orientation?: 'horizontal' | 'vertical';  // Default: 'horizontal'
  readonly length?: number;                            // Default: 10

  // Style
  readonly char?: string;                              // Default: '─' or '│'
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
  readonly eid: number;

  // Visibility
  show(): LineWidget;
  hide(): LineWidget;

  // Position
  move(dx: number, dy: number): LineWidget;
  setPosition(x: number, y: number): LineWidget;

  // Line-specific
  setChar(char: string): LineWidget;
  getChar(): string;
  getOrientation(): 'horizontal' | 'vertical';
  setLength(length: number): LineWidget;
  getLength(): number;

  // Focus (lines are not focusable by default)
  focus(): LineWidget;
  blur(): LineWidget;
  isFocused(): boolean;

  // Children
  append(child: number): LineWidget;
  getChildren(): number[];

  // Lifecycle
  destroy(): void;
}
```

---

## Zod Schemas

```typescript
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

```typescript
const separator = createLine(world, addEntity(world), {
  left: 0,
  top: 10,
  orientation: 'horizontal',
  length: 80,
  fg: '#666666',
});
void separator;
```

### Vertical Divider

```typescript
const divider = createLine(world, addEntity(world), {
  left: 40,
  top: 0,
  orientation: 'vertical',
  length: 24,
  char: '│',
});
void divider;
```

### Double Line Border

```typescript
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

void topLine; void bottomLine; void leftLine; void rightLine;
```

### Dynamic Length

```typescript
const dynLine = createLine(world, addEntity(world), {
  orientation: 'horizontal',
  length: 40,
});

// Resize the line based on terminal width
function onResize(terminalWidth: number) {
  dynLine.setLength(terminalWidth);
}
void onResize;
```

### Method Chaining

```typescript
const chainedLine = createLine(world, addEntity(world), { left: 0, top: 0 })
  .setPosition(10, 5)
  .setChar('═')
  .setLength(60)
  .move(0, 5)
  .show();
void chainedLine;
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
- [Position Component](../position.md) - Entity positioning
- [Dimensions Component](../dimensions.md) - Widget sizing
