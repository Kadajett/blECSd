# Layout Widget

The Layout widget is an auto-layout container that arranges children using different layout modes: inline (flow), grid, or flex.

## Overview

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLayout, createBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Create a flex layout with centered children
const layout = createLayout(world, eid, {
  left: 0,
  top: 0,
  width: 80,
  height: 24,
  layout: 'flex',
  direction: 'row',
  gap: 2,
  justify: 'center',
  align: 'center',
});

// Add children
const child1 = createBox(world, addEntity(world), { width: 10, height: 5 });
const child2 = createBox(world, addEntity(world), { width: 10, height: 5 });
layout.append(child1.eid).append(child2.eid);

// Apply layout
layout.recalculate();
```

---

## Factory Function

### createLayout

Creates a new Layout widget with the specified configuration.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLayout } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Basic inline layout (default)
const layout = createLayout(world, eid);

// Grid layout with 3 columns
const gridLayout = createLayout(world, addEntity(world), {
  layout: 'grid',
  cols: 3,
  gap: 1,
  width: 60,
  height: 24,
});

// Flex layout with centered content
const flexLayout = createLayout(world, addEntity(world), {
  layout: 'flex',
  direction: 'row',
  justify: 'center',
  align: 'center',
  width: 80,
  height: 24,
});
```

**Parameters:**
- `world` - The ECS world
- `entity` - The entity ID to wrap
- `config` - Optional configuration object (see LayoutConfig)

**Returns:** `LayoutWidget` interface

---

## Layout Modes

### Inline (Flow)

Children flow left-to-right, wrapping to the next line when they exceed the container width.

```typescript
const layout = createLayout(world, eid, {
  layout: 'inline',
  width: 80,
  gap: 1,
  wrap: true,  // Enable wrapping (default)
});
```

### Grid

Children are placed in a fixed-column grid.

```typescript
const layout = createLayout(world, eid, {
  layout: 'grid',
  cols: 3,     // Number of columns
  gap: 2,      // Gap between cells
  width: 60,
});
```

### Flex

Children are arranged in a row or column with flexible alignment options.

```typescript
const layout = createLayout(world, eid, {
  layout: 'flex',
  direction: 'row',       // 'row' or 'column'
  justify: 'space-between', // Main axis alignment
  align: 'center',        // Cross axis alignment
  gap: 2,
  width: 80,
});
```

---

## LayoutWidget Interface

The layout widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const layout = createLayout(world, eid);
console.log(layout.eid); // Entity ID number
```

### Visibility Methods

#### show

Shows the layout.

```typescript
layout.show();
```

**Returns:** `LayoutWidget` for chaining

#### hide

Hides the layout.

```typescript
layout.hide();
```

**Returns:** `LayoutWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
layout.setPosition(20, 15);
```

**Returns:** `LayoutWidget` for chaining

#### move

Moves the layout by a relative amount.

```typescript
layout.move(5, -3);
```

**Returns:** `LayoutWidget` for chaining

---

### Layout-Specific Methods

#### getLayoutMode

Gets the current layout mode.

```typescript
const mode = layout.getLayoutMode(); // 'inline' | 'grid' | 'flex'
```

**Returns:** `LayoutMode`

#### setGap

Sets the gap between children.

```typescript
layout.setGap(2);
```

**Returns:** `LayoutWidget` for chaining

#### getGap

Gets the current gap between children.

```typescript
const gap = layout.getGap(); // number
```

**Returns:** `number`

#### recalculate

Recalculates and applies layout positions to all children.

```typescript
layout.recalculate();
```

**Returns:** `LayoutWidget` for chaining

---

### Focus Methods

#### focus

Focuses the layout.

```typescript
layout.focus();
```

**Returns:** `LayoutWidget` for chaining

#### blur

Removes focus from the layout.

```typescript
layout.blur();
```

**Returns:** `LayoutWidget` for chaining

#### isFocused

Checks if the layout is currently focused.

```typescript
const focused = layout.isFocused(); // boolean
```

**Returns:** `boolean`

---

### Children Methods

#### append

Appends a child entity.

```typescript
const childEid = addEntity(world);
layout.append(childEid);
```

**Returns:** `LayoutWidget` for chaining

#### getChildren

Gets all direct children.

```typescript
const children = layout.getChildren();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
layout.destroy();
```

---

## Standalone Layout Functions

These functions can be used independently of the widget for custom layout calculations.

### calculateInlineLayout

Calculates inline (flow) layout positions.

<!-- blecsd-doccheck:ignore -->
```typescript
import { calculateInlineLayout, type ChildLayoutData } from 'blecsd';

