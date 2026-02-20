# Key Bindings

Configurable key binding system for keyboard shortcuts. Provides key combination parsing, binding registration, and event matching with conditional execution.

## Overview

```typescript
import {
  createKeyBindingRegistry,
  registerBinding,
  matchEvent,
  parseKeyString,
} from 'blecsd/core';

// Create a registry
let registry = createKeyBindingRegistry();

// Register bindings
registry = registerBinding(registry, {
  keys: 'ctrl+s',
  action: 'save',
  description: 'Save document',
});

registry = registerBinding(registry, {
  keys: ['ctrl+z', 'cmd+z'],
  action: 'undo',
});

// Match key events
const keyEvent = parseKeyString('ctrl+s');
if (keyEvent) {
  const matches = matchEvent(registry, keyEvent);
  for (const match of matches) {
    console.log('Execute action:', match.action);
  }
}
```

---

## parseKeyString

Parses a key combination string into a ParsedKey object.

```typescript
import { parseKeyString } from 'blecsd/core';

// Single key
parseKeyString('a');
// { name: 'a', ctrl: false, meta: false, shift: false }

// With modifiers
parseKeyString('ctrl+shift+a');
// { name: 'a', ctrl: true, meta: false, shift: true }

// Function keys
parseKeyString('ctrl+f5');
// { name: 'f5', ctrl: true, meta: false, shift: false }

// Navigation keys
parseKeyString('alt+home');
// { name: 'home', ctrl: false, meta: true, shift: false }
```

**Supported Modifiers:**
- `ctrl`, `control` - Control key
- `shift` - Shift key
- `alt`, `meta`, `cmd`, `command`, `option`, `win`, `super` - Meta/Alt key

**Supported Keys:**
- Letters: `a-z`
- Numbers: `0-9`
- Function keys: `f1-f12`
- Navigation: `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`
- Special: `escape`, `enter`, `return`, `tab`, `space`, `backspace`, `delete`, `insert`

**Key Aliases:**
- `esc` -> `escape`
- `del` -> `delete`
- `bs` -> `backspace`
- `pgup` -> `pageup`
- `pgdn`, `pgdown` -> `pagedown`

---

## Registry Operations

### createKeyBindingRegistry

Creates an empty key binding registry.

```typescript
import { createKeyBindingRegistry } from 'blecsd/core';

const registry = createKeyBindingRegistry();
```

### registerBinding

Registers a single key binding.

```typescript
import { createKeyBindingRegistry, registerBinding } from 'blecsd/core';

let registry = createKeyBindingRegistry();
registry = registerBinding(registry, {
  keys: 'ctrl+s',
  action: 'save',
  description: 'Save the document',
  when: 'focus == editor',
  preventDefault: true,
});
```

### registerBindings

Registers multiple bindings at once.

```typescript
import { registerBindings } from 'blecsd/core';

const registry = registerBindings(createKeyBindingRegistry(), [
  { keys: 'ctrl+c', action: 'copy' },
  { keys: 'ctrl+v', action: 'paste' },
  { keys: 'ctrl+x', action: 'cut' },
]);
```

### unregisterBinding

Removes a binding by action name.

```typescript
import { createKeyBindingRegistry, registerBinding, unregisterBinding } from 'blecsd/core';

let registry = createKeyBindingRegistry();
registry = registerBinding(registry, { keys: 'ctrl+s', action: 'save' });
registry = unregisterBinding(registry, 'save');
```

---

## KeyBinding Interface

```typescript
interface KeyBinding {
  /** Key combination(s) that trigger this binding */
  keys: string | readonly string[];
  /** Action identifier */
  action: string;
  /** Condition expression for when binding is active */
  when?: string;
  /** Whether to prevent default handling (default: true) */
  preventDefault?: boolean;
  /** Human-readable description */
  description?: string;
}
```

---

## Matching Events

### matchEvent

Matches a key event against the registry and returns all matching bindings.

