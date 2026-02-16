# @blecsd/audio

Audio management hooks and channels for blECSd terminal applications.

## Installation

```bash
pnpm add @blecsd/audio
```

## Overview

@blecsd/audio provides audio management for terminal games and applications. It includes an audio manager for loading and playing sounds, a channel system for organizing audio by category, and hooks for triggering sounds based on game events.

## Quick Start

```typescript
import { createAudioManager, AudioChannel } from '@blecsd/audio';

// Create an audio manager with channel configuration
const audio = createAudioManager({
  adapter: myAudioAdapter, // Your audio backend (web audio, node-speaker, etc.)
  channels: {
    [AudioChannel.MUSIC]: { volume: 0.7 },
    [AudioChannel.SFX]: { volume: 1.0 },
    [AudioChannel.VOICE]: { volume: 0.9 }
  }
});

// Load sounds
await audio.load('theme', 'assets/music/theme.mp3', AudioChannel.MUSIC);
await audio.load('jump', 'assets/sfx/jump.wav', AudioChannel.SFX);

// Play sounds
audio.play('theme', { loop: true });
audio.play('jump');

// Control channels
audio.setChannelVolume(AudioChannel.MUSIC, 0.5);
audio.muteChannel(AudioChannel.SFX);

// Clean up
audio.stop('theme');
audio.dispose();
```

## API Style

The @blecsd/audio package uses a direct API without namespace objects. The `AudioManager` returned by `createAudioManager()` provides all methods directly:

```typescript
import { createAudioManager, AudioChannel } from '@blecsd/audio';

const audio = createAudioManager({ ... });

// All methods are on the manager instance
audio.load('sound', 'path.mp3', AudioChannel.SFX);
audio.play('sound', { loop: true });
audio.setChannelVolume(AudioChannel.MUSIC, 0.5);
```

This design keeps the audio API simple and focused, since the API surface is intentionally small. The package exports `AudioChannel` as an enum for channel categorization.

## API

### Core Functions

- `createAudioManager(config)` - Create an audio manager instance
- `AudioChannel` - Predefined audio channel categories

### AudioManager Methods

| Method | Description |
|--------|-------------|
| `load(id, path, channel)` | Load an audio file into a channel |
| `play(id, options)` | Play a loaded sound with optional loop/volume |
| `stop(id)` | Stop a playing sound |
| `pause(id)` | Pause a sound (can be resumed) |
| `resume(id)` | Resume a paused sound |
| `setVolume(id, volume)` | Set volume for a specific sound |
| `setChannelVolume(channel, volume)` | Set volume for an entire channel |
| `muteChannel(channel)` | Mute a channel |
| `unmuteChannel(channel)` | Unmute a channel |
| `dispose()` | Clean up and release all audio resources |

### Audio Channels

- `AudioChannel.MUSIC` - Background music
- `AudioChannel.SFX` - Sound effects
- `AudioChannel.VOICE` - Voice/dialogue
- `AudioChannel.AMBIENT` - Ambient sounds

### Play Options

```typescript
interface PlayOptions {
  loop?: boolean;      // Loop the sound
  volume?: number;     // Override default volume (0.0 - 1.0)
  fadeIn?: number;     // Fade-in duration in ms
  delay?: number;      // Delay before playing in ms
}
```

### Sound Triggers

Associate game events with sounds:

```typescript
import type { SoundTrigger } from '@blecsd/audio';

const triggers: SoundTrigger[] = [
  { event: 'player:jump', sound: 'jump', channel: AudioChannel.SFX },
  { event: 'enemy:hit', sound: 'impact', channel: AudioChannel.SFX },
  { event: 'game:start', sound: 'theme', channel: AudioChannel.MUSIC, options: { loop: true } }
];

// Register triggers with your event system
```

## Requirements

- blecsd (peer dependency)
- Node.js 18+
- Audio adapter implementation (not included)

## License

MIT
