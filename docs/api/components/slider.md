# Slider Component

The Slider component provides range value selection with customizable appearance and state machine control. Supports both horizontal and vertical orientations.

## Import

```typescript
import {
  attachSliderBehavior,
  isSlider,
  getSliderValue,
  setSliderValue,
  incrementSlider,
  decrementSlider,
  getSliderState,
  onSliderChange,
  handleSliderKeyPress,
  setSliderDisplay,
  SliderOrientation,
} from 'blecsd/components';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, onSliderChange, setSliderValue } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Attach slider behavior
attachSliderBehavior(world, eid, {
  min: 0,
  max: 100,
  value: 50,
  step: 1,
});

// Listen for changes
onSliderChange(world, eid, (value) => {
  console.log(`Volume: ${value}`);
});

// Set value programmatically
setSliderValue(world, eid, 75);
```

## State Machine

Slider uses a state machine with these states:

| State | Description |
|-------|-------------|
| `idle` | Not focused |
| `focused` | Has keyboard focus |
| `dragging` | Being dragged with mouse |
| `disabled` | Cannot be interacted with |

### State Transitions

| From | Event | To |
|------|-------|-----|
| idle | focus | focused |
| idle | disable | disabled |
| focused | blur | idle |
| focused | dragStart | dragging |
| focused | disable | disabled |
| dragging | dragEnd | focused |
| dragging | blur | idle |
| disabled | enable | idle |

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `value` | `number` | `0` | Initial value |
| `step` | `number` | `1` | Increment amount |
| `orientation` | `SliderOrientation` | `Horizontal` | Slider direction |
| `showValue` | `boolean` | `false` | Show value text |

## Orientation

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { SliderOrientation, attachSliderBehavior } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Horizontal slider (default)
attachSliderBehavior(world, eid, {
  orientation: SliderOrientation.Horizontal,
});

// Vertical slider
attachSliderBehavior(world, eid, {
  orientation: SliderOrientation.Vertical,
});
```

## Display Configuration

Default appearance uses these characters:
- Track (horizontal): `─`
- Track (vertical): `│`
- Thumb: `●`
- Fill (horizontal): `━`
- Fill (vertical): `┃`

Customize with:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, setSliderDisplay } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

setSliderDisplay(world, eid, {
  trackChar: '─',
  thumbChar: '◆',
  fillChar: '═',
  trackFg: 0x666666ff,
  thumbFg: 0xffffffff,
  thumbBg: 0x0066ffff,
  fillFg: 0x00ff00ff,
});
```

## Functions

### Behavior Setup

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, isSlider, SliderOrientation } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);

// Attach with options
attachSliderBehavior(world, eid, {
  min: 0,
  max: 100,
  value: 50,
  step: 5,
  orientation: SliderOrientation.Horizontal,
  showValue: true,
});

// Check if entity is slider
if (isSlider(world, eid)) {
  // Handle slider
}
```

### Value Operations

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, getSliderValue, setSliderValue, incrementSlider, decrementSlider, setSliderToMin, setSliderToMax, setSliderFromPercentage } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Get current value
const value = getSliderValue(eid);

// Set value
setSliderValue(world, eid, 75);

// Increment by step
incrementSlider(world, eid);

// Decrement by step
decrementSlider(world, eid);

// Set to min/max
setSliderToMin(world, eid);
setSliderToMax(world, eid);

// Set from percentage (0-1)
setSliderFromPercentage(world, eid, 0.5);  // Sets to 50%
```

### Range Operations

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, getSliderMin, getSliderMax, getSliderStep, getSliderPercentage, setSliderRange, setSliderStep } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Get min/max
const min = getSliderMin(eid);
const max = getSliderMax(eid);

// Get step
const step = getSliderStep(eid);

// Get percentage (0-1)
const pct = getSliderPercentage(eid);

// Set range
setSliderRange(world, eid, 0, 200);

// Set step
setSliderStep(world, eid, 10);
```

### Focus Management

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, focusSlider, blurSlider, isSliderFocused } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Focus/blur
focusSlider(world, eid);
blurSlider(world, eid);

// Check focus
if (isSliderFocused(world, eid)) {
  // Handle focused state
}
```

### Drag Operations

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, startDragging, stopDragging, isSliderDragging } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Start/stop dragging
startDragging(world, eid);
stopDragging(world, eid);

