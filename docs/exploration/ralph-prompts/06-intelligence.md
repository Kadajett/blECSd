# Ralph Loop Prompt: Intelligence

## Focus Area

AI-native terminal primitives. Every developer tool is integrating LLMs, but the terminal UI layer has zero support for it. Streaming text arrives character by character and gets rendered naively. Tool-use results dump as raw JSON. Agent workflows are invisible. blECSd should be the first terminal UI library with first-class primitives for AI-powered applications: streaming text renderers, tool-use visualization, conversation threading, token usage displays, and agent workflow UIs.

## Goals (days of work)

1. **Streaming text renderer**: Build a widget specifically designed for LLM output. Not just appending characters, but: proper markdown rendering as text arrives (headers, code blocks, lists, bold/italic), syntax highlighting for code blocks that updates as the block grows, smooth scrolling that follows the output but can be "detached" when the user scrolls up (like a chat app), and a "thinking" indicator when waiting for the first token. The streaming text widget already exists at `src/widgets/streamingText.ts` but needs significant enhancement for markdown and code blocks.

2. **Tool-use visualization**: When an AI agent calls tools, show it visually. Build a widget that renders tool calls as expandable cards: tool name, parameters (formatted), status (pending/running/complete/error), result (collapsible), and duration. Think of how Claude Code shows tool use in the terminal, but as a reusable widget. Include a timeline view showing the sequence of tool calls for multi-step agent workflows.

3. **Conversation thread widget**: Build a widget for rendering conversation threads (user/assistant turns). Each message is a styled block with role indicator, timestamp, and content. Assistant messages use the streaming text renderer. User messages are static. Support for branching conversations (like ChatGPT's edit-and-regenerate). Support for collapsing old turns. Support for search within conversation history.

4. **Token and cost tracker**: Build a widget that displays token usage in real time: input tokens, output tokens, total tokens, estimated cost, tokens per second, and a sparkline showing throughput over time. This is useful for any AI application and surprisingly hard to find as a pre-built component. Include support for multiple model pricing tiers.

5. **Agent workflow visualizer**: For complex AI agent systems (multi-agent, tool-use chains, planning loops), build a widget that renders the workflow as a directed graph or tree. Each node is an agent step: what it did, what it decided, what it delegated. Expand/collapse subtrees. Color-code by status (running, complete, failed, waiting). This turns opaque agent behavior into something debuggable.

6. **Proposal: Structured terminal output protocol**: Write a technical proposal for a terminal output protocol that goes beyond raw text. Current terminals process a stream of characters and escape sequences. Propose a structured output layer where applications can emit semantic blocks: "this is a code block in Python", "this is a table with these columns", "this is an image at this URL", "this block is collapsible". Terminal emulators that support the protocol render these natively. Emulators that don't see graceful fallback text. This would transform terminal UIs from "paint characters" to "declare content" and enable accessibility, search, copy-paste, and AI comprehension of terminal output. Document in `docs/proposals/`.

## What to build

- Enhanced streaming text widget with markdown rendering in `src/widgets/streamingText.ts`
- Syntax highlighting for streaming code blocks (integrate with `src/text/syntaxHighlight.ts`)
- Tool-use visualization widget in `src/widgets/toolUse.ts`
- Conversation thread widget in `src/widgets/conversation.ts`
- Token/cost tracker widget in `src/widgets/tokenTracker.ts`
- Agent workflow visualizer in `src/widgets/agentWorkflow.ts`
- Structured output protocol proposal in `docs/proposals/structured-output.md`
- Tests for all new widgets, especially streaming edge cases
- Example app showing all AI widgets together

## Quality gates

- Streaming text handles partial UTF-8 sequences correctly
- Markdown rendering handles incomplete blocks (code fence opened but not closed yet)
- Tool-use widget handles rapid sequential tool calls without flickering
- Conversation widget handles 1000+ turns without memory growth
- All widgets work without the update loop (library-first principle)
- All public APIs have JSDoc with @example blocks
- No direct bitecs imports (use core/ecs wrapper)

## Orchestration

Use Claude Code agent teams for parallel work. The workflow:

1. **Create the team**: `TeamCreate` with a name like `blecsd-intelligence`
2. **Create git worktrees** before spawning workers: `git worktree add ../blECSd-w1 -b feat/streaming-markdown` etc. Every worker MUST have its own worktree.
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