const children: ChildLayoutData[] = [
  { eid: 1, width: 10, height: 5 },
  { eid: 2, width: 10, height: 5 },
  { eid: 3, width: 10, height: 5 },
];

const positions = calculateInlineLayout(
  children,
  80,    // container width
  1,     // gap
  true   // wrap
);

// positions is Map<Entity, { x: number, y: number }>
```

**Parameters:**
- `children` - Array of child layout data
- `containerWidth` - Container width for wrapping
- `gap` - Gap between children
- `wrap` - Whether to wrap children

**Returns:** `Map<Entity, LayoutPosition>`

### calculateGridLayout

Calculates grid layout positions.

<!-- blecsd-doccheck:ignore -->
```typescript
import { calculateGridLayout, type ChildLayoutData } from 'blecsd';

const children: ChildLayoutData[] = [
  { eid: 1, width: 10, height: 5 },
  { eid: 2, width: 10, height: 5 },
  { eid: 3, width: 10, height: 5 },
  { eid: 4, width: 10, height: 5 },
];

const positions = calculateGridLayout(
  children,
  2,  // columns
  1   // gap
);
```

**Parameters:**
- `children` - Array of child layout data
- `cols` - Number of columns
- `gap` - Gap between children

**Returns:** `Map<Entity, LayoutPosition>`

### calculateFlexLayout

Calculates flex layout positions.

<!-- blecsd-doccheck:ignore -->
```typescript
import { calculateFlexLayout, type ChildLayoutData } from 'blecsd';

const children: ChildLayoutData[] = [
  { eid: 1, width: 10, height: 5 },
  { eid: 2, width: 10, height: 5 },
];

const positions = calculateFlexLayout(
  children,
  80,              // container size
  2,               // gap
  'row',           // direction
  'center',        // justify
  'center'         // align
);
```

**Parameters:**
- `children` - Array of child layout data
- `containerSize` - Container size (width for row, height for column)
- `gap` - Gap between children
- `direction` - Flex direction ('row' or 'column')
- `justify` - Justify content alignment
- `align` - Align items alignment

**Returns:** `Map<Entity, LayoutPosition>`

---

## Helper Functions

### isLayout

Checks if an entity is a layout widget.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isLayout } from 'blecsd';

if (isLayout(world, entity)) {
  // Handle layout-specific logic
}
```

**Returns:** `boolean`

---

### getLayoutMode

Gets the layout mode of a layout entity.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getLayoutMode } from 'blecsd';

const mode = getLayoutMode(world, layoutEntity);
// 'inline', 'grid', or 'flex'
```

**Returns:** `LayoutMode`

---

## Types

### LayoutConfig

Configuration for creating a layout widget.

```typescript
interface LayoutConfig {
  // Position
  readonly left?: PositionValue;
  readonly top?: PositionValue;
  readonly width?: DimensionValue;
  readonly height?: DimensionValue;

  // Layout mode
  readonly layout?: LayoutMode;      // Default: 'inline'

  // Layout options
  readonly gap?: number;             // Default: 0
  readonly wrap?: boolean;           // Default: true
  readonly justify?: JustifyContent; // Default: 'start'
  readonly align?: AlignItems;       // Default: 'start'

  // Grid-specific
  readonly cols?: number;            // Default: 3

  // Flex-specific
  readonly direction?: FlexDirection; // Default: 'row'