// Check if dragging
if (isSliderDragging(world, eid)) {
  // Handle drag state
}
```

### Orientation

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, getSliderOrientation, setSliderOrientation, isSliderHorizontal, isSliderVertical, SliderOrientation } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Get/set orientation
const orient = getSliderOrientation(eid);
setSliderOrientation(world, eid, SliderOrientation.Vertical);

// Check orientation
if (isSliderHorizontal(eid)) {
  // Horizontal layout
}
if (isSliderVertical(eid)) {
  // Vertical layout
}
```

### Display

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, setShowSliderValue, isShowingSliderValue, getSliderDisplay, setSliderDisplay, clearSliderDisplay, renderSliderString } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Show/hide value text
setShowSliderValue(world, eid, true);
if (isShowingSliderValue(eid)) {
  // Include value in render
}

// Get display configuration
const display = getSliderDisplay(eid);

// Set display configuration
setSliderDisplay(world, eid, {
  trackChar: '═',
  thumbChar: '█',
  trackFg: 0x888888ff,
});

// Clear display (revert to defaults)
clearSliderDisplay(eid);

// Render to string
const str = renderSliderString(eid, 20);
// Returns: "────────●══════════"
```

### Enable/Disable

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, enableSlider, disableSlider, isSliderDisabled } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

enableSlider(world, eid);
disableSlider(world, eid);

if (isSliderDisabled(world, eid)) {
  // Skip interaction
}
```

### State

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, getSliderState, isSliderInState } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Get current state
const state = getSliderState(world, eid);
// Returns: 'idle' | 'focused' | 'dragging' | 'disabled'

// Check specific state
if (isSliderInState(world, eid, 'focused')) {
  // Handle focused state
}
```

### Events

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, onSliderChange, onSliderDragStart, onSliderDragEnd, clearSliderCallbacks } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });

// Value changed
const unsub1 = onSliderChange(world, eid, (value) => {
  console.log(`New value: ${value}`);
});

// Drag started
const unsub2 = onSliderDragStart(world, eid, () => {
  console.log('Drag started');
});

// Drag ended
const unsub3 = onSliderDragEnd(world, eid, () => {
  console.log('Drag ended');
});

// Cleanup
unsub1();
unsub2();
unsub3();

// Clear all callbacks
clearSliderCallbacks(world, eid);
```

### Key Handling

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, handleSliderKeyPress } from 'blecsd/components';

const world = createWorld();
const eid = addEntity(world);
attachSliderBehavior(world, eid, { min: 0, max: 100, value: 50 });
const key = 'right';

// In your input loop
const action = handleSliderKeyPress(world, eid, key);

// Handles:
// - Left/Down: decrement
// - Right/Up: increment
// - Home: set to min
// - End: set to max
// - PageUp: increment by 10%
// - PageDown: decrement by 10%
```

## Example: Volume Control

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, onSliderChange, setSliderDisplay } from 'blecsd/components';

const world = createWorld();
const volumeSlider = addEntity(world);

attachSliderBehavior(world, volumeSlider, {
  min: 0,
  max: 100,
  value: 80,
  step: 5,
  showValue: true,
});

setSliderDisplay(world, volumeSlider, {
  fillFg: 0x00ff00ff,
  thumbFg: 0xffffffff,
  thumbBg: 0x0066ffff,
});

onSliderChange(world, volumeSlider, (value) => {
  console.log(`Volume: ${value / 100}`);
});
```

## Example: RGB Color Picker

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { attachSliderBehavior, setSliderDisplay, getSliderValue, onSliderChange } from 'blecsd/components';

const world = createWorld();
const colorSliders = {
  red: addEntity(world),
  green: addEntity(world),
  blue: addEntity(world),
};

Object.entries(colorSliders).forEach(([_name, eid]) => {
  attachSliderBehavior(world, eid, {
    min: 0,
    max: 255,
    value: 128,
    step: 1,
  });
});

// Set colors for each slider
setSliderDisplay(world, colorSliders.red, { fillFg: 0xff0000ff });
setSliderDisplay(world, colorSliders.green, { fillFg: 0x00ff00ff });
setSliderDisplay(world, colorSliders.blue, { fillFg: 0x0000ffff });

function updateColor() {
  const r = getSliderValue(colorSliders.red);
  const g = getSliderValue(colorSliders.green);
  const b = getSliderValue(colorSliders.blue);
  console.log(`Color: rgb(${r}, ${g}, ${b})`);
}

Object.values(colorSliders).forEach(eid => {
  onSliderChange(world, eid, updateColor);
});
```

## Related

- [Form Component](./form.md) - Form container
- [ProgressBar Component](./progressBar.md) - Non-interactive progress display
- [Select Component](./select.md) - Discrete value selection
