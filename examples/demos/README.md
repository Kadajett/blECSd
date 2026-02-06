# blECSd Demos

Feature demos showcasing blECSd's terminal UI capabilities. Each demo is self-contained and can be run directly with `npx tsx`.

## Running Demos

```bash
# From the project root
npx tsx examples/demos/<name>-demo.ts

# Or from the demos directory
cd examples/demos
pnpm <script-name>
```

All demos: press `q` or `Ctrl+C` to quit.

## Shared Utilities

[`demo-utils.ts`](./demo-utils.ts) provides common helpers for terminal setup/teardown, input parsing, and rendering. Import from `./demo-utils` in any demo.

## Demo Index

### Widgets

| Demo | Description | Run |
|------|-------------|-----|
| Box Widget | Borders, padding, content alignment, focus cycling | `npx tsx examples/demos/box-widget-demo.ts` |
| Box Drawing | Unicode box-drawing characters and line styles | `npx tsx examples/demos/box-drawing-demo.ts` |
| Scrollable Box | Scrollable content within a box widget | `npx tsx examples/demos/scrollable-box-demo.ts` |
| Hover Tooltips | Tooltip display on hover/focus | `npx tsx examples/demos/hover-tooltips-demo.ts` |
| Markdown Rendering | Inline markdown rendering with styles | `npx tsx examples/demos/markdown-rendering-demo.ts` |

### Layout and Dimensions

| Demo | Description | Run |
|------|-------------|-----|
| Dimensions | Entity positioning and size queries | `npx tsx examples/demos/dimensions-demo.ts` |
| Auto Padding | Automatic padding calculation | `npx tsx examples/demos/auto-padding-demo.ts` |
| Style Inheritance | Parent-to-child style propagation | `npx tsx examples/demos/style-inheritance-demo.ts` |
| Resize Handling | Terminal resize detection and adaptive layout | `npx tsx examples/demos/resize-handling-demo.ts` |

### Input and Navigation

| Demo | Description | Run |
|------|-------------|-----|
| Keyboard Input | Parsed key names and modifier states | `npx tsx examples/demos/keyboard-input-demo.ts` |
| Focus Navigation | Tab/Shift+Tab focus cycling between elements | `npx tsx examples/demos/focus-navigation-demo.ts` |
| Vi Navigation | hjkl and vim-style key bindings | `npx tsx examples/demos/vi-navigation-demo.ts` |
| Terminal Focus | Terminal focus-in/focus-out events | `npx tsx examples/demos/terminal-focus-demo.ts` |
| Kitty Protocol | Kitty keyboard protocol support | `npx tsx examples/demos/kitty-protocol-demo.ts` |

### Scrolling and Text

| Demo | Description | Run |
|------|-------------|-----|
| Scrollable | Keyboard scrolling with position tracking | `npx tsx examples/demos/scrollable-demo.ts` |
| Fast Word Wrap | High-performance word wrapping | `npx tsx examples/demos/fast-word-wrap-demo.ts` |
| Large Text Search | Incremental search in large text buffers | `npx tsx examples/demos/large-text-search-demo.ts` |
| Rope Data Structure | Rope-based text editing operations | `npx tsx examples/demos/rope-data-structure-demo.ts` |
| Virtual Data Structure | Virtualized rendering for large datasets | `npx tsx examples/demos/virtual-data-structure-demo.ts` |

### Systems and ECS

| Demo | Description | Run |
|------|-------------|-----|
| Animation System | ECS-based animation with velocity and position | `npx tsx examples/demos/animation-system-demo.ts` |
| Entity Factories | Creating entities with factory functions | `npx tsx examples/demos/entity-factories-demo.ts` |

### Terminal

| Demo | Description | Run |
|------|-------------|-----|
| Terminfo/Tput | Terminal capability detection | `npx tsx examples/demos/terminfo-tput-demo.ts` |

### Full Applications

| App | Description | Run |
|-----|-------------|-----|
| Markdown Viewer | Split-pane viewer with tree navigation and search | `npx tsx examples/demos/markdown-viewer/index.ts` |
| Form Builder | Multi-field form with validation | `npx tsx examples/demos/form-builder/index.ts` |
| Kanban Board | Three-column board with drag-and-drop | `npx tsx examples/demos/kanban/index.ts` |
