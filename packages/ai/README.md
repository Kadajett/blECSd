# @blecsd/ai

AI-focused widgets for blECSd - conversation, streaming markdown, token tracking, tool use, agent workflow.

## Installation

```bash
pnpm add @blecsd/ai
```

## Overview

@blecsd/ai provides specialized terminal UI components for building LLM-powered interfaces. It includes widgets for displaying conversations, rendering streaming markdown, tracking token usage, visualizing tool execution, and managing agent workflows.

## Quick Start

```typescript
import { createWorld } from 'blecsd';
import { createConversation, createStreamingMarkdown, createTokenTracker } from '@blecsd/ai';

const world = createWorld();

// Create a conversation widget
const conversation = createConversation(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 20,
  messages: [
    { role: 'user', content: 'Hello!' },
    { role: 'assistant', content: 'Hi there! How can I help you?' }
  ]
});

// Create a streaming markdown widget for LLM responses
const markdown = createStreamingMarkdown(world, {
  x: 0,
  y: 21,
  width: 80,
  height: 10
});

// Stream content to the markdown widget
markdown.append('## Response\n\n');
markdown.append('This is a **streaming** response.\n');

// Track token usage
const tracker = createTokenTracker(world, {
  x: 0,
  y: 32,
  width: 40,
  height: 3,
  maxTokens: 4096,
  currentTokens: 1250
});
```

## Namespace Imports

The @blecsd/ai package provides namespace objects that group related functions for each widget type. These frozen objects make it easy to explore available functions via IDE autocomplete:

```typescript
import { conversation, streamingMarkdown, tokenTracker } from '@blecsd/ai';

// Conversation operations
const conv = conversation.createConversation(world, { width: 80, height: 30 });
conversation.addMessage(eid, { role: 'user', content: 'Hello!' });
conversation.startStreamingMessage(eid, { role: 'assistant', content: '' });
conversation.appendToMessage(eid, msgId, 'Hi there!');

// Streaming markdown operations
const md = streamingMarkdown.createStreamingMarkdown(world, { width: 80, height: 30 });
streamingMarkdown.appendMarkdown(eid, '## Response\n\n');
streamingMarkdown.appendMarkdown(eid, 'This is **bold** text.\n');
streamingMarkdown.scrollMarkdownByLines(eid, -5);

// Token tracking operations
const tracker = tokenTracker.createTokenTracker(world, { width: 40, height: 10 });
tokenTracker.recordTokens(eid, { inputTokens: 100, outputTokens: 200 });
const stats = tokenTracker.getTokenStats(eid);
```

### Available Namespaces

| Namespace | Purpose | Key Methods |
|-----------|---------|-------------|
| `conversation` | Chat-style conversation threads | `createConversation`, `addMessage`, `startStreamingMessage`, `appendToMessage`, `endStreamingMessage`, `collapseMessage`, `expandMessage`, `searchMessages` |
| `streamingMarkdown` | Real-time markdown rendering | `createStreamingMarkdown`, `appendMarkdown`, `clearMarkdownState`, `scrollMarkdownByLines`, `scrollMarkdownToLine`, `renderBlock`, `renderAllBlocks` |
| `tokenTracker` | LLM token usage tracking | `createTokenTracker`, `recordTokens`, `resetTokenState`, `getTokenStats`, `formatTokenDisplay` |
| `toolUse` | Tool/function call visualization | `createToolUse`, `recordToolCall`, `updateToolResult`, `formatToolDisplay` |
| `agentWorkflow` | Multi-step agent workflow | `createAgentWorkflow`, `addTask`, `updateTaskStatus`, `getWorkflowProgress`, `formatWorkflowDisplay` |

## API

### Widgets

| Widget | Description |
|--------|-------------|
| `createConversation()` | Chat-style conversation view with role-based message display |
| `createStreamingMarkdown()` | Real-time markdown rendering for streaming LLM responses |
| `createTokenTracker()` | Token usage visualization with progress bar and limits |
| `createToolUse()` | Visual display of tool/function calls with parameters and results |
| `createAgentWorkflow()` | Multi-step agent workflow visualization with task tracking |

### Conversation Widget

- Message history management
- Role-based styling (user, assistant, system)
- Auto-scrolling to latest message
- Markdown rendering support

### Streaming Markdown Widget

- Real-time content streaming
- Progressive markdown parsing
- Syntax highlighting for code blocks
- Auto-scroll during streaming

### Token Tracker Widget

- Current token count display
- Token limit visualization
- Progress bar with color-coded zones
- Estimated cost tracking (optional)

### Tool Use Widget

- Tool name and description display
- Parameter visualization
- Result rendering
- Execution status tracking

### Agent Workflow Widget

- Multi-step task visualization
- Task dependency tracking
- Progress indicators per task
- Status badges (pending, running, complete, failed)

## Requirements

- blecsd (peer dependency)
- Node.js 18+

## License

MIT
