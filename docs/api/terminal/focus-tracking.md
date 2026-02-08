# Terminal Focus Tracking

Provides focus/blur event handling that detects when the terminal window gains or loses focus using terminal focus reporting (CSI ? 1004 h/l sequences).

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createInputHandler,
  createFocusTracker,
  enableFocusTracking,
  disableFocusTracking,
  getTerminalFocusEventBus,
} from 'blecsd';

const inputHandler = createInputHandler(process.stdin);
const tracker = createFocusTracker(inputHandler);

// Listen for focus events
getTerminalFocusEventBus().on('focus', () => {
  console.log('Terminal gained focus');
});

getTerminalFocusEventBus().on('blur', () => {
  console.log('Terminal lost focus');
});

// Enable focus tracking
enableFocusTracking(tracker);

// When done
disableFocusTracking(tracker);
```

## Types

### FocusTrackingEventMap

```typescript
interface FocusTrackingEventMap {
  focus: undefined;    // Terminal window gained focus
  blur: undefined;     // Terminal window lost focus
}
```

### FocusTrackerState

```typescript
interface FocusTrackerState {
  readonly inputHandler: InputHandler;
  enabled: boolean;
  focused: boolean;
  readonly handler: (event: FocusEvent) => void;
  unsubscribe: (() => void) | null;
}
```

## Functions

### createFocusTracker

Creates a focus tracker for the given input handler. The tracker will listen for focus events from the terminal, track current focus state, and emit focus/blur events on the event bus.

```typescript
function createFocusTracker(inputHandler: InputHandler): FocusTrackerState
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { createInputHandler, createFocusTracker } from 'blecsd';

const inputHandler = createInputHandler(process.stdin);
const tracker = createFocusTracker(inputHandler);
```

### enableFocusTracking

Enables focus tracking on an input handler. Sends the CSI ? 1004 h sequence to enable terminal focus reporting and starts listening for focus events.

```typescript
function enableFocusTracking(state: FocusTrackerState): void
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { enableFocusTracking } from 'blecsd';

enableFocusTracking(tracker);
```

### disableFocusTracking

Disables focus tracking on an input handler. Sends the CSI ? 1004 l sequence to disable terminal focus reporting and stops listening for focus events.

```typescript
function disableFocusTracking(state: FocusTrackerState): void
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { disableFocusTracking } from 'blecsd';

disableFocusTracking(tracker);
```

### getTerminalFocusEventBus

Gets the focus event bus, creating if needed. Returns the same event bus instance on subsequent calls.

```typescript
function getTerminalFocusEventBus(): EventBus<FocusTrackingEventMap>
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { getTerminalFocusEventBus } from 'blecsd';

const bus = getTerminalFocusEventBus();

bus.on('focus', () => {
  console.log('Terminal window gained focus');
});

bus.on('blur', () => {
  console.log('Terminal window lost focus');
});
```

### getFocusTracker

Gets the active focus tracker for an input handler.

```typescript
function getFocusTracker(inputHandler: InputHandler): FocusTrackerState | undefined
```

Returns the focus tracker state, or `undefined` if not set up.

### isTerminalFocused

Gets the current focus state for an input handler.

```typescript
function isTerminalFocused(inputHandler: InputHandler): boolean | undefined
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { isTerminalFocused } from 'blecsd';

const focused = isTerminalFocused(inputHandler);
if (focused) {
  console.log('Terminal is focused');
}
```

Returns `true` if focused, `false` if blurred, `undefined` if no tracker exists.

### triggerFocusEvent

Manually triggers a focus event. Useful for testing or when focus state is obtained externally.

```typescript
function triggerFocusEvent(inputHandler: InputHandler, focused: boolean): void
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { triggerFocusEvent } from 'blecsd';

// Simulate focus gained
triggerFocusEvent(inputHandler, true);

// Simulate focus lost
triggerFocusEvent(inputHandler, false);
```

### resetTerminalFocusEventBus

Resets the focus event bus. Used for testing.

```typescript
function resetTerminalFocusEventBus(): void
```

## Terminal Support

Focus reporting is supported by most modern terminals:

| Terminal | Supported |
|----------|-----------|
| xterm | ✓ |
| VTE-based (GNOME Terminal, etc.) | ✓ |
| Konsole | ✓ |
| iTerm2 | ✓ |
| Alacritty | ✓ |
| Kitty | ✓ |
| WezTerm | ✓ |

## Use Cases

Focus tracking is useful for:

- **Pausing animations** when the terminal loses focus
- **Reducing CPU usage** when the terminal is in the background
- **Auto-saving** when the user switches away from the terminal
- **Resuming operations** when the terminal regains focus
- **Visual indicators** showing focus state

## Example: Pause Updates When Unfocused

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createInputHandler,
  createFocusTracker,
  enableFocusTracking,
  getTerminalFocusEventBus,
} from 'blecsd';

const inputHandler = createInputHandler(process.stdin);
const tracker = createFocusTracker(inputHandler);

let isPaused = false;

getTerminalFocusEventBus().on('blur', () => {
  isPaused = true;
  console.log('Pausing updates...');
});

getTerminalFocusEventBus().on('focus', () => {
  isPaused = false;
  console.log('Resuming updates...');
});

enableFocusTracking(tracker);

// In your render loop
function update() {
  if (!isPaused) {
    // Update UI
  }
  requestAnimationFrame(update);
}
```

## See Also

- [Input Stream](./input-stream.md) - Input handler and event processing
- [Mouse Parser](./mouse-parser.md) - Mouse event parsing (includes FocusEvent type)
- [ANSI](../ansi.md) - ANSI escape sequences (including focus reporting sequences)
