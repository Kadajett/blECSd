# Screenshot Capture API

Capture screen content for replay, testing, and debugging.

## Overview

The screenshot system provides:
- Full screen and region capture
- ANSI and plain text output
- JSON serialization for replay
- Screenshot comparison and diffing
- Cell-level access to captured data

## Quick Start

```typescript
import {
  createScreenBuffer,
  captureScreen,
  captureRegion,
  screenshotToAnsi,
  screenshotToText,
} from 'blecsd';

// Create and populate a buffer
const buffer = createScreenBuffer(80, 24);
// ... populate buffer ...

// Capture full screen
const screenshot = captureScreen(buffer);

// Capture a region
const region = captureRegion(buffer, 10, 5, 20, 10);

// Convert to ANSI for terminal display
const ansi = screenshotToAnsi(screenshot);
process.stdout.write(ansi);

// Convert to plain text
const text = screenshotToText(screenshot);
console.log(text);
```

## Capture Functions

### captureScreen

Capture the entire screen buffer.

```typescript
import { captureScreen } from 'blecsd';

const screenshot = captureScreen(buffer);

// With options
const noColors = captureScreen(buffer, {
  includeAttributes: true,
  includeColors: false,
  timestamp: Date.now(),
});
```

### captureRegion

Capture a rectangular region.

```typescript
import { captureRegion } from 'blecsd';

// Capture 20x10 region starting at (10, 5)
const region = captureRegion(buffer, 10, 5, 20, 10);

console.log(region.width);    // 20
console.log(region.height);   // 10
console.log(region.offsetX);  // 10
console.log(region.offsetY);  // 5
```

### captureRow

Capture a single row.

```typescript
import { captureRow } from 'blecsd';

const row = captureRow(buffer, 5);
```

### createEmptyScreenshot

Create an empty screenshot with specified dimensions.

```typescript
import { createEmptyScreenshot } from 'blecsd';

const empty = createEmptyScreenshot(80, 24);
```

### CaptureOptions

```typescript
interface CaptureOptions {
  readonly includeAttributes?: boolean;  // default: true
  readonly includeColors?: boolean;      // default: true
  readonly timestamp?: number;           // default: Date.now()
}
```

## Output Functions

### screenshotToText

Convert to plain text, stripping colors and attributes.

```typescript
import { screenshotToText } from 'blecsd';

const text = screenshotToText(screenshot);

// With options
const withSpaces = screenshotToText(screenshot, {
  lineSeparator: '\r\n',
  preserveTrailingSpaces: true,
});
```

### screenshotToAnsi

Convert to ANSI escape sequences for terminal display.

```typescript
import { screenshotToAnsi } from 'blecsd';

const ansi = screenshotToAnsi(screenshot);
process.stdout.write(ansi);

// With options
const ansi256 = screenshotToAnsi(screenshot, {
  resetPerLine: true,
  use256Color: true,
  lineSeparator: '\n',
});
```

### screenshotToJson

Convert to JSON-serializable format.

```typescript
import { screenshotToJson, screenshotFromJson } from 'blecsd';

// Serialize
const json = screenshotToJson(screenshot);
const str = JSON.stringify(json);

// Save to file
fs.writeFileSync('screenshot.json', str);

// Restore
const restored = screenshotFromJson(JSON.parse(str));
```

## Screenshot Type

```typescript
interface Screenshot {
  readonly width: number;
  readonly height: number;
  readonly cells: ReadonlyArray<ReadonlyArray<Cell>>;
  readonly timestamp: number;
  readonly offsetX: number;
  readonly offsetY: number;
}
```

## Comparison Functions

### screenshotsEqual

Compare two screenshots for equality.

```typescript
import { screenshotsEqual } from 'blecsd';

const before = captureScreen(buffer);
// ... modify buffer ...
const after = captureScreen(buffer);

if (!screenshotsEqual(before, after)) {
  console.log('Buffer changed');
}
```

### diffScreenshots

Compute cell-level differences between screenshots.

