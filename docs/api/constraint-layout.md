# Constraint Layout

Flexible constraint-based layout system inspired by Ratatui. Calculate UI layouts using various constraint types like fixed sizes, percentages, ratios, and min/max bounds.

## Quick Start

```typescript
import {
  createWorld,
  layoutHorizontal,
  layoutVertical,
  fixed,
  percentage,
  min,
  max,
  ratio,
} from 'blecsd';

const world = createWorld();
const area = { x: 0, y: 0, width: 100, height: 24 };

// Horizontal layout: sidebar, main, sidebar
const columns = layoutHorizontal(world, area, [
  fixed(20),      // Left sidebar: 20 cells
  percentage(60), // Main area: 60% of width
  fixed(20),      // Right sidebar: 20 cells
]);

// Vertical layout: header, content, footer
const rows = layoutVertical(world, columns[1]!, [
  fixed(3),        // Header: 3 lines
  percentage(100), // Content: rest of space
  fixed(2),        // Footer: 2 lines
]);
```

## API Reference

### Types

#### Rect

Rectangle representing a layout area.

**Properties:**
- `x` - X position
- `y` - Y position
- `width` - Width in cells
- `height` - Height in cells

#### Constraint

Union type for layout constraints. Can be one of:
- `{ type: 'fixed', value: number }` - Fixed size
- `{ type: 'percentage', value: number }` - Percentage of available space
- `{ type: 'min', value: number }` - Minimum size
- `{ type: 'max', value: number }` - Maximum size
- `{ type: 'ratio', numerator: number, denominator: number }` - Ratio of available space

### Constraint Constructors

#### fixed

Creates a fixed-size constraint.

**Parameters:**
- `value` - Fixed size in cells

**Returns:** `Constraint`

**Example:**
```typescript
import { fixed, layoutHorizontal } from 'blecsd';

const area = { x: 0, y: 0, width: 100, height: 20 };
const rects = layoutHorizontal(world, area, [
  fixed(20),  // Left sidebar: 20 cells
  fixed(60),  // Main area: 60 cells
  fixed(20),  // Right sidebar: 20 cells
]);
```

#### percentage

Creates a percentage-based constraint.

**Parameters:**
- `value` - Percentage (0-100)

**Returns:** `Constraint`

**Example:**
```typescript
import { percentage, layoutVertical } from 'blecsd';

const area = { x: 0, y: 0, width: 80, height: 24 };
const rects = layoutVertical(world, area, [
  percentage(30),  // Header: 30% of height
  percentage(60),  // Content: 60% of height
  percentage(10),  // Footer: 10% of height
]);
```

#### min

Creates a minimum-size constraint. The section will get at least this much space.

**Parameters:**
- `value` - Minimum size in cells

**Returns:** `Constraint`

**Example:**
```typescript
import { min, percentage, layoutHorizontal } from 'blecsd';

const area = { x: 0, y: 0, width: 100, height: 20 };
const rects = layoutHorizontal(world, area, [
  min(20),        // Sidebar: at least 20 cells
  percentage(80), // Main: 80% of remaining
]);
```

#### max

Creates a maximum-size constraint. The section will get at most this much space.

**Parameters:**
- `value` - Maximum size in cells

**Returns:** `Constraint`

**Example:**
```typescript
import { max, percentage, layoutVertical } from 'blecsd';

const area = { x: 0, y: 0, width: 80, height: 40 };
const rects = layoutVertical(world, area, [
  max(10),         // Header: max 10 cells
  percentage(100), // Content: rest of space
]);
```

#### ratio

Creates a ratio-based constraint.

**Parameters:**
- `numerator` - Numerator of the ratio
- `denominator` - Denominator of the ratio

**Returns:** `Constraint`

**Example:**
```typescript
import { ratio, layoutHorizontal } from 'blecsd';

const area = { x: 0, y: 0, width: 120, height: 20 };
const rects = layoutHorizontal(world, area, [
  ratio(1, 3),  // 1/3 of width
  ratio(2, 3),  // 2/3 of width
]);
```

### Layout Functions

#### layoutHorizontal

Lays out rectangles horizontally within an area. Pure function that takes available area and constraints, returns calculated rectangles.

**Parameters:**
- `world` - The ECS world (for consistency with other systems)
- `area` - The available rectangular area
- `constraints` - Array of constraints defining horizontal sections

**Returns:** `Rect[]` - Array of rectangles representing the layout

**Example:**
```typescript
import { createWorld, layoutHorizontal, fixed, percentage } from 'blecsd';

const world = createWorld();
const area = { x: 0, y: 0, width: 100, height: 20 };

const rects = layoutHorizontal(world, area, [
  fixed(20),       // Left panel: 20 cells
  percentage(80),  // Main content: 80% of remaining
]);

console.log(rects);
// [
//   { x: 0, y: 0, width: 20, height: 20 },
//   { x: 20, y: 0, width: 80, height: 20 }
// ]
```

