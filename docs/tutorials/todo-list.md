# Tutorial: Todo List App

**Difficulty:** Beginner
**Time:** 30 minutes
**Concepts:** Forms, state management, keyboard navigation

In this tutorial, you'll build a simple todo list application that demonstrates blECSd's form controls, state management, and keyboard navigation.

## What You'll Build

```
┌─ Todo List ───────────────────────────────────────┐
│                                                   │
│ [ ] Buy groceries                                 │
│ [x] Write documentation                           │
│ [ ] Review pull request                           │
│ > [ ] Fix login bug                               │
│ [ ] Update dependencies                           │
│                                                   │
│ ──────────────────────────────────────────────── │
│ New task: _                                       │
│                                                   │
│ [j/k] Navigate  [Space] Toggle  [Enter] Add      │
│ [d] Delete  [q] Quit                             │
└───────────────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+
- Basic TypeScript knowledge
- blECSd installed (`pnpm add blecsd`)

## Step 1: Project Setup

Create a new file `todo.ts`:

<!-- blecsd-doccheck:ignore -->
```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  createScheduler,
  LoopPhase,
  registerLayoutSystem,
  registerRenderSystem,
  registerInputSystem,
  registerFocusSystem,
  createProgram,
  createEventBus,
} from 'blecsd';

// Create the ECS world
const world = createWorld();

// Create the scheduler
const scheduler = createScheduler();
registerInputSystem(scheduler);
registerFocusSystem(scheduler);
registerLayoutSystem(scheduler);
registerRenderSystem(scheduler);

// Create terminal program
const program = createProgram({
  input: process.stdin,
  output: process.stdout,
});

// Start alternate screen and enable mouse
program.alternateBuffer();
program.enableMouse();
program.hideCursor();
```

## Step 2: Define Todo State

```typescript
// Todo item interface
interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

// Application state
interface AppState {
  todos: TodoItem[];
  selectedIndex: number;
  inputText: string;
  inputMode: boolean;
}

// Initial state
const state: AppState = {
  todos: [
    { id: 1, text: 'Buy groceries', completed: false },
    { id: 2, text: 'Write documentation', completed: true },
    { id: 3, text: 'Review pull request', completed: false },
  ],
  selectedIndex: 0,
  inputText: '',
  inputMode: false,
};

let nextId = 4;
```

## Step 3: Create the UI Layout

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createPanel,
  createText,
  createTextInput,
  createBox,
  setPosition,
  setDimensions,
  setContent,
  setParent,
} from 'blecsd';

// Create main panel
const mainPanel = createPanel(world, {
  title: 'Todo List',
  x: 0,
  y: 0,
  width: 52,
  height: 16,
  border: 'single',
});

// Create todo list container
const listContainer = createBox(world, {
  x: 1,
  y: 1,
  width: 50,
  height: 8,
});
setParent(world, listContainer, mainPanel);

// Create input section
const inputLabel = createText(world, {
  x: 1,
  y: 10,
  content: 'New task:',
});
setParent(world, inputLabel, mainPanel);

const textInput = createTextInput(world, {
  x: 11,
  y: 10,
  width: 38,
  placeholder: 'Enter task...',
});
setParent(world, textInput, mainPanel);

// Create help text
const helpText = createText(world, {
  x: 1,
  y: 13,
  content: '[j/k] Navigate  [Space] Toggle  [Enter] Add',
});
setParent(world, helpText, mainPanel);

const helpText2 = createText(world, {
  x: 1,
  y: 14,
  content: '[d] Delete  [q] Quit',
});
setParent(world, helpText2, mainPanel);
```

## Step 4: Render Todo Items

```typescript
// Array to hold todo item entities
const todoEntities: number[] = [];

function renderTodos(): void {
  // Clear existing entities
  for (const eid of todoEntities) {
    removeEntity(world, eid);
  }
  todoEntities.length = 0;

  // Create entity for each todo
  state.todos.forEach((todo, index) => {
    const isSelected = index === state.selectedIndex;
    const checkbox = todo.completed ? '[x]' : '[ ]';
    const prefix = isSelected ? '> ' : '  ';
    const content = `${prefix}${checkbox} ${todo.text}`;

    const todoEntity = createText(world, {
      x: 0,
      y: index,
      content,
      fg: isSelected ? 0x00ff00ff : (todo.completed ? 0x888888ff : 0xffffffff),
    });
    setParent(world, todoEntity, listContainer);
    todoEntities.push(todoEntity);
  });
}

// Initial render
renderTodos();
```

