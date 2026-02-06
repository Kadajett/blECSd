# Key Lock and Grab API

Key event control system for modal dialogs and game input handling.

## Overview

The key lock module provides:
- Key grabbing (consume keys without propagation)
- Key locking (block all key events)
- Ignored keys (bypass lock for specific keys)
- Custom filters for complex blocking logic
- Scoped lock contexts that auto-restore

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  grabKeys,
  lockAllKeys,
  setIgnoredKeys,
  shouldBlockKeyEvent,
  unlockAllKeys,
} from 'blecsd';

// Modal dialog: lock all except escape/enter
lockAllKeys();
setIgnoredKeys(['escape', 'enter']);

// In input handler
function handleKey(event: KeyEvent): void {
  if (shouldBlockKeyEvent(event)) {
    return; // Key is blocked
  }
  // Process key normally
}

// When modal closes
unlockAllKeys();
```

## Key Grabbing

Grabbed keys are consumed but not propagated to the application.

### grabKeys

Grabs specified keys.

<!-- blecsd-doccheck:ignore -->
```typescript
import { grabKeys } from 'blecsd';

// Grab movement keys for game
grabKeys(['up', 'down', 'left', 'right', 'space']);
```

### releaseKeys

Releases grabbed keys.

<!-- blecsd-doccheck:ignore -->
```typescript
import { releaseKeys } from 'blecsd';

releaseKeys(['up', 'down']);
```

### releaseAllGrabbedKeys

Releases all grabbed keys.

<!-- blecsd-doccheck:ignore -->
```typescript
import { releaseAllGrabbedKeys } from 'blecsd';

releaseAllGrabbedKeys();
```

### isKeyGrabbed

Checks if a key is grabbed.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isKeyGrabbed } from 'blecsd';

if (isKeyGrabbed('escape')) {
  // Key is grabbed
}
```

### getGrabbedKeys

Gets all grabbed keys.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getGrabbedKeys } from 'blecsd';

const keys = getGrabbedKeys();
// ['up', 'down', 'left', 'right']
```

## Key Locking

Lock all keys at once, with optional exceptions.

### lockAllKeys

Locks all keys from processing.

<!-- blecsd-doccheck:ignore -->
```typescript
import { lockAllKeys } from 'blecsd';

lockAllKeys();
```

### unlockAllKeys

Unlocks all keys.

<!-- blecsd-doccheck:ignore -->
```typescript
import { unlockAllKeys } from 'blecsd';

unlockAllKeys();
```

### areAllKeysLocked

Checks if all keys are locked.

<!-- blecsd-doccheck:ignore -->
```typescript
import { areAllKeysLocked } from 'blecsd';

if (areAllKeysLocked()) {
  // Lock is active
}
```

## Ignored Keys

Keys that bypass the lock when all keys are locked.

### setIgnoredKeys

Sets keys to ignore (replaces previous list).

<!-- blecsd-doccheck:ignore -->
```typescript
import { setIgnoredKeys } from 'blecsd';

// Only allow escape and enter when locked
setIgnoredKeys(['escape', 'enter']);
```

### addIgnoredKeys

Adds keys to ignored list.

<!-- blecsd-doccheck:ignore -->
```typescript
import { addIgnoredKeys } from 'blecsd';

addIgnoredKeys(['tab']);
```

### removeIgnoredKeys

Removes keys from ignored list.

<!-- blecsd-doccheck:ignore -->
```typescript
import { removeIgnoredKeys } from 'blecsd';

removeIgnoredKeys(['tab']);
```

### clearIgnoredKeys

Clears all ignored keys.

<!-- blecsd-doccheck:ignore -->
```typescript
import { clearIgnoredKeys } from 'blecsd';

clearIgnoredKeys();
```

### getIgnoredKeys

Gets all ignored keys.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getIgnoredKeys } from 'blecsd';

const keys = getIgnoredKeys();
// ['escape', 'enter']
```

### isKeyIgnored

Checks if a key is ignored.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isKeyIgnored } from 'blecsd';

if (isKeyIgnored('escape')) {
  // Key will bypass lock
}
```

## Custom Filters

For complex blocking logic.

### setKeyLockFilter

Sets a custom filter function.

<!-- blecsd-doccheck:ignore -->
```typescript
import { setKeyLockFilter } from 'blecsd';

// Block all number keys
setKeyLockFilter((event) => /^[0-9]$/.test(event.name));

// Clear filter
setKeyLockFilter(null);
```

### getKeyLockFilter

Gets the current filter.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getKeyLockFilter } from 'blecsd';

const filter = getKeyLockFilter();
```

## Event Filtering

### shouldBlockKeyEvent

Checks if a key event should be blocked.

<!-- blecsd-doccheck:ignore -->
```typescript
import { shouldBlockKeyEvent } from 'blecsd';

function processKeyEvent(event: KeyEvent): void {
  if (shouldBlockKeyEvent(event)) {
    return; // Event is blocked
  }
  // Process event
}
```

