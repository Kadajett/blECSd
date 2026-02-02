# Positioning System

Advanced positioning utilities for resolving position values to absolute coordinates. Supports numbers, percentages, expressions, and keywords.

## Overview

The positioning system allows you to specify element positions using various formats:

- **Numbers**: Absolute cell positions (e.g., `10`)
- **Percentages**: Relative to parent size (e.g., `'50%'`)
- **Expressions**: Percentage with offset (e.g., `'50%-5'`, `'100%+10'`)
- **Keywords**: Named positions (e.g., `'center'`, `'half'`)

## Types

### PositionValue

A position value can be a number or a string expression.

```typescript
type PositionValue = number | string;
```

Valid string formats:
- `'50%'` - percentage
- `'50%-5'` - percentage minus offset
- `'50%+5'` - percentage plus offset
- `'center'` - center in parent
- `'half'` - half of parent size
- `'left'`, `'top'` - start (0)
- `'right'`, `'bottom'` - end (parent - element size)

---

## Schema

### PositionValueSchema

Zod schema for validating position values.

```typescript
import { PositionValueSchema } from 'blecsd';

// Validation
PositionValueSchema.parse(10);        // Valid
PositionValueSchema.parse('50%');     // Valid
PositionValueSchema.parse('50%-5');   // Valid
PositionValueSchema.parse('center');  // Valid
PositionValueSchema.parse('invalid'); // Throws error
```

---

## Functions

### parsePosition

Resolves a position value to an absolute coordinate.

```typescript
import { parsePosition } from 'blecsd';

// Numbers (returned as-is, floored)
parsePosition(10, 100);           // 10
parsePosition(10.7, 100);         // 10

// Percentages (relative to parent size)
parsePosition('50%', 100);        // 50
parsePosition('100%', 80);        // 80

// Expressions
parsePosition('50%-5', 100);      // 45
parsePosition('100%-10', 100);    // 90
parsePosition('25%+10', 100);     // 35

// Keywords
parsePosition('center', 100, 20); // 40 ((100-20)/2)
parsePosition('half', 100, 20);   // 50 (ignores element size)
parsePosition('left', 100, 20);   // 0
parsePosition('right', 100, 20);  // 80 (100-20)
```

**Parameters:**
- `value` - Position value to resolve
- `parentSize` - Size of the parent container
- `elementSize` - Size of the element (used for centering, default: 0)

**Returns:** Absolute position (floored integer)

---

### parsePositionWithNegative

Like `parsePosition`, but handles negative values as offsets from the opposite edge.

```typescript
import { parsePositionWithNegative } from 'blecsd';

// Positive values work normally
parsePositionWithNegative(10, 100, 20);   // 10

// Negative values are from the right/bottom
parsePositionWithNegative(-10, 100, 20);  // 70 (100 - 10 - 20)
parsePositionWithNegative(-5, 100, 10);   // 85 (100 - 5 - 10)
```

**Parameters:**
- `value` - Position value to resolve
- `parentSize` - Size of the parent container
- `elementSize` - Size of the element

**Returns:** Absolute position

---

### clampPosition

Ensures a position value is within valid bounds.

```typescript
import { clampPosition } from 'blecsd';

clampPosition(50, 100, 20);  // 50 (within bounds)
clampPosition(-10, 100, 20); // 0 (clamped to min)
clampPosition(90, 100, 20);  // 80 (clamped so element fits)
```

**Parameters:**
- `value` - Position value to clamp
- `parentSize` - Size of the parent container
- `elementSize` - Size of the element

**Returns:** Clamped position value

---

### resolvePosition

Resolves both X and Y position values at once.

```typescript
import { resolvePosition } from 'blecsd';

const pos = resolvePosition('center', 'center', 100, 80, 20, 10);
// pos = { x: 40, y: 35 }

const pos2 = resolvePosition('50%-5', '100%-10', 100, 80, 0, 0);
// pos2 = { x: 45, y: 70 }
```

**Parameters:**
- `x` - X position value
- `y` - Y position value
- `parentWidth` - Parent container width
- `parentHeight` - Parent container height
- `elementWidth` - Element width (default: 0)
- `elementHeight` - Element height (default: 0)

**Returns:** `{ x: number, y: number }`

---

### resolvePositionClamped

Like `resolvePosition`, but clamps results to valid bounds.

```typescript
import { resolvePositionClamped } from 'blecsd';

// Position that would go off-screen is clamped
const pos = resolvePositionClamped('100%', '100%', 100, 80, 20, 10);
// pos = { x: 80, y: 70 } (clamped so element fits)
```

---

## Helper Functions

### centerPosition

Returns the `'center'` keyword.

```typescript
import { centerPosition, parsePosition } from 'blecsd';

const pos = centerPosition();
const x = parsePosition(pos, 100, 20); // 40
```

---

### percentPosition

Creates a percentage position string.

```typescript
import { percentPosition, parsePosition } from 'blecsd';

const pos = percentPosition(50);  // '50%'
const x = parsePosition(pos, 100); // 50
```

---

### percentOffsetPosition

Creates a percentage position with an offset.

```typescript
import { percentOffsetPosition, parsePosition } from 'blecsd';

const pos1 = percentOffsetPosition(50, -5);   // '50%-5'
const pos2 = percentOffsetPosition(100, -10); // '100%-10'

parsePosition(pos1, 100); // 45
parsePosition(pos2, 100); // 90
```

---

## Type Checking

### isPercentagePosition

Checks if a value contains a percentage.

```typescript
import { isPercentagePosition } from 'blecsd';

isPercentagePosition('50%');    // true
isPercentagePosition('50%-5');  // true
isPercentagePosition(50);       // false
isPercentagePosition('center'); // false
```

---

### isKeywordPosition

Checks if a value is a position keyword.

```typescript
import { isKeywordPosition } from 'blecsd';

isKeywordPosition('center'); // true
isKeywordPosition('half');   // true
isKeywordPosition('left');   // true
isKeywordPosition('50%');    // false
```

---

## Examples

### Centering an Element

```typescript
import { parsePosition } from 'blecsd';

const parentWidth = 100;
const parentHeight = 80;
const elementWidth = 20;
const elementHeight = 10;

const x = parsePosition('center', parentWidth, elementWidth);   // 40
const y = parsePosition('center', parentHeight, elementHeight); // 35
```

### Right-Aligned with Margin

```typescript
import { percentOffsetPosition, parsePosition } from 'blecsd';

// Position 10 cells from the right edge
const x = parsePosition('100%-10', 100, 20); // 70
// Or using the helper:
const pos = percentOffsetPosition(100, -10);
const x2 = parsePosition(pos, 100, 20); // 70
```

### Responsive Grid Layout

```typescript
import { parsePosition, resolvePosition } from 'blecsd';

const screenWidth = 120;
const screenHeight = 40;

// Header: full width, at top
const header = resolvePosition(0, 0, screenWidth, screenHeight, 0, 0);

// Sidebar: 25% width, below header
const sidebar = resolvePosition(0, 3, screenWidth, screenHeight, 0, 0);
const sidebarWidth = parsePosition('25%', screenWidth);

// Main content: centered in remaining space
const mainX = parsePosition('25%+2', screenWidth);
```

---

## See Also

- [Position Component](./position.md) - Entity position storage
- [Dimensions Component](./dimensions.md) - Entity sizing
