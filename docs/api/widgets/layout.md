# Layout Widget

The Layout widget is an auto-layout container that arranges children using different layout modes: inline (flow), grid, or flex.

## Overview

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  createLayout,
  createBox,
  isLayout,
  getLayoutMode,
  calculateInlineLayout,
  calculateGridLayout,
  calculateFlexLayout,
  LayoutConfigSchema,
} from 'blecsd/widgets';

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

```typescript
// Basic inline layout (default)
const layoutA = createLayout(world, addEntity(world), {});

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
console.log(layoutA.eid);
console.log(gridLayout.eid);
console.log(flexLayout.eid);
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
const inlineLayout = createLayout(world, addEntity(world), {
  layout: 'inline',
  width: 80,
  gap: 1,
  wrap: true,  // Enable wrapping (default)
});
console.log(inlineLayout.eid);
```

### Grid

Children are placed in a fixed-column grid.

```typescript
const gridLayout2 = createLayout(world, addEntity(world), {
  layout: 'grid',
  cols: 3,     // Number of columns
  gap: 2,      // Gap between cells
  width: 60,
});
console.log(gridLayout2.eid);
```

### Flex

Children are arranged in a row or column with flexible alignment options.

```typescript
const flexLayout2 = createLayout(world, addEntity(world), {
  layout: 'flex',
  direction: 'row',          // 'row' or 'column'
  justify: 'space-between',  // Main axis alignment
  align: 'center',           // Cross axis alignment
  gap: 2,
  width: 80,
});
console.log(flexLayout2.eid);
```

---

## LayoutWidget Interface

The layout widget provides a chainable API for all operations.

### Properties

#### eid

The underlying entity ID.

```typescript
const layoutB = createLayout(world, addEntity(world), {});
console.log(layoutB.eid); // Entity ID number
layoutB.destroy();
```

### Visibility Methods

#### show

Shows the layout.

```typescript
const layoutC = createLayout(world, addEntity(world), {});
layoutC.show();
layoutC.destroy();
```

**Returns:** `LayoutWidget` for chaining

#### hide

Hides the layout.

```typescript
const layoutD = createLayout(world, addEntity(world), {});
layoutD.hide();
layoutD.destroy();
```

**Returns:** `LayoutWidget` for chaining

---

### Position Methods

#### setPosition

Sets the absolute position.

```typescript
const layoutE = createLayout(world, addEntity(world), {});
layoutE.setPosition(20, 15);
layoutE.destroy();
```

**Returns:** `LayoutWidget` for chaining

#### move

Moves the layout by a relative amount.

```typescript
const layoutF = createLayout(world, addEntity(world), {});
layoutF.move(5, -3);
layoutF.destroy();
```

**Returns:** `LayoutWidget` for chaining

---

### Layout-Specific Methods

#### getLayoutMode

Gets the current layout mode.

```typescript
const layoutG = createLayout(world, addEntity(world), {});
const mode = layoutG.getLayoutMode(); // 'inline' | 'grid' | 'flex'
console.log(mode);
layoutG.destroy();
```

**Returns:** `LayoutMode`

#### setGap

Sets the gap between children.

```typescript
const layoutH = createLayout(world, addEntity(world), {});
layoutH.setGap(2);
layoutH.destroy();
```

**Returns:** `LayoutWidget` for chaining

#### getGap

Gets the current gap between children.

```typescript
const layoutI = createLayout(world, addEntity(world), {});
const gap = layoutI.getGap(); // number
console.log(gap);
layoutI.destroy();
```

**Returns:** `number`

#### recalculate

Recalculates and applies layout positions to all children.

```typescript
const layoutJ = createLayout(world, addEntity(world), {});
layoutJ.recalculate();
layoutJ.destroy();
```

**Returns:** `LayoutWidget` for chaining

---

### Focus Methods

#### focus

Focuses the layout.

```typescript
const layoutK = createLayout(world, addEntity(world), {});
layoutK.focus();
layoutK.destroy();
```

**Returns:** `LayoutWidget` for chaining

#### blur

Removes focus from the layout.

```typescript
const layoutL = createLayout(world, addEntity(world), {});
layoutL.blur();
layoutL.destroy();
```

**Returns:** `LayoutWidget` for chaining

#### isFocused

Checks if the layout is currently focused.

```typescript
const layoutM = createLayout(world, addEntity(world), {});
const focused = layoutM.isFocused(); // boolean
console.log(focused);
layoutM.destroy();
```

**Returns:** `boolean`

---

### Children Methods

#### append

Appends a child entity.

```typescript
const layoutN = createLayout(world, addEntity(world), {});
const childEid = addEntity(world);
layoutN.append(childEid);
layoutN.destroy();
```

**Returns:** `LayoutWidget` for chaining

#### getChildren

Gets all direct children.

```typescript
const layoutO = createLayout(world, addEntity(world), {});
const children = layoutO.getChildren();
console.log(children.length);
layoutO.destroy();
```

**Returns:** `Entity[]`

---

### Lifecycle Methods

#### destroy

Destroys the widget.

```typescript
const layoutP = createLayout(world, addEntity(world), {});
layoutP.destroy();
```

---

## Standalone Layout Functions

These functions can be used independently of the widget for custom layout calculations.

