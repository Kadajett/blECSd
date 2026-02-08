# Keyboard Shortcuts Reference

This guide documents the default keyboard bindings for all blECSd widgets and shows how to customize them.

## Overview

blECSd uses a flexible key binding system that allows:
- **Default widget shortcuts** - Each widget has sensible defaults
- **Custom bindings** - Override defaults or add new shortcuts
- **Context-aware** - Bindings can be conditional (e.g., only when focused)
- **Standard conventions** - Familiar shortcuts from terminal UIs and vim

## Global Navigation

These shortcuts work across all focusable widgets:

| Key | Action | Description |
|-----|--------|-------------|
| `Tab` | Focus Next | Move focus to next focusable widget |
| `Shift+Tab` | Focus Previous | Move focus to previous focusable widget |
| `Escape` | Blur | Remove focus from current widget |

## Common Widget Shortcuts

### List Widgets

Lists, ListTables, and VirtualizedLists share these shortcuts:

| Key | Action | Description |
|-----|--------|-------------|
| `↑` / `k` | Move Up | Select previous item |
| `↓` / `j` | Move Down | Select next item |
| `Home` / `g` | Move to First | Jump to first item |
| `End` / `G` | Move to Last | Jump to last item |
| `PageUp` | Page Up | Scroll up one page |
| `PageDown` | Page Down | Scroll down one page |
| `Enter` | Select/Activate | Confirm selection or activate item |
| `Space` | Toggle | Toggle selection (multi-select mode) |
| `/` | Search | Open search/filter mode |
| `Escape` | Exit Search | Close search mode or cancel |
| `1-9` | Quick Jump | Jump to item by number (if enabled) |

**Example:**
```typescript
import { createList } from 'blecsd';

const list = createList(world, eid, {
  items: ['Item 1', 'Item 2', 'Item 3'],
  selected: 0,
});

// User presses 'j' or Down arrow
list.handleKey('down');  // Moves to Item 2

// User presses 'G'
list.handleKey('G');  // Jumps to Item 3
```

### Text Input Widgets

TextBox, TextArea, and other text input widgets:

| Key | Action | Description |
|-----|--------|-------------|
| `←` / `Ctrl+B` | Move Left | Move cursor left one character |
| `→` / `Ctrl+F` | Move Right | Move cursor right one character |
| `Ctrl+A` / `Home` | Move to Start | Jump to line start |
| `Ctrl+E` / `End` | Move to End | Jump to line end |
| `Ctrl+U` | Delete to Start | Delete from cursor to line start |
| `Ctrl+K` | Delete to End | Delete from cursor to line end |
| `Ctrl+W` | Delete Word | Delete previous word |
| `Backspace` | Delete Previous | Delete character before cursor |
| `Delete` | Delete Next | Delete character after cursor |
| `Enter` | New Line | Insert newline (TextArea only) |
| `Enter` | Submit | Submit input (TextBox) |
| `Escape` | Cancel | Cancel input, restore original value |

**TextArea-specific:**

| Key | Action | Description |
|-----|--------|-------------|
| `↑` | Move Up | Move cursor up one line |
| `↓` | Move Down | Move cursor down one line |
| `PageUp` | Scroll Up | Scroll up one page |
| `PageDown` | Scroll Down | Scroll down one page |
| `Ctrl+D` | Delete Line | Delete current line |

**Example:**
```typescript
import { createTextBox } from 'blecsd';

const textBox = createTextBox(world, eid, {
  value: 'Hello',
  placeholder: 'Enter text...',
});

// User types
textBox.handleKey('w');        // Append 'w'
textBox.handleKey('o');        // Append 'o'
textBox.handleKey('r');        // Append 'r'
textBox.handleKey('l');        // Append 'l'
textBox.handleKey('d');        // Append 'd'
// Value is now 'Helloworld'

// User presses Ctrl+A to jump to start
textBox.handleKey('a', true);  // Cursor at position 0

// User presses Ctrl+W to delete word
textBox.handleKey('w', true);  // Deletes 'Hello'
```

### Button Widgets

| Key | Action | Description |
|-----|--------|-------------|
| `Enter` | Activate | Trigger button click |
| `Space` | Activate | Trigger button click |

**Example:**
```typescript
import { createButton } from 'blecsd';

const button = createButton(world, eid, {
  label: 'Submit',
  onClick: () => console.log('Clicked!'),
});

// User presses Enter or Space
button.handleKey('enter');  // Triggers onClick
```

### Checkbox Widgets

