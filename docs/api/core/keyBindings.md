# Key Bindings

Configurable key binding system for keyboard shortcuts. Provides key combination parsing, binding registration, and event matching with conditional execution.

## Overview

```typescript
import {
  createKeyBindingRegistry,
  registerBinding,
  matchEvent,
  parseKeyString,
} from 'blecsd';

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
const matches = matchEvent(registry, keyEvent);
for (const match of matches) {
  console.log('Execute action:', match.action);
}
```

---

## parseKeyString

Parses a key combination string into a ParsedKey object.

```typescript
import { parseKeyString } from 'blecsd';

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
import { createKeyBindingRegistry } from 'blecsd';

const registry = createKeyBindingRegistry();
```

### registerBinding

Registers a single key binding.

```typescript
import { registerBinding } from 'blecsd';

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
import { registerBindings } from 'blecsd';

const registry = registerBindings(createKeyBindingRegistry(), [
  { keys: 'ctrl+c', action: 'copy' },
  { keys: 'ctrl+v', action: 'paste' },
  { keys: 'ctrl+x', action: 'cut' },
]);
```

### unregisterBinding

Removes a binding by action name.

```typescript
import { unregisterBinding } from 'blecsd';

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
import { matchEvent } from 'blecsd';

// Simple match
const matches = matchEvent(registry, keyEvent);

// With condition context
const matches = matchEvent(registry, keyEvent, {
  focus: 'editor',
  modalOpen: false,
  textInputFocused: true,
});

for (const match of matches) {
  console.log(match.action);        // Action identifier
  console.log(match.preventDefault); // Whether to prevent default
  console.log(match.binding);       // Full binding object
}
```

### matchesKey

Checks if a specific binding matches a key event.

```typescript
import { matchesKey } from 'blecsd';

const binding = { keys: 'ctrl+c', action: 'copy' };
const matches = matchesKey(binding, keyEvent);
```

### getBindingsForKey

Gets all bindings for a parsed key combination (without condition evaluation).

```typescript
import { getBindingsForKey, parseKeyString } from 'blecsd';

const key = parseKeyString('ctrl+s')!;
const bindings = getBindingsForKey(registry, key);
```

### getBindingForAction

Gets a binding by its action name.

```typescript
import { getBindingForAction } from 'blecsd';

const binding = getBindingForAction(registry, 'save');
```

---

## Condition Expressions

The `when` property allows bindings to only activate in certain contexts.

### Supported Syntax

```typescript
// Boolean check
{ keys: 'ctrl+s', action: 'save', when: 'editorFocused' }

// Negation
{ keys: 'escape', action: 'close', when: '!modalOpen' }

// Equality
{ keys: 'enter', action: 'submit', when: 'focus == form' }

// Inequality
{ keys: 'tab', action: 'indent', when: 'focus != search' }

// AND conditions
{ keys: 'ctrl+s', action: 'save', when: 'editorFocused && !modalOpen' }
```

### evaluateCondition

Evaluates a condition expression against a context.

```typescript
import { evaluateCondition } from 'blecsd';

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
import { formatKey, parseKeyString } from 'blecsd';

const key = parseKeyString('shift+ctrl+a')!;
formatKey(key); // 'ctrl+shift+a' (normalized order)
```

### formatKeyEvent

Formats a KeyEvent as a key binding string.

```typescript
import { formatKeyEvent } from 'blecsd';

formatKeyEvent(keyEvent);
// 'ctrl+shift+a' or 'escape' etc.
```

---

## Default Bindings

Pre-defined binding sets for common use cases.

### DEFAULT_TEXT_BINDINGS

Standard text editing shortcuts.

```typescript
import { DEFAULT_TEXT_BINDINGS, registerBindings } from 'blecsd';

const registry = registerBindings(createKeyBindingRegistry(), DEFAULT_TEXT_BINDINGS);
// Includes: copy, paste, cut, undo, redo, selectAll, deleteBack, deleteForward,
// moveToLineStart, moveToLineEnd, moveToStart, moveToEnd
```

### DEFAULT_NAV_BINDINGS

Standard navigation shortcuts.

```typescript
import { DEFAULT_NAV_BINDINGS, registerBindings } from 'blecsd';

const registry = registerBindings(createKeyBindingRegistry(), DEFAULT_NAV_BINDINGS);
// Includes: focusNext (tab), focusPrev (shift+tab), cancel (escape),
// confirm (enter), moveUp/Down/Left/Right, pageUp/Down
```

---

## Validation Schemas

Zod schemas for runtime validation.

```typescript
import { KeyBindingSchema, KeyBindingsArraySchema } from 'blecsd';

// Validate single binding
const result = KeyBindingSchema.safeParse(binding);

// Validate array of bindings
const results = KeyBindingsArraySchema.safeParse(bindings);
```

---

## Examples

### Game Controls

```typescript
import { createKeyBindingRegistry, registerBindings, matchEvent } from 'blecsd';

let registry = createKeyBindingRegistry();
registry = registerBindings(registry, [
  { keys: 'w', action: 'moveUp' },
  { keys: 's', action: 'moveDown' },
  { keys: 'a', action: 'moveLeft' },
  { keys: 'd', action: 'moveRight' },
  { keys: 'space', action: 'jump' },
  { keys: 'shift', action: 'sprint' },
  { keys: 'e', action: 'interact' },
  { keys: 'escape', action: 'pause' },
]);

// In game loop
function handleInput(keyEvent: KeyEvent) {
  const matches = matchEvent(registry, keyEvent);
  for (const { action } of matches) {
    switch (action) {
      case 'moveUp': player.y -= 1; break;
      case 'moveDown': player.y += 1; break;
      // ...
    }
  }
}
```

### Context-Aware Bindings

```typescript
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

const matches = matchEvent(registry, keyEvent, context);
```

### Rebindable Keys

```typescript
// Load bindings from config
const userBindings = loadConfig().keybindings;
let registry = registerBindings(createKeyBindingRegistry(), userBindings);

// User rebinds a key
function rebindKey(action: string, newKey: string) {
  const existing = getBindingForAction(registry, action);
  if (existing) {
    registry = unregisterBinding(registry, action);
    registry = registerBinding(registry, {
      ...existing,
      keys: newKey,
    });
  }
}
```

---

## See Also

- [Key Parser](../terminal/keyParser.md) - Key event parsing
- [Input System](../systems/inputSystem.md) - Input handling system
- [Input Actions](./inputActions.md) - Action mapping system
