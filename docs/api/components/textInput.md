# TextInput Component

The TextInput component provides text entry fields with cursor management, selection support, and input validation. It uses a state machine for managing focus and editing states.

## Import

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachTextInputBehavior,
  isTextInput,
  getTextInputState,
  focusTextInput,
  blurTextInput,
  startEditingTextInput,
  endEditingTextInput,
  enableTextInput,
  disableTextInput,
  setTextInputError,
  clearTextInputError,
  isTextInputError,
  handleTextInputKeyPress,
  onTextInputChange,
  onTextInputSubmit,
  onTextInputCancel,
  getCursorPos,
  setCursorPos,
  moveCursor,
  getCursorMode,
  setCursorMode,
  toggleCursorMode,
  isCursorVisible,
  setCursorBlinkEnabled,
  resetCursorBlink,
  getSelection,
  setSelection,
  clearSelection,
  hasSelection,
  getNormalizedSelection,
  getTextInputConfig,
  setTextInputConfig,
  isSecretMode,
  getCensorChar,
  maskValue,
  isMultiline,
  getPlaceholder,
  getMaxLength,
  CursorMode,
} from 'blecsd/components';

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
| `validator` | `ValidationFunction` | `undefined` | Validation callback function |
| `validationTiming` | `ValidationTiming` | `'both'` | When to run validation |

## Cursor Modes

```typescript
// Line cursor (insert mode)
console.log(CursorMode.Line);  // 0

// Block cursor (overwrite mode)
console.log(CursorMode.Block); // 1
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
focusTextInput(world, eid);          // Focus the input
blurTextInput(world, eid);           // Remove focus
startEditingTextInput(world, eid);   // Enter editing mode
endEditingTextInput(world, eid);     // Exit editing mode
```

### State & Configuration

```typescript
// Get current state
const state = getTextInputState(world, eid);
// Returns: 'idle' | 'focused' | 'editing' | 'error' | 'disabled'
console.log(state);

// Get/set configuration
const config = getTextInputConfig(world, eid);
setTextInputConfig(world, eid, { maxLength: 100 });
console.log(config);

// Enable/disable
enableTextInput(world, eid);
disableTextInput(world, eid);
enableTextInput(world, eid); // re-enable for later use
```

### Cursor Operations

```typescript
// Get/set cursor position
const pos = getCursorPos(eid);
setCursorPos(world, eid, 10);
console.log(pos);

// Move cursor
moveCursor(world, eid, 5);   // Move forward 5
moveCursor(world, eid, -3);  // Move back 3

// Cursor mode
const mode = getCursorMode(eid);
setCursorMode(world, eid, CursorMode.Block);
toggleCursorMode(world, eid);
console.log(mode);

// Cursor visibility and blink
const vis = isCursorVisible(eid);
setCursorBlinkEnabled(eid, true);
resetCursorBlink(eid);
console.log(vis);
```

### Selection

```typescript
// Get selection range
const sel = getSelection(eid);
// Returns: { start: number, end: number } or null
console.log(sel);

// Set selection
setSelection(world, eid, 5, 15);

// Clear selection
clearSelection(world, eid);

// Check if has selection
if (hasSelection(eid)) {
  const normalized = getNormalizedSelection(eid);
  // { start: 5, end: 15 } (always start < end)
  console.log(normalized);
}
```

### Configuration Access

```typescript
// Password mode
if (isSecretMode(eid)) {
  const char = getCensorChar(eid);
  const masked = maskValue('secret', char);
  console.log(char, masked);
}

// Multiline
if (isMultiline(eid)) {
  // Handle newlines
}

// Placeholder
const placeholder = getPlaceholder(eid);
console.log(placeholder);

// Max length
const max = getMaxLength(eid);
console.log(max);
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
// Basic key handling
const action1 = handleTextInputKeyPress(world, eid, 'a');
if (action1) {
  switch (action1.type) {
    case 'insert':
      break;
    case 'delete':
      break;
    case 'submit':
      break;
    case 'cancel':
      break;
  }
}

// With Ctrl modifier for word navigation
const action2 = handleTextInputKeyPress(world, eid, 'left', '', true);
if (action2) {
  switch (action2.type) {
    case 'moveWordLeft':
      break;
    case 'moveWordRight':
      break;
    case 'deleteWordBackward':
      break;
    case 'deleteWordForward':
      break;
  }
}
```

### Word Navigation

Word-level cursor movement and deletion is supported via keyboard modifiers:

| Key | Action |
|-----|--------|
| Ctrl+Left | Move cursor to start of previous word |
| Ctrl+Right | Move cursor to start of next word |
| Ctrl+Backspace | Delete word before cursor |
| Ctrl+Delete | Delete word after cursor |

```typescript
// Pass ctrl=true to enable word operations
handleTextInputKeyPress(world, eid, 'left', '', true);
handleTextInputKeyPress(world, eid, 'backspace', '', true);
```

Word boundaries are detected using the built-in `isWordBoundary` function, which treats whitespace and punctuation as word separators.

## Example: Login Form

```typescript
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
  console.log(`Login submitted with password length: ${value.length}`);
});

focusTextInput(world, username);
```

## Validation

TextInput supports built-in validation with customizable timing and error messages.

### Validation Function

A validation function receives the current value and returns:
- `true` if valid
- `false` if invalid (shows "Invalid input" message)
- A string error message if invalid

### Validation Timing

Control when validation runs:

| Timing | Description |
|--------|-------------|
| `'onChange'` | Validate every time value changes |
| `'onSubmit'` | Validate only when Enter is pressed |
| `'both'` | Validate on both change and submit (default) |

### Validation API

```typescript
// Set validator when creating input
setTextInputConfig(world, eid, {
  validator: (value) => value.length >= 8 || 'Must be at least 8 characters',
  validationTiming: 'onSubmit',
});
```

### Validation Behavior

- When `validationTiming` is `'onChange'` or `'both'`, validation runs automatically in `emitValueChange`
- When `validationTiming` is `'onSubmit'` or `'both'`, validation runs automatically in `emitSubmit`
- If validation fails on submit, the submit event is **not emitted** and `emitSubmit` returns `false`
- Validation errors automatically trigger the `'error'` state in the state machine

## Example: Email Validation

```typescript
const emailInput = addEntity(world);
attachTextInputBehavior(world, emailInput);

// Set up email validation
setTextInputConfig(world, emailInput, {
  placeholder: 'Email address',
  validator: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value) || 'Invalid email format';
  },
  validationTiming: 'both',
});
```

## Example: Number Range Validation

```typescript
setTextInputConfig(world, eid, {
  placeholder: 'Enter age (0-120)',
  validator: (value) => {
    const num = Number.parseFloat(value);
    if (Number.isNaN(num)) return 'Must be a number';
    if (num < 0 || num > 120) return 'Must be between 0 and 120';
    return true;
  },
  validationTiming: 'onChange',
});
```

## Example: Password Strength

```typescript
const passwordInput = addEntity(world);
attachTextInputBehavior(world, passwordInput, { secret: true });
setTextInputConfig(world, passwordInput, {
  validator: (value) => {
    if (value.length < 8) return 'At least 8 characters required';
    if (!/[A-Z]/.test(value)) return 'Must contain uppercase letter';
    if (!/[0-9]/.test(value)) return 'Must contain number';
    return true;
  },
  validationTiming: 'onChange',
});
```

## Related

- [Form Component](./form.md) - Form container for field management
- Checkbox Component - Boolean toggle
- [Select Component](./select.md) - Dropdown selection
