# Installation

Get blecsd installed and ready to use.

## Prerequisites

- **Node.js** 18 or later
- **npm**, **pnpm**, or **yarn**
- A terminal that supports at least 256 colors (most modern terminals do)

## Install

```bash
# npm
npm install blecsd

# pnpm
pnpm add blecsd

# yarn
yarn add blecsd
```

## TypeScript Setup

blECSd is written in TypeScript and ships with full type definitions. No additional `@types` packages needed.

For the best experience, enable strict mode in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## Verify Installation

Create a file called `test.ts`:

```typescript
import { createGame } from 'blecsd';

const game = createGame({ title: 'Test' });

game.createText({
  x: 0,
  y: 0,
  content: 'blECSd is working!',
});

game.onKey('q', () => game.quit());
game.start();
```

Run it:

```bash
npx tsx test.ts
```

You should see "blECSd is working!" in your terminal. Press `q` to quit.

## Terminal Compatibility

blECSd works best in terminals with truecolor (24-bit) support:

| Terminal | Truecolor | Notes |
|----------|-----------|-------|
| iTerm2 | Yes | Recommended for macOS |
| Kitty | Yes | Fast GPU rendering |
| Alacritty | Yes | Cross-platform |
| Windows Terminal | Yes | Recommended for Windows |
| VS Code Terminal | Yes | Works great |
| macOS Terminal.app | No | 256 colors only |
| xterm | Varies | Check config |

blECSd automatically detects terminal capabilities and falls back gracefully.

## Common Issues

### "Cannot find module 'blecsd'"

Make sure you're in the correct directory and have run `npm install`.

### Colors look wrong

Your terminal may not support truecolor. Try a different terminal or set:

```bash
export COLORTERM=truecolor
```

### Input feels laggy

blECSd processes input at 60fps by default. If you're experiencing lag, check that no other processes are consuming CPU.

## Next Steps

- [Hello World](./hello-world.md) - Write your first program
- [Core Concepts](./concepts.md) - Understand how blessed works
