# Table Widget

The Table widget provides a data grid with headers, cell borders, column configuration, and row management. Commonly used for displaying structured data, database results, and configuration tables.

## Import

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createTable, isTableWidget, TableWidgetConfigSchema } from 'blecsd/widgets';

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

// Render table to inspect its output
const lines = table.renderLines(80);
for (const line of lines) {
  console.log(line);
}
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

```typescript
// Visibility and position
table.show();
table.hide();
table.setPosition(10, 5);
table.move(2, 0);

// Data management
table.setData([
  ['Name', 'Score'],
  ['Alice', '95'],
  ['Bob', '87'],
]);
console.log(table.getData()[0]);              // ['Name', 'Score']
console.log(table.getFullData().length);      // rows with metadata
console.log(table.getCellValue(0, 0));        // 'Name'
console.log(table.getRow(0));                 // cells in row 0
console.log(table.getRowCount());             // total row count

// Row operations
table.appendRow(['Charlie', '92']);
table.insertRow(1, ['Dave', '88']);
table.removeRow(2);

// Column configuration
table.setColumns([
  { header: 'Name', minWidth: 10, align: 'left' },
  { header: 'Score', width: 8, align: 'right' },
]);
console.log(table.getColumns().length);           // 2
console.log(table.getColCount());                 // 2
console.log(table.calculateColumnWidths(80));     // array of widths

// Header rows
table.setHeaderRowCount(1);
console.log(table.getHeaderRowCount());       // 1
console.log(table.getHeaderRows().length);    // 1
console.log(table.getDataRows().length);      // data rows only

// Display options
table.setCellPadding(2);
console.log(table.getCellPadding());          // 2
table.setCellBorders(true);
console.log(table.hasCellBorders());          // true
table.setStyle({ header: { fg: 0xffffffff, bg: 0x333333ff } });
console.log(typeof table.getDisplay());       // 'object'

// Render as text for inspection
const rendered = table.renderLines(80);
console.log(rendered.length > 0);             // true
```

## Examples

### Styled Data Table

```typescript
const styledTable = createTable(world, addEntity(world), {
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
styledTable.destroy();
```

### Borderless Table

```typescript
const borderlessTable = createTable(world, addEntity(world), {
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
borderlessTable.destroy();
```

### Right-Aligned Columns

```typescript
const alignedTable = createTable(world, addEntity(world), {
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
alignedTable.destroy();
```

## Type Guard

```typescript
const tableEid = addEntity(world);
const tableWidget = createTable(world, tableEid, { data: [['Name'], ['Alice']], headerRows: 1 });
if (isTableWidget(world, tableEid)) {
  console.log('Entity', tableEid, 'is a table widget');
}
tableWidget.destroy();
```

## Lifecycle

```typescript
// Clean up when done
table.destroy();
```

Destroying a table removes the entity and detaches all table behavior.

## Validation

Configuration is validated using Zod:

```typescript
const result = TableWidgetConfigSchema.safeParse({ data: [['Name'], ['Alice']], headerRows: 1 });
if (!result.success) {
  console.error(result.error);
}
```