| Key | Action | Description |
|-----|--------|-------------|
| `Space` | Toggle | Toggle checked state |
| `Enter` | Toggle | Toggle checked state |

**Example:**
```typescript
import { createCheckbox } from 'blecsd';

const checkbox = createCheckbox(world, eid, {
  label: 'Accept terms',
  checked: false,
});

// User presses Space
checkbox.handleKey('space');  // checked becomes true
```

### Radio Button Widgets

| Key | Action | Description |
|-----|--------|-------------|
| `↑` / `k` | Previous Option | Select previous radio button in group |
| `↓` / `j` | Next Option | Select next radio button in group |
| `Space` | Select | Select current radio button |
| `Enter` | Select | Select current radio button |

### Form Widgets

| Key | Action | Description |
|-----|--------|-------------|
| `Tab` | Next Field | Move to next form field |
| `Shift+Tab` | Previous Field | Move to previous form field |
| `Enter` | Submit | Submit form (if on last field or button) |
| `Escape` | Cancel | Cancel form, reset values |

**Example:**
```typescript
import { createForm } from 'blecsd';

const form = createForm(world, eid, {
  fields: [
    { name: 'username', type: 'text' },
    { name: 'password', type: 'password' },
  ],
  onSubmit: (values) => console.log(values),
});

// User presses Tab to move between fields
form.handleKey('tab');  // Moves from username to password

// User presses Shift+Tab to go back
form.handleKey('S-tab');  // Moves back to username
```

### Tab Widgets

| Key | Action | Description |
|-----|--------|-------------|
| `→` / `l` | Next Tab | Switch to next tab |
| `←` / `h` | Previous Tab | Switch to previous tab |
| `1-9` | Jump to Tab | Jump to specific tab by number |
| `Home` | First Tab | Jump to first tab |
| `End` | Last Tab | Jump to last tab |

### Menu/Listbar Widgets

| Key | Action | Description |
|-----|--------|-------------|
| `→` / `l` | Next Item | Move to next menu item |
| `←` / `h` | Previous Item | Move to previous menu item |
| `Enter` | Select | Activate menu item |
| `Space` | Select | Activate menu item |
| `Escape` | Close | Close menu |
| `Home` | First Item | Jump to first menu item |
| `End` | Last Item | Jump to last menu item |

### File Manager Widgets

| Key | Action | Description |
|-----|--------|-------------|
| `↑` / `k` | Move Up | Navigate to previous file/folder |
| `↓` / `j` | Move Down | Navigate to next file/folder |
| `Enter` | Open | Open file or enter directory |
| `Backspace` / `h` | Parent Directory | Go up one directory |
| `l` | Open Selected | Open selected file/folder |
| `g` | Go to Top | Jump to first item |
| `G` | Go to Bottom | Jump to last item |
| `/` | Search | Start file search |
| `.` | Toggle Hidden | Show/hide hidden files |
| `Space` | Select | Toggle file selection |

### Question/Prompt Widgets

| Key | Action | Description |
|-----|--------|-------------|
| `y` | Yes | Confirm yes |
| `n` | No | Confirm no |
| `Enter` | Submit | Submit current choice |
| `Escape` | Cancel | Cancel prompt |

### Scrollable Content

For scrollable boxes, text areas, and terminals:

| Key | Action | Description |
|-----|--------|-------------|
| `↑` | Scroll Up | Scroll content up one line |
| `↓` | Scroll Down | Scroll content down one line |
| `PageUp` | Page Up | Scroll up one full page |
| `PageDown` | Page Down | Scroll down one full page |
| `Home` | Scroll to Top | Jump to start of content |
| `End` | Scroll to Bottom | Jump to end of content |
| `Ctrl+U` | Half Page Up | Scroll up half a page |
| `Ctrl+D` | Half Page Down | Scroll down half a page |

## Key Naming Conventions

### Key Names

Standard key names used in blECSd:

**Printable characters:** `'a'`, `'b'`, `'1'`, `'@'`, etc.

**Special keys:**
- `'escape'`, `'esc'`
- `'enter'`, `'return'`
- `'tab'`
- `'space'`, `' '`
- `'backspace'`
- `'delete'`
- `'insert'`
- `'home'`, `'end'`
- `'pageup'`, `'pagedown'`
- `'up'`, `'down'`, `'left'`, `'right'`
- `'f1'` through `'f12'`

### Modifiers

Modifiers are specified with a prefix:

