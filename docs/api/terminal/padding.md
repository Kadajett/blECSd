# Padding System

Terminal output padding/timing system for handling terminfo delay specifications. Modern terminals are high-speed and rarely need padding, but this module provides full support for legacy terminal compatibility.

## Overview

Terminfo capabilities can include padding specifications that indicate delays needed for slow terminals:

- `$<5>` - 5ms delay
- `$<5*>` - 5ms proportional (scaled by affected lines)
- `$<5/>` - 5ms mandatory (even for high-speed terminals)
- `$<5*/>` - proportional and mandatory

```typescript
import { processPadding, createPaddedPrint } from 'blecsd';

// Process a capability string with padding
const result = processPadding('\x1b[?5h$<100/>\x1b[?5l');
// result.output: '\x1b[?5h\x1b[?5l'
// result.totalDelay: 100

// Create a print function that handles delays
const print = createPaddedPrint((s) => process.stdout.write(s));
await print('\x1b[?5h$<100/>\x1b[?5l');
```

---

## parsePadding

Parses a padding specification string.

```typescript
import { parsePadding } from 'blecsd';

parsePadding('$<5>');
// { delay: 5, proportional: false, mandatory: false, original: '$<5>' }

parsePadding('$<100*>');
// { delay: 100, proportional: true, mandatory: false, original: '$<100*>' }

parsePadding('$<50/>');
// { delay: 50, proportional: false, mandatory: true, original: '$<50/>' }

parsePadding('$<10*/>');
// { delay: 10, proportional: true, mandatory: true, original: '$<10*/>' }

parsePadding('invalid'); // null
```

**Parameters:**
- `spec` - Padding string to parse

**Returns:** `PaddingSpec | null`

### PaddingSpec

```typescript
interface PaddingSpec {
  /** Delay in milliseconds */
  delay: number;
  /** Proportional padding (scales with affected lines) */
  proportional: boolean;
  /** Mandatory padding (cannot be skipped for high-speed terminals) */
  mandatory: boolean;
  /** Original padding string */
  original: string;
}
```

---

## extractPadding

Extracts all padding specifications from a string.

```typescript
import { extractPadding } from 'blecsd';

const specs = extractPadding('\x1b[?5h$<100/>\x1b[?5l');
// [{ delay: 100, proportional: false, mandatory: true, ... }]

const multiple = extractPadding('$<10>\x1b[H$<20*>\x1b[J');
// [
//   { delay: 10, proportional: false, mandatory: false, ... },
//   { delay: 20, proportional: true, mandatory: false, ... }
// ]
```

**Parameters:**
- `input` - String potentially containing padding markers

**Returns:** `PaddingSpec[]`

---

## hasPadding

Checks if a string contains padding markers.

```typescript
import { hasPadding } from 'blecsd';

hasPadding('$<100/>\x1b[H'); // true
hasPadding('\x1b[H\x1b[J');   // false
```

---

## stripPadding

Removes padding markers from a string.

```typescript
import { stripPadding } from 'blecsd';

stripPadding('\x1b[?5h$<100/>\x1b[?5l');
// '\x1b[?5h\x1b[?5l'

stripPadding('$<10>\x1b[H$<20>\x1b[J');
// '\x1b[H\x1b[J'
```

---

## calculateDelay

Calculates the effective delay for a padding specification.

```typescript
import { calculateDelay, parsePadding } from 'blecsd';

const spec = parsePadding('$<50>')!;

// High-speed terminal (default): non-mandatory skipped
calculateDelay(spec, { highSpeed: true }); // 0

// Low-speed terminal: delay applied
calculateDelay(spec, { highSpeed: false }); // 50

// Mandatory padding always applied
const mandatory = parsePadding('$<50/>')!;
calculateDelay(mandatory, { highSpeed: true }); // 50

// Proportional padding scales with affected lines
const proportional = parsePadding('$<10*>')!;
calculateDelay(proportional, { highSpeed: false, affectedLines: 1 }); // 10
calculateDelay(proportional, { highSpeed: false, affectedLines: 5 }); // 50
```

**Parameters:**
- `spec` - Padding specification
- `config` - Padding configuration

**Returns:** Effective delay in milliseconds

### PaddingConfig

```typescript
interface PaddingConfig {
  /** Enable padding delays (default: true) */
  enabled: boolean;
  /** Terminal baud rate for proportional calculations */
  baudRate: number;
  /** Number of lines affected (for proportional padding) */
  affectedLines: number;
  /** Skip non-mandatory padding for high-speed terminals */
  highSpeed: boolean;
}
```

