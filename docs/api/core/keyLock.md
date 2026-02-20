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

```typescript
import {
  grabKeys,
  lockAllKeys,
  setIgnoredKeys,
  shouldBlockKeyEvent,
  unlockAllKeys,
} from 'blecsd/core';

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

```typescript
import { grabKeys } from 'blecsd/core';

// Grab movement keys for game
grabKeys(['up', 'down', 'left', 'right', 'space']);
```

### releaseKeys

Releases grabbed keys.

```typescript
import { releaseKeys } from 'blecsd/core';

releaseKeys(['up', 'down']);
```

### releaseAllGrabbedKeys

Releases all grabbed keys.

```typescript
import { releaseAllGrabbedKeys } from 'blecsd/core';

releaseAllGrabbedKeys();
```

### isKeyGrabbed

Checks if a key is grabbed.

```typescript
import { isKeyGrabbed } from 'blecsd/core';

if (isKeyGrabbed('escape')) {
  // Key is grabbed
}
```

### getGrabbedKeys

Gets all grabbed keys.

```typescript
import { getGrabbedKeys } from 'blecsd/core';

const keys = getGrabbedKeys();
// ['up', 'down', 'left', 'right']
```

## Key Locking

Lock all keys at once, with optional exceptions.

### lockAllKeys

Locks all keys from processing.

```typescript
import { lockAllKeys } from 'blecsd/core';

lockAllKeys();
```

### unlockAllKeys

Unlocks all keys.

```typescript
import { unlockAllKeys } from 'blecsd/core';

unlockAllKeys();
```

### areAllKeysLocked

Checks if all keys are locked.

```typescript
import { areAllKeysLocked } from 'blecsd/core';

if (areAllKeysLocked()) {
  // Lock is active
}
```

## Ignored Keys

Keys that bypass the lock when all keys are locked.

### setIgnoredKeys

Sets keys to ignore (replaces previous list).

```typescript
import { setIgnoredKeys } from 'blecsd/core';

// Only allow escape and enter when locked
setIgnoredKeys(['escape', 'enter']);
```

### addIgnoredKeys

Adds keys to ignored list.

```typescript
import { addIgnoredKeys } from 'blecsd/core';

addIgnoredKeys(['tab']);
```

### removeIgnoredKeys

Removes keys from ignored list.

```typescript
import { removeIgnoredKeys } from 'blecsd/core';

removeIgnoredKeys(['tab']);
```

### clearIgnoredKeys

Clears all ignored keys.

```typescript
import { clearIgnoredKeys } from 'blecsd/core';

clearIgnoredKeys();
```

### getIgnoredKeys

Gets all ignored keys.

```typescript
import { getIgnoredKeys } from 'blecsd/core';

const keys = getIgnoredKeys();
// ['escape', 'enter']
```

### isKeyIgnored

Checks if a key is ignored.

```typescript
import { isKeyIgnored } from 'blecsd/core';

if (isKeyIgnored('escape')) {
  // Key will bypass lock
}
```

## Custom Filters

For complex blocking logic.

### setKeyLockFilter

Sets a custom filter function.

```typescript
import { setKeyLockFilter } from 'blecsd/core';

// Block all number keys
setKeyLockFilter((event) => /^[0-9]$/.test(event.name));

// Clear filter
setKeyLockFilter(null);
```

### getKeyLockFilter

Gets the current filter.

```typescript
import { getKeyLockFilter } from 'blecsd/core';

const filter = getKeyLockFilter();
```

## Event Filtering

### shouldBlockKeyEvent

Checks if a key event should be blocked.

```typescript
import { shouldBlockKeyEvent } from 'blecsd/core';

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

```typescript
import { isKeyLocked } from 'blecsd/core';

if (isKeyLocked('a')) {
  // Key is locked
}
```

## Convenience Functions

### applyKeyLockOptions

Applies multiple options at once.

```typescript
import { applyKeyLockOptions } from 'blecsd/core';

applyKeyLockOptions({
  grab: ['tab'],
  lockAll: true,
  ignore: ['escape', 'enter'],
  filter: (e) => e.name === 'blocked',
});
```

### createKeyLockScope

Creates a scoped lock context that auto-restores.

```typescript
import { createKeyLockScope } from 'blecsd/core';

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

```typescript
import { getKeyLockState } from 'blecsd/core';

const state = getKeyLockState();
console.log(state.allKeysLocked);
console.log(state.grabbedKeys);
```

### createKeyLockState

Creates a new state with defaults.

```typescript
import { createKeyLockState } from 'blecsd/core';

const state = createKeyLockState();
// { grabbedKeys: Set, allKeysLocked: false, ignoredKeys: Set, customFilter: null }
```

### resetKeyLockState

Resets global state to defaults (for testing).

```typescript
import { resetKeyLockState } from 'blecsd/core';

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

```typescript
import { createKeyLockScope, shouldBlockKeyEvent } from 'blecsd/core';

// Lock all except dialog controls
const restoreModal = createKeyLockScope({
  lockAll: true,
  ignore: ['escape', 'enter', 'tab', 'up', 'down'],
});

// ... modal is active ...

// Close modal - previous state is restored
restoreModal();
```

### Game Input

```typescript
import { grabKeys, releaseAllGrabbedKeys, shouldBlockKeyEvent } from 'blecsd/core';

// Grab movement keys for game
grabKeys(['up', 'down', 'left', 'right', 'space', 'w', 'a', 's', 'd']);

// When paused, release keys
releaseAllGrabbedKeys();
```

### Custom Input Validation

```typescript
import { setKeyLockFilter } from 'blecsd/core';

// Only allow alphanumeric input
setKeyLockFilter((event) => {
  const key = event.key ?? '';
  const allowed = /^[a-zA-Z0-9]$/.test(key) ||
    ['enter', 'backspace', 'escape', 'tab'].includes(key);
  return !allowed; // Return true to block
});

// Clear restriction
setKeyLockFilter(null);
```

## Best Practices

1. **Use scopes for temporary locks** - `createKeyLockScope` automatically restores state when done.

2. **Prefer lockAll + ignore over grabbing many keys** - More maintainable for modal dialogs.

3. **Keys are case-insensitive** - `'ESCAPE'` and `'escape'` are equivalent.

4. **Check shouldBlockKeyEvent early** - Call it at the start of your input handler.

5. **Remember grab takes priority** - Grabbed keys are blocked even if in ignored list.