  // Style
  readonly fg?: string | number;
  readonly bg?: string | number;
}
```

### LayoutMode

Layout mode type.

```typescript
type LayoutMode = 'inline' | 'grid' | 'flex';
```

### JustifyContent

Justify content alignment options.

```typescript
type JustifyContent = 'start' | 'center' | 'end' | 'space-between';
```

### AlignItems

Align items alignment options.

```typescript
type AlignItems = 'start' | 'center' | 'end';
```

### FlexDirection

Flex direction options.

```typescript
type FlexDirection = 'row' | 'column';
```

### ChildLayoutData

Child layout data for calculations.

```typescript
interface ChildLayoutData {
  readonly eid: Entity;
  readonly width: number;
  readonly height: number;
}
```

### LayoutPosition

Layout position result.

```typescript
interface LayoutPosition {
  readonly x: number;
  readonly y: number;
}
```

### LayoutWidget

The layout widget interface.

```typescript
interface LayoutWidget {
  readonly eid: Entity;

  // Visibility
  show(): LayoutWidget;
  hide(): LayoutWidget;

  // Position
  move(dx: number, dy: number): LayoutWidget;
  setPosition(x: number, y: number): LayoutWidget;

  // Layout-specific
  getLayoutMode(): LayoutMode;
  setGap(gap: number): LayoutWidget;
  getGap(): number;
  recalculate(): LayoutWidget;

  // Focus
  focus(): LayoutWidget;
  blur(): LayoutWidget;
  isFocused(): boolean;

  // Children
  append(child: Entity): LayoutWidget;
  getChildren(): Entity[];

  // Lifecycle
  destroy(): void;
}
```

---

## Zod Schemas

<!-- blecsd-doccheck:ignore -->
```typescript
import { LayoutConfigSchema } from 'blecsd';

// Validate configuration
const result = LayoutConfigSchema.safeParse({
  layout: 'flex',
  direction: 'row',
  justify: 'center',
  gap: 2,
});

if (result.success) {
  // Configuration is valid
}
```

---

## Examples

### Dashboard Layout

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLayout, createBox } from 'blecsd';

const world = createWorld();

// Create a 3-column grid layout
const dashboard = createLayout(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 120,
  height: 40,
  layout: 'grid',
  cols: 3,
  gap: 2,
});

// Add dashboard panels
for (let i = 0; i < 6; i++) {
  const panel = createBox(world, addEntity(world), {
    width: 38,
    height: 18,
    border: 'single',
  });
  dashboard.append(panel.eid);
}

dashboard.recalculate();
```

### Toolbar Layout

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLayout, createBox } from 'blecsd';

const world = createWorld();

// Create a horizontal toolbar with spaced buttons
const toolbar = createLayout(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 80,
  height: 3,
  layout: 'flex',
  direction: 'row',
  justify: 'space-between',
  align: 'center',
});

// Add toolbar buttons
const buttonWidths = [10, 10, 10, 15, 10];
for (const width of buttonWidths) {
  const button = createBox(world, addEntity(world), {
    width,
    height: 1,
  });
  toolbar.append(button.eid);
}

toolbar.recalculate();
```

### Centered Content

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLayout, createBox } from 'blecsd';

const world = createWorld();

// Center content in the middle of the screen
const container = createLayout(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 80,
  height: 24,
  layout: 'flex',
  direction: 'column',
  justify: 'center',
  align: 'center',
  gap: 1,
});

// Add centered content
const title = createBox(world, addEntity(world), { width: 40, height: 3 });
const form = createBox(world, addEntity(world), { width: 40, height: 10 });
const buttons = createBox(world, addEntity(world), { width: 40, height: 3 });

container.append(title.eid).append(form.eid).append(buttons.eid);
container.recalculate();
```

### Method Chaining

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createLayout, createBox } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const layout = createLayout(world, eid, {
  left: 0,
  top: 0,
  width: 80,
  height: 24,
})
  .setPosition(10, 5)
  .setGap(2)
  .show();

// Add children and recalculate
const child = createBox(world, addEntity(world), { width: 10, height: 5 });
layout.append(child.eid).recalculate();
```

---

## See Also

- [Box Widget](./box.md) - Container with borders
- [Line Widget](./line.md) - Visual separator
- [Position Component](../components/position.md) - Entity positioning
- [Dimensions Component](../components/dimensions.md) - Widget sizing