| Modifier | Prefix | Example |
|----------|--------|---------|
| Ctrl | `C-` or specify `ctrl: true` | `'C-a'` or `handleKey('a', true)` |
| Alt/Meta | `M-` or `A-` | `'M-a'`, `'A-x'` |
| Shift | `S-` | `'S-tab'` (Shift+Tab) |

**Combined modifiers:**
- `'C-S-a'` - Ctrl+Shift+A
- `'C-M-x'` - Ctrl+Alt+X

### Format

Key strings use `+` to separate modifiers:
- `'ctrl+a'` - Ctrl+A
- `'ctrl+shift+a'` - Ctrl+Shift+A
- `'alt+f4'` - Alt+F4

## Customizing Key Bindings

### Using the KeyBindings System

```typescript
import { createKeyBindingRegistry, parseKeyString } from 'blecsd';

// Create a binding registry
const registry = createKeyBindingRegistry();

// Register a binding
registry.register({
  keys: 'ctrl+s',
  action: 'save',
  description: 'Save current file',
  preventDefault: true,
});

// Register multiple keys for same action
registry.register({
  keys: ['ctrl+q', 'alt+f4'],
  action: 'quit',
  description: 'Quit application',
});

// Conditional binding (only active in certain contexts)
registry.register({
  keys: 'ctrl+f',
  action: 'find',
  when: 'textInputFocused',
  description: 'Find in text',
});
```

### Widget-Specific Customization

Override default behavior by handling keys before the widget:

```typescript
import { createList, queueKeyEvent } from 'blecsd';

const list = createList(world, eid, {
  items: ['Item 1', 'Item 2', 'Item 3'],
});

// Custom key handler
function handleCustomKeys(event: KeyEvent): boolean {
  if (event.name === 'd' && !event.ctrl && !event.meta) {
    // Custom 'd' key behavior
    console.log('Custom delete action');
    return true;  // Mark as handled
  }

  // Let widget handle other keys
  return list.handleKey(event.name, event.ctrl);
}
```

### Global Key Binding Configuration

```typescript
import { createKeyBindingRegistry, KeyBinding } from 'blecsd';

const bindings: KeyBinding[] = [
  // Application-wide shortcuts
  { keys: 'ctrl+n', action: 'new-file', description: 'New file' },
  { keys: 'ctrl+o', action: 'open-file', description: 'Open file' },
  { keys: 'ctrl+s', action: 'save', description: 'Save' },
  { keys: 'ctrl+shift+s', action: 'save-as', description: 'Save as...' },
  { keys: 'ctrl+w', action: 'close-tab', description: 'Close tab' },
  { keys: 'ctrl+q', action: 'quit', description: 'Quit application' },

  // Navigation
  { keys: ['ctrl+tab', 'ctrl+]'], action: 'next-tab', description: 'Next tab' },
  { keys: ['ctrl+shift+tab', 'ctrl+['], action: 'prev-tab', description: 'Previous tab' },

  // Search
  { keys: 'ctrl+f', action: 'find', description: 'Find' },
  { keys: 'ctrl+h', action: 'replace', description: 'Find and replace' },
  { keys: 'f3', action: 'find-next', description: 'Find next' },
  { keys: 'shift+f3', action: 'find-prev', description: 'Find previous' },

  // Edit
  { keys: 'ctrl+z', action: 'undo', description: 'Undo' },
  { keys: 'ctrl+y', action: 'redo', description: 'Redo' },
  { keys: 'ctrl+x', action: 'cut', description: 'Cut' },
  { keys: 'ctrl+c', action: 'copy', description: 'Copy' },
  { keys: 'ctrl+v', action: 'paste', description: 'Paste' },
  { keys: 'ctrl+a', action: 'select-all', description: 'Select all' },
];

const registry = createKeyBindingRegistry();
for (const binding of bindings) {
  registry.register(binding);
}
```

### Context-Aware Bindings

Use the `when` clause to make bindings conditional:

```typescript
const bindings: KeyBinding[] = [
  // Only active when text input is focused
  {
    keys: 'ctrl+b',
    action: 'bold',
    when: 'textInputFocused',
    description: 'Bold text',
  },

  // Only active when modal is open
  {
    keys: 'escape',
    action: 'close-modal',
    when: 'modalOpen',
    description: 'Close modal',
  },

  // Only active in specific widget
  {
    keys: 'ctrl+l',
    action: 'clear-console',
    when: 'focus == "console"',
    description: 'Clear console',
  },
];
```

## Accessibility

### Screen Reader Support

blECSd follows terminal accessibility best practices:

- **Focus indicators** - Focused widgets are clearly marked
- **Keyboard navigation** - All functionality available via keyboard
- **Consistent shortcuts** - Follow standard terminal UI conventions

### Alternative Shortcuts

Many actions have alternative shortcuts for different preferences:

| Action | Standard | Vim-style | Alternative |
|--------|----------|-----------|-------------|
| Move Up | `↑` | `k` | `Ctrl+P` |
| Move Down | `↓` | `j` | `Ctrl+N` |
| Move Left | `←` | `h` | `Ctrl+B` |
| Move Right | `→` | `l` | `Ctrl+F` |
| Start of Line | `Home` | `0` | `Ctrl+A` |
| End of Line | `End` | `$` | `Ctrl+E` |

## Platform-Specific Behavior

### macOS

On macOS, `Meta` (Alt/Option) key behavior:
- `Alt+←` / `Alt+→` - Move by word
- `Cmd+←` / `Cmd+→` - Move to line start/end
- `Cmd+↑` / `Cmd+↓` - Move to document start/end

### Windows/Linux

On Windows and Linux:
- `Ctrl+←` / `Ctrl+→` - Move by word
- `Home` / `End` - Move to line start/end
- `Ctrl+Home` / `Ctrl+End` - Move to document start/end

## Debugging Key Bindings

### Logging Key Events

```typescript
import { queueKeyEvent, getEventQueue } from 'blecsd';

// Log all key events
function logKeyEvent(event: KeyEvent): void {
  console.log('Key:', {
    name: event.name,
    ctrl: event.ctrl,
    meta: event.meta,
    shift: event.shift,
    sequence: event.sequence,
  });
}

// Hook into input system
const originalQueue = queueKeyEvent;
queueKeyEvent = (event) => {
  logKeyEvent(event);
  originalQueue(event);
};
```

### Testing Key Bindings

```typescript
import { describe, it, expect } from 'vitest';
import { createList } from 'blecsd';

describe('List keyboard shortcuts', () => {
  it('moves down with j key', () => {
    const list = createList(world, eid, {
      items: ['A', 'B', 'C'],
      selected: 0,
    });

    list.handleKey('j');

    expect(list.getSelected()).toBe(1);
  });

  it('jumps to end with G key', () => {
    const list = createList(world, eid, {
      items: ['A', 'B', 'C'],
      selected: 0,
    });

    list.handleKey('G');

    expect(list.getSelected()).toBe(2);
  });
});
```

## Best Practices

### 1. Follow Conventions

Use standard shortcuts users expect:
- `Ctrl+C` for copy (but `Ctrl+C` may be SIGINT in terminals!)
- `Ctrl+Q` to quit
- `Tab` for navigation
- `Escape` to cancel/close

### 2. Provide Alternatives

Offer both arrow keys and vim-style hjkl:
```typescript
function handleMovement(key: string): boolean {
  if (key === 'up' || key === 'k') {
    moveUp();
    return true;
  }
  if (key === 'down' || key === 'j') {
    moveDown();
    return true;
  }
  return false;
}
```

### 3. Document Custom Shortcuts

Always provide a help screen showing shortcuts:
```typescript
const helpText = `
Keyboard Shortcuts:
  ↑/k       - Move up
  ↓/j       - Move down
  Enter     - Select
  /         - Search
  ?         - Show this help
  q         - Quit
`;
```

### 4. Avoid Conflicts

Be careful with terminal control sequences:
- `Ctrl+C` - Usually SIGINT
- `Ctrl+Z` - Usually SIGTSTP
- `Ctrl+S` / `Ctrl+Q` - Flow control (may freeze terminal)

### 5. Test Across Terminals

Different terminals may send different sequences:
- xterm, rxvt, gnome-terminal have different escape codes
- tmux/screen may intercept certain keys
- SSH sessions may lose some key combinations

## Summary

- **Global navigation** - Tab, Shift+Tab, Escape work everywhere
- **Widget shortcuts** - Each widget type has sensible defaults
- **Customization** - Use KeyBindings system for custom shortcuts
- **Conventions** - Follow standard terminal UI patterns
- **Vim-style** - Many widgets support hjkl navigation
- **Accessibility** - All features available via keyboard
- **Context-aware** - Bindings can be conditional with `when` clauses
- **Testing** - Easy to test key handling in unit tests

For related documentation:
- [Input System](../api/systems.md#inputsystem)
- [Focus System](../api/systems.md#focussystem)
- [Testing Guide](./testing.md)
