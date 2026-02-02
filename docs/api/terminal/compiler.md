# Terminfo Parameterized String Compiler

Compiles terminfo capability strings with parameter placeholders into executable functions. Implements the tparm parameter substitution language used by terminfo for cursor movement, colors, and other parameterized operations.

## Overview

Many terminfo capabilities require runtime parameters. For example, cursor positioning needs row and column values, and color setting needs a color number. The compiler transforms these parameterized strings into efficient, reusable functions.

```typescript
import { tparm, compileCapability } from 'blecsd';

// One-off parameter substitution
const cursorMove = tparm('\x1b[%i%p1%d;%p2%dH', 10, 5);
// Returns: '\x1b[11;6H' (cursor to row 11, col 6)

// Compile for repeated use (more efficient)
const cup = compileCapability('\x1b[%i%p1%d;%p2%dH');
cup.execute(0, 0);   // '\x1b[1;1H' (top-left)
cup.execute(10, 20); // '\x1b[11;21H'
cup.execute(24, 79); // '\x1b[25;80H' (bottom-right on 80x25)
```

---

## tparm

Executes a terminfo capability string with parameters. For repeated use with the same capability, use `compileCapability()` instead.

```typescript
import { tparm } from 'blecsd';

// Cursor movement (cup)
tparm('\x1b[%i%p1%d;%p2%dH', 10, 5);  // '\x1b[11;6H'

// Set 256-color foreground (setaf)
tparm('\x1b[38;5;%p1%dm', 196);  // '\x1b[38;5;196m'

// Set 256-color background (setab)
tparm('\x1b[48;5;%p1%dm', 21);  // '\x1b[48;5;21m'

// Parameterized line insert (il)
tparm('\x1b[%p1%dL', 5);  // '\x1b[5L'

// Scroll region (csr)
tparm('\x1b[%i%p1%d;%p2%dr', 0, 23);  // '\x1b[1;24r'
```

**Parameters:**
- `source` - Capability string with parameter placeholders
- `...params` - Parameters to substitute (numbers)

**Returns:** `string` - Rendered capability sequence

---

## compileCapability

Compiles a terminfo capability string for efficient repeated execution. Results are cached automatically.

```typescript
import { compileCapability } from 'blecsd';

// Compile cursor movement capability
const cup = compileCapability('\x1b[%i%p1%d;%p2%dH');

// Execute many times without re-parsing
for (let row = 0; row < 25; row++) {
  for (let col = 0; col < 80; col++) {
    process.stdout.write(cup.execute(row, col));
    process.stdout.write('*');
  }
}

// Compile color capabilities
const setaf = compileCapability('\x1b[38;5;%p1%dm');
const setab = compileCapability('\x1b[48;5;%p1%dm');

// Use for drawing
process.stdout.write(setaf.execute(196));  // Red foreground
process.stdout.write(setab.execute(21));   // Blue background
```

**Parameters:**
- `source` - Capability string with parameter placeholders

**Returns:** `CompiledCapability`

---

## precompileCapabilities

Pre-compiles multiple capabilities at once for performance.

```typescript
import { precompileCapabilities } from 'blecsd';

const capabilities = precompileCapabilities({
  cup: '\x1b[%i%p1%d;%p2%dH',
  setaf: '\x1b[38;5;%p1%dm',
  setab: '\x1b[48;5;%p1%dm',
  csr: '\x1b[%i%p1%d;%p2%dr',
});

// Use compiled capabilities
const cup = capabilities.get('cup');
const setaf = capabilities.get('setaf');

process.stdout.write(cup?.execute(10, 5) ?? '');
process.stdout.write(setaf?.execute(196) ?? '');
```

**Parameters:**
- `capabilities` - Record of capability names to source strings

**Returns:** `Map<string, CompiledCapability>`

---

## hasParameters

Checks if a capability string contains parameters. Useful for optimization.

```typescript
import { hasParameters } from 'blecsd';

hasParameters('\x1b[H');               // false (no params)
hasParameters('\x1b[%i%p1%d;%p2%dH');  // true (has params)
hasParameters('\x1b[2J');              // false (clear screen)
hasParameters('%%');                   // false (literal %)
```

**Parameters:**
- `source` - Capability string to check

**Returns:** `boolean`

---

## Cache Management

### clearCapabilityCache

