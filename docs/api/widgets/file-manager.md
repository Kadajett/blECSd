# FileManager Widget

A file browser widget for navigating directories and selecting files. Supports directory navigation, sorted entries (directories first), hidden file toggle, and glob-based file filtering.

## Overview

```typescript
import { createFileManager } from 'blecsd';

const world = createWorld();

const fm = createFileManager(world, {
  cwd: '/home/user',
  showHidden: false,
  width: 50,
  height: 25,
  border: { type: 'line' },
});

fm.onSelect((entry) => {
  console.log('Selected file:', entry.name);
});

fm.onNavigate((path) => {
  console.log('Navigated to:', path);
});
```

---

## Configuration

### FileManagerConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `cwd` | `string` | `process.cwd()` | Initial working directory |
| `showHidden` | `boolean` | `false` | Whether to show hidden files |
| `filePattern` | `string` | - | Glob pattern for filtering files (e.g., `'*.ts'`) |
| `width` | `number` | `40` | Widget width |
| `height` | `number` | `20` | Widget height |
| `left` | `number` | `0` | Left position |
| `top` | `number` | `0` | Top position |
| `fg` | `string \| number` | - | Foreground color |
| `bg` | `string \| number` | - | Background color |
| `border` | `FileManagerBorderConfig` | - | Border configuration |
| `padding` | `number \| PaddingConfig` | - | Padding |

### FileEntry

```typescript
interface FileEntry {
  readonly name: string;       // File or directory name
  readonly path: string;       // Full absolute path
  readonly isDirectory: boolean;
  readonly size: number;       // File size in bytes (0 for directories)
}
```

### Zod Schema

```typescript
import { FileManagerConfigSchema } from 'blecsd';

const result = FileManagerConfigSchema.safeParse({
  cwd: '/home/user',
  showHidden: false,
  width: 50,
  height: 25,
});
```

---

## Factory Function

### createFileManager

Creates a FileManager widget.

```typescript
import { createFileManager } from 'blecsd';

const fm = createFileManager(world, {
  cwd: '/home/user/projects',
  showHidden: false,
  filePattern: '*.ts',
  width: 50,
  height: 25,
  border: { type: 'line', ch: 'single' },
});
```

**Parameters:**
- `world: World` - The ECS world
- `config?: FileManagerConfig` - Widget configuration

**Returns:** `FileManagerWidget`

---

## FileManagerWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### show / hide

```typescript
show(): FileManagerWidget
hide(): FileManagerWidget
```

Controls visibility.

### move

```typescript
move(dx: number, dy: number): FileManagerWidget
```

Moves the widget by a relative offset.

### setPosition

```typescript
setPosition(x: number, y: number): FileManagerWidget
```

Sets the absolute position.

### center

```typescript
center(termWidth: number, termHeight: number): FileManagerWidget
```

Centers the widget within the given terminal dimensions.

### setCwd

```typescript
setCwd(path: string): FileManagerWidget
```

Sets the current working directory. Reloads directory entries and resets the selection index.

```typescript
fm.setCwd('/home/user/documents');
```

### getCwd

```typescript
getCwd(): string
```

Gets the current working directory.

### getSelected

```typescript
getSelected(): FileEntry | undefined
```

Gets the currently selected entry (by cursor index).

### refresh

```typescript
refresh(): FileManagerWidget
```

Reloads the directory listing from the filesystem.

### getEntries

```typescript
getEntries(): readonly FileEntry[]
```

Gets all current directory entries.

### onSelect

```typescript
onSelect(cb: (entry: FileEntry) => void): FileManagerWidget
```

Registers a callback for when a file is selected (Enter on a file entry).

### onNavigate

```typescript
onNavigate(cb: (path: string) => void): FileManagerWidget
```

Registers a callback for when navigating into a directory.

### destroy

```typescript
destroy(): void
```

Destroys the widget and removes the entity from the world.

---

## Key Handling

### handleFileManagerKey

Handles keyboard input for a file manager widget.

```typescript
import { handleFileManagerKey } from 'blecsd';

handleFileManagerKey(world, fmEid, 'down');      // Move selection down
handleFileManagerKey(world, fmEid, 'up');         // Move selection up
handleFileManagerKey(world, fmEid, 'enter');      // Open file or enter directory
handleFileManagerKey(world, fmEid, 'backspace');  // Go to parent directory
```

**Supported keys:**

| Key | Action |
|-----|--------|
| `up` | Move selection up |
| `down` | Move selection down |
| `enter` | Open file (fires onSelect) or navigate into directory (fires onNavigate) |
| `backspace` | Navigate to parent directory |

**Parameters:**
- `world: World` - The ECS world
- `eid: Entity` - The file manager entity ID
- `key: string` - The key name

**Returns:** `boolean` - true if the key was handled

---

## Utility Functions

### isFileManager

```typescript
import { isFileManager } from 'blecsd';

if (isFileManager(world, entity)) {
  // Entity is a file manager widget
}
```

### setReadDirFn

Injects a custom directory-reading function. Primarily used for testing to mock filesystem operations.

```typescript
import { setReadDirFn } from 'blecsd';

setReadDirFn(fmEid, (dir) => [
  { name: 'src', path: dir + '/src', isDirectory: true, size: 0 },
  { name: 'file.ts', path: dir + '/file.ts', isDirectory: false, size: 1024 },
]);
```

---

## Examples

### File Picker Dialog

```typescript
import { createFileManager } from 'blecsd';

const picker = createFileManager(world, {
  cwd: '/home/user',
  filePattern: '*.json',
  width: 50,
  height: 20,
  border: { type: 'line', ch: 'rounded' },
  padding: 1,
});

picker.center(80, 24);

picker.onSelect((entry) => {
  console.log('Selected:', entry.path);
  picker.destroy();
});
```

### Directory Browser with Hidden Files

```typescript
import { createFileManager, handleFileManagerKey } from 'blecsd';

const browser = createFileManager(world, {
  cwd: '/etc',
  showHidden: true,
  width: 60,
  height: 30,
});

// In your input handler:
function onKeyPress(key) {
  handleFileManagerKey(world, browser.eid, key);
}
```

### Filtered File Listing

```typescript
import { createFileManager } from 'blecsd';

const fm = createFileManager(world, {
  cwd: '/home/user/project',
  filePattern: '*.ts',  // Only show TypeScript files
  showHidden: false,
});

const entries = fm.getEntries();
for (const entry of entries) {
  console.log(entry.isDirectory ? `[DIR] ${entry.name}` : entry.name);
}
```

---

## Display Format

The file manager displays entries in this format:

```
[dirname]
..
> src/
  lib/
  package.json
  tsconfig.json
```

- The current directory name is shown in brackets at the top
- `..` provides parent directory navigation
- Directories are shown with a trailing `/`
- The selected entry is prefixed with `>`
- Entries are sorted: directories first (alphabetically), then files (alphabetically)

---

## See Also

- [Tree Widget](./tree.md) - Hierarchical tree view
- [List Widget](./list.md) - Selectable list items
