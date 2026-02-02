# Terminfo (Tput) Module

The Tput module provides access to terminal capabilities through the terminfo database. It uses functional patterns to query boolean, numeric, and string capabilities, and to format parameterized control sequences.

## Overview

```typescript
import { createTput, getDefaultTput } from 'blecsd';

// Create with default terminal ($TERM)
const tput = createTput();

// Check capabilities
console.log(`Max colors: ${tput.getNumber('max_colors')}`);

// Move cursor to row 10, column 5
process.stdout.write(tput.cup(10, 5));

// Set foreground color to red
process.stdout.write(tput.setaf(1));
```

---

## createTput

Creates a Tput instance for terminal capability access.

```typescript
import { createTput } from 'blecsd';

// Create with default terminal ($TERM)
const tput = createTput();

// Create with specific terminal
const vt100 = createTput({ terminal: 'vt100' });

// Create with custom terminfo data
const custom = createTput({
  data: {
    name: 'custom',
    names: ['custom'],
    description: 'Custom terminal',
    booleans: { auto_right_margin: true },
    numbers: { max_colors: 16 },
    strings: { clear_screen: '\x1b[2J' },
  },
});
```

**Parameters:**
- `config` - Tput configuration
  - `terminal` - Terminal name (defaults to $TERM)
  - `data` - Custom terminfo data (bypasses default lookup)
  - `extended` - Whether to use extended capabilities

**Returns:** `Tput`

---

## getDefaultTput

Gets the default Tput instance. Creates one on first call using the $TERM environment variable.

```typescript
import { getDefaultTput } from 'blecsd';

const tput = getDefaultTput();
console.log(`Terminal: ${tput.terminal}`);
```

---

## resetDefaultTput

Resets the default Tput instance. Useful for testing or when terminal changes.

```typescript
import { resetDefaultTput } from 'blecsd';

resetDefaultTput();
```

---

## getDefaultXtermData

Gets the default xterm-256color data. Useful for testing or as a fallback.

```typescript
import { getDefaultXtermData } from 'blecsd';

const data = getDefaultXtermData();
console.log(data.name); // 'xterm-256color'
```

---

## Tput Interface Methods

### has

Checks if a boolean capability is present.

```typescript
if (tput.has('has_meta_key')) {
  // Terminal supports meta key
}

if (tput.has('auto_right_margin')) {
  // Terminal wraps at right margin
}
```

### getNumber

Gets a numeric capability value.

```typescript
const colors = tput.getNumber('max_colors');
console.log(`Terminal supports ${colors} colors`);

const cols = tput.getNumber('columns');
const rows = tput.getNumber('lines');
console.log(`Terminal size: ${cols}x${rows}`);
```

**Returns:** `number | null`

### getString

Gets a string capability value.

```typescript
const clearSeq = tput.getString('clear_screen');
if (clearSeq) {
  process.stdout.write(clearSeq);
}

const boldSeq = tput.getString('enter_bold_mode');
const resetSeq = tput.getString('exit_attribute_mode');
```

**Returns:** `string | null`

### tparm

Formats a parameterized string capability. Replaces parameter placeholders with actual values.

```typescript
// Move cursor to row 10, column 5
const seq = tput.tparm('cursor_address', 10, 5);
if (seq) {
  process.stdout.write(seq);
}

// Insert 5 lines
const insertSeq = tput.tparm('parm_insert_line', 5);

// Change scroll region
const scrollSeq = tput.tparm('change_scroll_region', 5, 20);
```

**Returns:** `string | null`

### cup

Shortcut for cursor positioning.

```typescript
// Move cursor to row 10, column 5 (0-indexed)
process.stdout.write(tput.cup(10, 5));

// Move to home position
process.stdout.write(tput.cup(0, 0));
```

### sgr

Shortcut for setting graphics rendition (SGR).

```typescript
// Reset all attributes
process.stdout.write(tput.sgr(0));

// Bold
process.stdout.write(tput.sgr(1));

// Underline
process.stdout.write(tput.sgr(4));
```

### setaf

Shortcut for setting ANSI foreground color.

```typescript
// Basic colors (0-7)
process.stdout.write(tput.setaf(0)); // Black
process.stdout.write(tput.setaf(1)); // Red
process.stdout.write(tput.setaf(2)); // Green
process.stdout.write(tput.setaf(3)); // Yellow
process.stdout.write(tput.setaf(4)); // Blue
process.stdout.write(tput.setaf(5)); // Magenta
process.stdout.write(tput.setaf(6)); // Cyan
process.stdout.write(tput.setaf(7)); // White

// Bright colors (8-15)
process.stdout.write(tput.setaf(9));  // Bright red

// 256 colors (16-255)
process.stdout.write(tput.setaf(196)); // Bright red from palette
```

### setab

Shortcut for setting ANSI background color.

```typescript
// Basic colors
process.stdout.write(tput.setab(4)); // Blue background

// 256 colors
process.stdout.write(tput.setab(232)); // Dark gray background
```

---

## Capability Types

### BooleanCapability

Boolean capabilities indicate presence/absence of terminal features.

```typescript
type BooleanCapability =
  | 'auto_left_margin'
  | 'auto_right_margin'
  | 'back_color_erase'
  | 'has_meta_key'
  | 'move_insert_mode'
  | 'move_standout_mode'
  // ... and more
```

### NumberCapability

Numeric capabilities represent values like dimensions and counts.

```typescript
type NumberCapability =
  | 'columns'
  | 'lines'
  | 'max_colors'
  | 'max_pairs'
  | 'init_tabs'
  // ... and more
```