```typescript
import { createKeyBindingRegistry, registerBinding, matchEvent, parseKeyString } from 'blecsd/core';

const registry = registerBinding(createKeyBindingRegistry(), { keys: 'ctrl+s', action: 'save' });
const keyEvent = parseKeyString('ctrl+s');

if (keyEvent) {
  // Simple match
  const matches = matchEvent(registry, keyEvent);

  // With condition context
  const ctxMatches = matchEvent(registry, keyEvent, {
    focus: 'editor',
    modalOpen: false,
    textInputFocused: true,
  });

  console.log('Simple matches:', matches.length);
  for (const match of ctxMatches) {
    console.log(match.action);        // Action identifier
    console.log(match.preventDefault); // Whether to prevent default
  }
}
```

### matchesKey

Checks if a specific binding matches a key event.

```typescript
import { matchesKey, parseKeyString } from 'blecsd/core';

const binding = { keys: 'ctrl+c', action: 'copy' };
const keyEvent = parseKeyString('ctrl+c');
if (keyEvent) {
  const matches = matchesKey(binding, keyEvent);
  console.log('Matches:', matches);
}
```

### getBindingsForKey

Gets all bindings for a parsed key combination (without condition evaluation).

```typescript
import { createKeyBindingRegistry, registerBinding, getBindingsForKey, parseKeyString } from 'blecsd/core';

const registry = registerBinding(createKeyBindingRegistry(), { keys: 'ctrl+s', action: 'save' });
const key = parseKeyString('ctrl+s')!;
const bindings = getBindingsForKey(registry, key);
console.log('Bindings for ctrl+s:', bindings.map(b => b.action));
```

### getBindingForAction

Gets a binding by its action name.

```typescript
import { createKeyBindingRegistry, registerBinding, getBindingForAction } from 'blecsd/core';

const registry = registerBinding(createKeyBindingRegistry(), { keys: 'ctrl+s', action: 'save' });
const binding = getBindingForAction(registry, 'save');
console.log('Binding for save:', binding?.keys);
```

---

## Condition Expressions

The `when` property allows bindings to only activate in certain contexts.

### Supported Syntax

```typescript
import { createKeyBindingRegistry, registerBindings } from 'blecsd/core';

// Boolean check
const registry = registerBindings(createKeyBindingRegistry(), [
  { keys: 'ctrl+s', action: 'save', when: 'editorFocused' },
  { keys: 'escape', action: 'close', when: '!modalOpen' },
  { keys: 'enter', action: 'submit', when: 'focus == form' },
  { keys: 'tab', action: 'indent', when: 'focus != search' },
  { keys: 'ctrl+s', action: 'saveAll', when: 'editorFocused && !modalOpen' },
]);
console.log('Registered conditional bindings');
```

### evaluateCondition

Evaluates a condition expression against a context.

```typescript
import { evaluateCondition } from 'blecsd/core';

const context = {
  focus: 'editor',
  modalOpen: false,
  textInputFocused: true,
};

evaluateCondition('focus == editor', context);           // true
evaluateCondition('!modalOpen', context);                // true
evaluateCondition('textInputFocused && !modalOpen', context); // true
```

---

## Formatting

### formatKey

Formats a ParsedKey back to a string.

```typescript
import { formatKey, parseKeyString } from 'blecsd/core';

const key = parseKeyString('shift+ctrl+a')!;
formatKey(key); // 'ctrl+shift+a' (normalized order)
```

### formatKeyEvent

Formats a KeyEvent as a key binding string.

```typescript
import { formatKeyEvent, parseKeyString } from 'blecsd/core';

const keyEvent = parseKeyString('ctrl+shift+a')!;
formatKeyEvent(keyEvent);
// 'ctrl+shift+a' or 'escape' etc.
```

---

## Default Bindings

Pre-defined binding sets for common use cases.

### DEFAULT_TEXT_BINDINGS

Standard text editing shortcuts.

```typescript
import { DEFAULT_TEXT_BINDINGS, registerBindings, createKeyBindingRegistry } from 'blecsd/core';

const registry = registerBindings(createKeyBindingRegistry(), DEFAULT_TEXT_BINDINGS);
// Includes: copy, paste, cut, undo, redo, selectAll, deleteBack, deleteForward,
// moveToLineStart, moveToLineEnd, moveToStart, moveToEnd
console.log('Text binding count:', DEFAULT_TEXT_BINDINGS.length);
```

