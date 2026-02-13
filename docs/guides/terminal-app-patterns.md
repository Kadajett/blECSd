# Terminal Application Patterns

Practical patterns for building terminal applications with blECSd. Each section shows how to combine existing widgets, systems, and APIs to implement common application features.

## Command Palette

blECSd ships with a `createCommandPalette` widget that provides VS Code-style quick command search.

```typescript
import {
  createWorld,
  addEntity,
  createCommandPalette,
  createKeyBindingRegistry,
  registerBinding,
  matchKeyEvent,
  parseKeyBuffer,
  type Command,
} from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

// Define commands
const commands: Command[] = [
  {
    id: 'file.new',
    label: 'New File',
    shortcut: 'Ctrl+N',
    category: 'File',
    handler: () => { /* create file */ },
  },
  {
    id: 'file.save',
    label: 'Save',
    shortcut: 'Ctrl+S',
    category: 'File',
    handler: () => { /* save file */ },
  },
  {
    id: 'view.toggleSidebar',
    label: 'Toggle Sidebar',
    shortcut: 'Ctrl+B',
    category: 'View',
    handler: () => { /* toggle sidebar */ },
  },
];

// Create the palette (hidden by default)
const palette = createCommandPalette(world, eid, {
  commands,
  placeholder: 'Type a command...',
  maxResults: 10,
  width: 60,
  onClose: () => { /* handle close */ },
});

// Wire Ctrl+Shift+P to show the palette
const registry = createKeyBindingRegistry();
registerBinding(registry, {
  keys: 'ctrl+shift+p',
  action: 'commandPalette.toggle',
});

process.stdin.on('data', (data) => {
  const events = parseKeyBuffer(data);
  for (const key of events) {
    const match = matchKeyEvent(registry, key);
    if (match?.action === 'commandPalette.toggle') {
      palette.show();
    }
  }
});
```

The command palette uses blECSd's `fuzzySearchBy` internally, so results rank by match quality as the user types.

## Ctrl+F Search Overlay

Build a search overlay by combining a `createTextbox` for input, `fuzzySearch` for matching, and the focus system for keyboard control.

```typescript
import {
  createWorld,
  addEntity,
  createBox,
  createTextbox,
  createText,
  createEventBus,
  focusEntity,
  focusPush,
  focusPop,
  setVisible,
  setPosition,
  setDimensions,
  fuzzySearch,
  parseKeyBuffer,
  type KeyEvent,
} from 'blecsd';

interface SearchEvents {
  'search:open': undefined;
  'search:close': undefined;
  'search:match': { index: number; total: number };
}

const world = createWorld();
const events = createEventBus<SearchEvents>();

// Search overlay container (hidden by default)
const overlayEntity = addEntity(world);
const overlay = createBox(world, overlayEntity, {
  border: { type: 'rounded' },
  title: 'Search',
});
setPosition(world, overlayEntity, 40, 0);
setDimensions(world, overlayEntity, 40, 3);
setVisible(world, overlayEntity, false);

// Search input
const inputEntity = addEntity(world);
const searchBox = createTextbox(world, inputEntity, {
  placeholder: 'Search...',
});

// State
let searchVisible = false;
let searchableContent: string[] = []; // lines or items to search
let matchIndices: number[] = [];
let currentMatch = 0;

function openSearch(): void {
  searchVisible = true;
  setVisible(world, overlayEntity, true);
  focusPush(world); // save current focus
  focusEntity(world, inputEntity);
  events.emit('search:open', undefined);
}

function closeSearch(): void {
  searchVisible = false;
  setVisible(world, overlayEntity, false);
  focusPop(world); // restore previous focus
  matchIndices = [];
  currentMatch = 0;
  events.emit('search:close', undefined);
}

function performSearch(query: string): void {
  if (!query) {
    matchIndices = [];
    return;
  }
  const results = fuzzySearch(query, searchableContent, { threshold: 0.3 });
  matchIndices = results.map((r) => searchableContent.indexOf(r.item));
  currentMatch = 0;
  if (matchIndices.length > 0) {
    events.emit('search:match', {
      index: currentMatch,
      total: matchIndices.length,
    });
  }
}

function nextMatch(): void {
  if (matchIndices.length === 0) return;
  currentMatch = (currentMatch + 1) % matchIndices.length;
  events.emit('search:match', {
    index: currentMatch,
    total: matchIndices.length,
  });
}

// Handle input
process.stdin.on('data', (data) => {
  const keys = parseKeyBuffer(data);
  for (const key of keys) {
    if (key.ctrl && key.name === 'f') {
      searchVisible ? closeSearch() : openSearch();
    } else if (searchVisible && key.name === 'escape') {
      closeSearch();
    } else if (searchVisible && key.name === 'return') {
      nextMatch();
    }
  }
});
```

