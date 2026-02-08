# Switch Widget

A toggle switch widget for on/off controls. Can be toggled by clicking or pressing Space/Enter.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { createSwitch } from 'blecsd';

const world = createWorld();

// Create a switch
const toggle = createSwitch(world, {
  x: 10,
  y: 5,
  checked: false,
  onLabel: 'Enabled',
  offLabel: 'Disabled',
});

// Toggle the switch
toggle.toggle();

// Listen for changes
toggle.onChange((checked) => {
  console.log(`Switch is now: ${checked ? 'ON' : 'OFF'}`);
});
```

---

## Configuration

### SwitchConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `checked` | `boolean` | `false` | Initial state |
| `onLabel` | `string` | `'ON'` | Label for the on state |
| `offLabel` | `string` | `'OFF'` | Label for the off state |
| `onFg` | `string \| number` | `'#ffffff'` | Foreground color when on |
| `onBg` | `string \| number` | `'#4caf50'` | Background color when on |
| `offFg` | `string \| number` | `'#000000'` | Foreground color when off |
| `offBg` | `string \| number` | `'#757575'` | Background color when off |
| `focusable` | `boolean` | `true` | Whether the switch is focusable |
| `visible` | `boolean` | `true` | Initial visibility |

### Zod Schema

<!-- blecsd-doccheck:ignore -->
```typescript
import { SwitchConfigSchema } from 'blecsd';

const validated = SwitchConfigSchema.parse({
  checked: true,
  onLabel: 'Yes',
  offLabel: 'No',
});
```

---

## Factory Function

### createSwitch

Creates a Switch widget with the given configuration.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createSwitch } from 'blecsd';

const toggle = createSwitch(world, {
  x: 10,
  y: 5,
  checked: true,
  onLabel: 'Active',
  offLabel: 'Inactive',
});
```

**Parameters:**
- `world: World` - The ECS world
- `config?: SwitchConfig` - Widget configuration

**Returns:** `SwitchWidget`

---

## SwitchWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### isChecked

```typescript
isChecked(): boolean
```

Returns whether the switch is currently checked (on).

### setChecked

```typescript
setChecked(checked: boolean): SwitchWidget
```

Sets the checked state. Triggers onChange callback if the state changes. Returns `this` for chaining.

### toggle

```typescript
toggle(): SwitchWidget
```

Toggles the checked state from on to off or vice versa. Returns `this` for chaining.

<!-- blecsd-doccheck:ignore -->
```typescript
const toggle = createSwitch(world, { checked: false });
toggle.toggle(); // Now checked = true
toggle.toggle(); // Now checked = false
```

### setOnLabel / setOffLabel

```typescript
setOnLabel(label: string): SwitchWidget
setOffLabel(label: string): SwitchWidget
```

Sets the label text for the on or off state. Updates the visual immediately if the switch is in that state.

### getOnLabel / getOffLabel

```typescript
getOnLabel(): string
getOffLabel(): string
```

Gets the current on or off label text.

### onChange

```typescript
onChange(callback: (checked: boolean) => void): SwitchWidget
```

Registers a callback that fires when the switch state changes (via toggle, setChecked, or user interaction).

<!-- blecsd-doccheck:ignore -->
```typescript
toggle.onChange((checked) => {
  console.log(checked ? 'Switch turned ON' : 'Switch turned OFF');
});
```

### show / hide

```typescript
show(): SwitchWidget
hide(): SwitchWidget
```

Controls visibility of the switch.

### setPosition

```typescript
setPosition(x: number, y: number): SwitchWidget
```

Sets the absolute position. Returns `this` for chaining.

### destroy

```typescript
destroy(): void
```

Destroys the widget and removes the entity from the world.

---

## Utility Functions

### isSwitch

<!-- blecsd-doccheck:ignore -->
```typescript
import { isSwitch } from 'blecsd';

if (isSwitch(world, entity)) {
  // Entity is a switch widget
}
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID

**Returns:** `boolean`

### handleSwitchKey

<!-- blecsd-doccheck:ignore -->
```typescript
import { handleSwitchKey } from 'blecsd';

const handled = handleSwitchKey(world, entity, key);
```

Toggles the switch if Space or Enter key is pressed. Fires onChange callback.

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID
- `key: string` - The key pressed

**Returns:** `boolean` - true if the key was handled

### handleSwitchClick

<!-- blecsd-doccheck:ignore -->
```typescript
import { handleSwitchClick } from 'blecsd';

const handled = handleSwitchClick(world, entity);
```

Toggles the switch when clicked. Fires onChange callback.

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID

**Returns:** `boolean` - true if the click was handled

---

## Examples

### Basic Toggle

<!-- blecsd-doccheck:ignore -->
```typescript
import { createSwitch } from 'blecsd';

const darkMode = createSwitch(world, {
  x: 5,
  y: 2,
  checked: false,
  onLabel: 'Dark Mode ON',
  offLabel: 'Dark Mode OFF',
});

darkMode.onChange((checked) => {
  if (checked) {
    enableDarkMode();
  } else {
    enableLightMode();
  }
});
```

### Custom Styled Switch

<!-- blecsd-doccheck:ignore -->
```typescript
import { createSwitch } from 'blecsd';

const customToggle = createSwitch(world, {
  checked: true,
  onLabel: '✓ YES',
  offLabel: '✗ NO',
  onFg: '#000000',
  onBg: '#00ff00',
  offFg: '#ffffff',
  offBg: '#ff0000',
});
```

### Settings Toggle

<!-- blecsd-doccheck:ignore -->
```typescript
import { createSwitch } from 'blecsd';

const soundToggle = createSwitch(world, {
  x: 20,
  y: 10,
  checked: true,
  onLabel: 'Sound: ON',
  offLabel: 'Sound: OFF',
});

soundToggle.onChange((checked) => {
  settings.soundEnabled = checked;
  saveSettings(settings);
});
```

---

## See Also

- [Checkbox Widget](./checkbox.md) - For individual checkboxes
- [RadioButton Widget](./radioButton.md) - For mutually exclusive options
- [Button Widget](./button.md) - For action triggers
