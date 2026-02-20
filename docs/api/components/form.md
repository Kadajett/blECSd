# Form Component

The Form component provides container functionality for managing multiple form fields. It handles field registration, value collection, keyboard navigation between fields, and form submission.

## Import

```typescript
import {
  attachFormBehavior,
  isForm,
  registerFormField,
  unregisterFormField,
  getFormValues,
  getFieldValue,
  setFieldValue,
  submitForm,
  resetForm,
  onFormSubmit,
  onFormReset,
  focusNextField,
  focusPrevField,
  handleFormKeyPress,
} from 'blecsd/components';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachFormBehavior,
  attachTextInputBehavior,
  attachCheckboxBehavior,
  registerFormField,
  onFormSubmit,
  submitForm,
} from 'blecsd/components';

const world = createWorld();

// Create form container
const form = addEntity(world);
attachFormBehavior(world, form, { keys: true });

// Create fields
const usernameInput = addEntity(world);
attachTextInputBehavior(world, usernameInput);
registerFormField(world, form, usernameInput, 'username', '');

const rememberCheckbox = addEntity(world);
attachCheckboxBehavior(world, rememberCheckbox);
registerFormField(world, form, rememberCheckbox, 'remember', false);

// Handle submission
onFormSubmit(form, (values) => {
  console.log('Form submitted:', values);
  // { username: 'john', remember: true }
});

// Submit form
submitForm(world, form);
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `keys` | `boolean` | `true` | Enable Tab/Shift+Tab navigation |
| `submitOnEnter` | `boolean` | `true` | Submit form on Enter key |

## Functions

### Behavior Setup

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachFormBehavior, isForm, isFormKeysEnabled, isFormSubmitOnEnter } from 'blecsd/components';

const world = createWorld();
const formEntity = addEntity(world);
const eid = formEntity;

// Attach form behavior
attachFormBehavior(world, formEntity, {
  keys: true,
  submitOnEnter: true,
});

// Check if entity is form
if (isForm(world, eid)) {
  // Handle form
}

// Check settings
if (isFormKeysEnabled(formEntity)) {
  // Tab navigation enabled
}
if (isFormSubmitOnEnter(formEntity)) {
  // Enter submits
}
```

### Field Registration

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachFormBehavior, registerFormField, unregisterFormField, autoRegisterFields } from 'blecsd/components';

const world = createWorld();
const form = addEntity(world);
const fieldEntity = addEntity(world);
const initialValue = '';
attachFormBehavior(world, form);

// Register a field with the form
registerFormField(world, form, fieldEntity, 'fieldName', initialValue);

// Unregister a field
unregisterFormField(world, form, fieldEntity);

// Auto-register all focusable descendants
autoRegisterFields(world, form);
```

### Field Management

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachFormBehavior, registerFormField, getFieldName, getFieldValue, setFieldValue, getFormFields, getFormTabOrder } from 'blecsd/components';

const world = createWorld();
const form = addEntity(world);
const fieldEntity = addEntity(world);
attachFormBehavior(world, form);
registerFormField(world, form, fieldEntity, 'username', '');

// Get field name
const name = getFieldName(form, fieldEntity);
// Returns: string | undefined

// Get field value
const value = getFieldValue(world, form, fieldEntity);

// Set field value
setFieldValue(world, form, fieldEntity, 'new value');

// Get all fields in form
const fields = getFormFields(world, form);
// Returns: Entity[]

// Get tab order of fields
const tabOrder = getFormTabOrder(world, form);
// Returns: Entity[]
```

### Form Values

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachFormBehavior, getFormValues } from 'blecsd/components';

const world = createWorld();
const form = addEntity(world);
attachFormBehavior(world, form);

// Get all form values
const values = getFormValues(world, form);
// Returns: { fieldName: value, ... }

// Values are typed based on field type:
// - TextInput: string
// - Checkbox: boolean
// - RadioSet: string (selected value)
// - Select: string (selected value)
// - Slider: number
```

### Form Actions

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachFormBehavior, submitForm, resetForm } from 'blecsd/components';

const world = createWorld();
const form = addEntity(world);
attachFormBehavior(world, form);

// Submit the form
submitForm(world, form);

// Reset form to initial values
resetForm(world, form);
```

### Focus Navigation

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachFormBehavior, focusNextField, focusPrevField } from 'blecsd/components';

const world = createWorld();
const form = addEntity(world);
attachFormBehavior(world, form);

// Move focus to next field
focusNextField(world, form);

// Move focus to previous field
focusPrevField(world, form);
```

### Events

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachFormBehavior, onFormSubmit, onFormReset, clearFormCallbacks } from 'blecsd/components';

const world = createWorld();
const form = addEntity(world);
attachFormBehavior(world, form);

// Form submitted
const unsubSubmit = onFormSubmit(form, (values) => {
  console.log('Submitted:', values);
});

// Form reset
const unsubReset = onFormReset(form, () => {
  console.log('Form reset');
});

// Cleanup
unsubSubmit();
unsubReset();

// Clear all callbacks
clearFormCallbacks(form);
```

