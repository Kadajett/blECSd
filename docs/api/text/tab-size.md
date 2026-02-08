# Tab Size API

Control tab character width in text content.

---

## Overview

The tab size API allows you to configure how tab characters (`\t`) are rendered in text content. By default, tabs are expanded to 8 spaces, but you can customize this from 1-16 spaces per tab.

**Key Features:**
- Per-entity tab size configuration
- Tab expansion utility for manual text processing
- Zod validation for tab size values
- Automatic tab expansion in Content component

---

## Tab Size Configuration

### `setTabSize(world, entity, tabSize)`

Sets the tab width for an entity's content.

```typescript
import { setTabSize } from 'blecsd';

// Set tab size to 4 spaces
setTabSize(world, entity, 4);

// Set tab size to 2 spaces (common in many editors)
setTabSize(world, entity, 2);
```

**Parameters:**
- `world: World` - The ECS world
- `entity: Entity` - The entity to configure
- `tabSize: number` - Tab width in spaces (1-16)

**Validation:**
- Must be an integer between 1 and 16
- Throws error if outside valid range
- Validated using `TabSizeSchema`

---

### `getTabSize(world, entity)`

Gets the tab width for an entity's content.

```typescript
import { getTabSize } from 'blecsd';

const tabSize = getTabSize(world, entity);
console.log(`Tab size: ${tabSize}`); // Tab size: 4
```

**Parameters:**
- `world: World` - The ECS world
- `entity: Entity` - The entity to query

**Returns:** `number` - Tab width in spaces (1-16)

**Default:** Returns 8 if not explicitly set

---

## Tab Expansion

### `expandTabs(text, tabSize)`

Expands tab characters to spaces manually.

```typescript
import { expandTabs } from 'blecsd';

const text = 'Hello\tWorld';
const expanded = expandTabs(text, 4);
console.log(expanded); // 'Hello    World' (4 spaces)

// Default tab size (8 spaces)
const expanded8 = expandTabs(text);
console.log(expanded8); // 'Hello        World' (8 spaces)
```

**Parameters:**
- `text: string` - Text containing tab characters
- `tabSize?: number` - Tab width in spaces (default: 8)

**Returns:** `string` - Text with tabs expanded to spaces

**Behavior:**
- Tabs are replaced with spaces to reach the next tab stop
- Tab stops are aligned to multiples of `tabSize`
- Preserves alignment across multiple lines
- Handles mixed tabs and spaces correctly

**Example with alignment:**
```typescript
const code = `
function example() {
\treturn {
\t\tfoo: 'bar',
\t\tbaz: 'qux'
\t};
}
`;

const expanded = expandTabs(code, 2);
// Each tab becomes 2 spaces:
// function example() {
//   return {
//     foo: 'bar',
//     baz: 'qux'
//   };
// }
```

---

## Validation

### `TabSizeSchema`

Zod schema for validating tab size values.

```typescript
import { TabSizeSchema } from 'blecsd';

// Validate tab size
const result = TabSizeSchema.safeParse(4);
if (result.success) {
  console.log('Valid tab size:', result.data);
}

// Invalid values
TabSizeSchema.safeParse(0);   // Error: must be >= 1
TabSizeSchema.safeParse(20);  // Error: must be <= 16
TabSizeSchema.safeParse(3.5); // Error: must be integer
```

**Schema:** `z.number().int().min(1).max(16)`

**Valid range:** 1-16 (inclusive)

---

## Content Component Integration

Tab size is automatically applied when rendering Content components:

```typescript
import { createBox, setContent, setTabSize } from 'blecsd';

const box = createBox(world, { x: 5, y: 2, width: 40, height: 10 });

// Set tab size for this box
setTabSize(world, box, 4);

// Content with tabs
setContent(world, box, 'Column1\tColumn2\tColumn3');

// Tabs are automatically expanded to 4 spaces when rendered
```

**Automatic expansion:**
- Content component automatically expands tabs using `tabSize`
- Applied during text wrapping and rendering
- No manual expansion needed in most cases
- Use `expandTabs()` only for custom text processing

---

## Common Tab Sizes

