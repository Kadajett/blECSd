# Ralph Loop Prompt: Examples Integration

## Focus Area

Full-fledged product examples that showcase blECSd's complete feature set. The blECSd library has grown significantly with new capabilities: reactive signals, 3D rendering, collaborative editing (presence, multi-cursor, CRDTs), debug tools, theming, and 60+ widgets. The existing examples repo at `../blECSd-Examples/` has 15 examples but most were built against v0.4.0 and don't use the new features. This prompt brings everything together into polished, production-quality demonstrations.

## Setup

Before any example work, link the local blECSd build:

```bash
# In the blECSd library directory
cd /home/kadajett/Dev/gameDev2026/blECSd-Parent/blECSd
pnpm build
npm link

# In each example directory
cd /home/kadajett/Dev/gameDev2026/blECSd-Parent/blECSd-Examples/<example-name>
npm link blecsd
```

## Goals (days of work)

### 1. Update All Existing Examples to Latest API

Every existing example needs to be updated to use the latest blECSd APIs (v0.5.0+). Many examples import from older API surfaces. For each existing example:

- Update `package.json` dependency to `"blecsd": "^0.5.0"` (or use `npm link`)
- Fix any broken imports (API renames, moved exports)
- Replace any manual imperative patterns with reactive signals where appropriate
- Verify each example compiles (`npx tsc --noEmit`) and runs (`npx tsx index.ts`, kill after 3s)
- Update the example's README.md if APIs changed

Existing examples to update:
- `3d-backends`, `3d-cube`, `3d-obj-viewer` (3D examples)
- `ascii-clock`, `big-text`, `terminal` (widget demos)
- `balatro`, `roguelike`, `doom`, `kingdom` (games)
- `dvd-bounce` (animation demo)
- `file-manager`, `multiplexer`, `system-monitor`, `telnet-server` (applications)
- `claude-chat`, `agent-orchestrator`, `api-explorer` (AI/API examples)
- `presence-demo` (collaboration)
- `demos` (widget showcase)

### 2. Reactive Dashboard Example (NEW)

Create `reactive-dashboard/` demonstrating the full reactive signal system:

- Multiple data sources using `createPollingSignal`, `createIntervalSignal`, `createCallbackSignal`
- Computed properties that derive display values from raw data
- Declarative UI composition with `el()`, `vbox()`, `hbox()`, `mount()`
- Reactive bindings that auto-update widgets when signals change
- Effects for side effects (logging, alerts when thresholds exceeded)
- Theme switching at runtime (cycle through dark/light/nord/dracula)

Architecture:
```
reactive-dashboard/
  index.ts          # Main entry point
  signals.ts        # Data source signals (CPU, memory, network, disk)
  layout.ts         # Declarative UI layout using vbox/hbox/el
  effects.ts        # Side effects (alerts, logging)
  theme.ts          # Theme configuration and switching
  package.json
  tsconfig.json
  README.md
```

Key imports to use:
```typescript
import {
  createSignal, createComputed, createBatch, createEffect,
  createIntervalSignal, createPollingSignal, createDerivedSignal,
  el, vbox, hbox, mount, bind,
  createWidgetRegistry, registerBuiltinWidgets,
  setActiveTheme, getTheme,
  createWorld, addEntity,
} from 'blecsd';
```

### 3. Collaborative Text Editor Example (NEW)

Create `collab-editor/` demonstrating the collaboration system:

- Uses `createPresenceManager` for user tracking
- Multi-cursor overlays via `MultiCursor` namespace
- Text CRDT for concurrent editing via `ConflictResolution` namespace
- LWW registers for non-text state (cursor position, selection)
- TCP server mode for network transport (from `src/terminal/server.ts`)
- State serialization for persistence

Architecture:
```
collab-editor/
  index.ts          # Main entry, screen setup
  editor.ts         # Text editing logic with CRDT
  presence.ts       # User presence and cursor display
  network.ts        # TCP server/client for sync
  ui.ts             # UI layout with panels
  package.json
  tsconfig.json
  README.md
```

Key imports to use:
```typescript
import {
  createPresenceManager, addUser, moveUserCursor, setUserFocus,
  MultiCursor, createOverlayManager, addSessionOverlay,
  setCursorOverlay, setSelectionOverlay, renderOverlaysToAnsi,
  ConflictResolution, createTextCRDT, insertText, deleteText,
  applyRemoteOp, getTextValue,
  createLWWRegister, setLWWValue, mergeLWWRegisters,
  serializeWorldState, deserializeWorldState,
} from 'blecsd';
```

### 4. Debug Tools Showcase Example (NEW)

Create `debug-showcase/` demonstrating the debug and developer tools:

- Entity inspector showing live component data
- System timing overlay with per-system frame time
- Memory profiler with leak detection
- Slow-frame detector with visual warnings
- Debug toggle (F12 key to show/hide)
- Performance stats overlay

Architecture:
```
debug-showcase/
  index.ts          # Main app with deliberately varying workloads
  workloads.ts      # Configurable workloads (many entities, heavy systems)
  overlay.ts        # Debug overlay setup
  package.json
  tsconfig.json
  README.md
```

