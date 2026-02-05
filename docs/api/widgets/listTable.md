# ListTable Widget

The ListTable widget combines table rendering with list selection, providing a selectable data grid with fixed headers and row-based navigation. It's ideal for data browsers, log viewers with columns, and any tabular data that needs row selection.

## Import

```typescript
import { createListTable, isListTableWidget } from 'blecsd';
```

## Basic Usage

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createListTable } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const table = createListTable(world, eid, {
  x: 5,
  y: 5,
  width: 60,
  height: 15,
  data: [
    ['Name', 'Age', 'City'],        // Header row
    ['Alice', '30', 'New York'],
    ['Bob', '25', 'Los Angeles'],
    ['Carol', '35', 'Chicago'],
    ['David', '28', 'Houston'],
  ],
  headerRows: 1,
});

table.focus();
table.onActivate((index, item) => {
  console.log(`Selected row ${index}: ${item.value}`);
});
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `width` | `number` | - | Table width |
| `height` | `number` | `10` | Visible rows including header |
| `data` | `string[][]` | `[]` | Table data (first rows are headers) |
| `pad` | `number` | `1` | Cell padding |
| `align` | `CellAlign` | `'left'` | Default cell alignment |
| `style` | `ListTableStyleConfig` | - | Style configuration |
| `cellBorders` | `boolean` | `true` | Show cell borders |
| `headerRows` | `number` | `1` | Number of header rows |
| `columns` | `TableColumn[]` | - | Column configuration |
| `selected` | `number` | `0` | Initially selected data row |
| `interactive` | `boolean` | `true` | Enable interaction |
| `mouse` | `boolean` | `true` | Enable mouse input |
| `keys` | `boolean` | `true` | Enable keyboard input |
| `search` | `boolean` | `false` | Enable search mode |

### ListTableStyleConfig Interface

```typescript
interface ListTableStyleConfig {
  border?: { fg?: number; bg?: number };    // Border style
  header?: { fg?: number; bg?: number };    // Header style
  cell?: { fg?: number; bg?: number };      // Cell style
  selected?: { fg?: number; bg?: number };  // Selected row style
  altRowBg?: number;                         // Alternate row background
}
```

### CellAlign Type

```typescript
type CellAlign = 'left' | 'center' | 'right';
```

## Keyboard Bindings

When focused and `keys: true`:

| Key | Action |
|-----|--------|
| `Up` / `k` | Select previous row |
| `Down` / `j` | Select next row |
| `Enter` / `Space` | Activate selected row |
| `Escape` | Cancel / blur |
| `/` | Enter search mode (if enabled) |
| `g` | Jump to first row |
| `G` | Jump to last row |
| `PageUp` | Scroll up one page |
| `PageDown` | Scroll down one page |

## Methods

### Visibility

```typescript
table.show();   // Show the table
table.hide();   // Hide the table
```

### Position

```typescript
table.move(dx, dy);        // Move by offset
table.setPosition(x, y);   // Set absolute position
```

### Focus

```typescript
table.focus();  // Focus the table
table.blur();   // Remove focus
```

### Data

```typescript
table.setData(data);       // Replace all data
table.getData();           // Get data as string[][]
table.getFullData();       // Get data with cell metadata
table.clearData();         // Clear all data
```

### Cells

```typescript
table.setCell(row, col, value);     // Set cell value
table.getCell(row, col);            // Get cell object
table.getCellValue(row, col);       // Get cell string value
```

### Rows

```typescript
table.getRow(index);        // Get row at index
table.getRowCount();        // Total rows including headers
table.getDataRowCount();    // Data rows excluding headers
```

### Columns

```typescript
table.setColumns(columns);  // Set column configuration
table.getColumns();         // Get column configuration
table.getColCount();        // Get column count
```

### Headers

```typescript
table.setHeaderRowCount(2);  // Set number of header rows
table.getHeaderRowCount();   // Get header row count
table.getHeaderRows();       // Get header rows
table.getDataRows();         // Get data rows (excluding headers)
```

### Display

