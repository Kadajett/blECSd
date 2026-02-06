# Video Widget

Plays video files in the terminal using external video players (mpv, mplayer) with ASCII/ANSI rendering via libcaca or other terminal-compatible output drivers.

## Overview

```typescript
import { createVideo } from 'blecsd';

const world = createWorld();

const video = createVideo(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 24,
  path: '/path/to/video.mp4',
  player: 'mpv',
  outputDriver: 'caca',
});

video.play();
```

---

## Configuration

### VideoConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `x` | `number` | `0` | X position |
| `y` | `number` | `0` | Y position |
| `width` | `number` | `80` | Width in terminal columns |
| `height` | `number` | `24` | Height in terminal rows |
| `path` | `string` | `''` | Path to the video file |
| `player` | `'mpv' \| 'mplayer'` | auto-detect | Preferred video player |
| `outputDriver` | `'caca' \| 'tct' \| 'sixel'` | `'caca'` | Terminal output driver |
| `speed` | `number` | `1.0` | Playback speed multiplier |
| `autoPlay` | `boolean` | `false` | Start playback automatically |
| `loop` | `boolean` | `false` | Loop playback |
| `mute` | `boolean` | `true` | Mute audio |
| `visible` | `boolean` | `true` | Whether to show initially |

### VideoOutputDriver

- `'caca'` - Uses libcaca for ASCII art rendering (best quality, works with both players)
- `'tct'` - True-color terminal output (mpv only)
- `'sixel'` - Sixel graphics output (mpv only, requires terminal sixel support)

### Zod Schema

```typescript
import { VideoConfigSchema } from 'blecsd';

const result = VideoConfigSchema.safeParse({
  path: '/path/to/video.mp4',
  player: 'mpv',
});
```

---

## Factory Function

### createVideo

Creates a Video widget. Accepts an optional `VideoProcessSpawner` for dependency injection (useful for testing).

```typescript
import { createVideo } from 'blecsd';

const video = createVideo(world, {
  x: 0,
  y: 0,
  width: 80,
  height: 24,
  path: '/path/to/video.mp4',
  player: 'mpv',
  outputDriver: 'caca',
});

video.play();
video.onEnd(() => console.log('Video finished'));
```

**Parameters:**
- `world: World` - The ECS world
- `config?: VideoConfig` - Widget configuration
- `spawner?: VideoProcessSpawner` - Optional process spawner for testing

**Returns:** `VideoWidget`

---

## VideoWidget Interface

### eid

```typescript
readonly eid: Entity
```

The underlying entity ID.

### show / hide / isVisible

```typescript
show(): VideoWidget
hide(): VideoWidget
isVisible(): boolean
```

Controls visibility.

### move

```typescript
move(dx: number, dy: number): VideoWidget
```

Moves the widget by a relative offset.

### setPosition

```typescript
setPosition(x: number, y: number): VideoWidget
```

Sets the absolute position.

### getPosition

```typescript
getPosition(): { x: number; y: number }
```

Gets the current position.

### setPath / getPath

```typescript
setPath(path: string): VideoWidget
getPath(): string
```

Gets or sets the video file path.

### play

```typescript
play(): VideoWidget
```

Starts or resumes playback. Detects the video player if not configured. For mplayer, resumes a paused process. For mpv, restarts the process from the current seek position.

### pause

```typescript
pause(): VideoWidget
```

Pauses playback. Only effective when the player is currently playing.

### stop

```typescript
stop(): VideoWidget
```

Stops playback, kills the player process, and resets the seek position.

### togglePlayback

```typescript
togglePlayback(): VideoWidget
```

Toggles between playing and paused states.

### seek

```typescript
seek(seconds: number): VideoWidget
```

Seeks to a position in seconds. For mplayer, sends a seek command to the running process. For mpv, restarts playback from the new position.

### getPlaybackState

```typescript
getPlaybackState(): VideoPlaybackState
```

Returns `'stopped'`, `'playing'`, or `'paused'`.

### setSpeed / getSpeed

```typescript
setSpeed(speed: number): VideoWidget
getSpeed(): number
```

Controls playback speed multiplier (1.0 = normal).

### setLoop / getLoop

