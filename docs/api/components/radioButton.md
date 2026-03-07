# RadioButton Component

The RadioButton component provides single-selection functionality within a group. Radio buttons in a set are mutually exclusive: selecting one deselects all others.

## Import

```typescript
import {
  attachRadioSetBehavior,
  attachRadioButtonBehavior,
  isRadioSet,
  isRadioButton,
  isRadioSelected,
  selectRadioButton,
  getSelectedValue,
  getSelectedButton,
  onRadioSelect,
  handleRadioButtonKeyPress,
  setRadioValue,
  getRadioValue,
  setRadioButtonDisplay,
} from 'blecsd/components';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachRadioSetBehavior,
  attachRadioButtonBehavior,
  setRadioValue,
  onRadioSelect,
} from 'blecsd/components';

const world = createWorld();

// Create a radio set (container)
const radioSet = addEntity(world);
attachRadioSetBehavior(world, radioSet);

// Create radio buttons
const option1 = addEntity(world);
attachRadioButtonBehavior(world, option1, radioSet);
setRadioValue(option1, 'small');

const option2 = addEntity(world);
attachRadioButtonBehavior(world, option2, radioSet);
setRadioValue(option2, 'medium');

const option3 = addEntity(world);
attachRadioButtonBehavior(world, option3, radioSet);
setRadioValue(option3, 'large');

// Listen for selection changes
onRadioSelect(radioSet, (value, entity) => {
  console.log(`Selected: ${value}`);
});

// Select an option
selectRadioButton(world, option2);
```

## State Machine

RadioButton uses a state machine with these states:

| State | Description |
|-------|-------------|
| `unselected` | Not selected |
| `selected` | Currently selected |
| `disabled` | Cannot be selected |

### State Transitions

| From | Event | To |
|------|-------|-----|
| unselected | select | selected |
| unselected | disable | disabled |
| selected | deselect | unselected |
| selected | disable | disabled |
| disabled | enable | unselected |

## Display Characters

Default characters:
- Selected: `◉`
- Unselected: `○`

Customize with:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, setRadioButtonDisplay } from 'blecsd/components';

const world = createWorld();
const radioSet = addEntity(world);
const eid = addEntity(world);
attachRadioSetBehavior(world, radioSet);
attachRadioButtonBehavior(world, eid, radioSet);

setRadioButtonDisplay(world, eid, {
  selectedChar: '(•)',
  unselectedChar: '( )',
});

// Or use other characters
setRadioButtonDisplay(world, eid, {
  selectedChar: '●',
  unselectedChar: '○',
});
```

## Functions

### RadioSet (Container)

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, isRadioSet, getSelectedValue, getSelectedButton, getRadioButtonsInSet, getRadioSet, setRadioValue } from 'blecsd/components';

const world = createWorld();
const containerEntity = addEntity(world);
const setEntity = addEntity(world);
const buttonEntity = addEntity(world);
const eid = addEntity(world);
attachRadioSetBehavior(world, setEntity);
attachRadioButtonBehavior(world, buttonEntity, setEntity);
setRadioValue(buttonEntity, 'option1');

// Mark entity as a radio set container
attachRadioSetBehavior(world, containerEntity);

// Check if entity is a radio set
if (isRadioSet(world, eid)) {
  // Handle radio set
}

// Get selected value from set
const value = getSelectedValue(world, setEntity);
// Returns: string | null

// Get selected button entity
const buttonEid = getSelectedButton(world, setEntity);
// Returns: Entity | null

// Get all buttons in set
const buttons = getRadioButtonsInSet(world, setEntity);
// Returns: Entity[]

// Get radio set for a button
const set = getRadioSet(world, buttonEntity);
```

### RadioButton

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, isRadioButton, isRadioSelected } from 'blecsd/components';

const world = createWorld();
const setEntity = addEntity(world);
const buttonEntity = addEntity(world);
const eid = addEntity(world);
attachRadioSetBehavior(world, setEntity);

// Attach radio button to a set
attachRadioButtonBehavior(world, buttonEntity, setEntity);

// Check if entity is a radio button
if (isRadioButton(world, eid)) {
  // Handle radio button
}

// Check if selected
if (isRadioSelected(world, eid)) {
  // Button is selected
}
```

### Selection

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, selectRadioButton, deselectRadioButton, selectRadioByValue, setRadioValue } from 'blecsd/components';

const world = createWorld();
const setEntity = addEntity(world);
const buttonEntity = addEntity(world);
attachRadioSetBehavior(world, setEntity);
attachRadioButtonBehavior(world, buttonEntity, setEntity);
setRadioValue(buttonEntity, 'medium');

// Select a specific button (deselects others in set)
selectRadioButton(world, buttonEntity);

// Deselect a button
deselectRadioButton(world, buttonEntity);

// Select by value
selectRadioByValue(world, setEntity, 'medium');
```

### Values

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, setRadioValue, getRadioValue } from 'blecsd/components';

const world = createWorld();
const setEntity = addEntity(world);
const buttonEntity = addEntity(world);
attachRadioSetBehavior(world, setEntity);
attachRadioButtonBehavior(world, buttonEntity, setEntity);

// Set value for a radio button
setRadioValue(buttonEntity, 'option1');

// Get value for a radio button
const value = getRadioValue(buttonEntity);
// Returns: string | undefined
```

### Enable/Disable

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, disableRadioButton, enableRadioButton, isRadioButtonDisabled } from 'blecsd/components';

const world = createWorld();
const setEntity = addEntity(world);
const buttonEntity = addEntity(world);
const eid = addEntity(world);
attachRadioSetBehavior(world, setEntity);
attachRadioButtonBehavior(world, buttonEntity, setEntity);
attachRadioButtonBehavior(world, eid, setEntity);

// Disable a radio button
disableRadioButton(world, buttonEntity);

// Enable a radio button
enableRadioButton(world, buttonEntity);

// Check if disabled
if (isRadioButtonDisabled(world, eid)) {
  // Skip interaction
}
```

