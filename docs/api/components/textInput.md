# TextInput Component

The TextInput component provides text entry fields with cursor management, selection support, and input validation. It uses a state machine for managing focus and editing states.

## Import

```typescript
import {
  attachTextInputBehavior,
  isTextInput,
  getTextInputState,
  focusTextInput,
  blurTextInput,
  handleTextInputKeyPress,
  onTextInputChange,
  onTextInputSubmit,
  getCursorPos,
  setCursorPos,
  getSelection,
  setSelection,
  clearSelection,
} from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  attachTextInputBehavior,
  focusTextInput,
  handleTextInputKeyPress,
  onTextInputChange,
} from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Attach text input behavior
attachTextInputBehavior(world, eid, {
  placeholder: 'Enter your name',
  maxLength: 50,
});

// Listen for changes
onTextInputChange(eid, (value) => {
  console.log(`Value: ${value}`);
});

// In your input loop
function handleKey(key: string) {
  handleTextInputKeyPress(world, eid, key);
}

focusTextInput(world, eid);
```

## State Machine

TextInput uses a state machine with these states:

| State | Description |
|-------|-------------|
| `idle` | Not focused |
| `focused` | Has focus, not actively typing |
| `editing` | Actively receiving input |
| `error` | Validation error |
| `disabled` | Cannot receive input |

### State Transitions

| From | Event | To |
|------|-------|-----|
| idle | focus | focused |
| idle | disable | disabled |
| focused | startEdit | editing |
| focused | blur | idle |
| focused | error | error |
| editing | endEdit | focused |
| editing | blur | idle |
| error | clearError | focused |
| error | blur | idle |
| disabled | enable | idle |

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `secret` | `boolean` | `false` | Password mode (mask characters) |
| `censor` | `string` | `'*'` | Character to show in password mode |
| `placeholder` | `string` | `''` | Text shown when empty |
| `maxLength` | `number` | `0` | Maximum characters (0 = unlimited) |
| `multiline` | `boolean` | `false` | Enable multi-line input |

## Cursor Modes

```typescript
import { CursorMode } from 'blecsd';

// Line cursor (insert mode)
CursorMode.Line;  // 0

// Block cursor (overwrite mode)
CursorMode.Block; // 1
```

## Functions

### Behavior Setup

```typescript
// Attach behavior with options
attachTextInputBehavior(world, eid, {
  placeholder: 'Username',
  maxLength: 20,
});

// Check if entity is text input
if (isTextInput(world, eid)) {
  // Handle text input
}
```

### Focus Management

```typescript
focusTextInput(world, eid);    // Focus the input
blurTextInput(world, eid);     // Remove focus
startEditingTextInput(world, eid);  // Enter editing mode
endEditingTextInput(world, eid);    // Exit editing mode
```

### State & Configuration

```typescript
// Get current state
const state = getTextInputState(world, eid);
// Returns: 'idle' | 'focused' | 'editing' | 'error' | 'disabled'

// Get/set configuration
const config = getTextInputConfig(eid);
setTextInputConfig(eid, { maxLength: 100 });

// Enable/disable
enableTextInput(world, eid);
disableTextInput(world, eid);
```

### Cursor Operations

```typescript
// Get/set cursor position
const pos = getCursorPos(eid);
setCursorPos(world, eid, 10);

// Move cursor
moveCursor(world, eid, 5);   // Move forward 5
moveCursor(world, eid, -3);  // Move back 3

// Cursor mode
const mode = getCursorMode(eid);
setCursorMode(world, eid, CursorMode.Block);
toggleCursorMode(world, eid);

// Cursor visibility and blink
isCursorVisible(eid);
setCursorBlinkEnabled(eid, true);
resetCursorBlink(eid);
```

### Selection

```typescript
// Get selection range
const sel = getSelection(eid);
// Returns: { start: number, end: number } or null

// Set selection
setSelection(world, eid, 5, 15);

// Clear selection
clearSelection(world, eid);

// Check if has selection
if (hasSelection(eid)) {
  const normalized = getNormalizedSelection(eid);
  // { start: 5, end: 15 } (always start < end)
}
```

### Configuration Access

```typescript
// Password mode
if (isSecretMode(eid)) {
  const char = getCensorChar(eid);
  const masked = maskValue(value, char);
}

// Multiline
if (isMultiline(eid)) {
  // Handle newlines
}

// Placeholder
const placeholder = getPlaceholder(eid);

// Max length
const max = getMaxLength(eid);
```

### Error Handling

```typescript
// Set error state
setTextInputError(world, eid);

// Clear error
clearTextInputError(world, eid);

// Check error state
if (isTextInputError(world, eid)) {
  // Show error styling
}
```

### Events

```typescript
// Value changed
const unsub1 = onTextInputChange(eid, (value) => {
  console.log(`New value: ${value}`);
});

// Submitted (Enter pressed)
const unsub2 = onTextInputSubmit(eid, (value) => {
  console.log(`Submitted: ${value}`);
});

// Cancelled (Escape pressed)
const unsub3 = onTextInputCancel(eid, () => {
  console.log('Input cancelled');
});

// Cleanup
unsub1();
unsub2();
unsub3();
```

### Key Handling

```typescript
// In your input loop
const action = handleTextInputKeyPress(world, eid, key);
if (action) {
  switch (action.type) {
    case 'insert':
      // Character inserted
      break;
    case 'delete':
      // Character deleted
      break;
    case 'submit':
      // Enter pressed
      break;
    case 'cancel':
      // Escape pressed
      break;
  }
}
```

## Example: Login Form

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  attachTextInputBehavior,
  onTextInputSubmit,
  setTextInputConfig,
  focusTextInput,
} from 'blecsd';

const world = createWorld();

// Username field
const username = addEntity(world);
attachTextInputBehavior(world, username, {
  placeholder: 'Username',
  maxLength: 30,
});

// Password field
const password = addEntity(world);
attachTextInputBehavior(world, password, {
  placeholder: 'Password',
  secret: true,
  censor: '•',
});

// Handle submit
onTextInputSubmit(password, (value) => {
  // Get username value and submit
  console.log('Login submitted');
});

focusTextInput(world, username);
```

## Example: Validation

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  attachTextInputBehavior,
  onTextInputChange,
  setTextInputError,
  clearTextInputError,
} from 'blecsd';

const emailInput = addEntity(world);
attachTextInputBehavior(world, emailInput, {
  placeholder: 'Email address',
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

onTextInputChange(emailInput, (value) => {
  if (value && !emailRegex.test(value)) {
    setTextInputError(world, emailInput);
  } else {
    clearTextInputError(world, emailInput);
  }
});
```

## Related

- [Form Component](./form.md) - Form container for field management
- [Checkbox Component](./checkbox.md) - Boolean toggle
- [Select Component](./select.md) - Dropdown selection
