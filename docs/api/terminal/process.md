# Process Utilities

Process spawning and execution utilities with automatic terminal state management.

## Overview

The process utilities provide functions for spawning child processes, executing shell commands, and interacting with external editors. All functions automatically manage terminal state (alternate buffer, mouse tracking, raw mode) to ensure clean transitions between your terminal application and external processes.

**Key Features:**
- Automatic terminal state save/restore
- Support for alternate buffer and mouse tracking
- Async and sync execution modes
- External editor integration
- Shell command utilities

## Imports

```typescript
import {
  spawn,
  exec,
  execSync,
  readEditor,
  getDefaultEditor,
  processUtils,
  type SpawnOptions,
  type ExecOptions,
  type ExecResult,
  type EditorOptions,
} from 'blecsd/terminal';

// Or use the process namespace (note: shadows Node.js global `process`)
import { process as proc } from 'blecsd/terminal';
proc.spawn('ls', ['-la']);
```

## API

### `spawn(file, args?, options?)`

Spawn a child process with terminal state management.

Automatically handles:
1. Exiting alternate screen buffer (if active)
2. Showing the cursor
3. Disabling mouse tracking (if enabled)
4. Exiting raw mode

When the process exits, the terminal state is restored.

**Parameters:**
- `file: string` — Command to spawn
- `args?: string[]` — Arguments for the command (default: `[]`)
- `options?: SpawnOptions` — Spawn options including terminal state

**Returns:** `ChildProcess` — The spawned child process

**Example:**
```typescript
import { spawn } from 'blecsd/terminal';

// Spawn a shell command
const child = spawn('ls', ['-la'], {
  isAlternateBuffer: true,
  isMouseEnabled: true,
  onExit: (code, signal) => {
    console.log('Process exited with code:', code);
  },
});
```

### `exec(file, args?, options?)`

Execute a command and wait for it to complete.

This is a Promise-based wrapper around `spawn` that collects and returns the stdout/stderr of the process.

**Parameters:**
- `file: string` — Command to execute
- `args?: string[]` — Arguments for the command (default: `[]`)
- `options?: ExecOptions` — Exec options

**Returns:** `Promise<ExecResult>` — Promise resolving to the exec result

**Example:**
```typescript
import { exec } from 'blecsd/terminal';

const result = await exec('git', ['status'], {
  isAlternateBuffer: true,
  timeout: 5000, // 5 second timeout
});
console.log(result.stdout);
console.log(result.stderr);
console.log('Exit code:', result.exitCode);
```

### `execSync(file, args?, options?)`

Execute a command synchronously.

**Warning:** This blocks the event loop until the command completes. Use sparingly.

**Parameters:**
- `file: string` — Command to execute
- `args?: string[]` — Arguments for the command (default: `[]`)
- `options?: Omit<SpawnOptions, 'onExit'>` — Spawn options (excluding `onExit`)

**Returns:** `ExecResult` — The exec result

**Example:**
```typescript
import { execSync } from 'blecsd/terminal';

const result = execSync('date');
console.log(result.stdout);
```

### `readEditor(options?)`

Open an external editor and return the edited content.

This function:
1. Creates a temporary file with the initial content
2. Opens the editor (uses `EDITOR`/`VISUAL` env var or specified editor)
3. Waits for the editor to close
4. Returns the edited content
5. Cleans up the temporary file

**Parameters:**
- `options?: EditorOptions` — Editor options

**Returns:** `Promise<string>` — Promise resolving to the edited content

**Example:**
```typescript
import { readEditor } from 'blecsd/terminal';

// Open editor with initial content
const edited = await readEditor({
  content: 'Initial content to edit',
  extension: '.md',
  isAlternateBuffer: true,
});
console.log('Edited content:', edited);

// Use a specific editor
const edited2 = await readEditor({
  editor: 'nano',
  content: 'Edit me!',
});
```

### `getDefaultEditor()`

Get the default editor command.

Checks `EDITOR`, then `VISUAL` environment variables, then falls back to `'vi'`.

**Returns:** `string` — The editor command

**Example:**
```typescript
import { getDefaultEditor } from 'blecsd/terminal';

const editor = getDefaultEditor();
console.log('Default editor:', editor);
// Example output: "vim", "nano", "code --wait", etc.
```

### `processUtils`

Utilities namespace for common process operations.

#### `processUtils.commandExists(command)`

Check if a command exists in PATH.

**Parameters:**
- `command: string` — Command to check

**Returns:** `boolean` — True if command exists

**Example:**
```typescript
import { processUtils } from 'blecsd/terminal';

if (processUtils.commandExists('git')) {
  console.log('Git is installed');
}
```

#### `processUtils.getShell()`

Get the shell command for the current platform.

**Returns:** `{ shell: string; args: string[] }`

**Example:**
```typescript
import { processUtils, spawn } from 'blecsd/terminal';

const { shell, args } = processUtils.getShell();
spawn(shell, [...args, 'echo hello']);
```

#### `processUtils.shellEscape(str)`

Escape a string for use in shell commands.

**Parameters:**
- `str: string` — String to escape

**Returns:** `string` — Escaped string

**Example:**
```typescript
import { processUtils } from 'blecsd/terminal';

const filename = 'file with spaces.txt';
const escaped = processUtils.shellEscape(filename);
// On Unix: 'file with spaces.txt'
// On Windows: "file with spaces.txt"
```

## Types

### `SpawnOptions`

Options for spawning a process.

