# Text Widget

The Text widget is a simple container for displaying text that shrinks to fit its content by default. It's ideal for labels, status messages, and other text elements that don't need borders.

## Overview

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Create a simple label
const label = createText(world, eid, {
  left: 10,
  top: 5,
  content: 'Hello, World!',
});

// Chain methods for updates
label.setContent('Updated!').setPosition(20, 10).show();
```

---

## Factory Function

### createText

Creates a new Text widget with the specified configuration.

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic text
const text = createText(world, eid);

// Full configuration
const styledText = createText(world, eid, {
  left: 5,
  top: 3,
  content: 'Status: Ready',
  fg: '#00ff00',
  bg: '#000000',
  align: 'center',
  valign: 'middle',
  shrink: true,  // Default
});
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to wrap
- `config` - Optional configuration object (see TextConfig)

**Returns:** `TextWidget` interface

---

## TextWidget Interface

The text widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const text = createText(world, eid);
console.log(text.eid); // Entity ID number
```

### Visibility Methods

#### show

Shows the text.

```typescript
text.show();
```

**Returns:** `TextWidget` for chaining

#### hide

Hides the text.

```typescript
text.hide();
```

**Returns:** `TextWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
text.setPosition(20, 15);
```

**Parameters:**
- `x` - X coordinate
- `y` - Y coordinate

**Returns:** `TextWidget` for chaining

#### move

Moves the text by a relative amount.

```typescript
text.move(5, -3); // Move right 5, up 3
```

**Parameters:**
- `dx` - Horizontal delta
- `dy` - Vertical delta

**Returns:** `TextWidget` for chaining

---

### Content Methods

#### setContent

Sets the text content.

```typescript
text.setContent('New label');
```

**Parameters:**
- `text` - The text content

**Returns:** `TextWidget` for chaining

#### getContent

Gets the current text content.

```typescript
const content = text.getContent(); // 'New label'
```

**Returns:** `string`

---

### Focus Methods

#### focus

Focuses the text.

```typescript
text.focus();
```

**Returns:** `TextWidget` for chaining

#### blur

Removes focus from the text.

```typescript
text.blur();
```

**Returns:** `TextWidget` for chaining

#### isFocused

Checks if the text is currently focused.

```typescript
const focused = text.isFocused(); // boolean
```

**Returns:** `boolean`

---

### Children Methods

#### append

Appends a child entity to this text.

```typescript
const childEid = addEntity(world);
text.append(childEid);
```

**Parameters:**
- `child` - Entity ID to append

**Returns:** `TextWidget` for chaining

#### getChildren

Gets all direct children of this text.

```typescript
const children = text.getChildren(); // Entity[]
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget and removes it from the world.

```typescript
text.destroy();
```

---

## Helper Functions

### setTextContent

Sets the content of a text entity.

```typescript
import { setTextContent } from 'blecsd';

setTextContent(world, textEntity, 'Updated label');
```

**Parameters:**
- `world` - The ECS world
- `eid` - Entity ID
- `text` - Text content

**Returns:** `Entity` - The entity ID for chaining

---

### getTextContent

Gets the content of a text entity.

```typescript
import { getTextContent } from 'blecsd';

const content = getTextContent(world, textEntity); // string
```

**Parameters:**
- `world` - The ECS world
- `eid` - Entity ID

**Returns:** `string` - The text content or empty string

---

### isText

Checks if an entity is a text widget.

```typescript
import { isText } from 'blecsd';

if (isText(world, entity)) {
  // Handle text-specific logic
}
```

**Parameters:**
- `world` - The ECS world
- `eid` - Entity ID

**Returns:** `boolean`

---

## Types

### TextConfig

Configuration for creating a text widget.

```typescript
interface TextConfig {
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

  // Content
  readonly content?: string;
  readonly align?: Align;           // 'left' | 'center' | 'right'
  readonly valign?: VAlign;         // 'top' | 'middle' | 'bottom'

  // Behavior
  readonly shrink?: boolean;        // Default: true
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

### TextWidget

The text widget interface.

```typescript
interface TextWidget {
  readonly eid: Entity;
  show(): TextWidget;
  hide(): TextWidget;
  move(dx: number, dy: number): TextWidget;
  setPosition(x: number, y: number): TextWidget;
  setContent(text: string): TextWidget;
  getContent(): string;
  focus(): TextWidget;
  blur(): TextWidget;
  isFocused(): boolean;
  append(child: Entity): TextWidget;
  getChildren(): Entity[];
  destroy(): void;
}
```

---

## Zod Schemas

Zod schemas are provided for runtime validation.

```typescript
import { TextConfigSchema } from 'blecsd';

// Validate configuration
const result = TextConfigSchema.safeParse({
  left: 10,
  top: 5,
  content: 'Hello',
  fg: '#00ff00',
});

if (result.success) {
  // Configuration is valid
}
```

---

## Examples

### Simple Label

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const label = createText(world, eid, {
  left: 0,
  top: 0,
  content: 'Username:',
});
```

### Styled Status Message

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const status = createText(world, eid, {
  left: 0,
  top: 0,
  content: 'Status: Connected',
  fg: '#00ff00',
  align: 'right',
});

// Update status
status.setContent('Status: Disconnected');
```

### Multi-line Text

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const paragraph = createText(world, eid, {
  left: 5,
  top: 5,
  content: 'Line 1\nLine 2\nLine 3',
  shrink: true,  // Shrinks to fit content
});
```

### Method Chaining

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const text = createText(world, eid, { left: 0, top: 0 })
  .setContent('Chained!')
  .setPosition(10, 10)
  .move(5, 5)
  .focus()
  .show();

// Position is now (15, 15)
// Content is 'Chained!'
// Text is focused and visible
```

### Dynamic Content Update

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createText, setTextContent, getTextContent } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const counter = createText(world, eid, {
  left: 0,
  top: 0,
  content: 'Count: 0',
});

// Update via widget method
counter.setContent('Count: 1');

// Or use utility function
setTextContent(world, eid, 'Count: 2');

// Read content
const current = getTextContent(world, eid); // 'Count: 2'
```

### Fixed Size Text (No Shrink)

```typescript
import { createWorld, addEntity } from 'bitecs';
import { createText } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const fixedText = createText(world, eid, {
  left: 0,
  top: 0,
  width: 40,
  height: 3,
  content: 'Fixed size area',
  shrink: false,
  align: 'center',
  valign: 'middle',
});
```

---

## Text vs Box

The Text widget differs from Box in these ways:

| Feature | Text | Box |
|---------|------|-----|
| Shrink to content | **Yes** (default) | No |
| Border | No | Optional |
| Padding | No | Optional |
| Primary use | Labels, messages | Containers, panels |

Use Text for simple labels and status messages. Use Box when you need borders, padding, or a container for other elements.

---

## See Also

- [Box Widget](./box.md) - Container with borders and padding
- [Content Component](../components/content.md) - Text content management
- [Position Component](../components/position.md) - Entity positioning
- [Dimensions Component](../components/dimensions.md) - Widget sizing
