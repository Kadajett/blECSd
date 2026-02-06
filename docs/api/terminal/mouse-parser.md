# Mouse Parser

Parses terminal mouse protocol escape sequences into structured events. Supports X10, SGR, URXVT, DEC, and VT300 protocols, plus terminal focus events.

## Quick Start

```typescript
import {
  parseMouseSequence,
  isMouseBuffer,
} from 'blecsd';

// Parse an SGR mouse event
const result = parseMouseSequence(Buffer.from('\x1b[<0;10;20M'));
if (result?.type === 'mouse') {
  console.log(result.event.x);      // 9 (0-indexed)
  console.log(result.event.y);      // 19 (0-indexed)
  console.log(result.event.button); // 'left'
  console.log(result.event.action); // 'press'
}

// Parse a focus event
const focus = parseMouseSequence(Buffer.from('\x1b[I'));
if (focus?.type === 'focus') {
  console.log(focus.event.focused); // true
}
```

## Types

### MouseButton

```typescript
type MouseButton = 'left' | 'middle' | 'right' | 'wheelUp' | 'wheelDown' | 'unknown';
```

### MouseAction

```typescript
type MouseAction = 'press' | 'release' | 'move' | 'wheel';
```

### MouseProtocol

```typescript
type MouseProtocol = 'x10' | 'sgr' | 'urxvt' | 'dec' | 'vt300';
```

### MouseEvent

Parsed mouse event with position and modifiers.

```typescript
interface MouseEvent {
  readonly x: number;              // 0-indexed column
  readonly y: number;              // 0-indexed row
  readonly button: MouseButton;
  readonly action: MouseAction;
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly shift: boolean;
  readonly protocol: MouseProtocol;
  readonly raw: Uint8Array;
}
```

### FocusEvent

Terminal focus gained/lost event.

```typescript
interface FocusEvent {
  readonly focused: boolean;
  readonly raw: Uint8Array;
}
```

### ParseMouseResult

Discriminated union returned by `parseMouseSequence`.

```typescript
type ParseMouseResult =
  | { type: 'mouse'; event: MouseEvent }
  | { type: 'focus'; event: FocusEvent }
  | null;
```

## Functions

### parseMouseSequence

Parses a mouse or focus sequence from a buffer. Tries protocols in order: focus, SGR, X10, URXVT, DEC, VT300.

```typescript
function parseMouseSequence(buffer: Uint8Array): ParseMouseResult
```

```typescript
import { parseMouseSequence } from 'blecsd';

// SGR mouse press
const result = parseMouseSequence(Buffer.from('\x1b[<0;10;20M'));
if (result?.type === 'mouse') {
  console.log(result.event.button); // 'left'
  console.log(result.event.action); // 'press'
}

// Focus event
const focus = parseMouseSequence(Buffer.from('\x1b[I'));
if (focus?.type === 'focus') {
  console.log(focus.event.focused); // true
}
```

### isMouseBuffer

Checks if a buffer contains a mouse sequence.

```typescript
function isMouseBuffer(buffer: Uint8Array): boolean
```

```typescript
import { isMouseBuffer } from 'blecsd';

const buffer = Buffer.from('\x1b[<0;10;20M');
console.log(isMouseBuffer(buffer)); // true
```

## Protocol Details

### X10/X11

Format: `ESC [ M Cb Cx Cy`

- Coordinates are encoded with +32 offset
- Button 3 signals release (no button info on release)
- Movement codes: 35, 39, 51, 43

### SGR (most common modern protocol)

Format: `ESC [ < Cb ; Cx ; Cy M/m`

- `M` = press, `m` = release
- Coordinates are 1-based (converted to 0-based)
- Full button info on release

### URXVT

Format: `ESC [ Cb ; Cx ; Cy M`

- Similar to X10 but with decimal encoding
- Known bug: codes 128/129 on mousemove after wheel events

### DEC Locator

Format: `ESC [ < Cb ; Cx ; Cy ; page & w`

- Different button encoding (2=left, 4=middle, 6=right, 3=release)
- No modifier reporting

### VT300 Locator

Format: `ESC [ 24X ~ [ Cx , Cy ] CR`

- Button X: 1=left, 2/3=middle, 5=right
- No modifier reporting

## Modifier Encoding

Mouse modifier bits follow the X10 convention:

| Bit | Modifier |
|-----|----------|
| 2 | Shift |
| 3 | Meta/Alt |
| 4 | Ctrl |

## Zod Schemas

<!-- blecsd-doccheck:ignore -->
```typescript
import { MouseEventSchema, FocusEventSchema } from 'blecsd';

const result = MouseEventSchema.safeParse(event);
if (result.success) {
  console.log('Valid mouse event');
}
```

## See Also

- [Key Parser](./key-parser.md) - Keyboard event parsing
- [GPM Client](./gpm-client.md) - Linux console mouse support