#### layoutVertical

Lays out rectangles vertically within an area. Pure function that takes available area and constraints, returns calculated rectangles.

**Parameters:**
- `world` - The ECS world (for consistency with other systems)
- `area` - The available rectangular area
- `constraints` - Array of constraints defining vertical sections

**Returns:** `Rect[]` - Array of rectangles representing the layout

**Example:**
```typescript
import { createWorld, layoutVertical, fixed, percentage } from 'blecsd';

const world = createWorld();
const area = { x: 0, y: 0, width: 80, height: 24 };

const rects = layoutVertical(world, area, [
  fixed(2),        // Header: 2 lines
  percentage(90),  // Content: 90% of remaining
  fixed(1),        // Footer: 1 line
]);

console.log(rects);
// [
//   { x: 0, y: 0, width: 80, height: 2 },
//   { x: 0, y: 2, width: 80, height: 21 },
//   { x: 0, y: 23, width: 80, height: 1 }
// ]
```

## Common Patterns

### Three-Column Layout

```typescript
import { layoutHorizontal, fixed, percentage } from 'blecsd';

const area = { x: 0, y: 0, width: 120, height: 30 };

const columns = layoutHorizontal(world, area, [
  fixed(25),       // Left sidebar: 25 cells
  percentage(100), // Main content: remaining space
  fixed(25),       // Right sidebar: 25 cells
]);
```

### Header-Content-Footer

```typescript
import { layoutVertical, fixed, percentage } from 'blecsd';

const area = { x: 0, y: 0, width: 80, height: 24 };

const rows = layoutVertical(world, area, [
  fixed(3),        // Header: 3 lines
  percentage(100), // Content: all remaining
  fixed(2),        // Footer: 2 lines
]);
```

### Nested Layouts

```typescript
import { layoutHorizontal, layoutVertical, fixed, percentage } from 'blecsd';

const screen = { x: 0, y: 0, width: 100, height: 30 };

// Split into columns
const columns = layoutHorizontal(world, screen, [
  fixed(30),       // Sidebar
  percentage(100), // Main area
]);

// Split main area into rows
const mainRows = layoutVertical(world, columns[1]!, [
  fixed(5),        // Toolbar
  percentage(100), // Content
  fixed(3),        // Status bar
]);

// Split content into sub-columns
const contentColumns = layoutHorizontal(world, mainRows[1]!, [
  percentage(50),  // Left pane
  percentage(50),  // Right pane
]);
```

### Responsive Sidebar

```typescript
import { layoutHorizontal, min, max, percentage } from 'blecsd';

const area = { x: 0, y: 0, width: 100, height: 24 };

const columns = layoutHorizontal(world, area, [
  min(20),         // Sidebar: at least 20, expands if space available
  percentage(100), // Main: takes remaining space
]);
```

### Equal Distribution with Ratio

```typescript
import { layoutHorizontal, ratio } from 'blecsd';

const area = { x: 0, y: 0, width: 120, height: 20 };

// Four equal columns
const columns = layoutHorizontal(world, area, [
  ratio(1, 4),
  ratio(1, 4),
  ratio(1, 4),
  ratio(1, 4),
]);
```

### Dashboard Grid

```typescript
import { layoutHorizontal, layoutVertical, percentage } from 'blecsd';

const screen = { x: 0, y: 0, width: 120, height: 40 };

// 2x2 grid of equal panels
const rows = layoutVertical(world, screen, [
  percentage(50),
  percentage(50),
]);

const topColumns = layoutHorizontal(world, rows[0]!, [
  percentage(50),
  percentage(50),
]);

const bottomColumns = layoutHorizontal(world, rows[1]!, [
  percentage(50),
  percentage(50),
]);

// Now you have 4 equal panels:
// topColumns[0], topColumns[1], bottomColumns[0], bottomColumns[1]
```

### Mixed Constraints

```typescript
import { layoutVertical, fixed, min, max, percentage } from 'blecsd';

const area = { x: 0, y: 0, width: 80, height: 50 };

const sections = layoutVertical(world, area, [
  fixed(5),        // Fixed header
  min(10),         // Navigation: at least 10 lines
  max(20),         // Content preview: at most 20 lines
  percentage(100), // Main content: remaining space
  fixed(2),        // Fixed footer
]);
```

## Constraint Resolution

The layout system resolves constraints in this order:

1. **Fixed constraints** are calculated first and always get their requested size (up to available space)
2. **Percentage, ratio, min, max constraints** are calculated based on total available space
3. **Remaining space** is distributed among flexible constraints (min/max)
4. **Per-item distribution** gives each flexible constraint an equal share
5. **Max constraints** are capped at their maximum value

This ensures predictable, intuitive layouts that adapt to available space.
