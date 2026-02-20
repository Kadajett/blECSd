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
} from 'blecsd/components';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, onSelectChange, selectOptionByValue } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Attach select behavior with options
attachSelectBehavior(world, eid, [
  { label: 'Small', value: 'sm' },
  { label: 'Medium', value: 'md' },
  { label: 'Large', value: 'lg' },
], 1);  // Default to index 1 (Medium)

// Listen for changes
onSelectChange(world, eid, (value, label, index) => {
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
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, setSelectDisplay } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [{ label: 'Option 1', value: 'opt1' }]);

setSelectDisplay(world, eid, {
  closedIndicator: '↓',
  openIndicator: '↑',
  selectedMark: '✓',
  separator: ' | ',
});
```

## Functions

### Behavior Setup

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, isSelect } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

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
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, openSelect, closeSelect, toggleSelect, isSelectOpen } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);

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
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, getSelectedValue, getSelectedLabel, getSelectedOption, getSelectedIndex, selectOptionByValue, selectOptionByIndex, selectHighlighted, clearSelection } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [
  { label: 'Option 1', value: 'opt1' },
  { label: 'Option 2', value: 'opt2' },
], 0);

// Get selected value
const value = getSelectedValue(world, eid);
// Returns: string | undefined

// Get selected label
const label = getSelectedLabel(world, eid);
// Returns: string | undefined

// Get selected option object
const option = getSelectedOption(world, eid);
// Returns: { label, value } | undefined

// Get selected index
const index = getSelectedIndex(world, eid);
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
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, getHighlightedIndex, setHighlightedIndex, highlightNext, highlightPrev } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [
  { label: 'A', value: 'a' },
  { label: 'B', value: 'b' },
  { label: 'C', value: 'c' },
]);

// Get highlighted index
const idx = getHighlightedIndex(world, eid);

// Set highlighted index
setHighlightedIndex(world, eid, 2);

// Navigate highlight
highlightNext(world, eid);
highlightPrev(world, eid);
```

### Options

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, getSelectOptions, getOptionCount, getOptionAt, setSelectOptions, getSelectIndicator } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [
  { label: 'A', value: 'a' },
  { label: 'B', value: 'b' },
  { label: 'C', value: 'c' },
]);

// Get all options
const options = getSelectOptions(world, eid);
// Returns: SelectOption[]

// Get option count
const count = getOptionCount(world, eid);

// Get option at index
const opt = getOptionAt(world, eid, 2);
// Returns: SelectOption | undefined

// Set new options
setSelectOptions(world, eid, [
  { label: 'New 1', value: 'new1' },
  { label: 'New 2', value: 'new2' },
]);

// Get indicator character
const indicator = getSelectIndicator(world, eid);
// Returns: '▼' or '▲' depending on state
```

### Enable/Disable

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, enableSelect, disableSelect, isSelectDisabled } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);

enableSelect(world, eid);
disableSelect(world, eid);

if (isSelectDisabled(world, eid)) {
  // Skip interaction
}
```

### Display

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, getSelectDisplay, setSelectDisplay, clearSelectDisplay } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);

// Get display configuration
const display = getSelectDisplay(world, eid);

// Set display configuration
setSelectDisplay(world, eid, {
  closedIndicator: '▾',
  openIndicator: '▴',
  selectedMark: '→',
});

// Clear display (revert to defaults)
clearSelectDisplay(world, eid);
```

### State

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, getSelectState, isSelectInState } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);

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
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, onSelectChange, onSelectOpen, onSelectClose, clearSelectCallbacks } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [
  { label: 'A', value: 'a' },
  { label: 'B', value: 'b' },
]);

// Selection changed
const unsub1 = onSelectChange(world, eid, (value, label, index) => {
  console.log(`Selected: ${label}`);
});

// Dropdown opened
const unsub2 = onSelectOpen(world, eid, () => {
  console.log('Dropdown opened');
});

// Dropdown closed
const unsub3 = onSelectClose(world, eid, () => {
  console.log('Dropdown closed');
});

// Cleanup
unsub1();
unsub2();
unsub3();

// Clear all callbacks
clearSelectCallbacks(world, eid);
```

### Key Handling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, handleSelectKeyPress } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSelectBehavior(world, eid, [{ label: 'A', value: 'a' }]);
const key = 'down';

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
import { createWorld, addEntity } from 'blecsd/core';
import { attachSelectBehavior, onSelectChange, setSelectDisplay } from 'blecsd/components';

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

setSelectDisplay(world, countrySelect, {
  selectedMark: '✓',
});

onSelectChange(world, countrySelect, (value, label) => {
  console.log(`Country: ${label} (${value})`);
});
```

## Example: Form with Select

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  attachFormBehavior,
  attachSelectBehavior,
  registerFormField,
  getFormValues,
} from 'blecsd/components';

const world = createWorld();
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
- RadioButton Component - Alternative for few options
- Checkbox Component - Boolean toggle
