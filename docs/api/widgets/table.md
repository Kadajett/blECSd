# Table Widget

The Table widget provides a data grid with headers, cell borders, column configuration, and row management. Commonly used for displaying structured data, database results, and configuration tables.

## Import

```typescript
import { createTable, isTableWidget } from 'blecsd';
```

## Basic Usage

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import { createTable } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const table = createTable(world, eid, {
  x: 0,
  y: 0,
  data: [
    ['Name', 'Age', 'City'],
    ['Alice', '30', 'New York'],
    ['Bob', '25', 'Los Angeles'],
    ['Charlie', '35', 'Chicago'],
  ],
  headerRows: 1,
});

const lines = table.renderLines(80);
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `width` | `number` | auto | Table width |
| `height` | `number` | auto | Table height |
| `data` | `string[][]` | `[]` | Initial table data |
| `pad` | `number` | `1` | Cell padding (spaces) |
| `align` | `CellAlign` | `'left'` | Default cell alignment |
| `style` | `TableStyleConfig` | - | Style configuration |
| `noCellBorders` | `boolean` | `false` | Hide cell borders |
| `headerRows` | `number` | `1` | Number of header rows |
| `columns` | `TableColumn[]` | auto | Column configurations |

### TableStyleConfig

```typescript
interface TableStyleConfig {
  border?: { fg?: number; bg?: number };
  header?: { fg?: number; bg?: number };
  cell?: { fg?: number; bg?: number };
  altRowBg?: number;
  selected?: { fg?: number; bg?: number };
}
```

### TableColumn

```typescript
interface TableColumn {
  header: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: 'left' | 'center' | 'right';
}
```

### CellAlign

```typescript
type CellAlign = 'left' | 'center' | 'right';
```

## Methods

All methods return the widget for chaining (except getters).

### Visibility

```typescript
table.show();   // Show the table
table.hide();   // Hide the table
```

### Position

```typescript
table.setPosition(10, 5);  // Set absolute position
table.move(2, 0);          // Move relative
```

### Data Management

```typescript
// Set all data at once
table.setData([
  ['Name', 'Score'],
  ['Alice', '95'],
  ['Bob', '87'],
]);

// Get data as string[][]
const data = table.getData();

// Get full data with cell metadata
const fullData = table.getFullData();

// Clear all data
table.clearData();
```

### Cell Operations

```typescript
// Set a cell value (row, col)
table.setCell(1, 0, 'Alice Smith');

// Set a cell with metadata
table.setCell(1, 1, { value: '95', align: 'right' });

// Get a cell
const cell = table.getCell(1, 0);
// { value: 'Alice Smith', ... }

// Get just the string value
const value = table.getCellValue(1, 0);
// 'Alice Smith'
```

### Row Operations

```typescript
// Get a row
const row = table.getRow(1);

// Append a row
table.appendRow(['Charlie', '92']);

// Insert a row at index
table.insertRow(1, ['Dave', '88']);

// Remove a row
table.removeRow(2);

// Count rows
const count = table.getRowCount();
```

### Column Operations

```typescript
// Set column configuration
table.setColumns([
  { header: 'Name', minWidth: 10, align: 'left' },
  { header: 'Score', width: 8, align: 'right' },
]);

// Get columns
const columns = table.getColumns();

// Get column count
const colCount = table.getColCount();

// Calculate optimal column widths
const widths = table.calculateColumnWidths(80);
```

### Headers

```typescript
// Set number of header rows
table.setHeaderRowCount(2);

// Get header row count
const headerCount = table.getHeaderRowCount();

// Get just header rows
const headers = table.getHeaderRows();

// Get data rows (excluding headers)
const dataRows = table.getDataRows();
```

### Display Options

```typescript
// Cell padding
table.setCellPadding(2);
const padding = table.getCellPadding();

// Cell borders
table.setCellBorders(true);
const hasBorders = table.hasCellBorders();

// Style
table.setStyle({
  header: { fg: 0xffffffff, bg: 0x333333ff },
  cell: { fg: 0xccccccff },
  altRowBg: 0x1a1a1aff,
});

// Get current display config
const display = table.getDisplay();
```

### Rendering

```typescript
// Render table as text lines for given width
const lines = table.renderLines(80);
for (const line of lines) {
  console.log(line);
}
```

## Examples

### Styled Data Table

```typescript
const table = createTable(world, eid, {
  data: [
    ['Product', 'Price', 'Stock'],
    ['Widget A', '$9.99', '142'],
    ['Widget B', '$14.99', '85'],
    ['Widget C', '$4.99', '320'],
  ],
  headerRows: 1,
  pad: 2,
  style: {
    header: { fg: 0xffffffff, bg: 0x0066ccff },
    cell: { fg: 0xddddddff },
    altRowBg: 0x222222ff,
    border: { fg: 0x666666ff },
  },
});
```

### Dynamic Table Updates

```typescript
const table = createTable(world, eid, {
  data: [['Time', 'CPU', 'Memory']],
  headerRows: 1,
});

// Add rows periodically
setInterval(() => {
  table.appendRow([
    new Date().toISOString(),
    `${getCpuUsage()}%`,
    `${getMemoryUsage()}MB`,
  ]);
}, 1000);
```

### Borderless Table

```typescript
const table = createTable(world, eid, {
  data: [
    ['Key', 'Value'],
    ['name', 'blecsd'],
    ['version', '1.0.0'],
    ['author', 'blecsd team'],
  ],
  headerRows: 1,
  noCellBorders: true,
  pad: 1,
});
```

### Right-Aligned Columns

```typescript
const table = createTable(world, eid, {
  data: [
    ['Item', 'Qty', 'Total'],
    ['Apples', '5', '$4.95'],
    ['Oranges', '3', '$3.57'],
  ],
  headerRows: 1,
  columns: [
    { header: 'Item', align: 'left', minWidth: 15 },
    { header: 'Qty', align: 'right', width: 6 },
    { header: 'Total', align: 'right', width: 10 },
  ],
});
```

## Type Guard

<!-- blecsd-doccheck:ignore -->
```typescript
import { isTableWidget } from 'blecsd';

if (isTableWidget(world, eid)) {
  // Entity has table behavior attached
}
```

## Lifecycle

```typescript
// Clean up when done
table.destroy();
```

Destroying a table removes the entity and detaches all table behavior.

## Validation

Configuration is validated using Zod:

<!-- blecsd-doccheck:ignore -->
```typescript
import { TableWidgetConfigSchema } from 'blecsd';

const result = TableWidgetConfigSchema.safeParse(config);
if (!result.success) {
  console.error(result.error);
}
```
