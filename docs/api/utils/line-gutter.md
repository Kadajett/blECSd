# Line Gutter

Efficient line number gutter rendering with dynamic width, relative/hybrid numbering modes (vim-style), and virtualized computation that only processes visible lines.

## Import

```typescript
import {
  createGutterConfig,
  computeDigitWidth,
  computeGutterWidth,
  formatLineNumber,
  computeVisibleGutter,
  gutterWidthChanged,
  renderGutterBlock,
} from 'blecsd';
```

## Types

### LineNumberMode

```typescript
type LineNumberMode = 'absolute' | 'relative' | 'hybrid';
```

- **absolute** - Standard line numbers (1, 2, 3, ...)
- **relative** - Distance from cursor line (vim `relativenumber`)
- **hybrid** - Current line shows absolute, others show relative (vim `number` + `relativenumber`)

### GutterConfig

Configuration for gutter rendering.

```typescript
interface GutterConfig {
  readonly mode: LineNumberMode;       // Default: 'absolute'
  readonly minWidth: number;           // Min digit columns (default: 3)
  readonly rightPadding: number;       // Padding after number (default: 1)
  readonly padChar: string;            // Padding character (default: ' ')
  readonly separator: string;          // Separator char (default: '\u2502')
  readonly highlightCurrent: boolean;  // Highlight current line (default: true)
}
```

### GutterLine

A single rendered gutter cell.

```typescript
interface GutterLine {
  readonly text: string;
  readonly isCurrent: boolean;
  readonly lineNumber: number;
  readonly width: number;
}
```

### GutterResult

Result of computing visible gutter lines.

```typescript
interface GutterResult {
  readonly lines: readonly GutterLine[];
  readonly gutterWidth: number;
  readonly digitWidth: number;
  readonly totalLines: number;
}
```

## Functions

### createGutterConfig

Creates a full gutter config with defaults for any omitted fields.

```typescript
function createGutterConfig(config?: Partial<GutterConfig>): GutterConfig
```

**Example:**
```typescript
import { createGutterConfig } from 'blecsd';

const config = createGutterConfig({ mode: 'relative' });
```

### computeDigitWidth

Computes the number of digit columns needed for a given line count.

```typescript
function computeDigitWidth(totalLines: number, minWidth: number): number
```

**Example:**
```typescript
import { computeDigitWidth } from 'blecsd';

computeDigitWidth(99, 3);    // 3 (minWidth applies)
computeDigitWidth(1000, 3);  // 4
computeDigitWidth(99999, 3); // 5
```

### computeGutterWidth

Computes total gutter width including padding and separator.

```typescript
function computeGutterWidth(digitWidth: number, config?: Partial<GutterConfig>): number
```

### formatLineNumber

Formats a single line number for display.

```typescript
function formatLineNumber(
  lineNumber: number,
  cursorLine: number,
  digitWidth: number,
  mode: LineNumberMode,
): string
```

**Parameters:**
- `lineNumber` - Absolute line number (1-based)
- `cursorLine` - Current cursor line (1-based)
- `digitWidth` - Width to pad the number to
- `mode` - Line numbering mode

**Example:**
```typescript
import { formatLineNumber } from 'blecsd';

formatLineNumber(42, 42, 4, 'absolute');  // '  42'
formatLineNumber(40, 42, 4, 'relative');  // '   2'
formatLineNumber(42, 42, 4, 'hybrid');    // '  42'
formatLineNumber(40, 42, 4, 'hybrid');    // '   2'
```

### computeVisibleGutter

Computes gutter lines for a viewport. Runs in O(viewportHeight) regardless of total document size.

```typescript
function computeVisibleGutter(
  totalLines: number,
  viewportStart: number,
  viewportHeight: number,
  cursorLine: number,
  config?: Partial<GutterConfig>,
): GutterResult
```

**Parameters:**
- `totalLines` - Total lines in the document
- `viewportStart` - First visible line index (0-based)
- `viewportHeight` - Number of visible lines
- `cursorLine` - Current cursor line (1-based)
- `config` - Optional gutter config overrides

**Example:**
```typescript
import { computeVisibleGutter } from 'blecsd';

const result = computeVisibleGutter(100000, 500, 40, 520);
for (const line of result.lines) {
  process.stdout.write(line.text + '\n');
}
console.log(`Gutter width: ${result.gutterWidth}`);
```

### gutterWidthChanged

Checks if the gutter width would change at a new line count. Useful for detecting when a layout reflow is needed (e.g., going from 999 to 1000 lines).

```typescript
function gutterWidthChanged(oldTotal: number, newTotal: number, minWidth?: number): boolean
```

**Example:**
```typescript
import { gutterWidthChanged } from 'blecsd';

gutterWidthChanged(999, 1000, 3);  // true (3 digits -> 4 digits)
gutterWidthChanged(100, 200, 3);   // false (both 3 digits)
```

### renderGutterBlock

Renders gutter lines with ANSI styling. Returns an array of styled strings.

```typescript
function renderGutterBlock(
  result: GutterResult,
  currentHighlight: string,
  normalStyle: string,
  reset?: string,
): readonly string[]
```

**Parameters:**
- `result` - Computed gutter result
- `currentHighlight` - ANSI prefix for the current line
- `normalStyle` - ANSI prefix for normal lines
- `reset` - ANSI reset sequence (default: `'\x1b[0m'`)

**Example:**
```typescript
import { computeVisibleGutter, renderGutterBlock } from 'blecsd';

const gutter = computeVisibleGutter(1000, 0, 40, 1);
const styled = renderGutterBlock(gutter, '\x1b[1;33m', '\x1b[90m');
for (const line of styled) {
  process.stdout.write(line + '\n');
}
```

## Usage Example

```typescript
import { computeVisibleGutter, renderGutterBlock, gutterWidthChanged } from 'blecsd';

let totalLines = 500;
let viewportStart = 0;
const viewportHeight = 40;
let cursorLine = 1;

function render(): void {
  const gutter = computeVisibleGutter(totalLines, viewportStart, viewportHeight, cursorLine, {
    mode: 'hybrid',
  });
  const styled = renderGutterBlock(gutter, '\x1b[1;33m', '\x1b[90m');
  // Combine with content lines for display
}

// Detect gutter resize
function onLinesChanged(newTotal: number): void {
  if (gutterWidthChanged(totalLines, newTotal, 3)) {
    // Relayout needed
  }
  totalLines = newTotal;
}
```

---

## Related

- [Virtual Scrollback](./virtual-scrollback.md) - Scrollback buffer for scrolled views
- [Fast Wrap](./fast-wrap.md) - Word wrapping for content beside the gutter
