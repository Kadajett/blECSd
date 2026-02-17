# ListTable Widget

The ListTable widget combines table rendering with list selection, providing a selectable data grid with fixed headers and row-based navigation. It's ideal for data browsers, log viewers with columns, and any tabular data that needs row selection.

## Import

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createListTable, isListTableWidget, createPanel } from 'blecsd/widgets';

const world = createWorld();
const eid = addEntity(world);

const table = createListTable(world, eid, {
  x: 5,
  y: 5,
  width: 60,
  height: 15,
  data: [
    ['Name', 'Age', 'City'],
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
table.move(2, 0);          // Move by offset
table.setPosition(10, 5);  // Set absolute position
```

### Focus

```typescript
table.focus();  // Focus the table
table.blur();   // Remove focus
```

### Data

```typescript
table.setData([['Name', 'Score'], ['Alice', '95'], ['Bob', '87']]);
const tData = table.getData();
void tData;
const tFullData = table.getFullData();
void tFullData;
table.clearData();
```

### Cells

```typescript
table.setCell(0, 0, 'Name');
const tCell = table.getCell(0, 0);
void tCell;
const tCellValue = table.getCellValue(0, 0);
void tCellValue;
```

### Rows

```typescript
const tRow = table.getRow(0);
void tRow;
const tRowCount = table.getRowCount();
void tRowCount;
const tDataRowCount = table.getDataRowCount();
void tDataRowCount;
```

### Columns

```typescript
table.setColumns([{ header: 'Name' }, { header: 'Score' }]);
const tColumns = table.getColumns();
void tColumns;
const tColCount = table.getColCount();
void tColCount;
```

### Headers

```typescript
table.setHeaderRowCount(1);
const tHeaderCount = table.getHeaderRowCount();
void tHeaderCount;
const tHeaderRows = table.getHeaderRows();
void tHeaderRows;
const tDataRows = table.getDataRows();
void tDataRows;
```

### Display

```typescript
table.setCellPadding(2);
const tPadding = table.getCellPadding();
void tPadding;
table.setCellBorders(true);
const tHasBorders = table.hasCellBorders();
void tHasBorders;
table.setStyle({ header: { fg: 0xffffffff, bg: 0x444444ff } });
const tDisplay = table.getDisplay();
void tDisplay;
```

### Selection

```typescript
table.select(0);
const tSelectedIdx = table.getSelectedIndex();
void tSelectedIdx;
const tSelectedRow = table.getSelectedRow();
void tSelectedRow;
table.selectPrev();
table.selectNext();
table.selectFirst();
table.selectLast();
table.activate();
```

### Scrolling

```typescript
table.pageUp();
table.pageDown();
```

### Search

```typescript
table.startSearch();
table.endSearch();
const tQuery = table.getSearchQuery();
void tQuery;
const tIsSearching = table.isSearching();
void tIsSearching;
```

### State

```typescript
const tState = table.getState();
void tState;
```

### Events

```typescript
// Row selection changed
const unsubSelect = table.onSelect((index, item) => {
  console.log(`Selected row ${index}`);
  void item;
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
const processPanel = createPanel(world, addEntity(world), {
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
void processPanel;
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
  void query;
});
```

## Type Guard

```typescript
if (isListTableWidget(world, eid)) {
  // Entity has list table behavior
}
```

## Related

- [Table Widget](./table.md) - Non-selectable data table
- [List Widget](./list.md) - Simple selectable list
- [VirtualizedList Widget](./virtualizedList.md) - Large dataset handling