### calculateInlineLayout

Calculates inline (flow) layout positions.

```typescript
const childrenA: ChildLayoutData[] = [
  { eid: 1, width: 10, height: 5 },
  { eid: 2, width: 10, height: 5 },
  { eid: 3, width: 10, height: 5 },
];

const positions = calculateInlineLayout(
  childrenA,
  80,    // container width
  1,     // gap
  true   // wrap
);

// positions is Map<Entity, { x: number, y: number }>
console.log(positions.size);
```

**Parameters:**
- `children` - Array of child layout data
- `containerWidth` - Container width for wrapping
- `gap` - Gap between children
- `wrap` - Whether to wrap children

**Returns:** `Map<Entity, LayoutPosition>`

### calculateGridLayout

Calculates grid layout positions.

```typescript
const childrenB: ChildLayoutData[] = [
  { eid: 1, width: 10, height: 5 },
  { eid: 2, width: 10, height: 5 },
  { eid: 3, width: 10, height: 5 },
  { eid: 4, width: 10, height: 5 },
];

const gridPositions = calculateGridLayout(
  childrenB,
  2,  // columns
  1   // gap
);
console.log(gridPositions.size);
```

**Parameters:**
- `children` - Array of child layout data
- `cols` - Number of columns
- `gap` - Gap between children

**Returns:** `Map<Entity, LayoutPosition>`

### calculateFlexLayout

Calculates flex layout positions.

```typescript
const childrenC: ChildLayoutData[] = [
  { eid: 1, width: 10, height: 5 },
  { eid: 2, width: 10, height: 5 },
];

const flexPositions = calculateFlexLayout(
  childrenC,
  80,              // container size
  2,               // gap
  'row',           // direction
  'center',        // justify
  'center'         // align
);
console.log(flexPositions.size);
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

```typescript
const layoutQ = createLayout(world, addEntity(world), {});
if (isLayout(world, layoutQ.eid)) {
  // Handle layout-specific logic
}
layoutQ.destroy();
```

**Returns:** `boolean`

---

### getLayoutMode

Gets the layout mode of a layout entity.

```typescript
const layoutR = createLayout(world, addEntity(world), { layout: 'grid' });
const layoutModeVal = getLayoutMode(world, layoutR.eid);
console.log(layoutModeVal); // 'inline', 'grid', or 'flex'
layoutR.destroy();
```

**Returns:** `LayoutMode`

---

## Types

### LayoutConfig

Configuration for creating a layout widget.

```typescript
interface LayoutConfig {
  // Position
  readonly left?: number;
  readonly top?: number;
  readonly width?: number;
  readonly height?: number;

  // Layout mode
  readonly layout?: 'inline' | 'grid' | 'flex';  // Default: 'inline'

  // Layout options
  readonly gap?: number;              // Default: 0
  readonly wrap?: boolean;            // Default: true
  readonly justify?: 'start' | 'center' | 'end' | 'space-between';  // Default: 'start'
  readonly align?: 'start' | 'center' | 'end';  // Default: 'start'

  // Grid-specific
  readonly cols?: number;             // Default: 3

  // Flex-specific
  readonly direction?: 'row' | 'column';  // Default: 'row'

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
  readonly eid: number;
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
  readonly eid: number;

  // Visibility
  show(): LayoutWidget;
  hide(): LayoutWidget;

  // Position
  move(dx: number, dy: number): LayoutWidget;
  setPosition(x: number, y: number): LayoutWidget;

  // Layout-specific
  getLayoutMode(): 'inline' | 'grid' | 'flex';
  setGap(gap: number): LayoutWidget;
  getGap(): number;
  recalculate(): LayoutWidget;

  // Focus
  focus(): LayoutWidget;
  blur(): LayoutWidget;
  isFocused(): boolean;

  // Children
  append(child: number): LayoutWidget;
  getChildren(): number[];

  // Lifecycle
  destroy(): void;
}
```

---

## Zod Schemas

```typescript
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

```typescript
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
  const boxPanel = createBox(world, addEntity(world), {
    width: 38,
    height: 18,
  });
  dashboard.append(boxPanel.eid);
}

dashboard.recalculate();
```

### Toolbar Layout

```typescript
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

```typescript
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
const titleBox = createBox(world, addEntity(world), { width: 40, height: 3 });
const formBox = createBox(world, addEntity(world), { width: 40, height: 10 });
const buttonsBox = createBox(world, addEntity(world), { width: 40, height: 3 });

container.append(titleBox.eid).append(formBox.eid).append(buttonsBox.eid);
container.recalculate();
```

### Method Chaining

```typescript
const chainedLayout = createLayout(world, addEntity(world), {
  left: 0,
  top: 0,
  width: 80,
  height: 24,
})
  .setPosition(10, 5)
  .setGap(2)
  .show();

// Add children and recalculate
const childBox = createBox(world, addEntity(world), { width: 10, height: 5 });
chainedLayout.append(childBox.eid).recalculate();
```

---

## See Also

- [Box Widget](./box.md) - Container with borders
- [Line Widget](./line.md) - Visual separator
- [Position Component](../position.md) - Entity positioning
- [Dimensions Component](../dimensions.md) - Widget sizing