### Key Handling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachFormBehavior, handleFormKeyPress } from 'blecsd/components';

const world = createWorld();
const form = addEntity(world);
attachFormBehavior(world, form);
const key = 'tab';

// In your input loop
const action = handleFormKeyPress(world, form, key);

// Handles:
// - Tab: focus next field
// - Shift+Tab: focus previous field
// - Enter: submit (if submitOnEnter enabled)
```

## Example: Login Form

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachFormBehavior,
  attachTextInputBehavior,
  attachCheckboxBehavior,
  registerFormField,
  onFormSubmit,
  getFormValues,
} from 'blecsd/components';

const world = createWorld();

// Create form
const loginForm = addEntity(world);
attachFormBehavior(world, loginForm);

// Username field
const username = addEntity(world);
attachTextInputBehavior(world, username, {
  placeholder: 'Username',
  maxLength: 30,
});
registerFormField(world, loginForm, username, 'username', '');

// Password field
const password = addEntity(world);
attachTextInputBehavior(world, password, {
  placeholder: 'Password',
  secret: true,
});
registerFormField(world, loginForm, password, 'password', '');

// Remember me checkbox
const remember = addEntity(world);
attachCheckboxBehavior(world, remember);
registerFormField(world, loginForm, remember, 'rememberMe', false);

// Handle submit
onFormSubmit(loginForm, (values) => {
  const { username, password, rememberMe } = values;
  console.log('Login attempt:', { username, password, rememberMe });
});
```

## Example: Settings Form

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachFormBehavior,
  attachCheckboxBehavior,
  attachSelectBehavior,
  attachSliderBehavior,
  attachRadioSetBehavior,
  attachRadioButtonBehavior,
  setRadioValue,
  registerFormField,
  onFormSubmit,
  onFormReset,
} from 'blecsd/components';

const world = createWorld();
const settingsForm = addEntity(world);
attachFormBehavior(world, settingsForm);

// Theme select
const themeSelect = addEntity(world);
attachSelectBehavior(world, themeSelect, [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
], 0);
registerFormField(world, settingsForm, themeSelect, 'theme', 'light');

// Volume slider
const volumeSlider = addEntity(world);
attachSliderBehavior(world, volumeSlider, {
  min: 0,
  max: 100,
  value: 80,
});
registerFormField(world, settingsForm, volumeSlider, 'volume', 80);

// Notifications checkbox
const notifications = addEntity(world);
attachCheckboxBehavior(world, notifications, true);
registerFormField(world, settingsForm, notifications, 'notifications', true);

// Language radio buttons
const languageSet = addEntity(world);
attachRadioSetBehavior(world, languageSet);

const english = addEntity(world);
attachRadioButtonBehavior(world, english, languageSet);
setRadioValue(english, 'en');

const spanish = addEntity(world);
attachRadioButtonBehavior(world, spanish, languageSet);
setRadioValue(spanish, 'es');

registerFormField(world, settingsForm, languageSet, 'language', 'en');

// Handle changes
onFormSubmit(settingsForm, (values) => {
  console.log('Settings saved:', values);
});

onFormReset(settingsForm, () => {
  console.log('Settings reset to defaults');
});
```

## Example: Dynamic Form

```typescript
import { createWorld, addEntity, removeEntity } from 'blecsd/core';
import { attachFormBehavior, attachTextInputBehavior, registerFormField, unregisterFormField } from 'blecsd/components';
import type { Entity } from 'blecsd/core';

const world = createWorld();
const dynamicForm = addEntity(world);
attachFormBehavior(world, dynamicForm);

// Add fields dynamically
function addTextField(name: string, label: string): Entity {
  const field = addEntity(world);
  attachTextInputBehavior(world, field, { placeholder: label });
  registerFormField(world, dynamicForm, field, name, '');
  return field;
}

// Remove field
function removeField(fieldEntity: Entity) {
  unregisterFormField(world, dynamicForm, fieldEntity);
  removeEntity(world, fieldEntity);
}

// Create initial fields
const fields: Record<string, Entity> = {
  name: addTextField('name', 'Full Name'),
  email: addTextField('email', 'Email'),
};

// Add more fields later
fields.phone = addTextField('phone', 'Phone Number');
```

## Field Value Types

The form automatically extracts values based on field type:

| Field Type | Value Type | Example |
|------------|------------|---------|
| TextInput | `string` | `"hello"` |
| Checkbox | `boolean` | `true` |
| RadioSet | `string` | `"option1"` |
| Select | `string` | `"value"` |
| Slider | `number` | `75` |

## Related

- [TextInput Component](./textInput.md) - Text entry field
- Checkbox Component - Boolean toggle
- RadioButton Component - Single selection
- [Select Component](./select.md) - Dropdown selection
- [Slider Component](./slider.md) - Range selection