For a full-featured search, wire the match results to scroll the content view and highlight matched text using `setStyle` on the matched entities.

## Status Bar

Use `createFooter` for a fixed bottom status bar with left, center, and right sections. Use `createHeader` for a top title bar.

```typescript
import {
  createWorld,
  addEntity,
  createFooter,
  createHeader,
} from 'blecsd';

const world = createWorld();

// Top title bar
const headerEntity = addEntity(world);
createHeader(world, headerEntity, {
  title: 'My Editor',
  left: 'v1.0',
  right: new Date().toLocaleTimeString(),
  fg: '#FFFFFF',
  bg: '#1E1E1E',
});

// Bottom status bar
const footerEntity = addEntity(world);
const footer = createFooter(world, footerEntity, {
  left: 'NORMAL',
  center: 'main.ts',
  right: 'Ln 42, Col 10',
  height: 1,
  fg: '#FFFFFF',
  bg: '#007ACC',
});

// Update status bar content dynamically
function updateMode(mode: string): void {
  footer.setLeft(mode);
}

function updateCursorPosition(line: number, col: number): void {
  footer.setRight(`Ln ${line}, Col ${col}`);
}

function updateFilename(name: string): void {
  footer.setCenter(name);
}
```

### Multi-Section Status Bars with Listbar

For richer status bars with clickable items, use `createListbar`:

```typescript
import {
  createWorld,
  addEntity,
  createListbar,
} from 'blecsd';

const world = createWorld();
const barEntity = addEntity(world);

const menuBar = createListbar(world, barEntity, {
  items: [
    { text: 'File', key: 'f', callback: () => openFileMenu() },
    { text: 'Edit', key: 'e', callback: () => openEditMenu() },
    { text: 'View', key: 'v', callback: () => openViewMenu() },
    { text: 'Help', key: 'h', callback: () => openHelpMenu() },
  ],
  style: {
    item: { fg: 0xccccccff, bg: 0x333333ff },
    selected: { fg: 0xffffffff, bg: 0x007accff },
    prefix: { fg: 0xffcc00ff },
    separator: ' | ',
  },
});
```

## Tab Completion

Build autocomplete by combining `createTextbox` with `fuzzySearchBy` and a popup list.

