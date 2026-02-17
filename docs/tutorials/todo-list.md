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

```typescript
import { createWorld, addEntity, removeEntity } from 'blecsd/core';
import { setPosition, setDimensions } from 'blecsd/components';
import { layoutSystem, renderSystem, outputSystem } from 'blecsd/systems';
import { createScheduler, LoopPhase, createEventBus } from 'blecsd/core';
import { type KeyEvent } from 'blecsd/terminal';
import { createProgram } from 'blecsd/terminal';
import { createPanel, createText } from 'blecsd/widgets';
import { createTextboxEntity } from 'blecsd/core';
import { setContent, setParent } from 'blecsd/components';
import { blurAll } from 'blecsd/systems';
import { focusEntity } from 'blecsd/components';

// Create the ECS world
const world = createWorld();

// Create the scheduler and register systems
const scheduler = createScheduler();
scheduler.registerSystem(LoopPhase.LAYOUT, layoutSystem);
scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
scheduler.registerSystem(LoopPhase.POST_RENDER, outputSystem);

// Create terminal program
const program = createProgram({
  useAlternateScreen: true,
  hideCursor: true,
});
program.init();
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

```typescript
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
const listContainer = addEntity(world);
setPosition(world, listContainer, 1, 1);
setDimensions(world, listContainer, 50, 8);
setParent(world, listContainer, mainPanel);

// Create input section
const inputLabel = createText(world, {
  x: 1,
  y: 10,
  content: 'New task:',
});
setParent(world, inputLabel, mainPanel);

const textInput = createTextboxEntity(world, {
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
      program.destroy();
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
        setContent(world, textInput, '');
        renderTodos();
      }
      state.inputMode = false;
      blurAll(world);
      break;

    case 'escape':
      // Cancel input
      state.inputMode = false;
      state.inputText = '';
      setContent(world, textInput, '');
      blurAll(world);
      break;

    default:
      // Handle text input
      if (key.name === 'backspace') {
        state.inputText = state.inputText.slice(0, -1);
      } else if (key.sequence && key.sequence.length === 1) {
        state.inputText += key.sequence;
      }
      setContent(world, textInput, state.inputText);
      break;
  }
}
```

## Step 6: Main Loop

```typescript
// Event bus for application events
const events = createEventBus();

// Handle resize
program.on('resize', () => {
  // Update layout if needed
  scheduler.run(world, 0);
});

// Input handling via createProgram
program.on('key', (key: KeyEvent) => {
  handleKey(key);

  // Run the scheduler to update the UI
  scheduler.run(world, 0);
});

// Handle exit signals
process.on('SIGINT', () => {
  program.destroy();
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

See the full example in the [blECSd-Examples repository](https://github.com/Kadajett/blECSd-Examples).

## What You Learned

- Creating a basic blECSd application
- Using form controls (TextboxEntity)
- Managing application state
- Handling keyboard input via `createProgram`
- Creating dynamic UI updates

## Next Steps

- [File Browser Tutorial](./file-browser.md) - Learn virtualized lists and file system interaction
- [Form Component Reference](../api/components/form.md) - Full form control API