```typescript
setLoop(loop: boolean): VideoWidget
getLoop(): boolean
```

Controls whether playback loops.

### setMute / getMute

```typescript
setMute(mute: boolean): VideoWidget
getMute(): boolean
```

Controls audio mute state.

### getPlayer

```typescript
getPlayer(): VideoPlayer | undefined
```

Returns the detected or configured player (`'mpv'` or `'mplayer'`).

### isRunning

```typescript
isRunning(): boolean
```

Returns whether the video player process is currently running.

### resize

```typescript
resize(width: number, height: number): VideoWidget
```

Resizes the video output. If the process supports PTY resize, the running process is resized too.

### onEnd / onError / onData

```typescript
onEnd(callback: () => void): VideoWidget
onError(callback: (error: string) => void): VideoWidget
onData(callback: (data: string) => void): VideoWidget
```

Event callbacks for playback completion, errors, and process output data.

### destroy

```typescript
destroy(): void
```

Kills any running process and removes the entity from the world.

---

## Player Detection

### detectVideoPlayer

Finds the best available video player binary on the system.

```typescript
import { detectVideoPlayer } from 'blecsd';

const result = detectVideoPlayer();
if (result) {
  console.log(`Found ${result.player} at ${result.path}`);
}
```

**Parameters:**
- `checkExists?: (path: string) => boolean` - Custom file existence checker (defaults to `fs.existsSync`)

**Returns:** `{ player: VideoPlayer; path: string } | undefined`

Search paths checked:
- mpv: `/usr/bin/mpv`, `/usr/local/bin/mpv`, `/opt/homebrew/bin/mpv`, `/snap/bin/mpv`
- mplayer: `/usr/bin/mplayer`, `/usr/local/bin/mplayer`, `/opt/homebrew/bin/mplayer`

---

## Command Building

### buildMpvArgs

```typescript
import { buildMpvArgs } from 'blecsd';

const args = buildMpvArgs(
  { path: 'video.mp4', outputDriver: 'caca', speed: 1.0, loop: false, mute: true, seekPosition: 0 },
  80,
  24,
);
```

### buildMplayerArgs

```typescript
import { buildMplayerArgs } from 'blecsd';

const args = buildMplayerArgs(
  { path: 'video.mp4', outputDriver: 'caca', speed: 1.0, loop: false, mute: true, seekPosition: 0 },
  80,
  24,
);
```

### buildPlayerArgs

```typescript
import { buildPlayerArgs } from 'blecsd';

const args = buildPlayerArgs('mpv', videoState, 80, 24);
```

---

## Utility Functions

### isVideo

```typescript
import { isVideo } from 'blecsd';

if (isVideo(world, entity)) {
  // Entity is a video widget
}
```

### getVideoPlaybackState

```typescript
import { getVideoPlaybackState } from 'blecsd';

const state = getVideoPlaybackState(entity);
// 'stopped' | 'playing' | 'paused'
```

### getVideoPlayer

```typescript
import { getVideoPlayer } from 'blecsd';

const player = getVideoPlayer(entity);
// 'mpv' | 'mplayer' | undefined
```

### sendPauseCommand / sendSeekCommand

Low-level functions for sending commands to player processes.

```typescript
import { sendPauseCommand, sendSeekCommand } from 'blecsd';

sendPauseCommand(processHandle, 'mplayer');
sendSeekCommand(processHandle, 'mplayer', 30);
```

---

## Examples

### Basic Video Playback

```typescript
import { createVideo } from 'blecsd';

const video = createVideo(world, {
  path: '/home/user/movie.mp4',
  width: 80,
  height: 24,
  mute: false,
  outputDriver: 'caca',
});

video.play();

video.onEnd(() => {
  console.log('Playback finished');
  video.destroy();
});

video.onError((err) => {
  console.error('Playback error:', err);
});
```

### Looping Background Video

```typescript
import { createVideo } from 'blecsd';

const bg = createVideo(world, {
  path: '/assets/background.mp4',
  width: 80,
  height: 24,
  loop: true,
  mute: true,
  autoPlay: true,
});
```

---

## See Also

- [Image Widget](./image.md) - Static image rendering
- [Terminal Widget](./terminal.md) - Terminal emulator with PTY