Key imports to use:
```typescript
import {
  inspectEntity, inspectWorld, formatEntityInspection,
  createSlowFrameDetector, renderSlowFrameWarning,
  createDebugToggle,
  createMemoryProfiler,
  getPerformanceStats,
  enableTelemetry, getTelemetry,
  enableFrameBudget,
} from 'blecsd';
```

### 5. Plugin System Example (NEW)

Create `plugin-example/` demonstrating the plugin architecture:

- A main app that loads plugins dynamically
- A "weather" plugin that adds a weather widget
- A "theme" plugin that adds custom themes
- A "chart" plugin that registers chart widgets
- Plugin lifecycle demonstration (init, activate, deactivate, cleanup)
- Config validation via Zod schemas

Architecture:
```
plugin-example/
  index.ts            # Main app, plugin loading
  plugins/
    weather.ts        # Weather widget plugin
    custom-theme.ts   # Custom theme plugin
    charts.ts         # Chart widgets plugin
  package.json
  tsconfig.json
  README.md
```

Key imports to use:
```typescript
import {
  definePlugin, createPluginRegistry, registerPlugin,
  activatePlugin, deactivatePlugin,
  createWidgetRegistry, registerBuiltinWidgets,
  extendTheme, setActiveTheme,
  createScheduler, registerSystem,
} from 'blecsd';
```

### 6. Widget Gallery Interactive Example (NEW)

Create `widget-gallery/` as the definitive interactive widget showcase:

- Full-screen TUI app built with blECSd
- Left sidebar: widget list with categories (selectable)
- Right panel: live interactive demo of selected widget
- Bottom panel: example code snippet for the selected widget
- Keyboard navigation: up/down to select, tab to switch panels, q to quit
- Uses the widget registry to enumerate all available widgets
- Each widget has a pre-configured demo with realistic data

This is the "crown jewel" example that shows what blECSd can do.

Architecture:
```
widget-gallery/
  index.ts          # Main entry, screen setup, input handling
  sidebar.ts        # Widget list sidebar
  demo.ts           # Widget demo renderer (one demo per widget type)
  codePanel.ts      # Code snippet display
  demoData.ts       # Demo configurations for each widget
  package.json
  tsconfig.json
  README.md
```

## Quality Gates

For ALL examples:
- `npm link blecsd` must succeed
- `npx tsc --noEmit` must pass (no type errors)
- `timeout 5 npx tsx index.ts` must not crash (exit 0 or timeout)
- README.md exists with description and screenshot placeholder
- `package.json` has correct dependencies and scripts

For new examples:
- Must import from `'blecsd'` only (never internal paths)
- Must use functional patterns (no classes)
- Must handle cleanup on exit (Ctrl+C)
- Must work on minimum 80x24 terminal

## Orchestration

Use Claude Code agent teams for parallel work. The workflow:

1. **Create the team**: `TeamCreate` with a name like `blecsd-examples`
2. **Create git worktrees** in the examples repo: `git -C ../blECSd-Examples worktree add ../blECSd-Examples-w1 -b feat/reactive-dashboard` etc.
3. **Link blECSd** in each worktree: `cd <worktree> && npm link blecsd`
4. **Create tasks** with `TaskCreate` for each example
5. **Spawn workers** with `Task` tool using `subagent_type: "general-purpose"`, `model: "sonnet"`, `team_name`, and `mode: "bypassPermissions"`. Include the worktree path in each worker's prompt.
6. **Workers should**: implement, typecheck, verify it runs, commit, and push their branch
7. **Lead validates** each worker's output
8. **Merge to main** when validated
9. **Clean up**: shut down workers, delete team, remove worktrees

Key rules:
- Use Sonnet for workers, Opus for lead/planning
- Each worker gets ONE example, works in ONE worktree
- Never share worktrees between workers
- Commit with `--no-verify` after manual validation
- Always `npm link blecsd` before starting work in each worktree
- Run `pnpm build` in the blECSd library before linking

## Example Project Template

Each new example should follow this template:

```json
// package.json
{
  "name": "<example-name>-example",
  "version": "0.0.1",
  "description": "<description>",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsup index.ts --format esm --dts",
    "start": "node dist/index.js",
    "dev": "tsx index.ts"
  },
  "dependencies": {
    "blecsd": "^0.5.0"
  },
  "devDependencies": {
    "@types/node": "^25.2.1",
    "tsup": "^8.5.1",
    "tsx": "^4.19.3",
    "typescript": "^5.8.2"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["*.ts"]
}
```

## Manifest Update

After creating new examples, update `manifest.json` in the examples repo root:

```json
{
  "examples": [
    // ... existing entries ...
    {
      "name": "reactive-dashboard",
      "description": "Reactive signal dashboard with live data sources and theme switching",
      "category": "application"
    },
    {
      "name": "collab-editor",
      "description": "Collaborative text editor with multi-cursor, CRDT, and presence",
      "category": "application"
    },
    {
      "name": "debug-showcase",
      "description": "Debug tools demonstration with entity inspector and performance monitoring",
      "category": "demo"
    },
    {
      "name": "plugin-example",
      "description": "Plugin system example with custom widgets, themes, and lifecycle hooks",
      "category": "demo"
    },
    {
      "name": "widget-gallery",
      "description": "Interactive widget gallery showcasing all blECSd widgets",
      "category": "application"
    }
  ]
}
```