```typescript
import {
  createWorld,
  addEntity,
  createTextbox,
  createList,
  fuzzySearchBy,
  setVisible,
  setPosition,
  focusEntity,
  onTextInputChange,
  onListSelect,
  parseKeyBuffer,
  type FuzzyMatch,
} from 'blecsd';

const world = createWorld();

// Input field
const inputEntity = addEntity(world);
const textbox = createTextbox(world, inputEntity, {
  placeholder: 'Enter command...',
});

// Completions dropdown (hidden by default)
const listEntity = addEntity(world);
const completionList = createList(world, listEntity, {
  items: [],
});
setVisible(world, listEntity, false);

// Completion source
interface CompletionItem {
  readonly label: string;
  readonly detail?: string;
  readonly insertText: string;
}

const completions: CompletionItem[] = [
  { label: 'git commit', detail: 'Record changes', insertText: 'git commit' },
  { label: 'git push', detail: 'Upload changes', insertText: 'git push' },
  { label: 'git pull', detail: 'Download changes', insertText: 'git pull' },
  { label: 'git status', detail: 'Show status', insertText: 'git status' },
  { label: 'git log', detail: 'Show history', insertText: 'git log' },
];

// Filter completions as user types
onTextInputChange(world, inputEntity, (value: string) => {
  if (!value) {
    setVisible(world, listEntity, false);
    return;
  }

  const matches: FuzzyMatch<CompletionItem>[] = fuzzySearchBy(
    value,
    completions,
    (item) => item.label,
    { threshold: 0.2, limit: 8 },
  );

  if (matches.length === 0) {
    setVisible(world, listEntity, false);
    return;
  }

  // Update list items
  completionList.setItems(
    matches.map((m) => ({
      label: m.item.label,
      value: m.item.insertText,
    })),
  );
  setVisible(world, listEntity, true);
});

// Handle Tab key for accepting completion
process.stdin.on('data', (data) => {
  const keys = parseKeyBuffer(data);
  for (const key of keys) {
    if (key.name === 'tab' && completionList.getItems().length > 0) {
      const selected = completionList.getSelected();
      if (selected) {
        textbox.setValue(selected.value);
        setVisible(world, listEntity, false);
      }
    }
  }
});
```

## Toast Notifications

Use `createToast` for non-blocking notifications that auto-dismiss:

```typescript
import {
  createWorld,
  addEntity,
  createToast,
} from 'blecsd';

const world = createWorld();

// Show different toast types
function notify(message: string): void {
  const eid = addEntity(world);
  createToast(world, eid, {
    message,
    type: 'info',
    position: 'top-right',
    duration: 3000,
  });
}

function notifySuccess(message: string): void {
  const eid = addEntity(world);
  createToast(world, eid, {
    message,
    type: 'success',
    position: 'top-right',
    duration: 3000,
  });
}

function notifyError(message: string): void {
  const eid = addEntity(world);
  createToast(world, eid, {
    message,
    type: 'error',
    position: 'top-right',
    duration: 5000,
  });
}
```

## Modal Dialogs

Use `createModal` for blocking dialogs and `openModal` for a convenience wrapper:

```typescript
import {
  createWorld,
  addEntity,
  openModal,
} from 'blecsd';

const world = createWorld();

// Confirmation dialog
function confirmDelete(filename: string): void {
  const eid = addEntity(world);
  openModal(world, eid, {
    title: 'Confirm Delete',
    content: `Delete "${filename}"? This cannot be undone.`,
    buttons: [
      { label: 'Cancel', value: 'cancel' },
      { label: 'Delete', value: 'delete' },
    ],
    onSelect: (value) => {
      if (value === 'delete') {
        // perform delete
      }
    },
  });
}
```

## Key Binding System

The `createKeyBindingRegistry` provides a configurable key binding system with conditional activation ("when" clauses) similar to VS Code's keybindings.json.

```typescript
import {
  createKeyBindingRegistry,
  registerBinding,
  matchKeyEvent,
  parseKeyBuffer,
  type ConditionContext,
} from 'blecsd';

const registry = createKeyBindingRegistry();

// Register bindings with conditions
registerBinding(registry, {
  keys: 'ctrl+s',
  action: 'file.save',
  description: 'Save current file',
});

registerBinding(registry, {
  keys: 'ctrl+shift+p',
  action: 'commandPalette.open',
  description: 'Open command palette',
});

registerBinding(registry, {
  keys: ['ctrl+f', '/'],
  action: 'search.open',
  when: '!textInputFocused',
  description: 'Open search',
});

registerBinding(registry, {
  keys: 'escape',
  action: 'modal.close',
  when: 'modalOpen',
  description: 'Close modal',
});

// Match events against bindings
process.stdin.on('data', (data) => {
  const keys = parseKeyBuffer(data);
  const context: ConditionContext = {
    textInputFocused: false,
    modalOpen: false,
    focus: 'editor',
  };

  for (const key of keys) {
    const match = matchKeyEvent(registry, key, context);
    if (match) {
      handleAction(match.action);
    }
  }
});

function handleAction(action: string): void {
  switch (action) {
    case 'file.save':
      // save logic
      break;
    case 'commandPalette.open':
      // open palette
      break;
    case 'search.open':
      // open search
      break;
    case 'modal.close':
      // close modal
      break;
  }
}
```

