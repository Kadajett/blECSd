# Process Spawn/Exec Utilities

The process module provides utilities for spawning child processes from terminal applications with proper terminal state management.

## Overview

When spawning external processes from a terminal application, the terminal needs to be prepared:
1. Exit alternate screen buffer (if active)
2. Show the cursor
3. Disable mouse tracking (if enabled)
4. Exit raw mode

After the process exits, the terminal state should be restored. This module handles all of this automatically.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import { spawn, exec, readEditor } from 'blecsd/terminal';

// Spawn a command with terminal state management
const child = spawn('vim', ['file.txt'], {
  isAlternateBuffer: true,
  isMouseEnabled: true,
  onExit: (code) => {
    console.log('Editor exited with code:', code);
  },
});

// Execute and capture output
const result = await exec('git', ['status'], {
  isAlternateBuffer: true,
});
console.log(result.stdout);

// Open an external editor
const content = await readEditor({
  content: 'Edit this text',
  editor: 'nano',
});
console.log('Edited content:', content);
```

## Functions

### spawn()

Spawn a child process with terminal state management.

```typescript
function spawn(
  file: string,
  args?: string[],
  options?: SpawnOptions
): ChildProcess
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `string` | Command to spawn |
| `args` | `string[]` | Arguments for the command |
| `options` | `SpawnOptions` | Spawn options including terminal state |

**Returns:** `ChildProcess` - The spawned child process

**Example:**

```typescript
import { spawn } from 'blecsd/terminal';

// Spawn a shell command
const child = spawn('ls', ['-la'], {
  isAlternateBuffer: true,
  isMouseEnabled: true,
  onExit: (code, signal) => {
    console.log('Process exited:', code, signal);
    // Terminal state is automatically restored here
  },
});

// Process runs with inherited stdio
```

### exec()

Execute a command and wait for it to complete, capturing output.

```typescript
function exec(
  file: string,
  args?: string[],
  options?: ExecOptions
): Promise<ExecResult>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `string` | Command to execute |
| `args` | `string[]` | Arguments for the command |
| `options` | `ExecOptions` | Exec options |

**Returns:** `Promise<ExecResult>` - Promise resolving to the exec result

**Example:**

```typescript
import { exec } from 'blecsd/terminal';

// Execute and capture output
const result = await exec('git', ['status'], {
  isAlternateBuffer: true,
  timeout: 5000, // 5 second timeout
});

console.log('Exit code:', result.exitCode);
console.log('Output:', result.stdout);

if (result.stderr) {
  console.error('Errors:', result.stderr);
}
```

### execSync()

Execute a command synchronously, blocking until completion.

```typescript
function execSync(
  file: string,
  args?: string[],
  options?: Omit<SpawnOptions, 'onExit'>
): ExecResult
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `file` | `string` | Command to execute |
| `args` | `string[]` | Arguments for the command |
| `options` | `SpawnOptions` | Spawn options (without onExit) |

**Returns:** `ExecResult` - The exec result

**Example:**

```typescript
import { execSync } from 'blecsd/terminal';

// Execute synchronously (blocks event loop)
const result = execSync('date');
console.log('Current date:', result.stdout.trim());
```

### readEditor()

Open an external editor and return the edited content.

```typescript
function readEditor(options?: EditorOptions): Promise<string>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `EditorOptions` | Editor options |

**Returns:** `Promise<string>` - Promise resolving to the edited content

**Example:**

<!-- blecsd-doccheck:ignore -->
```typescript
import { readEditor } from 'blecsd/terminal';

// Open editor with initial content
const edited = await readEditor({
  content: 'Initial content to edit',
  extension: '.md',
});
console.log('Edited content:', edited);

// Use a specific editor
const edited2 = await readEditor({
  editor: 'code --wait',  // VS Code
  content: 'Edit me!',
});

// Use EDITOR environment variable
const edited3 = await readEditor({
  content: 'Uses $EDITOR or $VISUAL',
});
```

### getDefaultEditor()

Get the default editor command from environment variables.

```typescript
function getDefaultEditor(): string
```

**Returns:** `string` - The editor command (EDITOR, VISUAL, or 'vi')

**Example:**

```typescript
import { getDefaultEditor } from 'blecsd/terminal';

