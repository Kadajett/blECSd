# Capability Name Mappings

Complete terminfo capability name arrays, termcap-to-terminfo alias mappings, and utility functions for capability name resolution.

## Overview

```typescript
import {
  BOOLEAN_CAPS,
  NUMBER_CAPS,
  STRING_CAPS,
  CAPABILITY_ALIASES,
  resolveCapabilityName,
  getCapabilityType,
} from 'blecsd';

// Resolve termcap to terminfo name
const name = resolveCapabilityName('cup');  // 'cursor_address'

// Get capability type
const type = getCapabilityType('cursor_address');  // 'string'

// Check if valid capability
if (isCapabilityName('cm')) {
  console.log('Valid capability');
}
```

---

## Capability Arrays

### BOOLEAN_CAPS

Complete list of boolean capability names in terminfo order.

```typescript
import { BOOLEAN_CAPS } from 'blecsd';

console.log(`${BOOLEAN_CAPS.length} boolean capabilities`);
// 37 boolean capabilities

// Examples:
// 'auto_left_margin', 'auto_right_margin', 'has_meta_key', 'back_color_erase', ...
```

### NUMBER_CAPS

Complete list of numeric capability names in terminfo order.

```typescript
import { NUMBER_CAPS } from 'blecsd';

console.log(`${NUMBER_CAPS.length} numeric capabilities`);
// 33 numeric capabilities

// Examples:
// 'columns', 'lines', 'max_colors', 'max_pairs', ...
```

### STRING_CAPS

Complete list of string capability names in terminfo order.

```typescript
import { STRING_CAPS } from 'blecsd';

console.log(`${STRING_CAPS.length} string capabilities`);

// Examples:
// 'cursor_address', 'clear_screen', 'set_a_foreground', 'key_up', ...
```

---

## Alias Mappings

### CAPABILITY_ALIASES

Maps termcap short names to terminfo long names.

```typescript
import { CAPABILITY_ALIASES } from 'blecsd';

// Common aliases:
CAPABILITY_ALIASES['cm']  // 'cursor_address'
CAPABILITY_ALIASES['cl']  // 'clear_screen'
CAPABILITY_ALIASES['AF']  // 'set_a_foreground'
CAPABILITY_ALIASES['AB']  // 'set_a_background'
CAPABILITY_ALIASES['co']  // 'columns'
CAPABILITY_ALIASES['li']  // 'lines'
CAPABILITY_ALIASES['am']  // 'auto_right_margin'
CAPABILITY_ALIASES['km']  // 'has_meta_key'
```

### CAPABILITY_REVERSE_ALIASES

Maps terminfo long names to termcap short names.

```typescript
import { CAPABILITY_REVERSE_ALIASES } from 'blecsd';

CAPABILITY_REVERSE_ALIASES['cursor_address']  // 'cm'
CAPABILITY_REVERSE_ALIASES['clear_screen']    // 'cl'
```

---

## Utility Functions

### resolveCapabilityName

Resolves a capability name, handling termcap aliases.

```typescript
import { resolveCapabilityName } from 'blecsd';

resolveCapabilityName('cup');             // 'cursor_address'
resolveCapabilityName('cursor_address');  // 'cursor_address' (unchanged)
resolveCapabilityName('unknown');         // 'unknown' (unchanged)
```

**Parameters:**
- `name` - Capability name (terminfo or termcap)

**Returns:** `string` - Resolved terminfo name

---

### getTermcapName

Gets the termcap short name for a terminfo capability.

```typescript
import { getTermcapName } from 'blecsd';

getTermcapName('cursor_address');  // 'cm'
getTermcapName('clear_screen');    // 'cl'
getTermcapName('unknown');         // null
```

**Parameters:**
- `name` - Terminfo capability name

**Returns:** `string | null`

---

### getCapabilityType

Gets the type of a capability.

```typescript
import { getCapabilityType } from 'blecsd';

getCapabilityType('cursor_address');    // 'string'
getCapabilityType('max_colors');        // 'number'
getCapabilityType('auto_right_margin'); // 'boolean'
getCapabilityType('cm');                // 'string' (via alias)
getCapabilityType('unknown');           // null
```

**Parameters:**
- `name` - Capability name (terminfo or termcap)

**Returns:** `'boolean' | 'number' | 'string' | null`

---

### isCapabilityName

Checks if a name is a valid capability name.

```typescript
import { isCapabilityName } from 'blecsd';

isCapabilityName('cursor_address');  // true
isCapabilityName('cm');              // true (alias)
isCapabilityName('invalid');         // false
```

**Parameters:**
- `name` - Name to check

**Returns:** `boolean`

---

### Type Guards

```typescript
import {
  isBooleanCapability,
  isNumberCapability,
  isStringCapability,
} from 'blecsd';

// Check specific capability types
isBooleanCapability('auto_right_margin');  // true
isBooleanCapability('columns');            // false

isNumberCapability('max_colors');          // true
isNumberCapability('cursor_address');      // false

isStringCapability('cursor_address');      // true
isStringCapability('columns');             // false

// Also works with termcap aliases
isBooleanCapability('am');                 // true
isNumberCapability('Co');                  // true
isStringCapability('cm');                  // true
```

---

### getCapabilityIndex