### DEFAULT_NAV_BINDINGS

Standard navigation shortcuts.

```typescript
import { DEFAULT_NAV_BINDINGS, registerBindings, createKeyBindingRegistry } from 'blecsd/core';

const registry = registerBindings(createKeyBindingRegistry(), DEFAULT_NAV_BINDINGS);
// Includes: focusNext (tab), focusPrev (shift+tab), cancel (escape),
// confirm (enter), moveUp/Down/Left/Right, pageUp/Down
console.log('Nav binding count:', DEFAULT_NAV_BINDINGS.length);
```

---

## Validation Schemas

Zod schemas for runtime validation.

```typescript
import { KeyBindingSchema, KeyBindingsArraySchema } from 'blecsd/core';

// Validate single binding
const binding = { keys: 'ctrl+s', action: 'save' };
const bindings = [binding];
const result = KeyBindingSchema.safeParse(binding);

// Validate array of bindings
const results = KeyBindingsArraySchema.safeParse(bindings);
console.log('Binding valid:', result.success);
console.log('Bindings valid:', results.success);
```

---

## Examples

### Game Controls

```typescript
import { createKeyBindingRegistry, registerBindings, matchEvent, parseKeyString } from 'blecsd/core';
import type { ParsedKey } from 'blecsd/core';

let registry = createKeyBindingRegistry();
registry = registerBindings(registry, [
  { keys: 'w', action: 'moveUp' },
  { keys: 's', action: 'moveDown' },
  { keys: 'a', action: 'moveLeft' },
  { keys: 'd', action: 'moveRight' },
  { keys: 'space', action: 'jump' },
  { keys: 'escape', action: 'pause' },
]);

const player = { x: 0, y: 0 };

// In game loop
const handleInput = (keyEvent: ParsedKey) => {
  const matches = matchEvent(registry, keyEvent);
  for (const { action } of matches) {
    switch (action) {
      case 'moveUp': player.y -= 1; break;
      case 'moveDown': player.y += 1; break;
    }
  }
};

const ev = parseKeyString('w');
if (ev) handleInput(ev);
console.log('Player position:', player.x, player.y);
```

### Context-Aware Bindings

```typescript
import { createKeyBindingRegistry, registerBindings, matchEvent, parseKeyString } from 'blecsd/core';

let registry = createKeyBindingRegistry();
registry = registerBindings(registry, [
  // Only in editor
  { keys: 'ctrl+s', action: 'save', when: 'focus == editor' },

  // Not when modal is open
  { keys: 'escape', action: 'quit', when: '!modalOpen' },
  { keys: 'escape', action: 'closeModal', when: 'modalOpen' },

  // Combined conditions
  { keys: 'enter', action: 'submit', when: 'focus == form && !loading' },
]);

// Provide context when matching
const context = {
  focus: 'editor',
  modalOpen: false,
  loading: false,
};

const keyEvent = parseKeyString('ctrl+s');
if (keyEvent) {
  const matches = matchEvent(registry, keyEvent, context);
  console.log('Matched actions:', matches.map(m => m.action));
}
```

### Rebindable Keys

```typescript
import { createKeyBindingRegistry, registerBindings, registerBinding, unregisterBinding, getBindingForAction } from 'blecsd/core';

const defaultBindings = [{ keys: 'ctrl+s', action: 'save' }, { keys: 'ctrl+z', action: 'undo' }];
let registry = registerBindings(createKeyBindingRegistry(), defaultBindings);

// User rebinds a key
const rebindKey = (action: string, newKey: string) => {
  const existing = getBindingForAction(registry, action);
  if (existing) {
    registry = unregisterBinding(registry, action);
    registry = registerBinding(registry, {
      ...existing,
      keys: newKey,
    });
  }
};

rebindKey('save', 'ctrl+shift+s');
```

---

## See Also

- [Key Parser](../terminal/key-parser.md) - Key event parsing
- [Input System](../systems/input-system.md) - Input handling system
- [Input Actions](./keyBindings.md) - Action mapping system
