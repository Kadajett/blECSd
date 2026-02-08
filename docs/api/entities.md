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

<!-- blecsd-doccheck:ignore -->
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

### createCheckboxEntity

Creates a checkbox entity, an interactive toggle element with label support.

```typescript
import { createWorld, createCheckboxEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple checkbox
const checkbox = createCheckboxEntity(world, {
  x: 5,
  y: 5,
  width: 20,
  height: 1,
  label: 'Enable feature',
});

// Checked checkbox
const checkedBox = createCheckboxEntity(world, {
  x: 5,
  y: 7,
  width: 25,
  height: 1,
  label: 'Accept terms',
  checked: true,
});

// Custom checkbox with custom characters
const customCheckbox = createCheckboxEntity(world, {
  x: 5,
  y: 9,
  width: 22,
  height: 1,
  label: 'Subscribe to newsletter',
  checkedChar: '✓',
  uncheckedChar: '○',
  focusEffectFg: 0x00ff00ff,
});
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional checkbox configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Interactive, Focusable, Border (optional), Padding (optional)

**Default Behaviors:**
- Checkboxes are clickable, hoverable, and keyable by default
- Checkboxes are focusable by default
- Space or Enter toggles the checkbox state

---

### createTextboxEntity

Creates a textbox entity, a single-line text input field with cursor support, password masking, and keyboard navigation.

```typescript
import { createWorld, createTextboxEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple textbox
const textbox = createTextboxEntity(world, {
  x: 10,
  y: 5,
  width: 30,
  height: 1,
});

// Textbox with placeholder
const nameInput = createTextboxEntity(world, {
  x: 10,
  y: 8,
  width: 40,
  height: 1,
  placeholder: 'Enter your name...',
  maxLength: 50,
});

// Password field
const passwordInput = createTextboxEntity(world, {
  x: 10,
  y: 11,
  width: 30,
  height: 1,
  secret: true,
  censor: '*',
  placeholder: 'Password',
});

// Styled textbox with custom focus colors
const styledTextbox = createTextboxEntity(world, {
  x: 10,
  y: 14,
  width: 30,
  height: 1,
  value: 'Initial value',
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
- `config` - Optional textbox configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Interactive, Focusable, Border (optional), Padding (optional)

**Default Behaviors:**
- Textboxes are clickable, hoverable, and keyable by default
- Textboxes are focusable by default
- Enter submits, Escape cancels
- Supports Backspace, Delete, Left/Right arrows, Home/End

---

### createTextareaEntity

Creates a textarea entity, a multi-line text input field with scrolling support and keyboard navigation.

```typescript
import { createWorld, createTextareaEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple textarea
const textarea = createTextareaEntity(world, {
  x: 5,
  y: 5,
  width: 50,
  height: 10,
});

// Textarea with placeholder
const commentBox = createTextareaEntity(world, {
  x: 5,
  y: 5,
  width: 60,
  height: 15,
  placeholder: 'Enter your comment here...',
  value: '',
});

// Styled textarea with border and scrolling
const styledTextarea = createTextareaEntity(world, {
  x: 5,
  y: 22,
  width: 70,
  height: 20,
  value: 'Initial multi-line\ntext content\ncan be pre-filled',
  scrollable: true,
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
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional textarea configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Scrollable, Interactive, Focusable, Border (optional), Padding (optional)

**Default Behaviors:**
- Textareas are clickable, hoverable, and keyable by default
- Textareas are focusable by default
- Supports multi-line editing with Enter for new lines
- Arrow keys navigate cursor, Page Up/Down scrolls

---

### createSelectEntity

Creates a select entity, a dropdown menu for choosing from a list of options.

```typescript
import { createWorld, createSelectEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple select
const select = createSelectEntity(world, {
  x: 10,
  y: 5,
  width: 30,
  height: 1,
  items: ['Option 1', 'Option 2', 'Option 3'],
});

// Select with pre-selected value
const colorSelect = createSelectEntity(world, {
  x: 10,
  y: 8,
  width: 25,
  height: 1,
  items: ['Red', 'Green', 'Blue', 'Yellow'],
  selectedIndex: 2, // Blue selected
});

// Styled select with border
const styledSelect = createSelectEntity(world, {
  x: 10,
  y: 11,
  width: 35,
  height: 1,
  items: ['Small', 'Medium', 'Large', 'Extra Large'],
  selectedIndex: 1,
  focusEffectFg: 0x00ff00ff,
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
- `config` - Optional select configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Interactive, Focusable, Border (optional), Padding (optional)

**Default Behaviors:**
- Selects are clickable, hoverable, and keyable by default
- Selects are focusable by default
- Arrow keys navigate options when focused
- Enter or Space opens/closes dropdown

---

### createSliderEntity

Creates a slider entity, an interactive element for selecting a numeric value within a range.

```typescript
import { createWorld, createSliderEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple slider
const slider = createSliderEntity(world, {
  x: 10,
  y: 5,
  width: 40,
  height: 1,
  min: 0,
  max: 100,
  value: 50,
});

// Volume slider
const volumeSlider = createSliderEntity(world, {
  x: 10,
  y: 8,
  width: 30,
  height: 1,
  min: 0,
  max: 100,
  value: 75,
  step: 5, // Increment by 5
  label: 'Volume',
});

// Styled slider with custom colors
const styledSlider = createSliderEntity(world, {
  x: 10,
  y: 11,
  width: 35,
  height: 1,
  min: -10,
  max: 10,
  value: 0,
  step: 1,
  focusEffectFg: 0x00ff00ff,
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
- `config` - Optional slider configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Interactive, Focusable, Border (optional), Padding (optional)

**Default Behaviors:**
- Sliders are clickable, hoverable, and keyable by default
- Sliders are focusable by default
- Left/Right arrows adjust value
- Click to jump to position

---

### createFormEntity

Creates a form entity, a container for grouping form inputs with validation and submission support.

```typescript
import { createWorld, createFormEntity, createTextboxEntity, createButtonEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple form
const form = createFormEntity(world, {
  x: 5,
  y: 5,
  width: 60,
  height: 20,
});

// Add form fields as children
const nameField = createTextboxEntity(world, {
  parent: form,
  x: 5,
  y: 2,
  width: 40,
  height: 1,
  placeholder: 'Name',
});

const emailField = createTextboxEntity(world, {
  parent: form,
  x: 5,
  y: 4,
  width: 40,
  height: 1,
  placeholder: 'Email',
});

const submitButton = createButtonEntity(world, {
  parent: form,
  x: 5,
  y: 6,
  width: 12,
  height: 3,
  label: 'Submit',
});

// Styled form with border
const styledForm = createFormEntity(world, {
  x: 70,
  y: 5,
  width: 50,
  height: 25,
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
- `config` - Optional form configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Border (optional), Padding (optional)

**Notes:**
- Forms are containers for organizing related inputs
- Child inputs can be navigated with Tab/Shift+Tab
- Submit behavior is handled by button children

---

### createProgressBarEntity

Creates a progress bar entity, a visual indicator of task completion or loading status.

```typescript
import { createWorld, createProgressBarEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple progress bar
const progress = createProgressBarEntity(world, {
  x: 10,
  y: 5,
  width: 40,
  height: 1,
  value: 0,
  max: 100,
});

// Progress bar with label
const downloadProgress = createProgressBarEntity(world, {
  x: 10,
  y: 8,
  width: 50,
  height: 1,
  value: 45,
  max: 100,
  label: 'Downloading...',
});

// Styled progress bar with custom colors
const styledProgress = createProgressBarEntity(world, {
  x: 10,
  y: 11,
  width: 60,
  height: 3,
  value: 75,
  max: 100,
  fg: 0x00ff00ff,
  bg: 0x333333ff,
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
- `config` - Optional progress bar configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Border (optional), Padding (optional)

**Notes:**
- Progress bars are read-only displays (not interactive)
- Value should be between 0 and max
- Bar fills from left to right

---

### createRadioSetEntity

Creates a radio set entity, a container for grouping radio buttons with mutual exclusion.

```typescript
import { createWorld, createRadioSetEntity, createRadioButtonEntity, BorderType } from 'blecsd';

const world = createWorld();

// Simple radio set
const radioSet = createRadioSetEntity(world, {
  x: 10,
  y: 5,
  width: 30,
  height: 10,
});

// Add radio buttons as children
const option1 = createRadioButtonEntity(world, {
  parent: radioSet,
  x: 2,
  y: 1,
  width: 20,
  height: 1,
  label: 'Option 1',
  value: 'opt1',
  checked: true,
});

const option2 = createRadioButtonEntity(world, {
  parent: radioSet,
  x: 2,
  y: 3,
  width: 20,
  height: 1,
  label: 'Option 2',
  value: 'opt2',
});

const option3 = createRadioButtonEntity(world, {
  parent: radioSet,
  x: 2,
  y: 5,
  width: 20,
  height: 1,
  label: 'Option 3',
  value: 'opt3',
});

// Styled radio set with border
const styledRadioSet = createRadioSetEntity(world, {
  x: 50,
  y: 5,
  width: 35,
  height: 12,
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
- `config` - Optional radio set configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Border (optional), Padding (optional)

**Notes:**
- Radio sets enforce mutual exclusion among child radio buttons
- Only one radio button in a set can be checked at a time
- Checking a radio button unchecks all siblings

---

### createRadioButtonEntity

Creates a radio button entity, a selectable option within a radio set.

```typescript
import { createWorld, createRadioSetEntity, createRadioButtonEntity } from 'blecsd';

const world = createWorld();

const radioSet = createRadioSetEntity(world, {
  x: 10,
  y: 5,
  width: 30,
  height: 10,
});

// Simple radio button
const radio1 = createRadioButtonEntity(world, {
  parent: radioSet,
  x: 2,
  y: 1,
  width: 25,
  height: 1,
  label: 'Choice A',
  value: 'a',
});

// Checked radio button
const radio2 = createRadioButtonEntity(world, {
  parent: radioSet,
  x: 2,
  y: 3,
  width: 25,
  height: 1,
  label: 'Choice B',
  value: 'b',
  checked: true,
});

// Custom styled radio button
const radio3 = createRadioButtonEntity(world, {
  parent: radioSet,
  x: 2,
  y: 5,
  width: 25,
  height: 1,
  label: 'Choice C',
  value: 'c',
  checkedChar: '●',
  uncheckedChar: '○',
  focusEffectFg: 0x00ff00ff,
});
```

**Parameters:**
- `world` - The ECS world
- `config` - Optional radio button configuration

**Returns:** Entity ID

**Components Added:** Position, Dimensions, Renderable, Hierarchy, Content, Interactive, Focusable, Border (optional), Padding (optional)

**Default Behaviors:**
- Radio buttons are clickable, hoverable, and keyable by default
- Radio buttons are focusable by default
- Space or Enter selects the radio button
- Must be a child of a RadioSet entity

---

## Configuration Schemas

Each factory has a corresponding Zod schema for config validation:

- `BoxConfigSchema` - Validates box configuration
- `TextConfigSchema` - Validates text configuration
- `ButtonConfigSchema` - Validates button configuration
- `ScreenConfigSchema` - Validates screen configuration (width/height required)
- `InputConfigSchema` - Validates input configuration
- `ListConfigSchema` - Validates list configuration
- `CheckboxConfigSchema` - Validates checkbox configuration
- `TextboxConfigSchema` - Validates textbox configuration
- `TextareaConfigSchema` - Validates textarea configuration
- `SelectConfigSchema` - Validates select configuration
- `SliderConfigSchema` - Validates slider configuration
- `FormConfigSchema` - Validates form configuration
- `ProgressBarConfigSchema` - Validates progress bar configuration
- `RadioSetConfigSchema` - Validates radio set configuration
- `RadioButtonConfigSchema` - Validates radio button configuration

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
