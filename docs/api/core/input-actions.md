# Input Actions API

Input action mapping system for game controls. Maps physical inputs (keys, mouse buttons) to logical game actions with support for multiple bindings per action, runtime rebinding, and save/load.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import { createInputActionManager, ActionPresets } from 'blecsd';

// Create with preset bindings
const actions = createInputActionManager(ActionPresets.platformer);

// Or define custom bindings
const actions = createInputActionManager([
  { action: 'jump', keys: ['space'] },
  { action: 'attack', keys: ['j'], mouseButtons: ['left'] },
  { action: 'move_left', keys: ['a', 'left'], continuous: true },
]);

// Query state each frame
actions.update(inputState, deltaTime);
if (actions.isJustActivated('jump')) {
  performJump();
}
```

## Types

### ActionBinding

Configuration for a single action binding.

```typescript
interface ActionBinding {
  readonly action: string;
  readonly keys: readonly string[];
  readonly mouseButtons?: readonly MouseButton[];
  readonly continuous?: boolean;
  readonly deadzone?: number;
}
```

**Fields:**
- `action` - Unique action identifier (e.g., `'jump'`, `'attack'`, `'move_left'`)
- `keys` - Keys that activate this action
- `mouseButtons` - Mouse buttons that activate this action
- `continuous` - Whether action fires continuously while held (default: `false`)
- `deadzone` - Deadzone for analog inputs, 0-1 (default: `0.1`)

### ActionState

Runtime state of an action.

```typescript
interface ActionState {
  readonly active: boolean;
  readonly justActivated: boolean;
  readonly justDeactivated: boolean;
  readonly activeTime: number;
  readonly value: number;
}
```

**Fields:**
- `active` - Action is currently active (input is held)
- `justActivated` - Action was just activated this frame
- `justDeactivated` - Action was just deactivated this frame
- `activeTime` - How long the action has been active (ms)
- `value` - Analog value (0-1), 1 when digital input is pressed

### SerializedBindings

Serialized action bindings for save/load.

```typescript
interface SerializedBindings {
  readonly version: number;
  readonly bindings: readonly {
    readonly action: string;
    readonly keys: readonly string[];
    readonly mouseButtons?: readonly string[];
    readonly continuous?: boolean;
  }[];
}
```

### ActionCallback

```typescript
type ActionCallback = (action: string, state: ActionState, inputState: InputState) => void;
```

### InputActionManager

The full interface for the action manager.

```typescript
interface InputActionManager {
  register(binding: ActionBinding): InputActionManager;
  registerAll(bindings: readonly ActionBinding[]): InputActionManager;
  unregister(action: string): boolean;
  hasAction(action: string): boolean;
  getActions(): string[];
  getBinding(action: string): ActionBinding | undefined;
  update(inputState: InputState, deltaTime: number): void;
  isActive(action: string): boolean;
  isJustActivated(action: string): boolean;
  isJustDeactivated(action: string): boolean;
  getValue(action: string): number;
  getActiveTime(action: string): number;
  getState(action: string): ActionState;
  getActiveActions(): string[];
  rebindKeys(action: string, keys: readonly string[]): boolean;
  rebindMouseButtons(action: string, buttons: readonly MouseButton[]): boolean;
  addKey(action: string, key: string): boolean;
  removeKey(action: string, key: string): boolean;
  getKeysForAction(action: string): string[];
  getMouseButtonsForAction(action: string): MouseButton[];
  getActionsForKey(key: string): string[];
  onAction(action: string, callback: ActionCallback): () => void;
  onAnyAction(callback: ActionCallback): () => void;
  saveBindings(): SerializedBindings;
  loadBindings(data: unknown): void;
  toJSON(pretty?: boolean): string;
  fromJSON(json: string): void;
  resetStates(): void;
  clear(): void;
}
```

## Functions

### createInputActionManager

Creates a new InputActionManager.

```typescript
function createInputActionManager(
  initialBindings?: readonly ActionBinding[]
): InputActionManager;
```

**Parameters:**
- `initialBindings` - Optional initial bindings to register

**Returns:** A new InputActionManager instance.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createInputActionManager } from 'blecsd';

const actions = createInputActionManager([
  { action: 'jump', keys: ['space'] },
  { action: 'attack', keys: ['j'], mouseButtons: ['left'] },
]);
```

## Validation Schemas

### ActionBindingSchema

Zod schema for validating action bindings at runtime.

<!-- blecsd-doccheck:ignore -->
```typescript
import { ActionBindingSchema } from 'blecsd';

const result = ActionBindingSchema.parse({
  action: 'jump',
  keys: ['space'],
  continuous: false,
});
```

### SerializedBindingsSchema

Zod schema for validating serialized binding data.

<!-- blecsd-doccheck:ignore -->
```typescript
import { SerializedBindingsSchema } from 'blecsd';

const result = SerializedBindingsSchema.parse(loadedData);
```

## Presets

### ActionPresets

Common action presets for quick setup.

<!-- blecsd-doccheck:ignore -->
```typescript
import { ActionPresets, createInputActionManager } from 'blecsd';

// Standard platformer controls (move_left, move_right, jump, crouch, attack)
const platformer = createInputActionManager(ActionPresets.platformer);

// Standard top-down controls (move_up, move_down, move_left, move_right, action)
const topDown = createInputActionManager(ActionPresets.topDown);

// Menu navigation controls (up, down, left, right, confirm, cancel)
const menu = createInputActionManager(ActionPresets.menu);
```

## Usage Example

<!-- blecsd-doccheck:ignore -->
```typescript
import { createInputActionManager, createInputState } from 'blecsd';

const inputState = createInputState();
const actions = createInputActionManager([
  { action: 'move_left', keys: ['a', 'left'], continuous: true },
  { action: 'move_right', keys: ['d', 'right'], continuous: true },
  { action: 'jump', keys: ['space', 'w', 'up'] },
  { action: 'attack', keys: ['j', 'enter'] },
]);

// Listen for specific actions
const unsub = actions.onAction('attack', (action, state) => {
  if (state.justActivated) {
    console.log('Attack!');
  }
});

// In game loop
function update(deltaTime: number) {
  actions.update(inputState, deltaTime);

  if (actions.isActive('move_left')) {
    player.x -= speed * deltaTime;
  }
  if (actions.isJustActivated('jump')) {
    player.vy = -jumpForce;
  }
}

// Runtime rebinding
actions.rebindKeys('jump', ['space', 'z']);

// Save/load bindings
const json = actions.toJSON(true);
actions.fromJSON(json);

// Cleanup
unsub();
```