The function checks in order:
1. Is the key grabbed? (blocked)
2. Are all keys locked and this key not ignored? (blocked)
3. Does custom filter block it? (blocked)

### isKeyLocked

Simplified check by key name only.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isKeyLocked } from 'blecsd';

if (isKeyLocked('a')) {
  // Key is locked
}
```

## Convenience Functions

### applyKeyLockOptions

Applies multiple options at once.

<!-- blecsd-doccheck:ignore -->
```typescript
import { applyKeyLockOptions } from 'blecsd';

applyKeyLockOptions({
  grab: ['tab'],
  lockAll: true,
  ignore: ['escape', 'enter'],
  filter: (e) => e.name === 'blocked',
});
```

### createKeyLockScope

Creates a scoped lock context that auto-restores.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createKeyLockScope } from 'blecsd';

// Open modal
const restore = createKeyLockScope({
  lockAll: true,
  ignore: ['escape', 'enter', 'tab'],
});

// ... modal is active ...

// Close modal - previous state is restored
restore();
```

Scopes can be nested:

```typescript
const restore1 = createKeyLockScope({ lockAll: true });
const restore2 = createKeyLockScope({ ignore: ['escape'] });

// Inner scope active
restore2(); // Back to outer scope
restore1(); // Back to original state
```

## State Management

### getKeyLockState

Gets the current state object.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getKeyLockState } from 'blecsd';

const state = getKeyLockState();
console.log(state.allKeysLocked);
console.log(state.grabbedKeys);
```

### createKeyLockState

Creates a new state with defaults.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createKeyLockState } from 'blecsd';

const state = createKeyLockState();
// { grabbedKeys: Set, allKeysLocked: false, ignoredKeys: Set, customFilter: null }
```

### resetKeyLockState

Resets global state to defaults (for testing).

<!-- blecsd-doccheck:ignore -->
```typescript
import { resetKeyLockState } from 'blecsd';

resetKeyLockState();
```

## Types

### KeyLockState

```typescript
interface KeyLockState {
  readonly grabbedKeys: ReadonlySet<string>;
  readonly allKeysLocked: boolean;
  readonly ignoredKeys: ReadonlySet<string>;
  readonly customFilter: KeyLockFilter | null;
}
```

### KeyLockFilter

```typescript
type KeyLockFilter = (event: KeyEvent) => boolean;
```

### KeyLockOptions

```typescript
interface KeyLockOptions {
  grab?: readonly string[];
  release?: readonly string[];
  lockAll?: boolean;
  ignore?: readonly string[];
  filter?: KeyLockFilter | null;
}
```

## Integration Examples

### Modal Dialog

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createKeyLockScope,
  shouldBlockKeyEvent,
} from 'blecsd';

function openModal(): () => void {
  // Lock all except dialog controls
  const restore = createKeyLockScope({
    lockAll: true,
    ignore: ['escape', 'enter', 'tab', 'up', 'down'],
  });

  // Return close function
  return () => {
    restore();
  };
}

// Usage
const closeModal = openModal();
// ... modal is active ...
closeModal();
```

### Game Input

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  grabKeys,
  releaseAllGrabbedKeys,
  shouldBlockKeyEvent,
} from 'blecsd';

function startGame(): void {
  // Grab movement keys
  grabKeys(['up', 'down', 'left', 'right', 'space', 'w', 'a', 's', 'd']);
}

function pauseGame(): void {
  // Release keys when paused
  releaseAllGrabbedKeys();
}

function handleGameInput(event: KeyEvent): void {
  if (shouldBlockKeyEvent(event)) {
    // Key is grabbed, handle it in game
    handleMovement(event);
    return;
  }
  // Other keys go to UI
}
```

### Custom Input Validation

<!-- blecsd-doccheck:ignore -->
```typescript
import { setKeyLockFilter } from 'blecsd';

// Only allow alphanumeric input
function enableAlphanumericOnly(): void {
  setKeyLockFilter((event) => {
    const allowed = /^[a-zA-Z0-9]$/.test(event.name) ||
      ['enter', 'backspace', 'escape', 'tab'].includes(event.name);
    return !allowed; // Return true to block
  });
}

// Clear restriction
function disableRestriction(): void {
  setKeyLockFilter(null);
}
```

## Best Practices

1. **Use scopes for temporary locks** - `createKeyLockScope` automatically restores state when done.

2. **Prefer lockAll + ignore over grabbing many keys** - More maintainable for modal dialogs.

3. **Keys are case-insensitive** - `'ESCAPE'` and `'escape'` are equivalent.

4. **Check shouldBlockKeyEvent early** - Call it at the start of your input handler.

5. **Remember grab takes priority** - Grabbed keys are blocked even if in ignored list.