Clears the compilation cache. Useful for testing or memory-constrained environments.

```typescript
import { clearCapabilityCache } from 'blecsd';

clearCapabilityCache();
```

### getCapabilityCacheSize

Gets the current number of cached compiled capabilities.

```typescript
import { getCapabilityCacheSize, compileCapability } from 'blecsd';

console.log(getCapabilityCacheSize());  // 0

compileCapability('\x1b[%p1%dH');
compileCapability('\x1b[%p1%dm');

console.log(getCapabilityCacheSize());  // 2
```

---

## Types

### CompiledCapability

A compiled capability ready for execution.

```typescript
interface CompiledCapability {
  /** Original capability string */
  readonly source: string;
  /** Compiled instructions (internal) */
  readonly instructions: readonly Instruction[];
  /**
   * Execute with parameters.
   * @param params - Parameters to substitute
   * @returns Rendered capability string
   */
  execute(...params: number[]): string;
}
```

---

## Parameter Language Reference

### Parameter Push

Push parameter values onto the stack:

| Syntax | Description |
|--------|-------------|
| `%p1` - `%p9` | Push parameter 1-9 onto stack |

```typescript
tparm('%p1%d', 42);      // '42'
tparm('%p1%d,%p2%d', 1, 2);  // '1,2'
```

### Output Formats

Pop and output stack value:

| Syntax | Description |
|--------|-------------|
| `%d` | Output as decimal |
| `%o` | Output as octal |
| `%x` | Output as lowercase hex |
| `%X` | Output as uppercase hex |
| `%c` | Output as character |
| `%s` | Output as string |

```typescript
tparm('%p1%d', 255);   // '255'
tparm('%p1%o', 8);     // '10'
tparm('%p1%x', 255);   // 'ff'
tparm('%p1%c', 65);    // 'A'
```

### Constants

Push constant values:

| Syntax | Description |
|--------|-------------|
| `%{num}` | Push integer constant |
| `%'c'` | Push character constant (ASCII value) |

```typescript
tparm('%{42}%d');      // '42'
tparm("%'A'%d");       // '65'
tparm('%p1%{10}%+%d', 5);  // '15'
```

### Increment Operator

| Syntax | Description |
|--------|-------------|
| `%i` | Increment parameters 1 and 2 (for 1-based positioning) |

```typescript
// Without increment (0-based)
tparm('\x1b[%p1%d;%p2%dH', 0, 0);   // '\x1b[0;0H'

// With increment (1-based, standard terminfo)
tparm('\x1b[%i%p1%d;%p2%dH', 0, 0); // '\x1b[1;1H'
```

### Arithmetic Operations

Pop two values, compute, push result:

| Syntax | Description |
|--------|-------------|
| `%+` | Addition |
| `%-` | Subtraction |
| `%*` | Multiplication |
| `%/` | Integer division |
| `%m` | Modulo |

```typescript
tparm('%p1%p2%+%d', 10, 20);  // '30'
tparm('%p1%p2%-%d', 20, 8);   // '12'
tparm('%p1%p2%*%d', 6, 7);    // '42'
tparm('%p1%p2%/%d', 20, 4);   // '5'
tparm('%p1%p2%m%d', 17, 5);   // '2'
```

### Bitwise Operations

| Syntax | Description |
|--------|-------------|
| `%&` | Bitwise AND |
| `%\|` | Bitwise OR |
| `%^` | Bitwise XOR |
| `%~` | Bitwise NOT |

```typescript
tparm('%p1%p2%&%d', 0xff, 0x0f);  // '15'
tparm('%p1%p2%|%d', 0xf0, 0x0f);  // '255'
tparm('%p1%p2%^%d', 0xff, 0x0f);  // '240'
```

### Comparison Operations

| Syntax | Description |
|--------|-------------|
| `%=` | Equality (1 if equal, 0 otherwise) |
| `%<` | Less than |
| `%>` | Greater than |

```typescript
tparm('%p1%p2%=%d', 5, 5);   // '1'
tparm('%p1%p2%=%d', 5, 6);   // '0'
tparm('%p1%p2%<%d', 5, 10);  // '1'
tparm('%p1%p2%>%d', 10, 5);  // '1'
```

### Logical Operations

| Syntax | Description |
|--------|-------------|
| `%A` | Logical AND |
| `%O` | Logical OR |
| `%!` | Logical NOT |

