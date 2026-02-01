# DEC Locator

The locator namespace provides DEC Locator protocol support for advanced mouse control.

## Overview

The DEC Locator is a more advanced mouse protocol than X10/SGR, supporting:

- Pixel-level positioning
- Filter rectangles (events only in specific areas)
- Precise button event control
- One-shot and continuous reporting modes

**Note:** DEC Locator requires compatible terminals (xterm, etc.) and is less commonly supported than SGR mouse mode. This module is internal and not exported from the main package.

## Quick Start

```typescript
import { locator, LocatorButton } from 'blecsd/terminal';

// Enable locator reporting with character cell units
process.stdout.write(locator.enable(2, 2));

// Set a filter rectangle for events
process.stdout.write(locator.setFilterRectangle(1, 1, 100, 50));

// Request current locator position
process.stdout.write(locator.requestPosition());

// Disable locator
process.stdout.write(locator.disable());
```

## Constants

### LocatorEvent

```typescript
const LocatorEvent = {
  NONE: 0,           // No events
  BUTTON_DOWN: 1,    // Request only on button down
  BUTTON_UP: 2,      // Request only on button up
  BUTTON_DOWN_UP: 3, // Request on both button down and up
} as const;
```

### LocatorButton

```typescript
const LocatorButton = {
  NONE: 0,    // No button
  RIGHT: 1,   // Right button
  MIDDLE: 2,  // Middle button
  LEFT: 3,    // Left button
  M4: 4,      // M4 button
} as const;
```

## Functions

### enable()

Enable locator reporting (DECELR).

```typescript
locator.enable(
  mode?: 0 | 1 | 2,   // 0=disabled, 1=one-shot, 2=continuous (default: 2)
  units?: 0 | 1 | 2   // 0=default, 1=pixels, 2=cells (default: 2)
): string
```

**Example:**

```typescript
// Enable one-shot locator with character cell units
locator.enable(1, 2)
// Returns: '\x1b[1;2'z'

// Enable continuous locator with pixel units
locator.enable(2, 1)
// Returns: '\x1b[2;1'z'
```

### disable()

Disable locator reporting (DECELR mode 0).

```typescript
locator.disable(): string
```

**Returns:** `'\x1b[0'z'`

### setFilterRectangle()

Set locator filter rectangle (DECEFR). Events are only reported within this rectangle.

```typescript
locator.setFilterRectangle(
  top: number,
  left: number,
  bottom: number,
  right: number
): string
```

**Example:**

```typescript
// Set filter rectangle
locator.setFilterRectangle(1, 1, 100, 200)
// Returns: '\x1b[1;1;100;200'w'
```

### clearFilterRectangle()

Clear locator filter rectangle. Events will be reported for the entire screen.

```typescript
locator.clearFilterRectangle(): string
```

**Returns:** `'\x1b['w'`

### setEvents()

Select locator events (DECSLE). Configure which events trigger locator reports.

```typescript
locator.setEvents(events: number[]): string
```

**Event values:**
- `0`: Only respond to explicit requests (DECRQLP)
- `1`: Report button down transitions
- `2`: Do not report button down transitions
- `3`: Report button up transitions
- `4`: Do not report button up transitions

**Example:**

```typescript
// Report both button down and up
locator.setEvents([1, 3])
// Returns: '\x1b[1;3'{'

// Only report button down
locator.setEvents([1, 4])
// Returns: '\x1b[1;4'{'
```

### requestPosition()

Request locator position (DECRQLP). Terminal responds with a DECLRP sequence containing position.

```typescript
locator.requestPosition(button?: LocatorButtonValue): string
```

**Example:**

```typescript
// Request position of any button
locator.requestPosition()
// Returns: '\x1b['|'

// Request position when left button is pressed
locator.requestPosition(LocatorButton.LEFT)
// Returns: '\x1b[3'|'
```

### enableKeyMode()

Enable locator key mode. Enables locator reporting for keyboard events.

```typescript
locator.enableKeyMode(): string
```

**Returns:** `'\x1b[?99h'`

### disableKeyMode()