### Display

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, getRadioButtonChar, getRadioButtonDisplay, setRadioButtonDisplay, clearRadioButtonDisplay } from 'blecsd/components';

const world = createWorld();
const setEntity = addEntity(world);
const eid = addEntity(world);
attachRadioSetBehavior(world, setEntity);
attachRadioButtonBehavior(world, eid, setEntity);

// Get current display character
const char = getRadioButtonChar(world, eid);
// Returns: '◉' or '○' (or custom)

// Set custom display
setRadioButtonDisplay(world, eid, {
  selectedChar: '●',
  unselectedChar: '○',
});

// Get display configuration
const display = getRadioButtonDisplay(world, eid);

// Clear display (revert to defaults)
clearRadioButtonDisplay(eid);
```

### Events

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, onRadioSelect, clearRadioSetCallbacks } from 'blecsd/components';

const world = createWorld();
const setEntity = addEntity(world);
attachRadioSetBehavior(world, setEntity);

// Listen for selection changes on the SET
const unsubscribe = onRadioSelect(setEntity, (value, buttonEntity) => {
  console.log(`Selected: ${value}`);
});

// Cleanup
unsubscribe();

// Clear all callbacks
clearRadioSetCallbacks(setEntity);
```

### State Queries

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, getRadioButtonState, isRadioButtonInState } from 'blecsd/components';

const world = createWorld();
const setEntity = addEntity(world);
const eid = addEntity(world);
attachRadioSetBehavior(world, setEntity);
attachRadioButtonBehavior(world, eid, setEntity);

// Get state of radio button
const state = getRadioButtonState(world, eid);
// Returns: 'unselected' | 'selected' | 'disabled'

// Check specific state
if (isRadioButtonInState(world, eid, 'selected')) {
  // Handle selected state
}
```

### Key Handling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, handleRadioButtonKeyPress } from 'blecsd/components';

const world = createWorld();
const setEntity = addEntity(world);
const eid = addEntity(world);
attachRadioSetBehavior(world, setEntity);
attachRadioButtonBehavior(world, eid, setEntity);
const key = 'space';

// In your input loop
const action = handleRadioButtonKeyPress(world, eid, key);

if (action === 'select') {
  // Button was selected
}
```

### State Machine Events

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachRadioSetBehavior, attachRadioButtonBehavior, sendRadioButtonEvent } from 'blecsd/components';

const world = createWorld();
const setEntity = addEntity(world);
const eid = addEntity(world);
attachRadioSetBehavior(world, setEntity);
attachRadioButtonBehavior(world, eid, setEntity);

// Send raw events
sendRadioButtonEvent(world, eid, 'select');
sendRadioButtonEvent(world, eid, 'deselect');
sendRadioButtonEvent(world, eid, 'disable');
sendRadioButtonEvent(world, eid, 'enable');
```

## Example: Size Selection

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachRadioSetBehavior,
  attachRadioButtonBehavior,
  setRadioValue,
  onRadioSelect,
  selectRadioByValue,
} from 'blecsd/components';

const world = createWorld();

// Create radio set
const sizeSet = addEntity(world);
attachRadioSetBehavior(world, sizeSet);

// Create size options
const sizes = ['Small', 'Medium', 'Large', 'XL'];
const sizeButtons = sizes.map(size => {
  const btn = addEntity(world);
  attachRadioButtonBehavior(world, btn, sizeSet);
  setRadioValue(btn, size.toLowerCase());
  return btn;
});

// Default to medium
selectRadioByValue(world, sizeSet, 'medium');

// Handle selection
onRadioSelect(sizeSet, (value) => {
  console.log(`Size selected: ${value}`);
});
```

## Example: Form with Radio Buttons

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachFormBehavior,
  attachRadioSetBehavior,
  attachRadioButtonBehavior,
  registerFormField,
  setRadioValue,
  getFormValues,
} from 'blecsd/components';

const world = createWorld();
const form = addEntity(world);
attachFormBehavior(world, form);

// Payment method radio set
const paymentSet = addEntity(world);
attachRadioSetBehavior(world, paymentSet);

const creditCard = addEntity(world);
attachRadioButtonBehavior(world, creditCard, paymentSet);
setRadioValue(creditCard, 'credit');

const paypal = addEntity(world);
attachRadioButtonBehavior(world, paypal, paymentSet);
setRadioValue(paypal, 'paypal');

const bankTransfer = addEntity(world);
attachRadioButtonBehavior(world, bankTransfer, paymentSet);
setRadioValue(bankTransfer, 'bank');

// Register the SET with the form (not individual buttons)
registerFormField(world, form, paymentSet, 'paymentMethod', 'credit');

// Get form values
const values = getFormValues(world, form);
// { paymentMethod: 'paypal' }
```

## Related

- [Form Component](./form.md) - Form container for field management
- Checkbox Component - Boolean toggle (non-exclusive)
- [Select Component](./select.md) - Dropdown selection

## Namespace API

The `radio` namespace groups all related functions into a single import:

```typescript
import { radio } from 'blecsd/components';

// Available methods: attach,is,getState,isInState,sendEvent,handleKeyPress,select,deselect, ...
```

This is equivalent to importing individual functions but provides better discoverability. See the [namespace pattern](../index.md#namespace-pattern) for details.
