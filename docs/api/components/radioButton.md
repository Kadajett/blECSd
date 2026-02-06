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
} from 'blecsd';
```

## Basic Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  attachRadioSetBehavior,
  attachRadioButtonBehavior,
  setRadioValue,
  onRadioSelect,
} from 'blecsd';

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
import { setRadioButtonDisplay } from 'blecsd';

setRadioButtonDisplay(eid, {
  selectedChar: '(•)',
  unselectedChar: '( )',
});

// Or use other characters
setRadioButtonDisplay(eid, {
  selectedChar: '●',
  unselectedChar: '○',
});
```

## Functions

### RadioSet (Container)

```typescript
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
// Select a specific button (deselects others in set)
selectRadioButton(world, buttonEntity);

// Deselect a button
deselectRadioButton(world, buttonEntity);

// Select by value
selectRadioByValue(world, setEntity, 'medium');
```

### Values

```typescript
// Set value for a radio button
setRadioValue(buttonEntity, 'option1');

// Get value for a radio button
const value = getRadioValue(buttonEntity);
// Returns: string | undefined
```

### Enable/Disable

```typescript
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
// Get current display character
const char = getRadioButtonChar(world, eid);
// Returns: '◉' or '○' (or custom)

// Get display configuration
const display = getRadioButtonDisplay(eid);
// { selectedChar: '◉', unselectedChar: '○' }

// Set custom display
setRadioButtonDisplay(eid, {
  selectedChar: '●',
  unselectedChar: '○',
});

// Clear display (revert to defaults)
clearRadioButtonDisplay(eid);
```

### Events

```typescript
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
// In your input loop
const action = handleRadioButtonKeyPress(world, eid, key);

if (action === 'select') {
  // Button was selected
}
```

### State Machine Events

```typescript
// Send raw events
sendRadioButtonEvent(world, eid, 'select');
sendRadioButtonEvent(world, eid, 'deselect');
sendRadioButtonEvent(world, eid, 'disable');
sendRadioButtonEvent(world, eid, 'enable');
```

## Example: Size Selection

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  attachRadioSetBehavior,
  attachRadioButtonBehavior,
  setRadioValue,
  onRadioSelect,
  selectRadioByValue,
} from 'blecsd';

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
  updateProductSize(value);
});
```

## Example: Form with Radio Buttons

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  attachFormBehavior,
  attachRadioSetBehavior,
  attachRadioButtonBehavior,
  registerFormField,
  setRadioValue,
  getFormValues,
} from 'blecsd';

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
- [Checkbox Component](./checkbox.md) - Boolean toggle (non-exclusive)
- [Select Component](./select.md) - Dropdown selection
