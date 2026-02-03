# Entity Factories

Entity factory functions create ECS entities with pre-configured components for common UI element types.

## Overview

Entity factories are the low-level API for creating UI elements in blECSd. Each factory:

1. Creates an entity using `addEntity()`
2. Adds the required components for that entity type
3. Initializes components with config values
4. Returns the entity ID

## Factory Functions

### createBoxEntity

Creates a box entity, a basic container with position, dimensions, optional border, and padding.

```typescript
import { createWorld, createBoxEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple box
const box = createBoxEntity(world, {
  x: 10,
  y: 5,
  width: 40,
  height: 10,
});

// Styled box with border
const styledBox = createBoxEntity(world, {
  x: 0,
  y: 0,
  width: 20,
  height: 5,
  fg: 0xffffffff,
  bg: 0x0000ffff,
  border: {
    type: BorderType.Line,
    left: true,
    right: true,
    top: true,
    bottom: true,
  },
  padding: {
    left: 1,
    right: 1,
    top: 0,
    bottom: 0,
  },
});

// Child box
const childBox = createBoxEntity(world, {
  parent: styledBox,
  x: 2,
  y: 1,
  width: 10,
  height: 3,
});
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional box configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Border (optional), Padding (optional)

---

### createTextEntity

Creates a text entity that displays content with optional styling, alignment, and text wrapping.

```typescript
import { createWorld, createTextEntity, TextAlign, TextVAlign } from 'blecsd';

const world = createWorld();

// Simple text
const text = createTextEntity(world, {
  x: 5,
  y: 2,
  text: 'Hello, World!',
});

// Centered styled text
const title = createTextEntity(world, {
  x: 0,
  y: 0,
  width: 40,
  height: 3,
  text: 'Centered Title',
  fg: 0x00ff00ff,
  align: TextAlign.Center,
  valign: TextVAlign.Middle,
});

// Wrapped paragraph
const paragraph = createTextEntity(world, {
  x: 5,
  y: 10,
  width: 60,
  text: 'This is a long paragraph that will wrap to fit within the specified width.',
  wrap: true,
});
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional text configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Border (optional), Padding (optional)

---

### createButtonEntity

Creates a button entity, an interactive element with focus support and click handling.

```typescript
import { createWorld, createButtonEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple button
const button = createButtonEntity(world, {
  x: 10,
  y: 5,
  width: 12,
  height: 3,
  label: 'Submit',
});

// Styled button with border
const styledButton = createButtonEntity(world, {
  x: 10,
  y: 10,
  width: 16,
  height: 3,
  label: 'Cancel',
  fg: 0xffffffff,
  bg: 0xff0000ff,
  hoverEffectFg: 0xffffffff,
  hoverEffectBg: 0xff4444ff,
  focusEffectFg: 0xffffffff,
  focusEffectBg: 0x0066ffff,
  border: {
    type: BorderType.Line,
    left: true,
    right: true,
    top: true,
    bottom: true,
  },
});

// Button with custom tab order
const tabButton = createButtonEntity(world, {
  x: 30,
  y: 5,
  label: 'Next',
  tabIndex: 2,
});
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional button configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Interactive, Focusable, Border (optional), Padding (optional)

**Default Behaviors:**
- Buttons are clickable, hoverable, and keyable by default
- Buttons are focusable by default
- Label is centered horizontally and vertically

---

### createScreenEntity

Creates a screen entity, the root container for all other entities.

```typescript
import { createWorld, createScreenEntity } from 'blecsd';

const world = createWorld();

// Basic screen
const screen = createScreenEntity(world, {
  width: 80,
  height: 24,
});

