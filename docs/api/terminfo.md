# Terminfo (Tput) Module

The Tput module provides access to terminal capabilities through the terminfo database. Instead of hardcoding escape sequences for specific terminals, terminfo lets your code work across different terminal emulators by looking up the correct sequences at runtime.

## How do I create a Tput instance?

### createTput

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

**Parameters:** `config` (optional) containing `terminal` (name), `data` (custom terminfo), `extended` (use extended capabilities)

**Returns:** `Tput`

### getDefaultTput

Gets the shared default Tput instance. Creates one on first call using $TERM.

```typescript
import { getDefaultTput } from 'blecsd';

const tput = getDefaultTput();
console.log(`Terminal: ${tput.terminal}`);
```

### resetDefaultTput

Resets the default instance. Useful when terminal changes or for testing.

```typescript
import { resetDefaultTput } from 'blecsd';

resetDefaultTput();
```

### getDefaultXtermData

Gets xterm-256color data as a fallback.

```typescript
import { getDefaultXtermData } from 'blecsd';

const data = getDefaultXtermData();
console.log(data.name);  // 'xterm-256color'
```

---

## How do I check terminal capabilities?

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

Gets a string capability (control sequence).

```typescript
const clearSeq = tput.getString('clear_screen');
if (clearSeq) {
  process.stdout.write(clearSeq);
}

const boldSeq = tput.getString('enter_bold_mode');
const resetSeq = tput.getString('exit_attribute_mode');
```

**Returns:** `string | null`

---

## How do I use parameterized sequences?

### tparm

Formats a parameterized string capability. Replaces placeholders with values.

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

---

## What shortcuts are available?

### cup

Cursor positioning shortcut.

```typescript
// Move cursor to row 10, column 5 (0-indexed)
process.stdout.write(tput.cup(10, 5));

// Move to home position
process.stdout.write(tput.cup(0, 0));
```

### sgr

Set graphics rendition.

```typescript
process.stdout.write(tput.sgr(0));  // Reset all
process.stdout.write(tput.sgr(1));  // Bold
process.stdout.write(tput.sgr(4));  // Underline
```

### setaf

Set foreground color.

```typescript
// Basic colors (0-7)
process.stdout.write(tput.setaf(0));  // Black
process.stdout.write(tput.setaf(1));  // Red
process.stdout.write(tput.setaf(2));  // Green
process.stdout.write(tput.setaf(3));  // Yellow
process.stdout.write(tput.setaf(4));  // Blue
process.stdout.write(tput.setaf(5));  // Magenta
process.stdout.write(tput.setaf(6));  // Cyan
process.stdout.write(tput.setaf(7));  // White

// Bright colors (8-15)
process.stdout.write(tput.setaf(9));   // Bright red

// 256 colors (16-255)
process.stdout.write(tput.setaf(196));  // Red from extended palette
```

### setab

Set background color.

```typescript
process.stdout.write(tput.setab(4));    // Blue background
process.stdout.write(tput.setab(232));  // Dark gray background
```

---

## What capabilities are available?

### Boolean Capabilities

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

### Numeric Capabilities

```typescript
type NumberCapability =
  | 'columns'
  | 'lines'
  | 'max_colors'
  | 'max_pairs'
  | 'init_tabs'
  // ... and more
```

### String Capabilities

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

```typescript
interface TputConfig {
  readonly terminal?: string;
  readonly data?: TerminfoData;
  readonly extended?: boolean;
}
```

### Tput

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

The `tparm` method processes terminfo parameter strings:

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
process.stdout.write(tput.setaf(2));  // Green
process.stdout.write('Hello, World!');
process.stdout.write(tput.getString('orig_pair') ?? '');  // Reset
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

process.stdout.write(tput.getString('cursor_invisible') ?? '');
// ... work without cursor flicker ...
process.stdout.write(tput.getString('cursor_normal') ?? '');
```

### Checking Capabilities

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

## Limitations

- **$TERM dependency**: Capability lookup requires $TERM to be set correctly. SSH sessions, Docker containers, or misconfigured terminals may have incorrect $TERM values.
- **Missing capabilities**: If a capability returns `null`, the terminal doesn't support that feature. Always handle the `null` case.
- **Extended capabilities**: Extended (non-standard) capabilities may not be available on all systems.
- **Fallback behavior**: When terminfo data isn't available for a terminal, blECSd falls back to xterm-256color, which may not match the actual terminal's capabilities.

---

## See Also

- [Terminal Detection](./detection.md) - Detecting terminal type
- [ANSI Module](./ansi.md) - Direct ANSI escape sequence generation