Disable locator key mode.

```typescript
locator.disableKeyMode(): string
```

**Returns:** `'\x1b[?99l'`

### enableExtended()

Enable locator extended reporting (pixel coordinates).

```typescript
locator.enableExtended(): string
```

**Returns:** `'\x1b[?1003h'`

### disableExtended()

Disable locator extended reporting.

```typescript
locator.disableExtended(): string
```

**Returns:** `'\x1b[?1003l'`

### enableHighlight()

Enable locator highlight reporting. Reports highlighting changes in the locator area.

```typescript
locator.enableHighlight(): string
```

**Returns:** `'\x1b[?1001h'`

### disableHighlight()

Disable locator highlight reporting.

```typescript
locator.disableHighlight(): string
```

**Returns:** `'\x1b[?1001l'`

## Usage Patterns

### Basic Locator Setup

```typescript
import { locator } from 'blecsd/terminal';

function enableLocator() {
  // Enable continuous reporting with character cells
  process.stdout.write(locator.enable(2, 2));

  // Report both button down and up events
  process.stdout.write(locator.setEvents([1, 3]));
}

function disableLocator() {
  process.stdout.write(locator.disable());
}
```

### Filtered Region Tracking

```typescript
import { locator } from 'blecsd/terminal';

function trackButtonArea(x: number, y: number, width: number, height: number) {
  // Enable locator
  process.stdout.write(locator.enable(2, 2));

  // Only report events within the button area
  process.stdout.write(
    locator.setFilterRectangle(y, x, y + height, x + width)
  );

  // Report button down events only
  process.stdout.write(locator.setEvents([1, 4]));
}
```

### Polling Mode (One-Shot)

```typescript
import { locator, LocatorButton } from 'blecsd/terminal';

function pollMousePosition() {
  // Enable one-shot mode
  process.stdout.write(locator.enable(1, 2));

  // Request current position
  process.stdout.write(locator.requestPosition());

  // Terminal will respond with DECLRP sequence
  // After response, locator is automatically disabled (one-shot)
}

function pollLeftButton() {
  process.stdout.write(locator.enable(1, 2));
  process.stdout.write(locator.requestPosition(LocatorButton.LEFT));
}
```

### Pixel-Precise Tracking

```typescript
import { locator } from 'blecsd/terminal';

function enablePixelTracking() {
  // Enable with pixel units
  process.stdout.write(locator.enable(2, 1));

  // Enable extended reporting for full pixel coordinates
  process.stdout.write(locator.enableExtended());
}
```

## Response Parsing

The terminal responds to locator requests with DECLRP sequences. Use the response parser to decode them:

```typescript
import { parseResponse, isLocatorPosition } from 'blecsd/terminal';

function handleLocatorResponse(data: Buffer) {
  const response = parseResponse(data.toString());

  if (isLocatorPosition(response)) {
    console.log(`Button: ${response.button}`);
    console.log(`Position: ${response.col}, ${response.row}`);
    console.log(`Page: ${response.page}`);
  }
}
```

## DEC Locator vs SGR Mouse

| Feature | DEC Locator | SGR Mouse |
|---------|-------------|-----------|
| Coordinate units | Cells or pixels | Cells only |
| Filter rectangles | Yes | No |
| One-shot mode | Yes | No |
| Terminal support | Limited | Wide |
| Game use | Specialized | Recommended |

For most applications, SGR mouse mode (`mouse.enableSgr()`) is recommended due to wider terminal support. Use DEC Locator when you need:
- Pixel-level precision
- Event filtering by region
- One-shot position queries

## Terminal Support

DEC Locator is supported by:

- **xterm**: Full support
- **mintty**: Full support
- **VT340/VT420**: Native support

Most other terminal emulators do not support DEC Locator. Always provide fallback to SGR mouse mode.

## Related

- [Mouse](./ansi.md#mouse-namespace) - Standard mouse tracking (SGR mode)
- [Response Parser](./response-parser.md) - Parse locator responses
- [ANSI Escape Codes](./ansi.md) - Core escape sequence generation
