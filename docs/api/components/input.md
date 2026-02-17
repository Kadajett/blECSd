# Input Components API

ECS components for storing keyboard and mouse input state.

## Overview

The input module provides three components:
- **KeyboardInput** - Keyboard state (last key, modifiers)
- **MouseInput** - Mouse state (position, button, click count)
- **InputBuffer** - Text input buffer with cursor and selection

All components use the SoA (Structure of Arrays) pattern for performance.

## KeyboardInput Component

Stores keyboard state for an entity.

### setKeyboardInput

Add or update keyboard input state.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setKeyboardInput } from 'blecsd';

setKeyboardInput(world, entity, {
  lastKeyCode: 65,      // 'A' key
  lastKeyTime: Date.now(),
  ctrl: true,
  meta: false,
  shift: false
});
```

**Options:**
- `lastKeyCode` - Last key code pressed
- `lastKeyTime` - Timestamp of last key press
- `modifiers` - Packed modifier flags (or use individual booleans)
- `ctrl` - Control key held
- `meta` - Meta/Cmd key held
- `shift` - Shift key held

### getKeyboardInput

Get keyboard state for an entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getKeyboardInput } from 'blecsd';

const input = getKeyboardInput(world, entity);
if (input) {
  console.log(`Last key: ${input.lastKeyCode}`);
  console.log(`Ctrl: ${input.ctrl}, Shift: ${input.shift}`);
}
```

**Returns:** `KeyboardInputData | undefined`

### clearKeyboardInput

Reset keyboard state to defaults.

<!-- blecsd-doccheck:ignore -->
```typescript
import { clearKeyboardInput } from 'blecsd';

clearKeyboardInput(world, entity);
```

### hasKeyboardInput / removeKeyboardInput

Check or remove the component.

<!-- blecsd-doccheck:ignore -->
```typescript
import { hasKeyboardInput, removeKeyboardInput } from 'blecsd';

if (hasKeyboardInput(world, entity)) {
  removeKeyboardInput(world, entity);
}
```

## Modifier Helpers

### ModifierFlags

Constants for modifier key flags.

<!-- blecsd-doccheck:ignore -->
```typescript
import { ModifierFlags } from 'blecsd';

ModifierFlags.NONE  // 0
ModifierFlags.CTRL  // 1
ModifierFlags.META  // 2
ModifierFlags.SHIFT // 4
```

### packModifiers

Pack boolean modifiers into a single value.

<!-- blecsd-doccheck:ignore -->
```typescript
import { packModifiers, ModifierFlags } from 'blecsd';

const packed = packModifiers(true, false, true); // Ctrl + Shift
// Result: ModifierFlags.CTRL | ModifierFlags.SHIFT = 5
```

### unpackModifiers

Unpack modifiers to boolean values.

<!-- blecsd-doccheck:ignore -->
```typescript
import { unpackModifiers } from 'blecsd';

const { ctrl, meta, shift } = unpackModifiers(5);
// ctrl: true, meta: false, shift: true
```

## MouseInput Component

Stores mouse state for an entity.

### setMouseInput

Add or update mouse input state.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setMouseInput, MouseButtons } from 'blecsd';

setMouseInput(world, entity, {
  x: 10,
  y: 5,
  button: MouseButtons.LEFT,
  pressed: true,
  clickCount: 1
});
```

**Options:**
- `x`, `y` - Mouse position
- `button` - Button constant (see MouseButtons)
- `pressed` - Whether button is pressed
- `clickCount` - Number of clicks (1, 2, 3)
- `lastClickTime` - Timestamp for click detection
- `lastClickX`, `lastClickY` - Position of last click

### getMouseInput

Get mouse state for an entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getMouseInput } from 'blecsd';

const mouse = getMouseInput(world, entity);
if (mouse) {
  console.log(`Position: ${mouse.x}, ${mouse.y}`);
  console.log(`Pressed: ${mouse.pressed}`);
  console.log(`Clicks: ${mouse.clickCount}`);
}
```

### recordClick

Record a click and detect double/triple clicks.

<!-- blecsd-doccheck:ignore -->
```typescript
import { recordClick, MouseButtons } from 'blecsd';

const clickCount = recordClick(world, entity, x, y, MouseButtons.LEFT);
if (clickCount === 2) {
  console.log('Double click!');
} else if (clickCount === 3) {
  console.log('Triple click!');
}
```

Click detection uses:
- 500ms timeout between clicks
- Caps at 3 clicks (triple click)
- Resets on different button

### clearMouseInput / removeMouseInput