```typescript
interface SpawnOptions extends SpawnOptionsWithoutStdio {
  /** Output stream for terminal restoration (default: process.stdout) */
  output?: Writable;
  /** Input stream for terminal state (default: process.stdin) */
  input?: NodeJS.ReadStream;
  /** Whether the terminal is in alternate buffer mode (default: false) */
  isAlternateBuffer?: boolean;
  /** Whether mouse tracking is enabled (default: false) */
  isMouseEnabled?: boolean;
  /** Callback when process exits */
  onExit?: (code: number | null, signal: NodeJS.Signals | null) => void;
}
```

### `ExecOptions`

Options for executing a process and waiting.

```typescript
interface ExecOptions extends SpawnOptions {
  /** Timeout in milliseconds (default: no timeout) */
  timeout?: number;
  /** Maximum buffer size for output (default: 10MB) */
  maxBuffer?: number;
  /** Encoding for output (default: 'utf8') */
  encoding?: BufferEncoding;
}
```

### `ExecResult`

Result of an exec operation.

```typescript
interface ExecResult {
  /** Standard output */
  stdout: string;
  /** Standard error */
  stderr: string;
  /** Exit code (null if killed by signal) */
  exitCode: number | null;
  /** Signal that killed the process (null if exited normally) */
  signal: NodeJS.Signals | null;
}
```

### `EditorOptions`

Options for opening an external editor.

```typescript
interface EditorOptions {
  /** Initial content to edit */
  content?: string;
  /** File extension for temp file (default: '.txt') */
  extension?: string;
  /** Editor command (default: EDITOR or VISUAL env var, then 'vi') */
  editor?: string;
  /** Output stream for terminal restoration (default: process.stdout) */
  output?: Writable;
  /** Input stream for terminal state (default: process.stdin) */
  input?: NodeJS.ReadStream;
  /** Whether the terminal is in alternate buffer mode (default: false) */
  isAlternateBuffer?: boolean;
  /** Whether mouse tracking is enabled (default: false) */
  isMouseEnabled?: boolean;
}
```

## Complete Examples

### Running Git Commands

```typescript
import { exec } from 'blecsd/terminal';

async function checkGitStatus() {
  const result = await exec('git', ['status', '--short'], {
    isAlternateBuffer: true,
  });
  
  if (result.exitCode === 0) {
    console.log('Git status:', result.stdout);
  } else {
    console.error('Git error:', result.stderr);
  }
}
```

### Interactive Editor Workflow

```typescript
import { readEditor, getDefaultEditor } from 'blecsd/terminal';

async function editCommitMessage() {
  const editor = getDefaultEditor();
  console.log(`Using editor: ${editor}`);
  
  const message = await readEditor({
    content: '# Enter commit message\n\n',
    extension: '.txt',
    editor,
    isAlternateBuffer: true,
  });
  
  // Filter out comment lines
  const finalMessage = message
    .split('\n')
    .filter(line => !line.startsWith('#'))
    .join('\n')
    .trim();
  
  if (!finalMessage) {
    console.log('Commit message empty, aborting');
  } else {
    console.log('Commit message:', finalMessage);
  }
}
```

### Shell Command with Timeout

```typescript
import { exec } from 'blecsd/terminal';

async function runWithTimeout() {
  try {
    const result = await exec('long-running-command', [], {
      timeout: 5000, // 5 seconds
      maxBuffer: 1024 * 1024, // 1MB
    });
    console.log('Command completed:', result.stdout);
  } catch (err) {
    if (err.message.includes('timeout')) {
      console.error('Command timed out');
    } else {
      console.error('Command failed:', err);
    }
  }
}
```

### Spawning a Long-Running Process

```typescript
import { spawn } from 'blecsd/terminal';

function tailLogFile() {
  const child = spawn('tail', ['-f', '/var/log/app.log'], {
    isAlternateBuffer: true,
    onExit: (code, signal) => {
      console.log(`tail exited: code=${code}, signal=${signal}`);
    },
  });
  
  // Kill on Ctrl+C
  process.on('SIGINT', () => {
    child.kill('SIGTERM');
  });
}
```

## Namespace Usage

The `process` namespace provides the same functions as a single import:

```typescript
import { process as proc } from 'blecsd/terminal';

// Execute synchronously
const result = proc.execSync('ls', ['-la']);
console.log(result.stdout);

// Execute asynchronously
const asyncResult = await proc.exec('git', ['status']);
console.log(asyncResult.stdout);

// Spawn process
const child = proc.spawn('tail', ['-f', 'log.txt']);

// Open editor
const editor = proc.getDefaultEditor();
const text = await proc.readEditor({
  content: 'Initial content',
  editor,
  extension: '.md',
});
```

**Note:** Importing the `process` namespace will shadow the Node.js global `process`. Use an alias (`import { process as proc }`) if you need both.

## Terminal State Management

All process functions automatically manage terminal state transitions:

**Before spawning:**
1. Exit alternate buffer (if `isAlternateBuffer: true`)
2. Show cursor
3. Disable mouse tracking (if `isMouseEnabled: true`)
4. Exit raw mode (if `input.setRawMode` was enabled)

**After process exits:**
1. Re-enter alternate buffer (if it was active)
2. Re-enable mouse tracking (if it was enabled)
3. Re-enter raw mode (if it was enabled)

This ensures clean transitions without manual cleanup code.

## See Also

- [Server App](./server-app.md) — Higher-level application framework
- [ANSI Codes](../ansi.md) — Terminal escape sequences
