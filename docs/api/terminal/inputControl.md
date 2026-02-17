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
import { createWorld, createScreenEntity } from 'blecsd/core';
import { createProgram, createInputControl, enableInput, enableKeys, enableMouse, MouseTrackingMode } from 'blecsd/terminal';

const program = createProgram({ useBuffer: true });
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
import { createProgram, createInputControl, MouseTrackingMode } from 'blecsd/terminal';

// With initial options
const sgrProg = createProgram();
const inputControlSgr = createInputControl(world, sgrProg, {
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
import { getInputControl } from 'blecsd/terminal';

const existingControl = getInputControl(world);
if (existingControl) {
  // Input control exists
}
```

### destroyInputControl

Destroys an input control, disabling all input.

```typescript
import { createProgram, createInputControl, destroyInputControl } from 'blecsd/terminal';

const destroyProg = createProgram();
const inputControl = createInputControl(world, destroyProg);
destroyInputControl(inputControl);
```

## Keyboard Control

### enableKeys

Enables keyboard input handling.

```typescript
import { createProgram, createInputControl, enableKeys } from 'blecsd/terminal';

const keysProg = createProgram();
const inputControl = createInputControl(world, keysProg);
enableKeys(inputControl);
```

### disableKeys

Disables keyboard input handling.

```typescript
import { createProgram, createInputControl, disableKeys } from 'blecsd/terminal';

const disableKeysProg = createProgram();
const inputControl = createInputControl(world, disableKeysProg);
disableKeys(inputControl);
```

### areKeysEnabled

Checks if keyboard input is enabled.

```typescript
import { createProgram, createInputControl, areKeysEnabled } from 'blecsd/terminal';

const areKeysProg = createProgram();
const inputControl = createInputControl(world, areKeysProg);
if (areKeysEnabled(inputControl)) {
  // Keys are enabled
}
```

## Mouse Control

### enableMouse

Enables mouse input handling.

```typescript
import { createProgram, createInputControl, enableMouse, MouseTrackingMode } from 'blecsd/terminal';

const enableMouseProg = createProgram();
const inputControl = createInputControl(world, enableMouseProg);

// Enable with default mode (NORMAL)
enableMouse(inputControl);

// Enable with specific mode
enableMouse(inputControl, MouseTrackingMode.ANY);
```

### disableMouse

Disables mouse input handling.

```typescript
import { createProgram, createInputControl, disableMouse } from 'blecsd/terminal';

const disableMouseProg = createProgram();
const inputControl = createInputControl(world, disableMouseProg);
disableMouse(inputControl);
```

### isMouseEnabled

Checks if mouse input is enabled.

```typescript
import { createProgram, createInputControl, isMouseEnabled } from 'blecsd/terminal';

const isMouseProg = createProgram();
const inputControl = createInputControl(world, isMouseProg);
if (isMouseEnabled(inputControl)) {
  // Mouse is enabled
}
```

### getMouseMode

Gets the current mouse tracking mode.

```typescript
import { createProgram, createInputControl, getMouseMode } from 'blecsd/terminal';

const getMouseModeProg = createProgram();
const inputControl = createInputControl(world, getMouseModeProg);
const mode = getMouseMode(inputControl);
```

### setMouseMode

Sets the mouse tracking mode.

```typescript
import { createProgram, createInputControl, setMouseMode, MouseTrackingMode } from 'blecsd/terminal';

const setMouseModeProg = createProgram();
const inputControl = createInputControl(world, setMouseModeProg);
setMouseMode(inputControl, MouseTrackingMode.SGR);
```

If mouse is currently enabled, it will be re-enabled with the new mode.

## Combined Control

### enableInput

Enables both keyboard and mouse input.

```typescript
import { createProgram, createInputControl, enableInput, MouseTrackingMode } from 'blecsd/terminal';

const enableInputProg = createProgram();
const inputControl = createInputControl(world, enableInputProg);

// Enable with default mouse mode
enableInput(inputControl);

// Enable with specific mouse mode
enableInput(inputControl, MouseTrackingMode.BUTTON);
```

### disableInput

Disables both keyboard and mouse input.

```typescript
import { createProgram, createInputControl, disableInput } from 'blecsd/terminal';

const disableInputProg = createProgram();
const inputControl = createInputControl(world, disableInputProg);
disableInput(inputControl);
```

### isInputEnabled

Checks if any input is enabled.

```typescript
import { createProgram, createInputControl, isInputEnabled } from 'blecsd/terminal';

const isInputProg = createProgram();
const inputControl = createInputControl(world, isInputProg);
if (isInputEnabled(inputControl)) {
  // Some input is enabled
}
```

## World-Level Functions

Convenience functions that operate on a world directly.

### enableWorldKeys / disableWorldKeys

```typescript
import { enableWorldKeys, disableWorldKeys } from 'blecsd/terminal';

// Returns true if successful
enableWorldKeys(world);
disableWorldKeys(world);
```

### enableWorldMouse / disableWorldMouse

```typescript
import { enableWorldMouse, disableWorldMouse, MouseTrackingMode } from 'blecsd/terminal';

enableWorldMouse(world);
enableWorldMouse(world, MouseTrackingMode.ANY);
disableWorldMouse(world);
```

### enableWorldInput / disableWorldInput

```typescript
import { enableWorldInput, disableWorldInput, MouseTrackingMode } from 'blecsd/terminal';

enableWorldInput(world);
enableWorldInput(world, MouseTrackingMode.SGR);
disableWorldInput(world);
```

## Mouse Tracking Modes

### MouseTrackingMode

```typescript
import { MouseTrackingMode } from 'blecsd/terminal';

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
import { getInputControlEventBus } from 'blecsd/terminal';

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
import { resetInputControlEventBus } from 'blecsd/terminal';

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
import { createProgram, createInputControl, enableKeys } from 'blecsd/terminal';
import { lockAllKeys, setIgnoredKeys } from 'blecsd/core';

const lockProg = createProgram();
const lockControl = createInputControl(world, lockProg);
enableKeys(lockControl);

// Lock all keys except escape
lockAllKeys();
setIgnoredKeys(['escape']);

// Only escape key events will be queued
```

## Complete Example

```typescript
import { createWorld, createScreenEntity } from 'blecsd/core';
import {
  createProgram,
  createInputControl,
  destroyInputControl,
  getInputControlEventBus,
  enableInput,
  disableInput,
  MouseTrackingMode,
} from 'blecsd/terminal';

async function main(): Promise<void> {
  // Create program
  const mainProg = createProgram({ useBuffer: true });
  await mainProg.init();

  // Create world and screen
  const mainWorld = createWorld();
  const screen = createScreenEntity(mainWorld, {
    width: mainProg.cols,
    height: mainProg.rows,
  });

  // Create input control with SGR mouse mode
  const ctrl = createInputControl(mainWorld, mainProg, {
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
  enableInput(ctrl);

  // Cleanup function
  function cleanup(): void {
    disableInput(ctrl);
    destroyInputControl(ctrl);
    mainProg.destroy();
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