## Focus Management

blECSd provides a focus stack for managing keyboard focus across overlays, modals, and nested views.

```typescript
import {
  createWorld,
  focusEntity,
  focusNext,
  focusPrev,
  focusPush,
  focusPop,
  blurAll,
} from 'blecsd';

const world = createWorld();

// Tab navigation cycles through focusable entities
// (entities with Focusable component, ordered by tabIndex)
focusNext(world);  // focus next entity in tab order
focusPrev(world);  // focus previous entity in tab order

// Focus a specific entity
focusEntity(world, myButton);

// Focus stack for overlays/modals
focusPush(world);        // save current focus state
focusEntity(world, modalInput);  // focus modal content
// ... user interacts with modal ...
focusPop(world);         // restore previous focus when modal closes
```

## State Machines for View Management

Use `createStateMachine` to manage complex application states (editing, searching, navigating):

```typescript
import {
  createStateMachine,
  sendEvent,
  getCurrentState,
} from 'blecsd';

type AppState = 'normal' | 'insert' | 'command' | 'search';
type AppEvent = 'enterInsert' | 'enterCommand' | 'enterSearch' | 'escape';

const appState = createStateMachine<AppState, AppEvent>({
  initial: 'normal',
  states: {
    normal: {
      on: {
        enterInsert: 'insert',
        enterCommand: 'command',
        enterSearch: 'search',
      },
    },
    insert: {
      on: { escape: 'normal' },
    },
    command: {
      on: { escape: 'normal' },
    },
    search: {
      on: { escape: 'normal' },
    },
  },
});

// Transition between states
sendEvent(appState, 'enterInsert');
console.log(getCurrentState(appState)); // 'insert'

sendEvent(appState, 'escape');
console.log(getCurrentState(appState)); // 'normal'
```

## Event-Driven Architecture

Use `createEventBus` for decoupled communication between application components:

```typescript
import { createEventBus } from 'blecsd';

interface EditorEvents {
  'file:opened': { path: string };
  'file:saved': { path: string };
  'file:modified': { path: string; dirty: boolean };
  'cursor:moved': { line: number; col: number };
  'mode:changed': { mode: string };
}

const events = createEventBus<EditorEvents>();

// Status bar listens for cursor changes
events.on('cursor:moved', ({ line, col }) => {
  updateStatusBar(`Ln ${line}, Col ${col}`);
});

// Title bar listens for file events
events.on('file:opened', ({ path }) => {
  updateTitleBar(path);
});

events.on('file:modified', ({ dirty }) => {
  updateTitleBar(dirty ? '* modified' : 'saved');
});

// Editor emits events
function moveCursor(line: number, col: number): void {
  // ... move cursor logic ...
  events.emit('cursor:moved', { line, col });
}
```

## Scheduler and Update Loop

For applications that need a continuous update loop (animations, real-time updates), use `createScheduler`:

```typescript
import {
  createWorld,
  createScheduler,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Systems run in phase order:
// INPUT -> EARLY_UPDATE -> UPDATE -> LATE_UPDATE ->
// ANIMATION -> LAYOUT -> RENDER -> POST_RENDER

// Run one frame
function frame(deltaTime: number): void {
  scheduler.run(world, deltaTime);
}

// Game-style loop at ~60 FPS
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  frame(dt);
}, 16);
```

