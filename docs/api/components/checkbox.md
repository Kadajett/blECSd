# Checkbox Component

The Checkbox component provides boolean toggle functionality with state machine control and customizable display characters.

## Import

```typescript
import {
  attachCheckboxBehavior,
  isCheckbox,
  isChecked,
  checkCheckbox,
  uncheckCheckbox,
  toggleCheckbox,
  getCheckboxState,
  onCheckboxChange,
  handleCheckboxKeyPress,
  getCheckboxChar,
  setCheckboxDisplay,
} from 'blecsd/components';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, toggleCheckbox, onCheckboxChange } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Attach checkbox behavior
attachCheckboxBehavior(world, eid);

// Listen for changes
onCheckboxChange(eid, (checked) => {
  console.log(`Checkbox is now: ${checked ? 'checked' : 'unchecked'}`);
});

// Toggle programmatically
toggleCheckbox(world, eid);
```

## State Machine

Checkbox uses a state machine with these states:

| State | Description |
|-------|-------------|
| `unchecked` | Not selected |
| `checked` | Selected |
| `disabled` | Cannot be toggled |

### State Transitions

| From | Event | To |
|------|-------|-----|
| unchecked | toggle | checked |
| unchecked | check | checked |
| unchecked | disable | disabled |
| checked | toggle | unchecked |
| checked | uncheck | unchecked |
| checked | disable | disabled |
| disabled | enable | unchecked |

## Display Characters

Default characters:
- Checked: `☑`
- Unchecked: `☐`

You can customize these:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, setCheckboxDisplay } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachCheckboxBehavior(world, eid);

setCheckboxDisplay(world, eid, {
  checkedChar: '[x]',
  uncheckedChar: '[ ]',
});

// Or use other Unicode characters
setCheckboxDisplay(world, eid, {
  checkedChar: '✓',
  uncheckedChar: '○',
});
```

## Functions

### Behavior Setup

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, isCheckbox } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Attach behavior (starts unchecked)
attachCheckboxBehavior(world, eid);

// Start checked
attachCheckboxBehavior(world, eid, true);

// Check if entity is a checkbox
if (isCheckbox(world, eid)) {
  // Handle checkbox
}
```

### State Operations

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, isChecked, isUnchecked, getCheckboxState } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachCheckboxBehavior(world, eid);

// Check current state
if (isChecked(world, eid)) {
  console.log('Checkbox is checked');
}

if (isUnchecked(world, eid)) {
  console.log('Checkbox is unchecked');
}

// Get full state
const state = getCheckboxState(world, eid);
// Returns: 'unchecked' | 'checked' | 'disabled'
```

### Toggle Operations

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, toggleCheckbox, checkCheckbox, uncheckCheckbox, setChecked } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachCheckboxBehavior(world, eid);

// Toggle the checkbox
toggleCheckbox(world, eid);

// Set to checked
checkCheckbox(world, eid);

// Set to unchecked
uncheckCheckbox(world, eid);

// Set directly
setChecked(world, eid, true);
setChecked(world, eid, false);
```

### Enable/Disable

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, disableCheckbox, enableCheckbox, isCheckboxDisabled } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachCheckboxBehavior(world, eid);

// Disable the checkbox
disableCheckbox(world, eid);

// Enable the checkbox
enableCheckbox(world, eid);

// Check if disabled
if (isCheckboxDisabled(world, eid)) {
  // Skip interaction
}
```

### Display

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, getCheckboxChar, getCheckboxDisplay, setCheckboxDisplay, clearCheckboxDisplay } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachCheckboxBehavior(world, eid);

// Get current display character
const char = getCheckboxChar(world, eid);
// Returns '☑' or '☐' (or custom)

// Set custom display first
setCheckboxDisplay(world, eid, {
  checkedChar: '✓',
  uncheckedChar: '○',
});

// Get display configuration
const display = getCheckboxDisplay(eid);
// { checkedChar: '✓', uncheckedChar: '○' }

// Clear display (revert to defaults)
clearCheckboxDisplay(eid);
```

### Events

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, onCheckboxChange, clearCheckboxCallbacks } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachCheckboxBehavior(world, eid);

// Listen for changes
const unsubscribe = onCheckboxChange(eid, (checked) => {
  console.log(`Changed to: ${checked}`);
});

// Cleanup
unsubscribe();

// Clear all callbacks
clearCheckboxCallbacks(eid);
```

### Key Handling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, handleCheckboxKeyPress } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachCheckboxBehavior(world, eid);
const key = 'space';

// In your input loop
const action = handleCheckboxKeyPress(world, eid, key);

// Returns action taken or null
if (action === 'toggle') {
  // Checkbox was toggled
}
```

### State Machine Events

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachCheckboxBehavior, sendCheckboxEvent, isCheckboxInState } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachCheckboxBehavior(world, eid);

// Send raw events
sendCheckboxEvent(world, eid, 'toggle');
sendCheckboxEvent(world, eid, 'check');
sendCheckboxEvent(world, eid, 'uncheck');
sendCheckboxEvent(world, eid, 'disable');
sendCheckboxEvent(world, eid, 'enable');

// Check state
if (isCheckboxInState(world, eid, 'checked')) {
  // Handle checked state
}
```

## Example: Settings Panel

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachCheckboxBehavior,
  onCheckboxChange,
  setCheckboxDisplay,
  checkCheckbox,
  isChecked,
} from 'blecsd/components';

const world = createWorld();

// Create checkboxes for settings
const settings = {
  darkMode: addEntity(world),
  notifications: addEntity(world),
  autoSave: addEntity(world),
};

// Set up checkboxes
for (const eid of Object.values(settings)) {
  attachCheckboxBehavior(world, eid);
  setCheckboxDisplay(world, eid, {
    checkedChar: '[●]',
    uncheckedChar: '[ ]',
  });
}

// Enable auto-save by default
checkCheckbox(world, settings.autoSave);

// Listen for changes
onCheckboxChange(settings.darkMode, (checked) => {
  console.log(`Dark mode: ${checked ? 'on' : 'off'}`);
});

onCheckboxChange(settings.notifications, (checked) => {
  console.log(`Notifications: ${checked}`);
});

onCheckboxChange(settings.autoSave, (checked) => {
  console.log(`Auto-save: ${checked}`);
});
```

## Example: Form with Checkboxes

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachFormBehavior,
  attachCheckboxBehavior,
  registerFormField,
  getFormValues,
} from 'blecsd/components';

const world = createWorld();
const form = addEntity(world);
attachFormBehavior(world, form);

const rememberMe = addEntity(world);
attachCheckboxBehavior(world, rememberMe);
registerFormField(world, form, rememberMe, 'rememberMe', false);

const agreeTerms = addEntity(world);
attachCheckboxBehavior(world, agreeTerms);
registerFormField(world, form, agreeTerms, 'agreeTerms', false);

// Get form values
const values = getFormValues(world, form);
// { rememberMe: true, agreeTerms: false }
```

## Related

- [Form Component](./form.md) - Form container for field management
- RadioButton Component - Single selection from group
- [TextInput Component](./textInput.md) - Text entry field