---

## calculateTotalDelay

Calculates total delay for all padding in a string.

```typescript
import { calculateTotalDelay } from 'blecsd';

// Mandatory padding on high-speed terminal
calculateTotalDelay('$<50/>\x1b[H$<25/>', { highSpeed: true });
// 75

// Non-mandatory skipped
calculateTotalDelay('$<50>\x1b[H$<25>', { highSpeed: true });
// 0

// All padding on low-speed
calculateTotalDelay('$<50>\x1b[H$<25>', { highSpeed: false });
// 75
```

---

## processPadding

Processes a string for output, extracting padding information.

```typescript
import { processPadding } from 'blecsd';

const result = processPadding('\x1b[?5h$<100/>\x1b[?5l', { highSpeed: true });
// {
//   output: '\x1b[?5h\x1b[?5l',
//   totalDelay: 100,
//   paddingSpecs: [{ delay: 100, mandatory: true, ... }]
// }
```

**Returns:** `PrintResult`

```typescript
interface PrintResult {
  /** The output string (padding markers removed) */
  output: string;
  /** Total delay in milliseconds */
  totalDelay: number;
  /** Individual padding specifications found */
  paddingSpecs: PaddingSpec[];
}
```

---

## createPaddedPrint

Creates an async print function with padding support.

```typescript
import { createPaddedPrint } from 'blecsd';

const print = createPaddedPrint(
  (s) => process.stdout.write(s),
  { highSpeed: false } // Respect all padding
);

// Flash screen with 100ms delay
await print('\x1b[?5h$<100/>\x1b[?5l');

// Override config per-call
await print('\x1b[H$<50>', { highSpeed: true }); // Skip non-mandatory
```

**Parameters:**
- `writer` - Function to write output
- `config` - Default padding configuration

**Returns:** Async print function

---

## createPaddedPrintSync

Creates a synchronous print function with padding support.

Uses blocking delay (busy wait). Prefer `createPaddedPrint` for async operation.

```typescript
import { createPaddedPrintSync } from 'blecsd';

const print = createPaddedPrintSync(
  (s) => process.stdout.write(s),
  { highSpeed: false }
);

// This blocks for the delay
print('\x1b[?5h$<100/>\x1b[?5l');
```

---

## formatPadding

Formats a padding specification back to string format.

```typescript
import { formatPadding } from 'blecsd';

formatPadding({ delay: 100, proportional: false, mandatory: false });
// '$<100>'

formatPadding({ delay: 50, proportional: true, mandatory: true });
// '$<50*/>'
```

---

## addPadding

Appends padding to a string.

```typescript
import { addPadding } from 'blecsd';

addPadding('\x1b[H', 50);
// '\x1b[H$<50>'

addPadding('\x1b[H', 50, { mandatory: true });
// '\x1b[H$<50/>'

addPadding('\x1b[J', 100, { proportional: true, mandatory: true });
// '\x1b[J$<100*/>'
```

---

## Default Configuration

```typescript
import { DEFAULT_PADDING_CONFIG } from 'blecsd';

// {
//   enabled: true,      // Padding enabled
//   baudRate: 0,        // No baud-based scaling
//   affectedLines: 1,   // Default for proportional
//   highSpeed: true     // Modern terminals skip non-mandatory
// }
```

---

## Environment Variables

- `NCURSES_NO_PADDING` - Set to `1` to disable all padding

---

## Examples

### Screen Flash Effect

```typescript
import { createPaddedPrint } from 'blecsd';

const print = createPaddedPrint((s) => process.stdout.write(s));

// Flash screen (reverse video on, wait, reverse video off)
await print('\x1b[?5h$<100/>\x1b[?5l');
```

### Processing Capability Strings

```typescript
import { processPadding, tparm } from 'blecsd';

// Get compiled capability string (may contain padding)
const flashScreen = tparm(tput.get('flash_screen'));

// Process and write with delay
const { output, totalDelay } = processPadding(flashScreen);
process.stdout.write(output);
if (totalDelay > 0) {
  await new Promise(r => setTimeout(r, totalDelay));
}
```

### Building Capabilities with Padding

```typescript
import { addPadding } from 'blecsd';

// Create a clear screen with mandatory 50ms delay
const clearScreen = addPadding('\x1b[H\x1b[2J', 50, { mandatory: true });
// '\x1b[H\x1b[2J$<50/>'
```

---

## See Also

- [Compiler](./compiler.md) - Parameterized string compilation
- [Tput](./tput.md) - Terminal capability interface
- [Features](./features.md) - Terminal feature detection
