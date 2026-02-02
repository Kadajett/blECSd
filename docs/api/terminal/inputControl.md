# Screen Input Control API

Manages input event handling at the screen/program level.

## Overview

The input control module provides:
- Keyboard event handling setup
- Mouse event handling setup with multiple tracking modes
- World-level convenience functions
- Event bus for input state changes

## Quick Start

```typescript
import {
  createInputControl,
  enableInput,
  enableKeys,
  enableMouse,
  MouseTrackingMode,
} from 'blecsd';

const program = new Program();
await program.init();

const world = createWorld();
const screen = createScreenEntity(world, { width: 80, height: 24 });

// Create input control
const inputControl = createInputControl(world, program);

// Enable both keyboard and mouse
enableInput(inputControl);

// Or enable separately with options
enableKeys(inputControl);
enableMouse(inputControl, MouseTrackingMode.ANY);
```

## Creating Input Control

### createInputControl

Creates an input control for a world and program.

```typescript
import { createInputControl } from 'blecsd';

// Basic creation
const inputControl = createInputControl(world, program);

// With initial options
const inputControl = createInputControl(world, program, {
  keys: true,
  mouse: true,
  mouseMode: MouseTrackingMode.SGR,
});
```

**Parameters:**
- `world` - The ECS world
- `program` - The Program instance
- `options` - Optional initial options

**Returns:** InputControlState

### getInputControl

Gets the input control for a world.

```typescript
import { getInputControl } from 'blecsd';

const inputControl = getInputControl(world);
if (inputControl) {
  // Input control exists
}
```

### destroyInputControl

Destroys an input control, disabling all input.

```typescript
import { destroyInputControl } from 'blecsd';

destroyInputControl(inputControl);
```

## Keyboard Control

### enableKeys

Enables keyboard input handling.

```typescript
import { enableKeys } from 'blecsd';

enableKeys(inputControl);
```

### disableKeys

Disables keyboard input handling.

```typescript
import { disableKeys } from 'blecsd';

disableKeys(inputControl);
```

### areKeysEnabled

Checks if keyboard input is enabled.

```typescript
import { areKeysEnabled } from 'blecsd';

if (areKeysEnabled(inputControl)) {
  // Keys are enabled
}
```

## Mouse Control

### enableMouse

Enables mouse input handling.

```typescript
import { enableMouse, MouseTrackingMode } from 'blecsd';

// Enable with default mode (NORMAL)
enableMouse(inputControl);

// Enable with specific mode
enableMouse(inputControl, MouseTrackingMode.ANY);
```

### disableMouse

Disables mouse input handling.

```typescript
import { disableMouse } from 'blecsd';

disableMouse(inputControl);
```

### isMouseEnabled

Checks if mouse input is enabled.

```typescript
import { isMouseEnabled } from 'blecsd';

if (isMouseEnabled(inputControl)) {
  // Mouse is enabled
}
```

### getMouseMode

Gets the current mouse tracking mode.

```typescript
import { getMouseMode } from 'blecsd';

const mode = getMouseMode(inputControl);
```

### setMouseMode

Sets the mouse tracking mode.

```typescript
import { setMouseMode, MouseTrackingMode } from 'blecsd';

setMouseMode(inputControl, MouseTrackingMode.SGR);
```

If mouse is currently enabled, it will be re-enabled with the new mode.

## Combined Control

### enableInput

Enables both keyboard and mouse input.

```typescript
import { enableInput, MouseTrackingMode } from 'blecsd';

// Enable with default mouse mode
enableInput(inputControl);

// Enable with specific mouse mode
enableInput(inputControl, MouseTrackingMode.BUTTON);
```

### disableInput

Disables both keyboard and mouse input.

```typescript
import { disableInput } from 'blecsd';

disableInput(inputControl);
```

### isInputEnabled

Checks if any input is enabled.

```typescript
import { isInputEnabled } from 'blecsd';

if (isInputEnabled(inputControl)) {
  // Some input is enabled
}
```

## World-Level Functions

Convenience functions that operate on a world directly.

### enableWorldKeys / disableWorldKeys

```typescript
import { enableWorldKeys, disableWorldKeys } from 'blecsd';

// Returns true if successful
enableWorldKeys(world);
disableWorldKeys(world);
```

### enableWorldMouse / disableWorldMouse

```typescript
import { enableWorldMouse, disableWorldMouse, MouseTrackingMode } from 'blecsd';

enableWorldMouse(world);
enableWorldMouse(world, MouseTrackingMode.ANY);
disableWorldMouse(world);
```

### enableWorldInput / disableWorldInput

```typescript
import { enableWorldInput, disableWorldInput } from 'blecsd';

enableWorldInput(world);
enableWorldInput(world, MouseTrackingMode.SGR);
disableWorldInput(world);
```

