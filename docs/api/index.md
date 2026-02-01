# API Reference

This section contains the API documentation for blECSd.

## Public API

The public API is stable and intended for general use:

- [Game Class](./game.md) - Main game interface
- [Widgets](./widgets/) - UI widgets
- [Components](./components/) - ECS components
- [Systems](./systems/) - ECS systems
- [Input](./input.md) - Input handling
- [Schemas](./schemas.md) - Configuration schemas

## Terminal I/O (Internal)

These modules are used internally by the library. They are documented for advanced users and contributors:

### Core

- [Program Class](./program.md) - Main terminal control interface
- [ANSI Escape Codes](./ansi.md) - Cursor, style, screen, mouse escape sequences
- [Terminal Detection](./detection.md) - Detect terminal type and capabilities
- [Terminal Cleanup](./cleanup.md) - Global cleanup coordination

### Rendering

- [Output Buffer](./output-buffer.md) - Efficient buffered output
- [Screen Buffer](./screen-buffer.md) - Alternate screen buffer management
- [Synchronized Output](./sync-output.md) - Flicker-free rendering (DEC 2026)

### Features

- [Character Set Handling](./charset.md) - G0-G3 designation, ACS mode, and box drawing
- [Window Manipulation](./window-ops.md) - Window position, size, and state control
- [Hyperlinks](./hyperlink.md) - Clickable links in terminal output (OSC 8)
- [Suspend/Resume](./suspend.md) - SIGTSTP (Ctrl+Z) and SIGCONT handling
- [Process Utilities](./process.md) - Spawn child processes with terminal state management
- [Debug Logging](./debug.md) - Debug logging and terminal state dumping

### Advanced (VT400+)

- [Media Copy (Print)](./media-copy.md) - Terminal printing and media copy operations
- [Rectangular Area Operations](./rectangle.md) - Copy, fill, erase rectangles (DECCRA, DECFRA, etc.)
- [DEC Locator](./locator.md) - Advanced mouse protocol with pixel precision

### Utilities

- [Security (Escape Sanitization)](./security.md) - Sanitize escape sequences from untrusted input
- [Tmux Pass-Through](./tmux.md) - Handle escape sequences in tmux sessions
- [Response Parser](./response-parser.md) - Parse terminal query responses

## Module Structure

```
blecsd/
├── index.ts           # Public exports
└── terminal/          # Terminal I/O (internal)
    ├── ansi.ts        # ANSI escape code generators
    ├── detection.ts   # Terminal capability detection
    ├── program.ts     # Program class
    ├── responseParser.ts  # Terminal response parsing
    ├── security/      # Security utilities
    │   └── sanitize.ts
    └── ...
```

## Import Patterns

### Public API

```typescript
import { createGame } from 'blecsd';
```

### Terminal I/O (Advanced)

```typescript
import {
  // Detection (public)
  isTmux,
  isColorSupported,
  getTerminalInfo,

  // Character sets (internal)
  charset,
  boxDrawing,
  DEC_SPECIAL_GRAPHICS,
  UNICODE_TO_ASCII,

  // Window manipulation (internal)
  windowOps,

  // Hyperlinks (internal)
  hyperlink,
  isHyperlinkAllowed,
  HYPERLINK_ALLOWED_PROTOCOLS,

  // Suspend/Resume (internal)
  suspend,
  SuspendManager,
  suspendSequences,

  // Sanitization (internal)
  sanitizeForTerminal,
  SafeStringBuilder,

  // Tmux (internal)
  tmux,

  // Response parser (internal)
  parseResponse,
  query,
  isCursorPosition,
} from 'blecsd/terminal';
```
