# Content Manipulation

A set of functions for line-level manipulation of entity text content. Provides array-like operations (push, pop, shift, splice) on content lines with automatic scroll adjustment.

## Overview

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  getLines,
  setLines,
  insertLine,
  deleteLine,
  pushLine,
  popLine,
  spliceLines,
  clearLines,
  setLine,
  setBaseLine,
  getBaseLine,
  contentGetLine,
  contentGetLineCount,
  insertTop,
  insertBottom,
  deleteTop,
  deleteBottom,
  shiftLine,
  unshiftLine,
  replaceLines,
} from 'blecsd/widgets';

const world = createWorld();
const entity = addEntity(world);

// Set content, then manipulate by line
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);

insertLine(world, entity, 1, 'Inserted');
// Content: 'Line 1\nInserted\nLine 2\nLine 3'

const removed = popLine(world, entity);
// removed: 'Line 3'
// Content: 'Line 1\nInserted\nLine 2'
console.log('removed line:', removed);
```

---

## Reading Functions

### getLines

Gets the content of an entity as an array of lines.

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
const lines = getLines(world, entity);
// ['Line 1', 'Line 2', 'Line 3']
console.log('lines:', lines);
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID

**Returns:** `string[]`

### contentGetLineCount

Gets the number of lines in an entity's content.

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
console.log(contentGetLineCount(world, entity)); // 3
```

**Returns:** `number`

### contentGetLine

Gets a specific line by index (0-based).

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
console.log(contentGetLine(world, entity, 1)); // 'Line 2'
```

**Returns:** `string` - The line content, or empty string if index is out of bounds.

### getBaseLine

Gets a line from the base content (before scroll adjustment). Equivalent to `getLine` since scroll offset is applied during rendering, not storage.

```typescript
setLines(world, entity, ['First', 'Second', 'Third']);
console.log(getBaseLine(world, entity, 0)); // Same as getLine
```

---

## Writing Functions

### setLine

Sets a specific line by index. Marks the entity dirty.

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
setLine(world, entity, 1, 'Modified Line');
// Content: 'Line 1\nModified Line\nLine 3'
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID
- `index: number` - Line index (0-based)
- `line: string` - New line content

**Returns:** `Entity` - The entity ID for chaining

### setBaseLine

Sets a line in the base content. Equivalent to `setLine`.

```typescript
setLines(world, entity, ['Old first line', 'Second']);
setBaseLine(world, entity, 0, 'New first line');
```

### setLines

Sets all content lines at once. Marks the entity dirty and adjusts scroll if content is now shorter.

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
// Content: 'Line 1\nLine 2\nLine 3'
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID
- `lines: string[]` - Array of lines

**Returns:** `Entity`

### clearLines

Clears all lines and resets scroll position.

```typescript
setLines(world, entity, ['Some content', 'Second line']);
clearLines(world, entity);
// Content: ''
```

---

## Insertion Functions

### insertLine

Inserts a line at a specific position. Adjusts scroll if inserting above the current scroll position.

```typescript
setLines(world, entity, ['Line 1', 'Line 3']);
insertLine(world, entity, 1, 'Line 2');
// Content: 'Line 1\nLine 2\nLine 3'
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID
- `index: number` - Position to insert (0-based, clamped to valid range)
- `line: string` - The line to insert

**Returns:** `Entity`

### insertTop

Inserts a line at the top of the content.

```typescript
setLines(world, entity, ['Line 2', 'Line 3']);
insertTop(world, entity, 'Line 1');
// Content: 'Line 1\nLine 2\nLine 3'
```

### insertBottom

Inserts a line at the bottom of the content.

```typescript
setLines(world, entity, ['Line 1', 'Line 2']);
insertBottom(world, entity, 'Line 3');
// Content: 'Line 1\nLine 2\nLine 3'
```

---

## Deletion Functions

### deleteLine

Deletes one or more lines starting at a specific position. Adjusts scroll if deleting above the current scroll position.

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3', 'Line 4']);
deleteLine(world, entity, 1, 2);
// Content: 'Line 1\nLine 4'
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID
- `index: number` - Starting line index
- `count?: number` - Number of lines to delete (default: 1)

**Returns:** `Entity`