### StringCapability

String capabilities represent control sequences for terminal operations.

```typescript
type StringCapability =
  // Cursor movement
  | 'cursor_address'
  | 'cursor_down'
  | 'cursor_home'
  | 'cursor_left'
  | 'cursor_right'
  | 'cursor_up'
  | 'cursor_invisible'
  | 'cursor_normal'
  | 'cursor_visible'
  // Screen manipulation
  | 'clear_screen'
  | 'clr_eol'
  | 'clr_eos'
  // Attributes
  | 'enter_bold_mode'
  | 'enter_underline_mode'
  | 'enter_reverse_mode'
  | 'exit_attribute_mode'
  // Colors
  | 'set_a_foreground'
  | 'set_a_background'
  | 'orig_pair'
  // ... and more
```

---

## Types

### TerminfoData

Raw terminfo data structure.

```typescript
interface TerminfoData {
  readonly name: string;
  readonly names: readonly string[];
  readonly description: string;
  readonly booleans: Readonly<Record<string, boolean>>;
  readonly numbers: Readonly<Record<string, number>>;
  readonly strings: Readonly<Record<string, string>>;
}
```

### TputConfig

Tput instance configuration.

```typescript
interface TputConfig {
  readonly terminal?: string;      // Terminal name (defaults to $TERM)
  readonly data?: TerminfoData;    // Custom terminfo data
  readonly extended?: boolean;     // Use extended capabilities
}
```

### Tput

Tput API interface.

```typescript
interface Tput {
  readonly terminal: string;
  readonly data: TerminfoData;

  has(cap: BooleanCapability): boolean;
  getNumber(cap: NumberCapability): number | null;
  getString(cap: StringCapability): string | null;
  tparm(cap: StringCapability, ...params: number[]): string | null;
  cup(row: number, col: number): string;
  sgr(attrs: number): string;
  setaf(color: number): string;
  setab(color: number): string;
}
```

---

## Parameter Language

The `tparm` method processes terminfo parameter strings. Common operations:

| Code | Description |
|------|-------------|
| `%p1` - `%p9` | Push parameter 1-9 onto stack |
| `%d` | Pop and output as decimal |
| `%c` | Pop and output as character |
| `%s` | Pop and output as string |
| `%i` | Increment first two parameters (for 1-indexed terminals) |
| `%{N}` | Push integer constant N |
| `%+`, `%-`, `%*`, `%/` | Arithmetic operations |
| `%<`, `%>`, `%=` | Comparison operations |
| `%?...%t...%e...%;` | Conditional (if-then-else) |
| `%%` | Literal percent sign |

---

## Examples

### Basic Terminal Control

```typescript
import { createTput } from 'blecsd';

const tput = createTput();

// Clear screen
process.stdout.write(tput.getString('clear_screen') ?? '');

// Move cursor to center
const cols = tput.getNumber('columns') ?? 80;
const rows = tput.getNumber('lines') ?? 24;
process.stdout.write(tput.cup(Math.floor(rows / 2), Math.floor(cols / 2)));

// Print colored text
process.stdout.write(tput.setaf(2)); // Green
process.stdout.write('Hello, World!');
process.stdout.write(tput.getString('orig_pair') ?? ''); // Reset colors
```

### Alternate Screen Buffer

```typescript
import { createTput } from 'blecsd';

const tput = createTput();

// Enter alternate screen
process.stdout.write(tput.getString('enter_ca_mode') ?? '');

// ... your application code ...

// Exit alternate screen (restores previous content)
process.stdout.write(tput.getString('exit_ca_mode') ?? '');
```

### Cursor Visibility

```typescript
import { createTput } from 'blecsd';

const tput = createTput();

// Hide cursor
process.stdout.write(tput.getString('cursor_invisible') ?? '');

// ... do work without cursor flicker ...

// Show cursor
process.stdout.write(tput.getString('cursor_normal') ?? '');
```

### Text Attributes

```typescript
import { createTput } from 'blecsd';

const tput = createTput();

// Bold text
process.stdout.write(tput.getString('enter_bold_mode') ?? '');
process.stdout.write('Bold text');

// Underlined text
process.stdout.write(tput.getString('enter_underline_mode') ?? '');
process.stdout.write('Underlined text');

// Reset all attributes
process.stdout.write(tput.getString('exit_attribute_mode') ?? '');
```

### Scrolling Region

```typescript
import { createTput } from 'blecsd';

const tput = createTput();

// Set scroll region to lines 5-20
const scrollSeq = tput.tparm('change_scroll_region', 5, 20);
if (scrollSeq) {
  process.stdout.write(scrollSeq);
}

// Insert 3 lines at current position
const insertSeq = tput.tparm('parm_insert_line', 3);
if (insertSeq) {
  process.stdout.write(insertSeq);
}
```

### Checking Terminal Capabilities

```typescript
import { createTput } from 'blecsd';

const tput = createTput();

function printCapabilities() {
  console.log(`Terminal: ${tput.terminal}`);
  console.log(`Colors: ${tput.getNumber('max_colors')}`);
  console.log(`Columns: ${tput.getNumber('columns')}`);
  console.log(`Lines: ${tput.getNumber('lines')}`);
  console.log(`Has meta key: ${tput.has('has_meta_key')}`);
  console.log(`Back color erase: ${tput.has('back_color_erase')}`);
}
```

---

## See Also

- [Terminal Detection](./detection.md) - Detecting terminal type and capabilities
- [ANSI Module](./ansi.md) - Direct ANSI escape sequence generation
- [Colors](./terminal/colors.md) - Color handling and conversion