```typescript
table.setCellPadding(2);     // Set cell padding
table.getCellPadding();      // Get cell padding
table.setCellBorders(true);  // Toggle cell borders
table.hasCellBorders();      // Check if borders shown
table.setStyle(style);       // Update style
table.getDisplay();          // Get display configuration
```

### Selection

```typescript
table.select(2);            // Select data row at index
table.getSelectedIndex();   // Get selected index
table.getSelectedRow();     // Get selected row data
table.selectPrev();         // Select previous row
table.selectNext();         // Select next row
table.selectFirst();        // Select first data row
table.selectLast();         // Select last data row
table.activate();           // Trigger activation
```

### Scrolling

```typescript
table.pageUp();    // Scroll up one page
table.pageDown();  // Scroll down one page
```

### Search

```typescript
table.startSearch();       // Enter search mode
table.endSearch();         // Exit search mode
table.getSearchQuery();    // Get current query
table.isSearching();       // Check if searching
```

### State

```typescript
table.getState();          // Get current state
```

### Events

```typescript
// Row selection changed
const unsubSelect = table.onSelect((index, item) => {
  console.log(`Selected row ${index}`);
});

// Row activated (Enter pressed)
const unsubActivate = table.onActivate((index, item) => {
  const rowData = item.value.split('\t');
  console.log(`Activated: ${rowData[0]}`);
});

// Search query changed
const unsubSearch = table.onSearchChange((query) => {
  console.log(`Searching: ${query}`);
});

// Cleanup
unsubSelect();
unsubActivate();
unsubSearch();
```

### Key Handling

```typescript
// In your input loop
const action = table.handleKey('down');
if (action) {
  console.log(`Action: ${action.type}`);
}
```

### Lifecycle

```typescript
table.destroy();  // Remove entity and cleanup
```

## Example: Process List

```typescript
import { createWorld, addEntity } from 'blecsd';
import { createListTable, createPanel } from 'blecsd';

const world = createWorld();

const panel = createPanel(world, {
  x: 0, y: 0,
  width: 80, height: 20,
  title: 'Process List',
});

const processTable = createListTable(world, addEntity(world), {
  x: 1, y: 2,
  width: 78, height: 17,
  data: [
    ['PID', 'Name', 'CPU', 'Memory'],
    ['1234', 'node', '12%', '256MB'],
    ['5678', 'chrome', '8%', '1.2GB'],
    ['9012', 'vscode', '5%', '800MB'],
    ['3456', 'terminal', '1%', '50MB'],
  ],
  headerRows: 1,
  columns: [
    { header: 'PID', width: 8, align: 'right' },
    { header: 'Name', width: 20 },
    { header: 'CPU', width: 8, align: 'right' },
    { header: 'Memory', width: 10, align: 'right' },
  ],
  style: {
    header: { fg: 0xffffffff, bg: 0x444444ff },
    selected: { fg: 0x000000ff, bg: 0x00ff00ff },
    altRowBg: 0x222222ff,
  },
});

processTable.onActivate((index, item) => {
  const [pid] = item.value.split('\t');
  console.log(`Kill process ${pid}?`);
});

processTable.focus();
```

## Example: Log Viewer with Columns

```typescript
const logTable = createListTable(world, addEntity(world), {
  x: 0, y: 0,
  width: 120, height: 30,
  data: [
    ['Time', 'Level', 'Source', 'Message'],
    ['10:23:45', 'INFO', 'app', 'Server started'],
    ['10:23:46', 'DEBUG', 'db', 'Connection established'],
    ['10:23:47', 'WARN', 'auth', 'Invalid token attempt'],
    ['10:23:48', 'ERROR', 'api', 'Request timeout'],
  ],
  headerRows: 1,
  search: true,
  style: {
    header: { fg: 0xffffffff, bg: 0x333333ff },
  },
});

// Filter by typing /
logTable.onSearchChange((query) => {
  // Filter logic here
});
```

## Related

- [Table Widget](./table.md) - Non-selectable data table
- [List Widget](./list.md) - Simple selectable list
- [VirtualizedList Widget](./virtualizedList.md) - Large dataset handling