```typescript
tparm('%p1%p2%A%d', 1, 1);  // '1'
tparm('%p1%p2%A%d', 1, 0);  // '0'
tparm('%p1%p2%O%d', 0, 1);  // '1'
tparm('%p1%!%d', 0);        // '1'
tparm('%p1%!%d', 1);        // '0'
```

### Conditionals

| Syntax | Description |
|--------|-------------|
| `%?` | Start conditional |
| `%t` | Then (if stack top is true) |
| `%e` | Else |
| `%;` | End conditional |

```typescript
// Simple if-then
tparm('%?%p1%tyes%;', 1);   // 'yes'
tparm('%?%p1%tyes%;', 0);   // ''

// If-then-else
tparm('%?%p1%tyes%eNo%;', 1);  // 'yes'
tparm('%?%p1%tyes%eNo%;', 0);  // 'No'

// Comparison in conditional
tparm('%?%p1%{5}%<%tsmall%ebig%;', 3);   // 'small'
tparm('%?%p1%{5}%<%tsmall%ebig%;', 10);  // 'big'
```

### Variables

| Syntax | Description |
|--------|-------------|
| `%Pa` - `%Pz` | Set static variable (a-z) |
| `%PA` - `%PZ` | Set dynamic variable (A-Z) |
| `%ga` - `%gz` | Get static variable |
| `%gA` - `%gZ` | Get dynamic variable |

```typescript
// Store and retrieve
tparm('%p1%Pa%ga%d', 42);  // '42'
```

### Special

| Syntax | Description |
|--------|-------------|
| `%%` | Literal percent sign |
| `%l` | Push string length |

```typescript
tparm('50%%');  // '50%'
```

---

## Real-World Examples

### Complex Color Setting (setaf)

Many terminals use conditionals for backward-compatible color support:

```typescript
// Typical setaf with conditional for 8/16/256 color support
const setaf = '\x1b[%?%p1%{8}%<%t3%p1%d%e%p1%{16}%<%t9%p1%{8}%-%d%e38;5;%p1%d%;m';

tparm(setaf, 1);    // '\x1b[31m' (basic red)
tparm(setaf, 9);    // '\x1b[91m' (bright red)
tparm(setaf, 196);  // '\x1b[38;5;196m' (256-color red)
```

### Cursor Positioning

```typescript
import { compileCapability } from 'blecsd';

const cup = compileCapability('\x1b[%i%p1%d;%p2%dH');
const csr = compileCapability('\x1b[%i%p1%d;%p2%dr');

// Move cursor to row 10, column 20
process.stdout.write(cup.execute(9, 19));  // 1-based: row 10, col 20

// Set scroll region (rows 5-20)
process.stdout.write(csr.execute(4, 19));  // 1-based: rows 5-20
```

### Building a Terminal Interface

```typescript
import { precompileCapabilities, createTput, getDefaultTput } from 'blecsd';

// Get terminfo data
const tput = getDefaultTput();

// Precompile commonly used capabilities
const caps = precompileCapabilities({
  cup: tput.getString('cursor_address') ?? '\x1b[%i%p1%d;%p2%dH',
  setaf: tput.getString('set_a_foreground') ?? '\x1b[3%p1%dm',
  setab: tput.getString('set_a_background') ?? '\x1b[4%p1%dm',
  sgr0: tput.getString('exit_attribute_mode') ?? '\x1b[m',
});

// Draw a colored box
function drawBox(row: number, col: number, color: number): void {
  const cup = caps.get('cup')!;
  const setaf = caps.get('setaf')!;
  const sgr0 = caps.get('sgr0')!;

  process.stdout.write(setaf.execute(color));
  process.stdout.write(cup.execute(row, col));
  process.stdout.write('***');
  process.stdout.write(cup.execute(row + 1, col));
  process.stdout.write('* *');
  process.stdout.write(cup.execute(row + 2, col));
  process.stdout.write('***');
  process.stdout.write(sgr0.execute());
}

drawBox(5, 10, 196);  // Red box at row 5, col 10
```

---

## See Also

- [Tput](./tput.md) - High-level capability interface
- [Parser](./parser.md) - Binary terminfo format parser
- [Capability Names](./capabilities-names.md) - Capability name mappings
- [Locator](./locator.md) - Finding terminfo files