const editor = getDefaultEditor();
console.log('Default editor:', editor);
// Returns: process.env.EDITOR || process.env.VISUAL || 'vi'
```

## Types

### SpawnOptions

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

### ExecOptions

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

### ExecResult

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

### EditorOptions

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

## processUtils Namespace

Utility functions for common process operations.

### commandExists()

Check if a command exists in PATH.

```typescript
processUtils.commandExists(command: string): boolean
```

**Example:**

```typescript
import { processUtils } from 'blecsd/terminal';

if (processUtils.commandExists('git')) {
  console.log('Git is installed');
}

if (!processUtils.commandExists('mycommand')) {
  console.log('mycommand not found in PATH');
}
```

### getShell()

Get the shell command for the current platform.

```typescript
processUtils.getShell(): { shell: string; args: string[] }
```

**Example:**

```typescript
import { processUtils, spawn } from 'blecsd/terminal';

const { shell, args } = processUtils.getShell();
// On Unix: { shell: '/bin/bash', args: ['-c'] }
// On Windows: { shell: 'cmd.exe', args: ['/c'] }

// Execute a shell command
spawn(shell, [...args, 'echo "Hello World"']);
```

### shellEscape()

Escape a string for use in shell commands.

```typescript
processUtils.shellEscape(str: string): string
```

**Example:**

<!-- blecsd-doccheck:ignore -->
```typescript
import { processUtils } from 'blecsd/terminal';

const filename = 'file with spaces.txt';
const escaped = processUtils.shellEscape(filename);
// On Unix: "'file with spaces.txt'"
// On Windows: '"file with spaces.txt"'

// Safe to use in shell commands
const { shell, args } = processUtils.getShell();
spawn(shell, [...args, `cat ${escaped}`]);
```

## Usage Patterns

### Game Integration

```typescript
import { spawn, readEditor } from 'blecsd/terminal';
import { SuspendManager } from 'blecsd/terminal';

class Game {
  private suspendManager: SuspendManager;
  private isAlternateBuffer = true;
  private isMouseEnabled = true;

  openHelp() {
    // Spawn a pager to show help
    spawn('less', ['help.txt'], {
      isAlternateBuffer: this.isAlternateBuffer,
      isMouseEnabled: this.isMouseEnabled,
      onExit: () => {
        // Re-render game when pager closes
        this.render();
      },
    });
  }

  async editConfig() {
    // Open config in external editor
    const currentConfig = JSON.stringify(this.config, null, 2);
    const edited = await readEditor({
      content: currentConfig,
      extension: '.json',
      isAlternateBuffer: this.isAlternateBuffer,
      isMouseEnabled: this.isMouseEnabled,
    });

    // Parse and apply edited config
    try {
      this.config = JSON.parse(edited);
      this.render();
    } catch (e) {
      this.showError('Invalid JSON in config');
    }
  }
}
```

### Shell Command Execution

```typescript
import { exec, processUtils } from 'blecsd/terminal';

async function runGitCommand(args: string[]) {
  // Check if git is available
  if (!processUtils.commandExists('git')) {
    throw new Error('Git is not installed');
  }

  const result = await exec('git', args, {
    isAlternateBuffer: true,
    timeout: 30000, // 30 second timeout
  });

  if (result.exitCode !== 0) {
    throw new Error(`Git failed: ${result.stderr}`);
  }

  return result.stdout;
}

// Usage
const status = await runGitCommand(['status', '--short']);
console.log('Changed files:', status);
```

## Terminal State Flow

When spawning a process, the following sequence occurs:

### Prepare for Spawn

1. Exit alternate buffer (if `isAlternateBuffer: true`)
2. Show cursor
3. Disable mouse tracking (if `isMouseEnabled: true`)
4. Reset text styles
5. Exit raw mode

### After Process Exits

1. Re-enable raw mode
2. Re-enter alternate buffer (if was in it)
3. Re-enable mouse tracking (if was enabled)
4. Call `onExit` callback

## Platform Notes

- **Unix/Linux/macOS**: Full support for all features
- **Windows**:
  - `getShell()` returns `cmd.exe` with `/c` argument
  - `shellEscape()` uses double quotes (Windows style)
  - `commandExists()` uses `where` instead of `which`

## Related

- [Suspend/Resume](./suspend.md) - Manual suspend with Ctrl+Z
- [Cleanup Module](./cleanup.md) - Terminal cleanup on exit
- [Screen Namespace](./ansi.md#screen) - Alternate buffer control
