# Process Utilities API

Spawn child processes with terminal state management.

## Overview

The process utilities provide:
- Child process spawning with terminal state save/restore
- External editor integration (`readEditor`)
- Command execution with output capture
- Shell utilities (escape, command existence check)

## Quick Start

```typescript
import {
  spawn,
  exec,
  readEditor,
  getDefaultEditor,
  processUtils,
} from 'blecsd';

// Spawn a command
const child = spawn('ls', ['-la'], {
  isAlternateBuffer: true,
  isMouseEnabled: true,
});

// Execute and capture output
const result = await exec('git', ['status']);
console.log(result.stdout);

// Open external editor
const edited = await readEditor({
  content: 'Initial content',
  extension: '.md',
});
```

## External Editor

### readEditor

Open an external editor and return the edited content.

```typescript
import { readEditor } from 'blecsd';

// Basic usage
const content = await readEditor({
  content: 'Initial text to edit',
});

// With options
const markdown = await readEditor({
  content: '# My Document\n\nEdit me!',
  extension: '.md',
  editor: 'vim',
  isAlternateBuffer: true,
  isMouseEnabled: true,
});
```

The function:
1. Creates a temporary file with the initial content
2. Opens the editor (from EDITOR/VISUAL env or specified)
3. Waits for the editor to close
4. Returns the edited content
5. Cleans up the temporary file

### getDefaultEditor

Get the default editor command.

```typescript
import { getDefaultEditor } from 'blecsd';

const editor = getDefaultEditor();
// Checks EDITOR, then VISUAL env vars, falls back to 'vi'
```

### EditorOptions

```typescript
interface EditorOptions {
  content?: string;      // Initial content to edit
  extension?: string;    // File extension (default: '.txt')
  editor?: string;       // Editor command (default: EDITOR/VISUAL/vi)
  output?: Writable;     // Terminal output stream
  input?: ReadStream;    // Terminal input stream
  isAlternateBuffer?: boolean; // Terminal in alternate buffer
  isMouseEnabled?: boolean;    // Mouse tracking enabled
}
```

## Spawning Processes

### spawn

Spawn a child process with terminal state management.

```typescript
import { spawn } from 'blecsd';

const child = spawn('vim', ['file.txt'], {
  isAlternateBuffer: true,
  isMouseEnabled: true,
  onExit: (code, signal) => {
    console.log('Editor exited with code:', code);
  },
});
```

Terminal state is automatically:
1. Saved before spawning
2. Restored when the process exits

### SpawnOptions

```typescript
interface SpawnOptions extends NodeSpawnOptions {
  output?: Writable;           // Terminal output stream
  input?: ReadStream;          // Terminal input stream
  isAlternateBuffer?: boolean; // Exit alternate buffer during spawn
  isMouseEnabled?: boolean;    // Disable mouse during spawn
  onExit?: (code: number | null, signal: string | null) => void;
}
```

## Executing Commands

### exec

Execute a command and capture output.

```typescript
import { exec } from 'blecsd';

const result = await exec('git', ['log', '--oneline', '-10']);

console.log(result.stdout);
console.log(result.exitCode);
```

### execSync

Execute synchronously (blocking).

```typescript
import { execSync } from 'blecsd';

const result = execSync('date');
console.log(result.stdout);
```

### ExecOptions

```typescript
interface ExecOptions extends SpawnOptions {
  timeout?: number;      // Timeout in milliseconds
  maxBuffer?: number;    // Max output buffer (default: 10MB)
  encoding?: string;     // Output encoding (default: 'utf8')
}
```

### ExecResult

```typescript
interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: string | null;
}
```

## Process Utilities

### processUtils.commandExists

Check if a command exists in PATH.

```typescript
import { processUtils } from 'blecsd';

if (processUtils.commandExists('git')) {
  console.log('Git is available');
}
```

### processUtils.getShell

Get the shell for the current platform.

```typescript
import { processUtils } from 'blecsd';

const { shell, args } = processUtils.getShell();
// Unix: { shell: '/bin/bash', args: ['-c'] }
// Windows: { shell: 'cmd.exe', args: ['/c'] }

spawn(shell, [...args, 'echo hello']);
```

### processUtils.shellEscape

Escape a string for shell commands.

```typescript
import { processUtils } from 'blecsd';

const filename = 'file with spaces.txt';
const escaped = processUtils.shellEscape(filename);
// Unix: 'file with spaces.txt'
// Windows: "file with spaces.txt"
```

## Terminal State Management

When spawning processes, the terminal state is automatically managed:

**Before spawn:**
1. Exit alternate screen buffer (if `isAlternateBuffer: true`)
2. Show cursor
3. Disable mouse tracking (if `isMouseEnabled: true`)
4. Reset text styles
5. Exit raw mode

**After spawn:**
1. Re-enter alternate buffer (if was active)
2. Re-enable mouse (if was enabled)
3. Re-enable raw mode (if was enabled)

## Example: Interactive Git Commit

```typescript
import { readEditor, exec, processUtils } from 'blecsd';

async function gitCommit() {
  // Get diff for context
  const diff = await exec('git', ['diff', '--staged']);

  // Open editor for commit message
  const template = `
# Enter commit message above.
# Lines starting with # will be ignored.
#
# Changes to be committed:
${diff.stdout.split('\n').map(l => '# ' + l).join('\n')}
`;

  const message = await readEditor({
    content: template,
    extension: '.gitcommit',
  });

  // Remove comment lines
  const cleanMessage = message
    .split('\n')
    .filter(l => !l.startsWith('#'))
    .join('\n')
    .trim();

  if (cleanMessage) {
    await exec('git', ['commit', '-m', cleanMessage]);
    console.log('Committed!');
  } else {
    console.log('Commit aborted');
  }
}
```

## Example: Interactive Shell

```typescript
import { spawn } from 'blecsd';

function openShell() {
  const { shell, args } = processUtils.getShell();

  return new Promise<void>((resolve) => {
    spawn(shell, [], {
      isAlternateBuffer: true,
      isMouseEnabled: true,
      onExit: () => resolve(),
    });
  });
}

// Usage
await openShell();
console.log('Back from shell');
```

## Error Handling

```typescript
import { readEditor, exec } from 'blecsd';

try {
  const edited = await readEditor({ content: 'Test' });
} catch (error) {
  if (error.message.includes('killed by signal')) {
    console.log('Editor was interrupted');
  } else if (error.message.includes('Failed to start')) {
    console.log('Editor not found');
  }
}

try {
  const result = await exec('nonexistent-command', []);
} catch (error) {
  console.log('Command failed:', error.message);
}
```

## Platform Notes

- **Editor detection**: Uses `EDITOR`, then `VISUAL` env vars, then `vi`
- **Windows**: Uses `COMSPEC` (cmd.exe) for shell commands
- **Unix**: Uses `SHELL` env var or `/bin/sh`
- **Terminal state**: Only manages state for inherited stdio