### deleteTop

Deletes lines from the top.

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
deleteTop(world, entity, 1);
// Content: 'Line 2\nLine 3'
```

### deleteBottom

Deletes lines from the bottom.

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
deleteBottom(world, entity, 1);
// Content: 'Line 1\nLine 2'
```

---

## Stack-Like Operations

### pushLine

Pushes a line to the bottom (alias for `insertBottom`).

```typescript
clearLines(world, entity);
pushLine(world, entity, 'Log entry 1');
pushLine(world, entity, 'Log entry 2');
// Lines: ['Log entry 1', 'Log entry 2']
```

### popLine

Removes and returns the last line.

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
const popped = popLine(world, entity);
// popped: 'Line 3'
// Content: 'Line 1\nLine 2'
console.log('popped line:', popped);
```

**Returns:** `string` - The removed line, or empty string if content is empty.

### shiftLine

Removes and returns the first line. Adjusts scroll position.

```typescript
setLines(world, entity, ['Line 1', 'Line 2', 'Line 3']);
const shifted = shiftLine(world, entity);
// shifted: 'Line 1'
// Content: 'Line 2\nLine 3'
console.log('shifted line:', shifted);
```

**Returns:** `string` - The removed line, or empty string if content is empty.

### unshiftLine

Adds a line to the top (alias for `insertTop`).

```typescript
setLines(world, entity, ['Second', 'Third']);
unshiftLine(world, entity, 'New first line');
```

---

## Batch Operations

### replaceLines

Replaces multiple lines starting at an index (in-place, does not change line count).

```typescript
setLines(world, entity, ['A', 'B', 'C', 'D', 'E']);
replaceLines(world, entity, 1, ['X', 'Y']);
// Content: 'A\nX\nY\nD\nE'
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID
- `startIndex: number` - Starting line index
- `newLines: string[]` - Replacement lines

**Returns:** `Entity`

### spliceLines

Deletes and/or inserts lines at a position (like `Array.splice`).

```typescript
setLines(world, entity, ['A', 'B', 'C', 'D']);
const deleted = spliceLines(world, entity, 1, 2, ['X', 'Y', 'Z']);
// deleted: ['B', 'C']
// Content: 'A\nX\nY\nZ\nD'
console.log('deleted lines:', deleted);
```

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The entity ID
- `start: number` - Starting index
- `deleteCount: number` - Number of lines to delete
- `insertLines?: string[]` - Optional lines to insert

**Returns:** `string[]` - Array of deleted lines

---

## Scroll Behavior

All modification functions automatically adjust the scroll position for entities that have the scrollable component:

- **Inserting above scroll position** - Scroll shifts down to keep the same content visible
- **Deleting above scroll position** - Scroll shifts up proportionally
- **Content becomes shorter than scroll** - Scroll is clamped to the valid range
- **Clearing content** - Scroll resets to 0

---

## Examples

### Log Buffer with Maximum Lines

```typescript
const MAX_LINES = 1000;

function addLogEntry(message: string) {
  pushLine(world, entity, message);

  // Evict old entries
  const count = contentGetLineCount(world, entity);
  if (count > MAX_LINES) {
    deleteTop(world, entity, count - MAX_LINES);
  }
}
addLogEntry('First log entry');
```

### Editable Text Buffer

```typescript
setLines(world, entity, ['function main() {', '  // body', '}']);

// Insert a line at the cursor
function insertAtCursor(cursorLine: number, text: string) {
  insertLine(world, entity, cursorLine, text);
}

// Delete the current line
function deleteCurrentLine(cursorLine: number) {
  deleteLine(world, entity, cursorLine);
}

// Replace the current line
function replaceCurrentLine(cursorLine: number, newText: string) {
  setLine(world, entity, cursorLine, newText);
}

insertAtCursor(1, '  console.log("hello");');
const currentLine = contentGetLine(world, entity, 1);
console.log('current line:', currentLine);
replaceCurrentLine(1, '  console.log("world");');
deleteCurrentLine(2);
```

---

## See Also

- [Log Widget](./log.md) - Append-only log display
- [Streaming Text](./streaming-text.md) - Incremental text rendering
- [ScrollableText Widget](./scrollableText.md) - Scrollable text display