Gets the index of a capability in its category array. Useful for binary format parsing.

```typescript
import { getCapabilityIndex } from 'blecsd';

getCapabilityIndex('cursor_address');  // 10 (in STRING_CAPS)
getCapabilityIndex('max_colors');      // 13 (in NUMBER_CAPS)
getCapabilityIndex('auto_left_margin'); // 0 (in BOOLEAN_CAPS)
getCapabilityIndex('unknown');         // -1
```

**Parameters:**
- `name` - Capability name

**Returns:** `number` - Index or -1 if not found

---

### getCapabilitiesByType

Gets all capability names of a given type.

```typescript
import { getCapabilitiesByType } from 'blecsd';

const booleans = getCapabilitiesByType('boolean');  // BOOLEAN_CAPS
const numbers = getCapabilitiesByType('number');    // NUMBER_CAPS
const strings = getCapabilitiesByType('string');    // STRING_CAPS
```

**Parameters:**
- `type` - Capability type ('boolean' | 'number' | 'string')

**Returns:** `readonly string[]`

---

## Types

### CapabilityType

```typescript
type CapabilityType = 'boolean' | 'number' | 'string';
```

### BooleanCapName

```typescript
type BooleanCapName = typeof BOOLEAN_CAPS[number];
// 'auto_left_margin' | 'auto_right_margin' | ... (37 values)
```

### NumberCapName

```typescript
type NumberCapName = typeof NUMBER_CAPS[number];
// 'columns' | 'lines' | 'max_colors' | ... (33 values)
```

### StringCapName

```typescript
type StringCapName = typeof STRING_CAPS[number];
// 'cursor_address' | 'clear_screen' | ... (many values)
```

---

## Common Termcap Aliases Reference

### Boolean Capabilities

| Termcap | Terminfo | Description |
|---------|----------|-------------|
| `am` | `auto_right_margin` | Terminal has automatic margins |
| `bw` | `auto_left_margin` | Backspace wraps from column 0 |
| `km` | `has_meta_key` | Has a meta key |
| `ut` | `back_color_erase` | Background color erases |
| `xn` | `eat_newline_glitch` | Newline ignored after 80 cols |

### Numeric Capabilities

| Termcap | Terminfo | Description |
|---------|----------|-------------|
| `co` | `columns` | Number of columns |
| `li` | `lines` | Number of lines |
| `Co` | `max_colors` | Maximum colors |
| `pa` | `max_pairs` | Maximum color pairs |
| `it` | `init_tabs` | Initial tab stops |

### String Capabilities

| Termcap | Terminfo | Description |
|---------|----------|-------------|
| `cm` | `cursor_address` | Move cursor to row, col |
| `cl` | `clear_screen` | Clear screen |
| `ce` | `clr_eol` | Clear to end of line |
| `cd` | `clr_eos` | Clear to end of screen |
| `ti` | `enter_ca_mode` | Enter alternate screen |
| `te` | `exit_ca_mode` | Exit alternate screen |
| `AF` | `set_a_foreground` | Set ANSI foreground color |
| `AB` | `set_a_background` | Set ANSI background color |
| `op` | `orig_pair` | Reset colors |
| `me` | `exit_attribute_mode` | Reset attributes |
| `md` | `enter_bold_mode` | Enter bold mode |
| `us` | `enter_underline_mode` | Enter underline mode |
| `so` | `enter_standout_mode` | Enter standout mode |
| `vi` | `cursor_invisible` | Make cursor invisible |
| `ve` | `cursor_normal` | Make cursor normal |
| `sc` | `save_cursor` | Save cursor position |
| `rc` | `restore_cursor` | Restore cursor position |

---

## Examples

### Building a Capability Lookup Table

```typescript
import {
  BOOLEAN_CAPS,
  NUMBER_CAPS,
  STRING_CAPS,
  getCapabilityType,
} from 'blecsd';

// Create a Map of all capabilities with their types
const capabilityMap = new Map<string, 'boolean' | 'number' | 'string'>();

for (const cap of BOOLEAN_CAPS) {
  capabilityMap.set(cap, 'boolean');
}
for (const cap of NUMBER_CAPS) {
  capabilityMap.set(cap, 'number');
}
for (const cap of STRING_CAPS) {
  capabilityMap.set(cap, 'string');
}

// Use it
function lookupCapability(name: string) {
  return capabilityMap.get(name) ?? getCapabilityType(name);
}
```

### Validating Terminfo Data

```typescript
import {
  getCapabilityType,
  resolveCapabilityName,
  isBooleanCapability,
  isNumberCapability,
  isStringCapability,
} from 'blecsd';

function validateTerminfoEntry(name: string, value: unknown): boolean {
  const resolved = resolveCapabilityName(name);

  if (isBooleanCapability(resolved)) {
    return typeof value === 'boolean';
  }
  if (isNumberCapability(resolved)) {
    return typeof value === 'number' && Number.isInteger(value);
  }
  if (isStringCapability(resolved)) {
    return typeof value === 'string';
  }

  return false; // Unknown capability
}
```

---

## See Also

- [Parser](./parser.md) - Binary terminfo format parser
- [Locator](./locator.md) - Finding terminfo files
- [Tput](./tput.md) - High-level capability interface
