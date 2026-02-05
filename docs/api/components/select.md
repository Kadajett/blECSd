# Select Component

The Select component provides dropdown selection functionality with state machine control. It displays a list of options that can be opened and navigated.

## Import

```typescript
import {
  attachSelectBehavior,
  isSelect,
  isSelectOpen,
  openSelect,
  closeSelect,
  toggleSelect,
  getSelectedValue,
  getSelectOptions,
  selectOptionByValue,
  selectOptionByIndex,
  onSelectChange,
  handleSelectKeyPress,
  setSelectDisplay,
} from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  attachSelectBehavior,
  onSelectChange,
  selectOptionByValue,
} from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Attach select behavior with options
attachSelectBehavior(world, eid, [
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
], 1);  // Default to index 1 (Medium)

// Listen for changes
onSelectChange(eid, (value, label, index) => {
  console.log(`Selected: ${label} (${value})`);
});

// Select by value
selectOptionByValue(world, eid, 'lg');
```

## State Machine

Select uses a state machine with these states:

| State | Description |
|-------|-------------|
| `closed` | Dropdown is closed |
| `open` | Dropdown is open, showing options |
| `disabled` | Cannot be interacted with |

### State Transitions

| From | Event | To |
|------|-------|-----|
| closed | open | open |
| closed | toggle | open |
| closed | disable | disabled |
| open | close | closed |
| open | select | closed |
| open | toggle | closed |
| open | disable | disabled |
| disabled | enable | closed |

## SelectOption Interface

```typescript
interface SelectOption {
  label: string;  // Display text
  value: string;  // Value when selected
}
```

## Display Configuration

Default appearance:
- Closed indicator: `▼`
- Open indicator: `▲`
- Selected mark: `●`
- Separator: ` `

Customize with:

```typescript
import { setSelectDisplay } from 'blecsd';

setSelectDisplay(eid, {
  closedIndicator: '↓',
  openIndicator: '↑',
  selectedMark: '✓',
  separator: ' | ',
});
```

## Functions

### Behavior Setup

```typescript
// Attach with options
attachSelectBehavior(world, eid, [
  { label: 'Option 1', value: 'opt1' },
  { label: 'Option 2', value: 'opt2' },
], 0);  // selectedIndex = 0

// Check if entity is select
if (isSelect(world, eid)) {
  // Handle select
}
```

### Open/Close

```typescript
// Open the dropdown
openSelect(world, eid);

// Close the dropdown
closeSelect(world, eid);

// Toggle open/closed
toggleSelect(world, eid);

// Check if open
if (isSelectOpen(world, eid)) {
  // Render dropdown list
}
```

### Selection

```typescript
// Get selected value
const value = getSelectedValue(world, eid);
// Returns: string | undefined

// Get selected label
const label = getSelectedLabel(eid);
// Returns: string | undefined

// Get selected option object
const option = getSelectedOption(eid);
// Returns: { label, value } | undefined

// Get selected index
const index = getSelectedIndex(eid);
// Returns: number (-1 if none)

// Select by value
selectOptionByValue(world, eid, 'opt2');

// Select by index
selectOptionByIndex(world, eid, 1);

// Select highlighted item (when open)
selectHighlighted(world, eid);

// Clear selection
clearSelection(world, eid);
```

### Highlight (when open)

```typescript
// Get highlighted index
const index = getHighlightedIndex(eid);

// Set highlighted index
setHighlightedIndex(world, eid, 2);

// Navigate highlight
highlightNext(world, eid);
highlightPrev(world, eid);
```

### Options

```typescript
// Get all options
const options = getSelectOptions(eid);
// Returns: SelectOption[]

// Get option count
const count = getOptionCount(eid);

// Get option at index
const opt = getOptionAt(eid, 2);
// Returns: SelectOption | undefined

// Set new options
setSelectOptions(world, eid, [
  { label: 'New 1', value: 'new1' },
  { label: 'New 2', value: 'new2' },
]);

// Get indicator character
const indicator = getSelectIndicator(eid);
// Returns: '▼' or '▲' depending on state
```

### Enable/Disable

```typescript
enableSelect(world, eid);
disableSelect(world, eid);

if (isSelectDisabled(world, eid)) {
  // Skip interaction
}
```

### Display

```typescript
// Get display configuration
const display = getSelectDisplay(eid);

// Set display configuration
setSelectDisplay(eid, {
  closedIndicator: '▾',
  openIndicator: '▴',
  selectedMark: '→',
});

// Clear display (revert to defaults)
clearSelectDisplay(eid);
```

### State

```typescript
// Get current state
const state = getSelectState(world, eid);
// Returns: 'closed' | 'open' | 'disabled'

// Check specific state
if (isSelectInState(world, eid, 'open')) {
  // Render dropdown
}
```

### Events

```typescript
// Selection changed
const unsub1 = onSelectChange(eid, (value, label, index) => {
  console.log(`Selected: ${label}`);
});

// Dropdown opened
const unsub2 = onSelectOpen(eid, () => {
  console.log('Dropdown opened');
});

// Dropdown closed
const unsub3 = onSelectClose(eid, () => {
  console.log('Dropdown closed');
});

// Cleanup
unsub1();
unsub2();
unsub3();

// Clear all callbacks
clearSelectCallbacks(eid);
```

### Key Handling

```typescript
// In your input loop
const action = handleSelectKeyPress(world, eid, key);

// Handles:
// - Enter/Space: open or select highlighted
// - Escape: close
// - Up/k: highlight previous
// - Down/j: highlight next
// - Home: highlight first
// - End: highlight last
```

## Example: Country Selector

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  attachSelectBehavior,
  onSelectChange,
  setSelectDisplay,
} from 'blecsd';

const world = createWorld();
const countrySelect = addEntity(world);

const countries = [
  { label: 'United States', value: 'US' },
  { label: 'United Kingdom', value: 'UK' },
  { label: 'Canada', value: 'CA' },
  { label: 'Australia', value: 'AU' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Japan', value: 'JP' },
];

attachSelectBehavior(world, countrySelect, countries, 0);

setSelectDisplay(countrySelect, {
  selectedMark: '✓',
});

onSelectChange(countrySelect, (value, label) => {
  console.log(`Country: ${label} (${value})`);
  updateShippingOptions(value);
});
```

## Example: Form with Select

```typescript
import {
  attachFormBehavior,
  attachSelectBehavior,
  registerFormField,
  getFormValues,
} from 'blecsd';

const form = addEntity(world);
attachFormBehavior(world, form);

const prioritySelect = addEntity(world);
attachSelectBehavior(world, prioritySelect, [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
], 1);

registerFormField(world, form, prioritySelect, 'priority', 'medium');

// Get form values
const values = getFormValues(world, form);
// { priority: 'high' }
```

## Related

- [Form Component](./form.md) - Form container
- [RadioButton Component](./radioButton.md) - Alternative for few options
- [Checkbox Component](./checkbox.md) - Boolean toggle