// Screen with title
const namedScreen = createScreenEntity(world, {
  width: 120,
  height: 40,
  title: 'File Manager',
});
```

**Parameters:**
- `world` - The ECS world
- `config` - Screen configuration with required width and height

**Returns:** Entity ID

**Throws:** `ZodError` if width or height are missing or not positive integers

**Components Added:** Position, Dimensions, Renderable, Hierarchy

**Notes:**
- Screens are always positioned at (0,0)
- Screens are always visible
- Screens have no parent (they are root entities)

---

### createInputEntity

Creates an input entity, a text input field with focus and key handling.

```typescript
import { createWorld, createInputEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple input
const input = createInputEntity(world, {
  x: 10,
  y: 5,
  width: 30,
  height: 1,
});

// Input with placeholder and max length
const emailInput = createInputEntity(world, {
  x: 10,
  y: 8,
  width: 40,
  height: 1,
  value: '',
  placeholder: 'Enter your email...',
  maxLength: 100,
});

// Styled input with custom focus colors
const styledInput = createInputEntity(world, {
  x: 10,
  y: 11,
  width: 30,
  height: 1,
  focusEffectFg: 0x00ff00ff,
  focusEffectBg: 0x111111ff,
  border: {
    type: BorderType.Line,
    left: true,
    right: true,
    top: true,
    bottom: true,
  },
});
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional input configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Interactive, Focusable, Border (optional), Padding (optional)

**Default Behaviors:**
- Inputs are clickable, hoverable, and keyable by default
- Inputs are focusable by default

---

### createListEntity

Creates a list entity that displays a scrollable list of items with selection support.

```typescript
import { createWorld, createListEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple list
const list = createListEntity(world, {
  x: 5,
  y: 5,
  width: 30,
  height: 10,
  items: ['Option 1', 'Option 2', 'Option 3'],
});

// Menu list with selection and scrolling
const menuList = createListEntity(world, {
  x: 0,
  y: 0,
  width: 25,
  height: 8,
  items: ['New File', 'Open File', 'Save', 'Settings', 'Exit'],
  selectedIndex: 0,
  scrollable: true,
  border: {
    type: BorderType.Line,
    left: true,
    right: true,
    top: true,
    bottom: true,
  },
});

// List with custom focus styling
const styledList = createListEntity(world, {
  x: 30,
  y: 5,
  width: 20,
  height: 6,
  items: ['Red', 'Green', 'Blue'],
  focusEffectFg: 0xffff00ff,
  focusEffectBg: 0x333333ff,
  tabIndex: 1,
});
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional list configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Scrollable, Interactive, Focusable, Border (optional), Padding (optional)

**Notes:**
- Items are stored as newline-separated content
- Lists are focusable and keyable by default
- Scrollbar visibility defaults to "auto"

---

## Configuration Schemas

Each factory has a corresponding Zod schema for config validation:

- `BoxConfigSchema` - Validates box configuration
- `TextConfigSchema` - Validates text configuration
- `ButtonConfigSchema` - Validates button configuration
- `ScreenConfigSchema` - Validates screen configuration (width/height required)
- `InputConfigSchema` - Validates input configuration
- `ListConfigSchema` - Validates list configuration

### Common Config Options

**Position Options:**
- `x` - X coordinate (number)
- `y` - Y coordinate (number)
- `z` - Z-index for layering (number)
- `absolute` - Use absolute positioning (boolean)

**Dimension Options:**
- `width` - Width (number or percentage string like "50%")
- `height` - Height (number or percentage string)
- `minWidth`, `maxWidth` - Width constraints (number)
- `minHeight`, `maxHeight` - Height constraints (number)
- `shrink` - Allow shrinking to fit content (boolean)

**Style Options:**
- `fg` - Foreground color (32-bit RGBA)
- `bg` - Background color (32-bit RGBA)
- `bold`, `italic`, `underline`, `strikethrough`, `dim`, `inverse`, `blink` - Text styles (boolean)
- `visible` - Visibility (boolean)

**Border Options (nested under `border`):**
- `type` - Border type (BorderType enum)
- `left`, `right`, `top`, `bottom` - Enable specific borders (boolean)
- `fg`, `bg` - Border colors (32-bit RGBA)
- `chars` - Custom border characters (BorderCharset)

**Padding Options (nested under `padding`):**
- `left`, `right`, `top`, `bottom` - Padding values (number)

**Interactive Options:**
- `clickable`, `draggable`, `hoverable`, `keyable` - Enable interactions (boolean)
- `hoverEffectFg`, `hoverEffectBg` - Hover state colors (32-bit RGBA)

**Focusable Options:**
- `focusable` - Enable focus (boolean)
- `tabIndex` - Tab order index (number)
- `focusEffectFg`, `focusEffectBg` - Focus state colors (32-bit RGBA)

**Scrollable Options:**
- `scrollable` - Enable scrolling (boolean)
- `scrollX`, `scrollY` - Initial scroll position (number)
- `scrollWidth`, `scrollHeight` - Content size (number)
- `scrollbarVisible` - Scrollbar visibility mode (number)

---

## See Also

- [Components Reference](./components.md) - Component documentation
- [World & Scheduler](./core.md) - ECS world and system scheduling