## Step 5: Handle Input

```typescript
import { parseKeyBuffer, type KeyEvent } from 'blecsd';

function handleKey(key: KeyEvent): void {
  if (state.inputMode) {
    handleInputMode(key);
    return;
  }

  switch (key.name) {
    case 'j':
    case 'down':
      // Move selection down
      state.selectedIndex = Math.min(
        state.selectedIndex + 1,
        state.todos.length - 1
      );
      renderTodos();
      break;

    case 'k':
    case 'up':
      // Move selection up
      state.selectedIndex = Math.max(state.selectedIndex - 1, 0);
      renderTodos();
      break;

    case 'space':
      // Toggle completion
      if (state.todos[state.selectedIndex]) {
        state.todos[state.selectedIndex].completed =
          !state.todos[state.selectedIndex].completed;
        renderTodos();
      }
      break;

    case 'd':
      // Delete selected
      if (state.todos.length > 0) {
        state.todos.splice(state.selectedIndex, 1);
        state.selectedIndex = Math.min(
          state.selectedIndex,
          state.todos.length - 1
        );
        renderTodos();
      }
      break;

    case 'i':
    case 'a':
      // Enter input mode
      state.inputMode = true;
      focusEntity(world, textInput);
      break;

    case 'q':
      // Quit
      cleanup();
      process.exit(0);
      break;
  }
}

function handleInputMode(key: KeyEvent): void {
  switch (key.name) {
    case 'enter':
      // Add new todo
      if (state.inputText.trim()) {
        state.todos.push({
          id: nextId++,
          text: state.inputText.trim(),
          completed: false,
        });
        state.inputText = '';
        setInputValue(world, textInput, '');
        renderTodos();
      }
      state.inputMode = false;
      blurEntity(world, textInput);
      break;

    case 'escape':
      // Cancel input
      state.inputMode = false;
      state.inputText = '';
      setInputValue(world, textInput, '');
      blurEntity(world, textInput);
      break;

    default:
      // Handle text input
      if (key.name === 'backspace') {
        state.inputText = state.inputText.slice(0, -1);
      } else if (key.sequence && key.sequence.length === 1) {
        state.inputText += key.sequence;
      }
      setInputValue(world, textInput, state.inputText);
      break;
  }
}
```

## Step 6: Main Loop

```typescript
// Event bus for application events
const events = createEventBus();

// Handle resize
process.stdout.on('resize', () => {
  const { columns, rows } = process.stdout;
  // Update layout if needed
});

// Input handling
process.stdin.setRawMode(true);
process.stdin.on('data', (data) => {
  const key = parseKeyBuffer(data);
  handleKey(key);

  // Run the scheduler to update the UI
  scheduler.run(world, 0);
});

// Cleanup function
function cleanup(): void {
  program.showCursor();
  program.disableMouse();
  program.normalBuffer();
  process.stdin.setRawMode(false);
}

// Handle exit signals
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});

// Initial render
scheduler.run(world, 0);
```

## Step 7: Run the App

```bash
npx tsx todo.ts
```

## Exercises

1. **Add persistence:** Save todos to a JSON file and load on startup
2. **Add editing:** Press 'e' to edit the selected todo
3. **Add filtering:** Show all, active, or completed todos
4. **Add priorities:** Color-code todos by priority level
5. **Add due dates:** Track and display due dates

## Complete Code

See the full example at: `examples/todo-list/index.ts`

## What You Learned

- Creating a basic blECSd application
- Using form controls (TextInput)
- Managing application state
- Handling keyboard input
- Creating dynamic UI updates

## Next Steps

- [File Browser Tutorial](./file-browser.md) - Learn virtualized lists and file system interaction
- [Form Component Reference](../api/components/form.md) - Full form control API
