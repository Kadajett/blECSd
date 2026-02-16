# Ralph Loop Prompt: Composability

## Focus Area

Plugin ecosystem, theming, widget registry, and developer experience. blECSd already has 40+ widgets and a plugin system, but nobody can find them. The competitive analysis revealed a "discoverability problem": features exist but aren't obvious. This focus area is about making blECSd the platform people build ON, not just the library they use. Think npm for terminal widgets. Think Material UI's component gallery but for the terminal.

## Goals (days of work)

1. **Theme system overhaul**: The stylesheet system exists in `src/style/` but themes are basic. Build a comprehensive theming system: named theme presets (dark, light, solarized, monokai, nord, dracula, gruvbox), per-widget style overrides, dynamic theme switching at runtime without re-creating widgets, and theme inheritance (a "dashboard" theme that extends "dark" with different gauge colors). Themes should be JSON-serializable so users can share them.

2. **Widget registry and discovery**: Build a runtime widget registry where all built-in widgets self-register with metadata: name, description, default config, config schema (Zod), required components, supported events. This registry powers autocomplete, documentation generation, and the widget gallery. Add `blecsd widgets list` CLI command that prints all available widgets with descriptions. Add `blecsd widgets info <name>` that shows the full config schema.

3. **Plugin API v2**: The plugin system in `src/core/plugins.ts` exists but is minimal. Extend it: plugins can register new components, systems, widgets, themes, and CLI commands. Plugins declare dependencies on other plugins. Plugin lifecycle hooks: onInit, onActivate, onDeactivate, onDestroy. Plugin configuration via Zod schemas. A plugin should be as simple as `export default definePlugin({ name: 'my-charts', widgets: [MyBarChart, MyPieChart] })`.

4. **CLI scaffolding and project templates**: The `blecsd` CLI (`src/cli/init.ts`) exists but is basic. Expand it: `blecsd init` creates a new project with TypeScript config, blECSd dependency, and a hello-world app. `blecsd init --template dashboard` creates a dashboard template. `blecsd init --template game` creates a game template. Templates should be downloadable from a registry (or bundled initially). Include proper `tsconfig.json`, `package.json`, and a working example for each template.

5. **Developer tools enhancement**: The debug module exists in `src/debug/`. Expand it: real-time entity inspector (shows all components on a selected entity), system timing overlay (shows per-system frame time), memory usage tracker, and a "slow frame" warning that highlights when the frame budget is exceeded. These tools should be activatable via a keyboard shortcut (F12 or similar) and render as an overlay without disrupting the app layout.

6. **Interactive widget gallery**: Build a terminal app (using blECSd itself) that showcases every widget with live interactive demos. Each widget page shows: description, live demo you can interact with, configuration options you can tweak in real time, and the code to recreate it. This is the single most impactful thing for adoption. Run it with `blecsd gallery` or `pnpm playground`. Start with 10 widgets and expand from there.

## What to build

- Theme presets and runtime theme switching in `src/style/themes/`
- Widget registry with metadata in `src/widgets/registry.ts` (already exists, enhance it)
- Plugin API v2 with lifecycle hooks and dependency resolution
- CLI templates: dashboard, game, basic
- Debug tools overlay with entity inspector and system timing
- Interactive widget gallery in `playground/gallery.ts`
- Tests for theme switching, plugin loading, registry operations
- JSDoc and API docs for all new public APIs

## Quality gates

- Theme switching works without entity re-creation (hot swap)
- Widget registry is complete (every built-in widget is registered)
- Plugin lifecycle is tested (init, activate, deactivate, destroy)
- CLI templates produce projects that build and run without errors
- Gallery renders correctly on 80x24 minimum terminal size
- All public APIs have JSDoc with @example blocks

## Orchestration

Use Claude Code agent teams for parallel work. The workflow:

1. **Create the team**: `TeamCreate` with a name like `blecsd-ecosystem`
2. **Create git worktrees** before spawning workers: `git worktree add ../blECSd-w1 -b feat/theme-overhaul` etc. Every worker MUST have its own worktree.
3. **Create tasks** with `TaskCreate` for each work item
4. **Spawn workers** with `Task` tool using `subagent_type: "general-purpose"`, `model: "sonnet"`, `team_name`, and `mode: "bypassPermissions"`. Include the worktree path in each worker's prompt.
5. **Workers should**: implement, test, lint, typecheck, commit, and push their branch
6. **Lead validates** each worker's output: run tests, lint, typecheck, build on their worktree
7. **Merge to main** when validated, then rebase other workers: `git fetch origin && git rebase origin/main`
8. **Clean up**: shut down workers, delete team, remove worktrees

Key rules:
- Use Sonnet for workers, Opus for lead/planning
- Each worker gets ONE task, works in ONE worktree
- Never share worktrees between workers
- Commit with `--no-verify` after manual validation to skip slow pre-push hooks
- Always create git tags when bumping versions
