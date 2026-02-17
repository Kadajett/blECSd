# Input State API

Frame-aware input state tracking for keyboard and mouse. Provides queries like `isKeyPressed` (just this frame), `isKeyReleased`, key hold time, and repeat handling.

## Quick Start

```typescript
import { createInputState, createInputEventBuffer, drainKeys, drainMouse, getMovementDirection } from 'blecsd/core';

const inputState = createInputState({ trackRepeats: true });
const buffer = createInputEventBuffer();
const keyEvents = drainKeys(buffer);
const mouseEvents = drainMouse(buffer);
const deltaTime = 16;

// Each frame: update with buffered events
inputState.update(keyEvents, mouseEvents, deltaTime);

// Query state
if (inputState.isKeyPressed('space')) {
  console.log('jump!');
}

const player = { x: 0, y: 0 };
const speed = 5;
const dir = getMovementDirection(inputState);
player.x += dir.x * speed;
player.y += dir.y * speed;
```

## Types

### KeyState

State of a single key.

```typescript
interface KeyState {
  readonly pressed: boolean;
  readonly justPressed: boolean;
  readonly justReleased: boolean;
  readonly heldTime: number;
  readonly repeatCount: number;
  readonly lastEventTime: number;
}
```

### MouseButtonState

State of a mouse button.

```typescript
interface MouseButtonState {
  readonly pressed: boolean;
  readonly justPressed: boolean;
  readonly justReleased: boolean;
  readonly heldTime: number;
  readonly lastEventTime: number;
}
```

### MouseState

Current mouse position and state.

```typescript
interface MouseState {
  readonly x: number;
  readonly y: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly wheelDelta: number;
  readonly buttons: Readonly<Record<MouseButton, MouseButtonState>>;
}
```

### InputStateStats

Input state statistics.

```typescript
interface InputStateStats {
  readonly keysDown: number;
  readonly keysPressed: number;
  readonly keysReleased: number;
  readonly keyEventsThisFrame: number;
  readonly mouseEventsThisFrame: number;
  readonly frameCount: number;
}
```

### InputStateConfig

Configuration for input state tracking.

```typescript
interface InputStateConfig {
  readonly trackRepeats?: boolean;       // default: true
  readonly debounceTime?: number;        // default: 0 (no debouncing)
  readonly customRepeatRate?: number;    // default: undefined (use OS repeat)
  readonly customRepeatDelay?: number;   // default: 500
}
```

### InputState

The full interface for the input state tracker.

```typescript
interface InputState {
  update(keyEvents: readonly TimestampedKeyEvent[], mouseEvents: readonly TimestampedMouseEvent[], deltaTime: number): void;
  isKeyDown(key: KeyName | string): boolean;
  isKeyPressed(key: KeyName | string): boolean;
  isKeyReleased(key: KeyName | string): boolean;
  getKeyHeldTime(key: KeyName | string): number;
  getKeyState(key: KeyName | string): KeyState;
  getKeyRepeatCount(key: KeyName | string): number;
  getPressedKeys(): string[];
  getJustPressedKeys(): string[];
  getJustReleasedKeys(): string[];
  isCtrlDown(): boolean;
  isAltDown(): boolean;
  isShiftDown(): boolean;
  hasModifier(): boolean;
  isMouseButtonDown(button: MouseButton): boolean;
  isMouseButtonPressed(button: MouseButton): boolean;
  isMouseButtonReleased(button: MouseButton): boolean;
  getMouseX(): number;
  getMouseY(): number;
  getMousePosition(): { x: number; y: number };
  getMouseDelta(): { deltaX: number; deltaY: number };
  getWheelDelta(): number;
  getMouseState(): MouseState;
  releaseKey(key: KeyName | string): void;
  releaseAllKeys(): void;
  releaseAllMouseButtons(): void;
  releaseAll(): void;
  getStats(): InputStateStats;
  getFrameCount(): number;
  reset(): void;
}
```

## Functions

### createInputState

Creates a new InputState tracker.

```typescript
function createInputState(config?: InputStateConfig): InputState;
```

**Parameters:**
- `config` - Optional configuration options

**Returns:** A new InputState instance.

```typescript
import { createInputState } from 'blecsd/core';

const inputState = createInputState({
  trackRepeats: true,
  debounceTime: 50,
});
```

### isAnyKeyDown

Checks if any of the specified keys are pressed.

```typescript
function isAnyKeyDown(inputState: InputState, keys: readonly (KeyName | string)[]): boolean;
```

```typescript
import { createInputState, isAnyKeyDown } from 'blecsd/core';

const inputState = createInputState();
if (isAnyKeyDown(inputState, ['w', 'up'])) {
  console.log('move forward');
}
```

### isAllKeysDown

Checks if all specified keys are pressed.

```typescript
function isAllKeysDown(inputState: InputState, keys: readonly (KeyName | string)[]): boolean;
```

```typescript
import { createInputState, isAllKeysDown } from 'blecsd/core';

const inputState = createInputState();
if (isAllKeysDown(inputState, ['ctrl', 's'])) {
  console.log('save');
}
```

### isAnyKeyPressed

Checks if any of the specified keys were just pressed this frame.

```typescript
function isAnyKeyPressed(inputState: InputState, keys: readonly (KeyName | string)[]): boolean;
```

### getMovementDirection

Gets the direction vector from WASD or arrow keys.

```typescript
function getMovementDirection(inputState: InputState): { x: number; y: number };
```

**Returns:** Object with `x` (-1, 0, or 1) and `y` (-1, 0, or 1).

```typescript
import { createInputState, getMovementDirection } from 'blecsd/core';

const inputState = createInputState();
const player = { x: 0, y: 0 };
const speed = 5;
const dir = getMovementDirection(inputState);
player.x += dir.x * speed;
player.y += dir.y * speed;
```

## Usage Example

```typescript
import { createInputState, createInputEventBuffer, drainKeys, drainMouse } from 'blecsd/core';

const inputState = createInputState({ trackRepeats: true });
const buffer = createInputEventBuffer();

// Each frame in your game loop
function gameLoop(deltaTime: number) {
  const keys = drainKeys(buffer);
  const mouse = drainMouse(buffer);
  inputState.update(keys, mouse, deltaTime);

  // Check for single-frame events
  if (inputState.isKeyPressed('escape')) {
    console.log('open pause menu');
  }

  // Check for held keys
  if (inputState.isKeyDown('shift')) {
    console.log('sprint');
  }

  // Check hold duration
  const holdTime = inputState.getKeyHeldTime('space');
  if (holdTime > 1000) {
    console.log('charge attack');
  }

  // Mouse state
  const { x, y } = inputState.getMousePosition();
  const { deltaX, deltaY } = inputState.getMouseDelta();

  // Modifier queries
  if (inputState.isCtrlDown() && inputState.isKeyPressed('z')) {
    console.log('undo');
  }

  // Stats for debugging
  const stats = inputState.getStats();
  console.log(`Keys down: ${stats.keysDown}, Frame: ${stats.frameCount}`);
}

gameLoop(16);
```
