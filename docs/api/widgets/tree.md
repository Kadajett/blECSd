# Tree Widget

The Tree widget provides a hierarchical tree view with expandable nodes, keyboard navigation, and selection support. It's ideal for file browsers, navigation menus, and any hierarchical data display.

## Import

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createTree, isTreeWidget } from 'blecsd/widgets';
```

## Basic Usage

```typescript
const world = createWorld();
const eid = addEntity(world);

const tree = createTree(world, eid, {
  x: 5,
  y: 2,
  width: 40,
  height: 15,
  nodes: [
    {
      label: 'Documents',
      expanded: true,
      children: [
        { label: 'Report.pdf', value: '/docs/report.pdf' },
        { label: 'Notes.txt', value: '/docs/notes.txt' },
        {
          label: 'Projects',
          children: [
            { label: 'App', value: '/docs/projects/app' },
            { label: 'Website', value: '/docs/projects/website' },
          ],
        },
      ],
    },
    {
      label: 'Downloads',
      children: [
        { label: 'image.png', value: '/downloads/image.png' },
      ],
    },
  ],
});

// Focus and navigate
tree.focus();
tree.selectNext();
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `width` | `number` | `40` | Widget width |
| `height` | `number` | `10` | Visible row count |
| `nodes` | `TreeNode[]` | `[]` | Root nodes |
| `selected` | `string` | - | Initially selected path (e.g., "0.1.0") |
| `style` | `TreeStyleConfig` | - | Style configuration |
| `showLines` | `boolean` | `true` | Show connection lines |
| `keys` | `boolean` | `true` | Enable keyboard navigation |
| `indent` | `number` | `2` | Indentation per level (1-8) |

### TreeNode Interface

```typescript
interface TreeNode {
  label: string;           // Display text
  value?: unknown;         // Associated data
  children?: TreeNode[];   // Child nodes
  expanded?: boolean;      // Initial expanded state
  icon?: string;           // Icon before label
  id?: string;             // Unique identifier (auto-generated if omitted)
}
```

### TreeStyleConfig Interface

```typescript
interface TreeStyleConfig {
  node?: { fg?: number; bg?: number };      // Regular node style
  selected?: { fg?: number; bg?: number };  // Selected node style
  expanded?: { fg?: number };               // Expanded indicator color
  collapsed?: { fg?: number };              // Collapsed indicator color
}
```

## Keyboard Bindings

When focused and `keys: true`:

| Key | Action |
|-----|--------|
| `Up` / `k` | Select previous visible node |
| `Down` / `j` | Select next visible node |
| `Left` / `h` | Collapse node or select parent |
| `Right` / `l` | Expand node |
| `Enter` / `Space` | Toggle expand or activate leaf node |
| `Escape` | Blur tree |
| `g` | Jump to first node |
| `G` | Jump to last node |

## Methods

### Visibility

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});
tree.show();   // Show the tree
tree.hide();   // Hide the tree
```

### Position

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});
const dx = 5; const dy = 3; const x = 10; const y = 5;
tree.move(dx, dy);         // Move by offset
tree.setPosition(x, y);    // Set absolute position
```

### Focus

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});
tree.focus();  // Focus the tree (enables keyboard input)
tree.blur();   // Remove focus
```

### Nodes

```typescript
const world = createWorld();
const eid = addEntity(world);
const nodes = [{ label: 'Root', children: [{ label: 'Child' }] }];
const tree = createTree(world, eid, { nodes });
tree.setNodes(nodes);       // Replace all nodes
tree.getNodes();            // Get root nodes
tree.getNode('0.0');        // Get node by path
tree.getVisibleNodes();     // Get all visible (flattened) nodes
```

### Selection

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, { nodes: [{ label: 'A', children: [{ label: 'B', children: [{ label: 'C' }] }] }] });
tree.select('0.0.0');       // Select by path
tree.getSelectedPath();     // Get selected path string
tree.getSelectedNode();     // Get selected node object
tree.selectPrev();          // Select previous visible node
tree.selectNext();          // Select next visible node
tree.selectFirst();         // Select first visible node
tree.selectLast();          // Select last visible node
tree.selectParent();        // Select parent of current node
```

### Expand/Collapse

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, { nodes: [{ label: 'Root', children: [{ label: 'Child' }] }] });
tree.expand('0');           // Expand node at path
tree.collapse('0');         // Collapse node at path
tree.toggle('0');           // Toggle expansion
tree.expandAll();           // Expand all nodes
tree.collapseAll();         // Collapse all nodes
tree.isExpanded('0');       // Check if expanded
```

### State

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});
tree.getState();            // Returns 'idle' or 'focused'
```

### Display

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});
const style = {};
tree.setStyle(style);       // Update style configuration
tree.setShowLines(true);    // Toggle connection lines
tree.getShowLines();        // Check if lines shown
```

### Scrolling

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});
tree.getFirstVisible();     // First visible index
tree.setFirstVisible(5);    // Scroll to index
tree.getVisibleCount();     // Number of visible rows
```

### Rendering

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});
const lines = tree.renderLines(40);  // Get text lines for rendering
void lines;
```

### Events

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});

// Selection changed
const unsubSelect = tree.onSelect((path, node) => {
  console.log(`Selected: ${node.label} at ${path}`);
});

// Node activated (Enter pressed on leaf)
const unsubActivate = tree.onActivate((path, node) => {
  console.log(`Activated: ${node.label}`);
  void node.value;
});

// Node expanded/collapsed
const unsubToggle = tree.onToggle((path, expanded) => {
  console.log(`${path} is now ${expanded ? 'expanded' : 'collapsed'}`);
});

// Cleanup
unsubSelect();
unsubActivate();
unsubToggle();
```

### Key Handling

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});
// In your input loop
const action = tree.handleKey('down');
if (action) {
  console.log(`Action: ${action.type}`);
}
```

### Lifecycle

```typescript
const world = createWorld();
const eid = addEntity(world);
const tree = createTree(world, eid, {});
tree.destroy();  // Remove entity and cleanup
```

## Path Notation

Nodes are addressed using dot-separated indices:

- `"0"` - First root node
- `"1"` - Second root node
- `"0.0"` - First child of first root
- `"0.1.2"` - Third child of second child of first root

## Example: File Browser

```typescript
const world = createWorld();
const treeEntity = addEntity(world);
const tree = createTree(world, treeEntity, {
  x: 1, y: 2,
  width: 38, height: 17,
  nodes: [
    {
      label: 'Documents',
      value: '/docs',
      children: [
        { label: 'report.pdf', value: '/docs/report.pdf' },
        { label: 'notes.txt', value: '/docs/notes.txt' },
      ],
    },
    {
      label: 'Downloads',
      value: '/downloads',
      children: [
        { label: 'image.png', value: '/downloads/image.png' },
      ],
    },
  ],
});

tree.onActivate((path, node) => {
  if (typeof node.value === 'string') {
    console.log(`Open file: ${node.value}`);
  }
});

tree.focus();
```

## Related

- [List Widget](./list.md) - Flat list selection
- [Panel Widget](./panel.md) - Container with title
- [VirtualizedList Widget](./virtualizedList.md) - Large dataset handling