| Language/Editor | Common Tab Size |
|-----------------|-----------------|
| Python (PEP 8)  | 4 spaces |
| JavaScript      | 2 or 4 spaces |
| Go              | 8 spaces (tabs) |
| Java            | 4 spaces |
| C/C++           | 4 or 8 spaces |
| Makefiles       | 8 spaces (tabs) |
| HTML/CSS        | 2 spaces |

---

## Examples

### Example 1: Code Display

```typescript
import { createBox, setContent, setTabSize } from 'blecsd';

const codeBox = createBox(world, {
  x: 5, y: 2, width: 60, height: 20,
  border: { type: 'single' }
});

// Use 2-space tabs for JavaScript
setTabSize(world, codeBox, 2);

const code = `
function example() {
\tconst result = {
\t\tfoo: 'bar',
\t\tbaz: 'qux'
\t};
\treturn result;
}
`;

setContent(world, codeBox, code);
// Renders with 2-space indentation
```

### Example 2: Tab-Aligned Columns

```typescript
import { createBox, setContent, setTabSize } from 'blecsd';

const tableBox = createBox(world, {
  x: 5, y: 2, width: 50, height: 10
});

// Use 8-space tabs for wide columns
setTabSize(world, tableBox, 8);

const table = `
Name\t\tAge\tCity
Alice\t\t30\tNew York
Bob\t\t25\tLondon
Charlie\t\t35\tParis
`;

setContent(world, tableBox, table);
// Columns align at 8-space intervals
```

### Example 3: Custom Text Processing

```typescript
import { expandTabs, setContent } from 'blecsd';

// Process text before setting content
const rawText = 'Header:\tValue';

// Expand tabs manually for custom processing
const expanded = expandTabs(rawText, 4);

// Apply additional formatting
const formatted = expanded.toUpperCase();

setContent(world, entity, formatted);
```

### Example 4: Mixed Tab Sizes

```typescript
import { createBox, setContent, setTabSize } from 'blecsd';

// Different tab sizes for different boxes
const codeBox = createBox(world, { x: 5, y: 2, width: 40, height: 10 });
const dataBox = createBox(world, { x: 50, y: 2, width: 40, height: 10 });

setTabSize(world, codeBox, 2);  // Code uses 2 spaces
setTabSize(world, dataBox, 8);  // Data uses 8 spaces

setContent(world, codeBox, 'if (x) {\n\treturn true;\n}');
setContent(world, dataBox, 'Name\tValue\nFoo\tBar');
```

---

## Performance Considerations

- **Tab expansion is cached** - Expanded text is cached until content changes
- **Efficient string processing** - Uses optimized string replacement
- **No regex overhead** - Simple character-by-character expansion
- **Memory friendly** - Only stores expanded text when needed

---

## Edge Cases

### Empty Strings
```typescript
expandTabs('');  // Returns ''
```

### No Tabs
```typescript
expandTabs('Hello World', 4);  // Returns 'Hello World' (unchanged)
```

### Multiple Consecutive Tabs
```typescript
expandTabs('A\t\tB', 4);  // Expands both tabs correctly
```

### Tabs at Line Start
```typescript
expandTabs('\tIndented', 4);  // '    Indented'
```

### Mixed Tabs and Spaces
```typescript
expandTabs('  \tMixed', 4);  // Correctly aligns to next tab stop
```

---

## Related APIs

- [`setContent()`](/docs/api/components/content.md) - Set text content on entity
- [`getContent()`](/docs/api/components/content.md) - Get text content from entity
- [`wrapText()`](/docs/api/utils/text-wrap.md) - Text wrapping with tab support
- [`Content`](/docs/api/components/content.md) - Content component reference

---

## Migration Notes

**From blessed.js:**
```javascript
// blessed.js
element.options.tabSize = 4;

// blECSd
setTabSize(world, entity, 4);
```

**From manual tab expansion:**
```typescript
// Before (manual)
const text = rawText.replace(/\t/g, '    ');

// After (automatic)
setTabSize(world, entity, 4);
setContent(world, entity, rawText);
// Tabs are automatically expanded
```

---

## See Also

- [Content Component](/docs/api/components/content.md)
- [Text Wrapping](/docs/api/utils/text-wrap.md)
- [Text Rendering](/docs/api/systems/render.md)
