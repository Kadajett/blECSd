# Rope

Immutable rope data structure for efficient large text buffer operations. Provides O(log n) insert, delete, and index operations using a balanced binary tree of string chunks.

## Import

```typescript
import {
  createRope,
  createEmptyRope,
  getLength,
  getNewlineCount,
  getLineCount,
  isEmpty,
  charAt,
  substring,
  getText,
  getLineForIndex,
  getLineStart,
  getLineEnd,
  getLine,
  getLines,
  insert,
  append,
  prepend,
  deleteRange,
  replaceRange,
  getStats,
  verify,
} from 'blecsd';
```

## Types

### Rope

A rope is either a leaf node or an internal node.

```typescript
type Rope = RopeLeaf | RopeNode;
```

### RopeLeaf

A leaf node containing actual text content.

```typescript
interface RopeLeaf {
  readonly type: 'leaf';
  readonly text: string;
  readonly length: number;
  readonly newlines: number;
  readonly lineBreaks: readonly number[];
}
```

### RopeNode

An internal node containing two subtrees.

```typescript
interface RopeNode {
  readonly type: 'node';
  readonly left: Rope;
  readonly right: Rope;
  readonly leftLength: number;
  readonly length: number;
  readonly newlines: number;
  readonly depth: number;
}
```

### LineInfo

Line information returned by `getLine`.

```typescript
interface LineInfo {
  readonly text: string;
  readonly start: number;
  readonly end: number;
  readonly lineNumber: number;
}
```

### RopeStats

Statistics about a rope's internal structure.

```typescript
interface RopeStats {
  readonly length: number;
  readonly newlines: number;
  readonly leafCount: number;
  readonly depth: number;
  readonly avgLeafSize: number;
}
```

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `LEAF_MAX_SIZE` | 512 | Maximum characters in a leaf node |
| `LEAF_MIN_SIZE` | 256 | Minimum characters before merging |
| `MAX_DEPTH` | 48 | Maximum tree depth before rebalance |

## Functions

### Creation

#### createRope

Creates a rope from a string. Large strings are automatically split into balanced chunks.

```typescript
function createRope(text?: string): Rope
```

**Parameters:**
- `text` - Initial text content (default: empty string)

**Returns:** A new Rope.

**Example:**
```typescript
import { createRope } from 'blecsd';

const rope = createRope('Hello, World!');
```

#### createEmptyRope

Creates an empty rope.

```typescript
function createEmptyRope(): Rope
```

### Queries

#### getLength

Gets the total character count.

```typescript
function getLength(rope: Rope): number
```

#### getNewlineCount

Gets the total number of newline characters.

```typescript
function getNewlineCount(rope: Rope): number
```

#### getLineCount

Gets the total number of lines (newlines + 1).

```typescript
function getLineCount(rope: Rope): number
```

#### isEmpty

Checks if the rope is empty.

```typescript
function isEmpty(rope: Rope): boolean
```

#### charAt

Gets the character at a specific index.

```typescript
function charAt(rope: Rope, index: number): string | undefined
```

**Parameters:**
- `rope` - The rope to query
- `index` - Character index (0-based)

**Returns:** Character at index, or `undefined` if out of bounds.

#### substring

Gets a substring from the rope.

```typescript
function substring(rope: Rope, start: number, end?: number): string
```

**Parameters:**
- `rope` - The rope to query
- `start` - Start index (inclusive)
- `end` - End index (exclusive, defaults to end of rope)

**Returns:** Substring.

#### getText

Converts the entire rope to a string.

```typescript
function getText(rope: Rope): string
```

### Line Operations

#### getLineForIndex

Gets the line number for a character position.

```typescript
function getLineForIndex(rope: Rope, index: number): number
```

**Parameters:**
- `rope` - The rope to query
- `index` - Character index

**Returns:** Line number (0-based).

#### getLineStart

Gets the start index of a line.

```typescript
function getLineStart(rope: Rope, lineNumber: number): number
```

**Returns:** Start index, or -1 if out of bounds.

#### getLineEnd

Gets the end index of a line (position of newline or end of rope).

```typescript
function getLineEnd(rope: Rope, lineNumber: number): number
```

**Returns:** End index, or -1 if out of bounds.

#### getLine

Gets a specific line's content.

```typescript
function getLine(rope: Rope, lineNumber: number): LineInfo | undefined
```

**Parameters:**
- `rope` - The rope to query
- `lineNumber` - Line number (0-based)

**Returns:** Line info or `undefined` if out of bounds.

**Example:**
```typescript
import { createRope, getLine } from 'blecsd';

const rope = createRope('Line 1\nLine 2\nLine 3');
const line = getLine(rope, 1);
console.log(line?.text); // 'Line 2'
```

#### getLines

Gets a range of lines.

```typescript
function getLines(rope: Rope, startLine: number, endLine: number): LineInfo[]
```

**Parameters:**
- `rope` - The rope to query
- `startLine` - Start line (inclusive)
- `endLine` - End line (exclusive)

**Returns:** Array of line info objects.

### Mutations

All mutation functions return a new rope (immutable).

#### insert

Inserts text at a position.

```typescript
function insert(rope: Rope, index: number, text: string): Rope
```

**Example:**
```typescript
import { createRope, insert, getText } from 'blecsd';

let rope = createRope('Hello World');
rope = insert(rope, 6, 'Beautiful ');
console.log(getText(rope)); // 'Hello Beautiful World'
```

#### append

Appends text to the end.

```typescript
function append(rope: Rope, text: string): Rope
```

#### prepend

Prepends text to the start.

```typescript
function prepend(rope: Rope, text: string): Rope
```

#### deleteRange

Deletes a range of text.

```typescript
function deleteRange(rope: Rope, start: number, end: number): Rope
```

**Parameters:**
- `rope` - The rope to modify
- `start` - Start index (inclusive)
- `end` - End index (exclusive)

**Example:**
```typescript
import { createRope, deleteRange, getText } from 'blecsd';

let rope = createRope('Hello Beautiful World');
rope = deleteRange(rope, 6, 16);
console.log(getText(rope)); // 'Hello World'
```

#### replaceRange

Replaces a range of text.

```typescript
function replaceRange(rope: Rope, start: number, end: number, text: string): Rope
```

**Example:**
```typescript
import { createRope, replaceRange, getText } from 'blecsd';

let rope = createRope('Hello World');
rope = replaceRange(rope, 6, 11, 'Universe');
console.log(getText(rope)); // 'Hello Universe'
```

### Statistics and Debugging

#### getStats

Gets statistics about the rope's internal structure.

```typescript
function getStats(rope: Rope): RopeStats
```

#### verify

Verifies rope integrity (useful for testing and debugging).

```typescript
function verify(rope: Rope): boolean
```

## Usage Example

```typescript
import { createRope, insert, deleteRange, getLine, getText, getStats } from 'blecsd';

// Build a document
let doc = createRope('');
doc = insert(doc, 0, 'function hello() {\n');
doc = insert(doc, doc.length, '  return "world";\n');
doc = insert(doc, doc.length, '}\n');

// Query lines
const line = getLine(doc, 1);
console.log(line?.text); // '  return "world";'

// Edit in the middle
doc = replaceRange(doc, 19, 36, '  console.log("hi");');

// Check stats
const stats = getStats(doc);
console.log(`${stats.length} chars, ${stats.leafCount} leaves, depth ${stats.depth}`);
```

---

## Related

- [Fast Wrap](./fast-wrap.md) - Word wrapping with caching
- [Line Gutter](./line-gutter.md) - Line number rendering
