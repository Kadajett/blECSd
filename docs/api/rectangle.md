# Rectangular Area Operations

The rectangle namespace provides VT400+ rectangular area operations for advanced screen manipulation.

## Overview

Rectangular area operations allow manipulation of rectangular regions on the screen, including:

- Copying content between regions
- Filling regions with characters
- Erasing regions
- Setting/toggling attributes within regions
- Character protection (selective erase)

**Note:** These features require VT400+ compatible terminals. This module is internal and not exported from the main package.

## Quick Start

```typescript
import { rectangle, SGR } from 'blecsd/terminal';

// Fill a rectangle with '#' character
process.stdout.write(rectangle.fill(1, 1, 10, 20, '#'));

// Erase a rectangle
process.stdout.write(rectangle.erase(5, 5, 15, 25));

// Copy a rectangle to another location
process.stdout.write(rectangle.copy(1, 1, 10, 20, 1, 30));

// Make text bold in a region
process.stdout.write(rectangle.setAttrs(1, 1, 10, 20, [SGR.BOLD]));
```

## Functions

### setAttrs()

Set character attributes in a rectangular area (DECCARA). Changes attributes (bold, underline, etc.) within a rectangle.

```typescript
rectangle.setAttrs(
  top: number,     // Top row (1-indexed)
  left: number,    // Left column (1-indexed)
  bottom: number,  // Bottom row (1-indexed)
  right: number,   // Right column (1-indexed)
  attrs: number[]  // SGR attribute codes to set
): string
```

**Example:**

```typescript
// Make text bold and underlined in rectangle
rectangle.setAttrs(1, 1, 10, 20, [SGR.BOLD, SGR.UNDERLINE])
// Returns: '\x1b[1;1;10;20;1;4$r'
```

### reverseAttrs()

Reverse character attributes in a rectangular area (DECRARA). Toggles specified attributes within a rectangle.

```typescript
rectangle.reverseAttrs(
  top: number,
  left: number,
  bottom: number,
  right: number,
  attrs: number[]
): string
```

**Example:**

```typescript
// Toggle inverse attribute in rectangle
rectangle.reverseAttrs(1, 1, 10, 20, [SGR.INVERSE])
// Returns: '\x1b[1;1;10;20;7$t'
```

### copy()

Copy rectangular area (DECCRA). Copies content from one rectangle to another location.

```typescript
rectangle.copy(
  srcTop: number,     // Source top row
  srcLeft: number,    // Source left column
  srcBottom: number,  // Source bottom row
  srcRight: number,   // Source right column
  destTop: number,    // Destination top row
  destLeft: number,   // Destination left column
  srcPage?: number,   // Source page (default: 1)
  destPage?: number   // Destination page (default: 1)
): string
```

**Example:**

```typescript
// Copy rectangle from (1,1)-(10,20) to position (1,30)
rectangle.copy(1, 1, 10, 20, 1, 30)
// Returns: '\x1b[1;1;10;20;1;1;30;1$v'
```

### fill()

Fill rectangular area with character (DECFRA). Fills a rectangle with a specified character.

```typescript
rectangle.fill(
  top: number,
  left: number,
  bottom: number,
  right: number,
  char: string | number  // Character or character code
): string
```

**Example:**

```typescript
// Fill rectangle with '#'
rectangle.fill(1, 1, 10, 20, '#')
// Returns: '\x1b[35;1;1;10;20$x'

// Fill with character code
rectangle.fill(1, 1, 10, 20, 42) // '*' character
```

### erase()

Erase rectangular area (DECERA). Erases content within a rectangle (fills with spaces).

```typescript
rectangle.erase(
  top: number,
  left: number,
  bottom: number,
  right: number
): string
```

**Example:**

```typescript
// Erase rectangle
rectangle.erase(5, 5, 15, 25)
// Returns: '\x1b[5;5;15;25$z'
```

### selectiveErase()

Selective erase rectangular area (DECSERA). Erases only characters that are not protected by DECSCA.

```typescript
rectangle.selectiveErase(
  top: number,
  left: number,
  bottom: number,
  right: number
): string
```

**Example:**

```typescript
// Selective erase rectangle
rectangle.selectiveErase(5, 5, 15, 25)
// Returns: '\x1b[5;5;15;25${'
```

### setProtection()

Set character protection attribute (DECSCA). Protected characters are not affected by selective erase.

```typescript
rectangle.setProtection(protect: boolean): string
```

**Example:**

```typescript
// Protect subsequent characters
rectangle.setProtection(true)
// Returns: '\x1b[1"q'

// Unprotect
rectangle.setProtection(false)
// Returns: '\x1b[0"q'
```

### requestChecksum()

Enable rectangular area checksum reporting (DECRQCRA). Requests a checksum of a rectangular area.

```typescript
rectangle.requestChecksum(
  id: number,      // Request ID (returned in response)
  page: number,    // Page number
  top: number,
  left: number,
  bottom: number,
  right: number
): string
```

## Usage Patterns

### Drawing a Box Border

```typescript
import { rectangle, cursor } from 'blecsd/terminal';

function drawBoxBorder(x: number, y: number, width: number, height: number) {
  const right = x + width - 1;
  const bottom = y + height - 1;

  // Fill entire area with spaces first
  process.stdout.write(rectangle.fill(y, x, bottom, right, ' '));

  // Draw corners and edges using cursor positioning
  // (rectangular fill is for bulk operations)
}
```

### Copying a Window

```typescript
import { rectangle } from 'blecsd/terminal';

function copyWindow(
  srcX: number, srcY: number,
  width: number, height: number,
  destX: number, destY: number
) {
  process.stdout.write(
    rectangle.copy(
      srcY, srcX,
      srcY + height - 1, srcX + width - 1,
      destY, destX
    )
  );
}
```

### Clearing a Dialog Area

```typescript
import { rectangle } from 'blecsd/terminal';

function clearDialog(x: number, y: number, width: number, height: number) {
  process.stdout.write(
    rectangle.erase(y, x, y + height - 1, x + width - 1)
  );
}
```

### Protected Status Line

```typescript
import { rectangle, cursor } from 'blecsd/terminal';

function setupProtectedStatusLine(row: number, cols: number) {
  // Move to status line
  process.stdout.write(cursor.move(1, row));

  // Enable protection for status line text
  process.stdout.write(rectangle.setProtection(true));
  process.stdout.write('Status: Ready');
  process.stdout.write(rectangle.setProtection(false));

  // Now selective erase won't affect the status line
}
```

### Highlighting a Region

```typescript
import { rectangle, SGR } from 'blecsd/terminal';

function highlightRegion(
  x: number, y: number,
  width: number, height: number
) {
  process.stdout.write(
    rectangle.setAttrs(
      y, x,
      y + height - 1, x + width - 1,
      [SGR.INVERSE]
    )
  );
}

function unhighlightRegion(
  x: number, y: number,
  width: number, height: number
) {
  process.stdout.write(
    rectangle.reverseAttrs(
      y, x,
      y + height - 1, x + width - 1,
      [SGR.INVERSE]
    )
  );
}
```

## Terminal Support

Rectangular area operations require VT400+ compatible terminals:

- **xterm**: Full support
- **VT420/VT520**: Native support
- **mintty**: Full support
- **Windows Terminal**: Partial support

Many terminal emulators do not implement these advanced features. Test compatibility before relying on them.

## Related

- [ANSI Escape Codes](./ansi.md) - Core escape sequence generation
- [Screen](./ansi.md#screen-namespace) - Basic screen operations
