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
} from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'bitecs';
import {
  attachFormBehavior,
  attachTextInputBehavior,
  attachCheckboxBehavior,
  registerFormField,
  onFormSubmit,
  submitForm,
} from 'blecsd';

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
// Register a field with the form
registerFormField(world, form, fieldEntity, 'fieldName', initialValue);

// Unregister a field
unregisterFormField(world, form, fieldEntity);

// Auto-register all focusable descendants
autoRegisterFields(world, form);
```

### Field Management

```typescript
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
// Submit the form
submitForm(world, form);

// Reset form to initial values
resetForm(world, form);
```

### Focus Navigation

```typescript
// Move focus to next field
focusNextField(world, form);

// Move focus to previous field
focusPrevField(world, form);
```

### Events

```typescript
// Form submitted
const unsubSubmit = onFormSubmit(form, (values) => {
  console.log('Submitted:', values);
  saveData(values);
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
// In your input loop
const action = handleFormKeyPress(world, form, key);

// Handles:
// - Tab: focus next field
// - Shift+Tab: focus previous field
// - Enter: submit (if submitOnEnter enabled)
```

## Example: Login Form

```typescript
import { createWorld, addEntity } from 'bitecs';
import {
  attachFormBehavior,
  attachTextInputBehavior,
  attachCheckboxBehavior,
  registerFormField,
  onFormSubmit,
  getFormValues,
} from 'blecsd';

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
onFormSubmit(loginForm, async (values) => {
  const { username, password, rememberMe } = values;

  try {
    await login(username, password, rememberMe);
    showMessage('Login successful!');
  } catch (error) {
    showError('Invalid credentials');
  }
});
```

## Example: Settings Form

```typescript
import {
  attachFormBehavior,
  attachCheckboxBehavior,
  attachSelectBehavior,
  attachSliderBehavior,
  attachRadioSetBehavior,
  attachRadioButtonBehavior,
  registerFormField,
  onFormSubmit,
  onFormReset,
} from 'blecsd';

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
  saveSettings(values);
  showMessage('Settings saved!');
});

onFormReset(settingsForm, () => {
  showMessage('Settings reset to defaults');
});
```

## Example: Dynamic Form

```typescript
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
const fields = {
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
- [Checkbox Component](./checkbox.md) - Boolean toggle
- [RadioButton Component](./radioButton.md) - Single selection
- [Select Component](./select.md) - Dropdown selection
- [Slider Component](./slider.md) - Range selection
