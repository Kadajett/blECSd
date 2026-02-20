# Media Copy (Print)

The mediaCopy namespace provides functions for terminal printing and media copy operations.

## Overview

Media copy operations are legacy terminal features for controlling printers and capturing screen output. While rarely used in modern applications, they may be useful for:

- Printing terminal content to physical printers
- Screen capture/dump functionality
- Specialized printing scenarios

**Note:** This module is internal and not exported from the main package.

## Quick Start

```typescript
import { mediaCopy } from 'blecsd/terminal';

// Print the current screen
process.stdout.write(mediaCopy.printScreen());

// Enable printer controller mode
process.stdout.write(mediaCopy.printerOn());
process.stdout.write('This goes to the printer');
process.stdout.write(mediaCopy.printerOff());
```

## Constants

### MediaCopyMode

```typescript
const MediaCopyMode = {
  PRINT_SCREEN: 0,      // Print screen (mc0)
  PRINTER_OFF: 4,       // Turn off printer controller mode (mc4)
  PRINTER_ON: 5,        // Turn on printer controller mode (mc5)
  PRINT_LINE: 1,        // Print cursor line (mc1) - VT100
  PRINT_DISPLAY: 10,    // Print composed display (mc10) - VT300+
  PRINT_ALL_PAGES: 11,  // Print all pages (mc11) - VT300+
} as const;
```

## Functions

### mc()

Send media copy command with specified mode.

```typescript
mediaCopy.mc(mode: MediaCopyModeValue): string
```

**Example:**

```typescript
mediaCopy.mc(MediaCopyMode.PRINT_SCREEN)
// Returns: '\x1b[0i'
```

### printScreen()

Print screen (mc0). Sends screen contents to the printer.

```typescript
mediaCopy.printScreen(): string
```

**Returns:** `'\x1b[0i'`

### printLine()

Print cursor line (mc1). Sends the line containing the cursor to the printer.

```typescript
mediaCopy.printLine(): string
```

**Returns:** `'\x1b[1i'`

### printerOn()

Turn on printer controller mode (mc5). All subsequent output is sent to the printer until printerOff() is called.

```typescript
mediaCopy.printerOn(): string
```

**Returns:** `'\x1b[5i'`

**Example:**

```typescript
// Enable printer mode
process.stdout.write(mediaCopy.printerOn());

// This text goes to printer
process.stdout.write('Hello, Printer!');

// Disable printer mode
process.stdout.write(mediaCopy.printerOff());
```

### printerOff()

Turn off printer controller mode (mc4). Stops sending output to the printer.

```typescript
mediaCopy.printerOff(): string
```

**Returns:** `'\x1b[4i'`

### printerForBytes()

Turn on printer for n bytes (mc5p). Sends exactly n bytes to the printer, then automatically turns off.

```typescript
mediaCopy.printerForBytes(n: number): string
```

**Example:**

```typescript
// Print exactly 100 bytes
mediaCopy.printerForBytes(100)
// Returns: '\x1b[5;100i'
```

### printDisplay()

Print composed display (mc10). VT300+ feature for printing the composed display.

```typescript
mediaCopy.printDisplay(): string
```

**Returns:** `'\x1b[10i'`

### printAllPages()

Print all pages (mc11). VT300+ feature for printing all pages.

```typescript
mediaCopy.printAllPages(): string
```

**Returns:** `'\x1b[11i'`

### autoPrintOn()

Enable auto print mode. Lines are automatically printed when cursor moves off them.

```typescript
mediaCopy.autoPrintOn(): string
```

**Returns:** `'\x1b[?5i'`

### autoPrintOff()

Disable auto print mode.

```typescript
mediaCopy.autoPrintOff(): string
```

**Returns:** `'\x1b[?4i'`

### printCursorPosition()

Print cursor position report. Sends the cursor position to the printer.

```typescript
mediaCopy.printCursorPosition(): string
```

**Returns:** `'\x1b[?1i'`

## Usage Patterns

### Print Current Screen

```typescript
import { mediaCopy } from 'blecsd/terminal';

function printScreen() {
  process.stdout.write(mediaCopy.printScreen());
}
```

### Print Custom Content

```typescript
import { mediaCopy } from 'blecsd/terminal';

function printDocument(content: string) {
  // Enter printer mode
  process.stdout.write(mediaCopy.printerOn());

  // Send content to printer
  process.stdout.write(content);
  process.stdout.write('\n');

  // Exit printer mode
  process.stdout.write(mediaCopy.printerOff());
}
```

### Print Fixed-Length Data

```typescript
import { mediaCopy } from 'blecsd/terminal';

function printWithHeader(data: string) {
  const header = 'Report Output\n';
  const totalBytes = header.length + data.length;

  // Print exactly the header + data bytes
  process.stdout.write(mediaCopy.printerForBytes(totalBytes));
  process.stdout.write(header);
  process.stdout.write(data);
  // Printer mode automatically turns off after totalBytes
}
```

## Terminal Support

Media copy features require terminal support:

- **VT100+**: Basic print screen and printer controller
- **VT300+**: Extended features like print display, print all pages
- **xterm**: Full media copy support (when configured)

Many modern terminal emulators do not support printer operations. Test compatibility before relying on these features.

## Related

- [ANSI Escape Codes](./ansi.md) - Core escape sequence generation
- [Program](./program.md) - High-level terminal control