For non-realtime applications (forms, menus), you can skip the scheduler entirely and call systems directly:

```typescript
import {
  createWorld,
  layoutSystem,
  renderSystem,
} from 'blecsd';

const world = createWorld();

// Call systems on demand, only when state changes
function redraw(): void {
  layoutSystem(world);
  renderSystem(world);
}
```

## Putting It Together

A minimal terminal editor skeleton combining several patterns:

```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  createPanel,
  createFooter,
  createHeader,
  createCommandPalette,
  createKeyBindingRegistry,
  registerBinding,
  matchKeyEvent,
  createEventBus,
  createStateMachine,
  sendEvent,
  getCurrentState,
  parseKeyBuffer,
} from 'blecsd';

// Setup
const world = createWorld();
const scheduler = createScheduler();

// Events
interface AppEvents {
  'mode:changed': { mode: string };
  'cursor:moved': { line: number; col: number };
}
const events = createEventBus<AppEvents>();

// State machine
type Mode = 'normal' | 'insert' | 'command';
type ModeEvent = 'enterInsert' | 'enterCommand' | 'escape';
const mode = createStateMachine<Mode, ModeEvent>({
  initial: 'normal',
  states: {
    normal: { on: { enterInsert: 'insert', enterCommand: 'command' } },
    insert: { on: { escape: 'normal' } },
    command: { on: { escape: 'normal' } },
  },
});

// UI
const headerEntity = addEntity(world);
createHeader(world, headerEntity, { title: 'Editor' });

const footerEntity = addEntity(world);
const footer = createFooter(world, footerEntity, {
  left: 'NORMAL',
  right: 'Ln 1, Col 1',
  fg: '#FFFFFF',
  bg: '#007ACC',
});

const paletteEntity = addEntity(world);
const palette = createCommandPalette(world, paletteEntity, {
  commands: [
    { id: 'file.save', label: 'Save', shortcut: 'Ctrl+S', handler: () => {} },
    { id: 'file.quit', label: 'Quit', shortcut: 'Ctrl+Q', handler: () => process.exit(0) },
  ],
});

// Key bindings
const keys = createKeyBindingRegistry();
registerBinding(keys, { keys: 'ctrl+shift+p', action: 'palette.open' });
registerBinding(keys, { keys: 'i', action: 'mode.insert', when: '!textInputFocused' });
registerBinding(keys, { keys: 'escape', action: 'mode.normal' });

// React to mode changes
events.on('mode:changed', ({ mode: m }) => footer.setLeft(m.toUpperCase()));
events.on('cursor:moved', ({ line, col }) => footer.setRight(`Ln ${line}, Col ${col}`));

// Input loop
process.stdin.setRawMode(true);
process.stdin.on('data', (data) => {
  const parsed = parseKeyBuffer(data);
  for (const key of parsed) {
    const match = matchKeyEvent(keys, key, {
      textInputFocused: getCurrentState(mode) === 'insert',
    });
    if (match) {
      switch (match.action) {
        case 'palette.open':
          palette.show();
          break;
        case 'mode.insert':
          sendEvent(mode, 'enterInsert');
          events.emit('mode:changed', { mode: 'insert' });
          break;
        case 'mode.normal':
          sendEvent(mode, 'escape');
          events.emit('mode:changed', { mode: 'normal' });
          break;
      }
    }
  }
});

// Render loop
let lastTime = Date.now();
setInterval(() => {
  const now = Date.now();
  scheduler.run(world, (now - lastTime) / 1000);
  lastTime = now;
}, 16);
```

## Further Reading

- [API Reference](../api/index.md): Full API documentation for all widgets, components, and systems
- [Testing Guide](./testing.md): Testing blECSd applications
- [Performance Guide](./performance.md): Optimization tips for large terminal apps
- [blECSd-Examples](https://github.com/Kadajett/blECSd-Examples): Complete runnable example applications