<!-- blecsd-doccheck:ignore -->
```typescript
import { clearMouseInput, removeMouseInput } from 'blecsd';

clearMouseInput(world, entity);  // Reset to defaults
removeMouseInput(world, entity); // Remove component
```

### MouseButtons

Mouse button constants.

<!-- blecsd-doccheck:ignore -->
```typescript
import { MouseButtons } from 'blecsd';

MouseButtons.NONE       // 0
MouseButtons.LEFT       // 1
MouseButtons.MIDDLE     // 2
MouseButtons.RIGHT      // 3
MouseButtons.WHEEL_UP   // 4
MouseButtons.WHEEL_DOWN // 5
```

## InputBuffer Component

Text input buffer with cursor and selection support.

### inputBufferStore

Low-level store for managing text buffers.

<!-- blecsd-doccheck:ignore -->
```typescript
import { inputBufferStore } from 'blecsd';

// Create a buffer
const bufferId = inputBufferStore.create('Initial text');

// Manipulate text
inputBufferStore.setText(bufferId, 'New text');
inputBufferStore.insert(bufferId, 4, ' inserted');
inputBufferStore.delete(bufferId, 0, 4);

// Query
const text = inputBufferStore.getText(bufferId);
const length = inputBufferStore.getLength(bufferId);

// Cleanup
inputBufferStore.remove(bufferId);
inputBufferStore.clear(); // Remove all buffers
```

### setInputBuffer

Add or update input buffer state.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setInputBuffer, inputBufferStore } from 'blecsd';

const bufferId = inputBufferStore.create('Hello');

setInputBuffer(world, entity, {
  bufferId,
  cursorPos: 5,
  selectionStart: 0,
  selectionEnd: 5
});
```

**Options:**
- `bufferId` - ID from inputBufferStore
- `cursorPos` - Cursor position
- `selectionStart`, `selectionEnd` - Selection range (-1 for none)

### getInputBuffer

Get input buffer state.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getInputBuffer } from 'blecsd';

const buffer = getInputBuffer(world, entity);
if (buffer) {
  console.log(`Cursor: ${buffer.cursorPos}`);
  console.log(`Has selection: ${buffer.hasSelection}`);
  if (buffer.hasSelection) {
    console.log(`Selection: ${buffer.selectionStart}-${buffer.selectionEnd}`);
  }
}
```

### getInputBufferText / setInputBufferText

Convenience functions for buffer text.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getInputBufferText, setInputBufferText } from 'blecsd';

const text = getInputBufferText(world, entity);
setInputBufferText(world, entity, 'New value');
```

### Selection Management

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  setInputBufferSelection,
  clearInputBufferSelection
} from 'blecsd';

// Set selection
setInputBufferSelection(world, entity, 0, 5);

// Clear selection
clearInputBufferSelection(world, entity);
```

### removeInputBuffer

Remove the component and its buffer.

<!-- blecsd-doccheck:ignore -->
```typescript
import { removeInputBuffer } from 'blecsd';

// Removes component AND deletes buffer from store
removeInputBuffer(world, entity);
```

## Types

### KeyboardInputData

```typescript
interface KeyboardInputData {
  lastKeyCode: number;
  lastKeyTime: number;
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
}
```

### MouseInputData

```typescript
interface MouseInputData {
  x: number;
  y: number;
  button: number;
  pressed: boolean;
  clickCount: number;
  lastClickTime: number;
  lastClickX: number;
  lastClickY: number;
}
```

### InputBufferData

```typescript
interface InputBufferData {
  bufferId: number;
  cursorPos: number;
  selectionStart: number;
  selectionEnd: number;
  hasSelection: boolean;
}
```

## Direct Component Access

For high-performance code, access arrays directly:

<!-- blecsd-doccheck:ignore -->
```typescript
import { KeyboardInput, MouseInput, InputBuffer } from 'blecsd';

// In a system
for (const eid of entities) {
  const keyCode = KeyboardInput.lastKeyCode[eid];
  const mouseX = MouseInput.x[eid];
  const cursorPos = InputBuffer.cursorPos[eid];
}
```

**Component Arrays:**

KeyboardInput:
- `lastKeyCode: Uint16Array`
- `lastKeyTime: Float64Array`
- `modifiers: Uint8Array`

MouseInput:
- `x, y: Float32Array`
- `button: Uint8Array`
- `pressed: Uint8Array`
- `clickCount: Uint8Array`
- `lastClickTime: Float64Array`
- `lastClickX, lastClickY: Float32Array`

InputBuffer:
- `bufferId: Uint32Array`
- `cursorPos: Uint32Array`
- `selectionStart, selectionEnd: Int32Array`