## Mouse Tracking Modes

### MouseTrackingMode

```typescript
import { MouseTrackingMode } from 'blecsd';

MouseTrackingMode.OFF     // 0 - No mouse tracking
MouseTrackingMode.NORMAL  // 1 - Click tracking only
MouseTrackingMode.BUTTON  // 2 - Button event tracking
MouseTrackingMode.ANY     // 3 - All motion tracking
MouseTrackingMode.SGR     // 4 - SGR extended mode (recommended)
```

**Mode Details:**

| Mode | Description |
|------|-------------|
| OFF | No mouse tracking |
| NORMAL | Reports button presses and releases |
| BUTTON | Reports button events and motion while buttons pressed |
| ANY | Reports all mouse motion, even without buttons |
| SGR | SGR extended mode with better coordinate handling |

## Event Bus

### getInputControlEventBus

Gets the event bus for input control events.

```typescript
import { getInputControlEventBus } from 'blecsd';

const bus = getInputControlEventBus();

// Listen for key events
bus.on('key', (event) => {
  console.log('Key:', event.name);
});

// Listen for mouse events
bus.on('mouse', (event) => {
  console.log('Mouse:', event.x, event.y);
});

// Listen for state changes
bus.on('keysEnabled', () => console.log('Keys enabled'));
bus.on('keysDisabled', () => console.log('Keys disabled'));
bus.on('mouseEnabled', (mode) => console.log('Mouse enabled:', mode));
bus.on('mouseDisabled', () => console.log('Mouse disabled'));
```

### resetInputControlEventBus

Resets the event bus (for testing).

```typescript
import { resetInputControlEventBus } from 'blecsd';

resetInputControlEventBus();
```

## Types

### InputControlState

```typescript
interface InputControlState {
  readonly world: World;
  readonly program: Program;
  keysEnabled: boolean;
  mouseEnabled: boolean;
  mouseMode: MouseModeValue;
  readonly keyHandler: (event: KeyEvent) => void;
  readonly mouseHandler: (event: MouseEvent) => void;
}
```

### InputControlOptions

```typescript
interface InputControlOptions {
  keys?: boolean;
  mouse?: boolean;
  mouseMode?: MouseModeValue;
}
```

### InputControlEventMap

```typescript
interface InputControlEventMap {
  key: KeyEvent;
  mouse: MouseEvent;
  keysEnabled: void;
  keysDisabled: void;
  mouseEnabled: MouseModeValue;
  mouseDisabled: void;
}
```

### MouseModeValue

```typescript
type MouseModeValue = 0 | 1 | 2 | 3 | 4;
```

## Integration with Key Lock

Input control automatically integrates with the key lock system. Locked keys are filtered before being queued.

```typescript
import { createInputControl, enableKeys } from 'blecsd';
import { lockAllKeys, setIgnoredKeys } from 'blecsd';

const inputControl = createInputControl(world, program);
enableKeys(inputControl);

// Lock all keys except escape
lockAllKeys();
setIgnoredKeys(['escape']);

// Only escape key events will be queued
```

## Complete Example

```typescript
import {
  createWorld,
  createScreenEntity,
  createInputControl,
  enableInput,
  disableInput,
  destroyInputControl,
  getInputControlEventBus,
  MouseTrackingMode,
  Program,
} from 'blecsd';

async function main(): Promise<void> {
  // Create program
  const program = new Program();
  await program.init();

  // Create world and screen
  const world = createWorld();
  const screen = createScreenEntity(world, {
    width: program.cols,
    height: program.rows,
  });

  // Create input control with SGR mouse mode
  const inputControl = createInputControl(world, program, {
    mouseMode: MouseTrackingMode.SGR,
  });

  // Subscribe to events
  const bus = getInputControlEventBus();

  bus.on('key', (event) => {
    if (event.name === 'q') {
      cleanup();
    }
    console.log('Key:', event.name);
  });

  bus.on('mouse', (event) => {
    console.log(`Mouse: ${event.action} at ${event.x},${event.y}`);
  });

  // Enable all input
  enableInput(inputControl);

  // Cleanup function
  function cleanup(): void {
    disableInput(inputControl);
    destroyInputControl(inputControl);
    program.destroy();
    process.exit(0);
  }

  // Handle exit
  process.on('SIGINT', cleanup);
}

main();
```

## Best Practices

1. **Use SGR mouse mode** - It's the most modern and handles large coordinates correctly.

2. **Destroy input control on exit** - Call `destroyInputControl` to properly disable mouse tracking.

3. **Use world-level functions for simple cases** - They're convenient when you have the world but not the control state.

4. **Listen to state events** - Use the event bus to react to input state changes.

5. **Combine with key lock** - Use key lock for modal dialogs while keeping input control enabled.