```typescript
import { diffScreenshots } from 'blecsd';

const before = captureScreen(buffer);
// ... modify buffer ...
const after = captureScreen(buffer);

const diffs = diffScreenshots(before, after);
console.log(`${diffs.length} cells changed`);

for (const diff of diffs) {
  console.log(`(${diff.x}, ${diff.y}): "${diff.before.char}" -> "${diff.after.char}"`);
}
```

### CellDiff

```typescript
interface CellDiff {
  readonly x: number;
  readonly y: number;
  readonly before: Cell;
  readonly after: Cell;
}
```

## Utility Functions

### getScreenshotCell

Get a cell from a screenshot.

```typescript
import { getScreenshotCell } from 'blecsd';

const cell = getScreenshotCell(screenshot, 10, 5);
if (cell) {
  console.log(cell.char);
}
```

### getScreenshotRow

Get row content as text.

```typescript
import { getScreenshotRow } from 'blecsd';

const rowText = getScreenshotRow(screenshot, 5);
console.log(`Row 5: ${rowText}`);
```

### getScreenshotColumn

Get column content as text.

```typescript
import { getScreenshotColumn } from 'blecsd';

const colText = getScreenshotColumn(screenshot, 10);
console.log(`Column 10: ${colText}`);
```

### extractRegion

Extract a sub-region from a screenshot.

```typescript
import { extractRegion } from 'blecsd';

const full = captureScreen(buffer);
const region = extractRegion(full, 10, 5, 20, 10);
```

### isScreenshotEmpty

Check if screenshot contains only empty cells.

```typescript
import { isScreenshotEmpty } from 'blecsd';

const isEmpty = isScreenshotEmpty(screenshot);
```

### countNonEmptyCells

Count cells with non-space characters.

```typescript
import { countNonEmptyCells } from 'blecsd';

const count = countNonEmptyCells(screenshot);
console.log(`${count} cells have content`);
```

## Use Cases

### Testing

```typescript
import { captureScreen, screenshotsEqual } from 'blecsd';

function testRenderer() {
  const buffer = createScreenBuffer(80, 24);
  renderMyUI(buffer);

  const actual = captureScreen(buffer);
  const expected = loadExpectedScreenshot();

  expect(screenshotsEqual(actual, expected)).toBe(true);
}
```

### Debug Snapshots

```typescript
import { captureScreen, screenshotToText } from 'blecsd';

function debugDump(buffer: ScreenBufferData, label: string) {
  const screenshot = captureScreen(buffer);
  const text = screenshotToText(screenshot);

  console.log(`=== ${label} ===`);
  console.log(text);
  console.log(`=================`);
}
```

### Recording for Replay

```typescript
import {
  captureScreen,
  screenshotToJson,
  screenshotFromJson,
} from 'blecsd';

// Record
const frames: object[] = [];
function recordFrame(buffer: ScreenBufferData) {
  const screenshot = captureScreen(buffer);
  frames.push(screenshotToJson(screenshot));
}

// Save
fs.writeFileSync('recording.json', JSON.stringify(frames));

// Replay
const savedFrames = JSON.parse(fs.readFileSync('recording.json'));
for (const frame of savedFrames) {
  const screenshot = screenshotFromJson(frame);
  const ansi = screenshotToAnsi(screenshot);
  process.stdout.write(ansi);
  await sleep(100);
}
```

### Change Detection

```typescript
import { captureScreen, diffScreenshots } from 'blecsd';

let lastScreenshot = captureScreen(buffer);

function onRender() {
  const current = captureScreen(buffer);
  const diffs = diffScreenshots(lastScreenshot, current);

  if (diffs.length > 0) {
    // Only update changed cells
    for (const diff of diffs) {
      updateCell(diff.x, diff.y, diff.after);
    }
  }

  lastScreenshot = current;
}
```

## Performance Tips

1. **Capture only what you need** - Use `captureRegion` for partial captures
2. **Strip unnecessary data** - Use `includeColors: false` if colors don't matter
3. **Cache screenshots** - Don't capture every frame if content rarely changes
4. **Use text output for logs** - `screenshotToText` is faster than ANSI
5. **Compare dimensions first** - `screenshotsEqual` checks dimensions before cells
