# Addon Packages

blECSd provides several addon packages that extend the core library with specialized functionality. Each package is independently installable and provides focused features for specific use cases.

## Overview

| Package | Purpose | Key Features |
|---------|---------|--------------|
| [@blecsd/3d](#blecsd3d) | 3D rendering and math | Software rasterizer, 3D math, OBJ loader, multiple backends |
| [@blecsd/ai](#blecsdai) | AI/ML integration | LLM streaming, structured output, embeddings, vector search |
| [@blecsd/audio](#blecsdaudio) | Audio playback and synthesis | Wave file support, tone generation, audio widgets |
| [@blecsd/game](#blecsdgame) | Game development framework | High-level game API, collision detection, physics |
| [@blecsd/media](#blecsdmedia) | Image and video rendering | GIF/PNG parsers, ANSI rendering, image/video widgets |

All addon packages:
- Are published to npm with the `@blecsd/` scope
- Require `blecsd` as a peer dependency (version >= 0.6.0)
- Support tree-shakeable imports via subpath exports
- Are fully typed with TypeScript
- Follow the same versioning as the core library

## @blecsd/3d

Terminal 3D rendering for blECSd - complete 3D pipeline including rasterizer, math utilities, mesh loading, and multiple rendering backends.

### Installation

```bash
pnpm add @blecsd/3d
```

### Quick Example

```typescript
import { createWorld } from 'blecsd';
import {
  createCamera3D,
  createMesh,
  createTransform3D,
  loadObjFile,
  BrailleBackend,
  Viewport3D
} from '@blecsd/3d';

const world = createWorld();

// Create a camera
const camera = createCamera3D(world, {
  fov: 60,
  near: 0.1,
  far: 100
});

// Load a 3D model
const mesh = loadObjFile('model.obj');
const entity = createMesh(world, mesh);

// Create a viewport with braille backend
const viewport = new Viewport3D(world, {
  width: 80,
  height: 24,
  backend: new BrailleBackend()
});

// Render the scene
viewport.render();
```

### Key Features

- **Software Rasterizer** - Full 3D rendering pipeline for terminal output
- **3D Math Library** - Vectors, matrices, projections, clipping
- **Multiple Backends** - Braille (high-density), half-block, sextant, Sixel, Kitty
- **Mesh Loading** - OBJ file format support + primitive generators
- **Namespace API** - Discoverable API via frozen namespace objects
- **ECS Components** - Transform3D, Camera3D, Mesh, Material3D, Animation3D

[Full documentation →](../../packages/3d/README.md)

## @blecsd/ai

AI and machine learning integration for blECSd - streaming LLM responses, structured output validation, embeddings, and vector search.

### Installation

```bash
pnpm add @blecsd/ai
```

### Quick Example

```typescript
import { createWorld } from 'blecsd';
import { createChatWidget, streamLLMResponse } from '@blecsd/ai';

const world = createWorld();

// Create a chat widget
const chat = createChatWidget(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 24
});

// Stream an LLM response
const response = await streamLLMResponse({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
  onChunk: (chunk) => {
    chat.addMessage({ role: 'assistant', content: chunk });
  }
});
```

### Key Features

- **LLM Streaming** - Real-time streaming with OpenAI/Anthropic APIs
- **Structured Output** - Zod schema validation for LLM responses
- **Embeddings** - Generate and search semantic embeddings
- **Vector Search** - In-memory vector similarity search
- **Chat Widgets** - Pre-built UI components for chat interfaces
- **Prompt Templates** - Template system for dynamic prompts

[Full documentation →](../../packages/ai/README.md)

## @blecsd/audio

Audio playback and synthesis for terminal applications - play sounds, generate tones, create audio-reactive visualizations.

### Installation

```bash
pnpm add @blecsd/audio
```

### Quick Example

```typescript
import { createWorld } from 'blecsd';
import { loadWaveFile, createAudioPlayer } from '@blecsd/audio';

const world = createWorld();

// Load and play an audio file
const audio = loadWaveFile('sound.wav');
const player = createAudioPlayer(world, audio);

player.play();
```

### Key Features

- **Wave File Support** - Load and play .wav files
- **Tone Generation** - Synthesize pure tones, sawtooth, square waves
- **Audio Widgets** - Waveform visualizers, spectrum analyzers, VU meters
- **Playback Control** - Play, pause, seek, volume, loop
- **Audio Events** - React to playback events (ended, progress, etc.)
- **Multi-track Mixing** - Mix multiple audio sources

[Full documentation →](../../packages/audio/README.md)

## @blecsd/game

High-level game development framework for blECSd - simplified API wrapping ECS with common game patterns.

### Installation

```bash
pnpm add @blecsd/game
```

### Quick Example

```typescript
import { createGame } from '@blecsd/game';

const game = createGame({
  title: 'My Game',
  width: 80,
  height: 24
});

// Create UI elements
const box = game.createBox({ x: 5, y: 2, width: 20, height: 10 });
const text = game.createText({ x: 6, y: 3, text: 'Hello World!' });

// Handle input
game.onKey('q', () => game.quit());
game.onKey('space', () => console.log('Space pressed!'));

// Game loop
game.onUpdate((dt) => {
  // Update game state
});

game.start();
```

### Key Features

- **Simplified API** - High-level game creation without ECS boilerplate
- **Collision System** - ECS-based collision detection with layers and triggers
- **Physics Integration** - Optional physics engine integration
- **Input Actions** - Map keys to actions, support for gamepads
- **Scene Management** - Load/unload scenes, scene transitions
- **UI Helpers** - Create boxes, text, sprites, particles

[Full documentation →](../../packages/game/README.md)

## @blecsd/media

Media rendering for blECSd - parse and display images (GIF/PNG), render animations, create image/video widgets.

### Installation

```bash
pnpm add @blecsd/media
```

### Quick Example

```typescript
import { createWorld } from 'blecsd';
import { parseGIF, renderToAnsi, createImage } from '@blecsd/media';
import { readFileSync } from 'fs';

const world = createWorld();

// Parse a GIF file
const buffer = readFileSync('animation.gif');
const gif = parseGIF(buffer);

// Create an image widget
const image = createImage(world, {
  x: 0,
  y: 0,
  width: 40,
  height: 20,
  imageData: gif
});
```

### Key Features

- **Image Parsers** - Parse GIF and PNG files with full format support
- **ANSI Rendering** - Convert images to terminal-compatible ANSI cells
- **Animation Support** - Display animated GIFs with frame timing
- **Image Widgets** - Pre-built widgets for displaying images
- **Video Widgets** - Play video files in the terminal
- **W3M Overlay** - Fallback to W3M image protocol when available

[Full documentation →](../../packages/media/README.md)

## Using Multiple Packages Together

Addon packages are designed to work seamlessly together. Here's an example combining multiple packages:

```typescript
import { createWorld } from 'blecsd';
import { createGame } from '@blecsd/game';
import { parseGIF, createImage } from '@blecsd/media';
import { loadWaveFile, createAudioPlayer } from '@blecsd/audio';
import { createChatWidget, streamLLMResponse } from '@blecsd/ai';

// Create game with media and audio
const game = createGame({ title: 'My Game', width: 80, height: 24 });

// Add an animated sprite
const sprite = parseGIF('character.gif');
const image = createImage(game.world, {
  x: 10,
  y: 10,
  width: 8,
  height: 8,
  imageData: sprite
});

// Play background music
const music = loadWaveFile('theme.wav');
const player = createAudioPlayer(game.world, music);
player.play();

// Add AI-powered NPC dialogue
const chat = createChatWidget(game.world, { x: 50, y: 2, width: 28, height: 20 });
game.onKey('t', async () => {
  await streamLLMResponse({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Talk to NPC' }],
    onChunk: (chunk) => chat.addMessage({ role: 'assistant', content: chunk })
  });
});

game.start();
```

## Tree-Shaking and Bundle Size

All addon packages support tree-shaking via subpath exports. Import only what you need to minimize bundle size:

```typescript
// Instead of importing from the main entry:
import { parseGIF, parsePNG, renderToAnsi } from '@blecsd/media';

// Use subpath imports to only bundle what you use:
import { parseGIF } from '@blecsd/media/gif';
import { renderToAnsi } from '@blecsd/media/render';
```

Each package's README lists all available subpath exports in its documentation.

## Version Compatibility

Addon packages follow the core library's versioning:
- All packages are released together with matching version numbers
- Addon packages require `blecsd >= 0.6.0` as a peer dependency
- Breaking changes in addon packages coincide with core library major/minor versions

## Next Steps

- Explore individual package READMEs for detailed API documentation
- Check out the [examples directory](../examples/) for complete projects using addon packages
- Read the [tutorials](../tutorials/) for step-by-step guides
- Visit the [API reference](../api/) for type definitions and advanced usage
