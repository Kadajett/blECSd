/**
 * Video Widget
 *
 * Factory widget that plays video files in the terminal using external
 * players (mpv, mplayer) with ASCII/ANSI rendering via libcaca or
 * built-in terminal output modes.
 *
 * The widget manages the video player subprocess lifecycle, supports
 * play/pause/seek controls, and handles terminal resize.
 *
 * @module widgets/video
 */

import { z } from 'zod';
import { setContent } from '../components/content';
import { Dimensions, setDimensions } from '../components/dimensions';
import { Position, setPosition } from '../components/position';
import { markDirty, setVisible } from '../components/renderable';
import { addEntity, removeEntity } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported video player backends.
 *
 * - 'mpv': Modern, feature-rich player (preferred)
 * - 'mplayer': Legacy player, widely available
 */
export type VideoPlayer = 'mpv' | 'mplayer';

/**
 * Video playback state.
 */
export type VideoPlaybackState = 'stopped' | 'playing' | 'paused';

/**
 * Video output driver mode for terminal rendering.
 *
 * - 'caca': Uses libcaca for ASCII art rendering (best quality)
 * - 'tct': True-color terminal output (mpv only)
 * - 'sixel': Sixel graphics output (mpv only, requires sixel support)
 */
export type VideoOutputDriver = 'caca' | 'tct' | 'sixel';

/**
 * Configuration for creating a Video widget.
 *
 * @example
 * ```typescript
 * import type { VideoConfig } from 'blecsd';
 *
 * const config: VideoConfig = {
 *   x: 0,
 *   y: 0,
 *   width: 80,
 *   height: 24,
 *   path: '/path/to/video.mp4',
 *   player: 'mpv',
 * };
 * ```
 */
export interface VideoConfig {
	/** X position in terminal columns */
	readonly x?: number;
	/** Y position in terminal rows */
	readonly y?: number;
	/** Width in terminal columns */
	readonly width?: number;
	/** Height in terminal rows */
	readonly height?: number;
	/** Path to the video file */
	readonly path?: string;
	/** Preferred video player backend (default: auto-detect) */
	readonly player?: VideoPlayer;
	/** Video output driver mode (default: 'caca') */
	readonly outputDriver?: VideoOutputDriver;
	/** Playback speed multiplier (default: 1.0) */
	readonly speed?: number;
	/** Start playback automatically (default: false) */
	readonly autoPlay?: boolean;
	/** Loop playback (default: false) */
	readonly loop?: boolean;
	/** Mute audio (default: true for terminal use) */
	readonly mute?: boolean;
	/** Whether to show initially (default: true) */
	readonly visible?: boolean;
}

/**
 * Video widget interface providing chainable methods for video playback.
 *
 * @example
 * ```typescript
 * import { createVideo } from 'blecsd';
 *
 * const video = createVideo(world, {
 *   x: 0, y: 0, width: 80, height: 24,
 *   path: '/path/to/video.mp4',
 * });
 * video.play();
 * ```
 */
export interface VideoWidget {
	/** The underlying entity ID */
	readonly eid: Entity;

	// Visibility
	/** Shows the video widget */
	show(): VideoWidget;
	/** Hides the video widget */
	hide(): VideoWidget;
	/** Checks if visible */
	isVisible(): boolean;

	// Position
	/** Moves the video widget by dx, dy */
	move(dx: number, dy: number): VideoWidget;
	/** Sets the absolute position */
	setPosition(x: number, y: number): VideoWidget;
	/** Gets current position */
	getPosition(): { x: number; y: number };

	// Playback control
	/** Sets the video file path */
	setPath(path: string): VideoWidget;
	/** Gets the current video file path */
	getPath(): string;
	/** Starts or resumes playback */
	play(): VideoWidget;
	/** Pauses playback */
	pause(): VideoWidget;
	/** Stops playback and resets position */
	stop(): VideoWidget;
	/** Toggles between playing and paused */
	togglePlayback(): VideoWidget;
	/** Seeks to a position in seconds */
	seek(seconds: number): VideoWidget;
	/** Gets the current playback state */
	getPlaybackState(): VideoPlaybackState;

	// Settings
	/** Sets playback speed multiplier */
	setSpeed(speed: number): VideoWidget;
	/** Gets current playback speed */
	getSpeed(): number;
	/** Sets whether playback loops */
	setLoop(loop: boolean): VideoWidget;
	/** Gets whether playback loops */
	getLoop(): boolean;
	/** Sets audio mute state */
	setMute(mute: boolean): VideoWidget;
	/** Gets audio mute state */
	getMute(): boolean;
	/** Gets the detected or configured player */
	getPlayer(): VideoPlayer | undefined;

	// Process management
	/** Gets whether the video player process is running */
	isRunning(): boolean;
	/** Resize the video output */
	resize(width: number, height: number): VideoWidget;

	// Events
	/** Sets callback for when playback ends */
	onEnd(callback: () => void): VideoWidget;
	/** Sets callback for when an error occurs */
	onError(callback: (error: string) => void): VideoWidget;
	/** Sets callback for process data output */
	onData(callback: (data: string) => void): VideoWidget;

	// Lifecycle
	/** Destroys the video widget and kills any running process */
	destroy(): void;
}

/**
 * Interface for spawning child processes (injectable for testing).
 *
 * @example
 * ```typescript
 * import type { VideoProcessSpawner } from 'blecsd';
 *
 * const spawner: VideoProcessSpawner = {
 *   spawn: (cmd, args) => ({ pid: 123, stdout: mockStream, ... }),
 *   exists: (path) => true,
 * };
 * ```
 */
export interface VideoProcessSpawner {
	/** Spawns a child process and returns a handle */
	readonly spawn: (command: string, args: readonly string[]) => VideoProcessHandle;
	/** Checks if a binary exists at the given path */
	readonly exists: (path: string) => boolean;
}

/**
 * Handle to a running video player process.
 */
export interface VideoProcessHandle {
	/** Process ID */
	readonly pid: number;
	/** Send data to stdin */
	readonly write: (data: string) => void;
	/** Register stdout data handler */
	readonly onData: (callback: (data: string) => void) => void;
	/** Register exit handler */
	readonly onExit: (callback: (code: number) => void) => void;
	/** Kill the process */
	readonly kill: (signal?: string) => void;
	/** Resize the pseudo-terminal (if available) */
	readonly resize?: (cols: number, rows: number) => void;
}

// =============================================================================
// INTERNAL STATE TYPE
// =============================================================================

/**
 * Internal state for a video widget instance.
 */
interface VideoState {
	path: string;
	player: VideoPlayer | undefined;
	outputDriver: VideoOutputDriver;
	speed: number;
	loop: boolean;
	mute: boolean;
	playbackState: VideoPlaybackState;
	visible: boolean;
	process: VideoProcessHandle | null;
	seekPosition: number;
	onEndCallback: (() => void) | null;
	onErrorCallback: ((error: string) => void) | null;
	onDataCallback: ((data: string) => void) | null;
}

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Zod schema for video widget configuration.
 *
 * @example
 * ```typescript
 * import { VideoConfigSchema } from 'blecsd';
 *
 * const result = VideoConfigSchema.safeParse({
 *   path: '/path/to/video.mp4',
 *   player: 'mpv',
 * });
 * ```
 */
export const VideoConfigSchema = z.object({
	x: z.number().int().default(0),
	y: z.number().int().default(0),
	width: z.number().int().positive().default(80),
	height: z.number().int().positive().default(24),
	path: z.string().default(''),
	player: z.enum(['mpv', 'mplayer']).optional(),
	outputDriver: z.enum(['caca', 'tct', 'sixel']).default('caca'),
	speed: z.number().positive().default(1.0),
	autoPlay: z.boolean().default(false),
	loop: z.boolean().default(false),
	mute: z.boolean().default(true),
	visible: z.boolean().default(true),
});

// =============================================================================
// COMPONENT TAG
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Video component marker for identifying video entities.
 */
export const Video = {
	/** Tag indicating this is a video widget (1 = yes) */
	isVideo: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE STORES
// =============================================================================

/** Maps entity IDs to their video state */
const videoStateStore = new Map<Entity, VideoState>();

// =============================================================================
// PLAYER DETECTION
// =============================================================================

/**
 * Default search paths for video player binaries.
 */
export const MPV_SEARCH_PATHS: readonly string[] = [
	'/usr/bin/mpv',
	'/usr/local/bin/mpv',
	'/opt/homebrew/bin/mpv',
	'/snap/bin/mpv',
];

/**
 * Default search paths for mplayer binary.
 */
export const MPLAYER_SEARCH_PATHS: readonly string[] = [
	'/usr/bin/mplayer',
	'/usr/local/bin/mplayer',
	'/opt/homebrew/bin/mplayer',
];

/**
 * Finds the best available video player binary.
 *
 * Checks mpv first (preferred), then mplayer.
 *
 * @param checkExists - Function to check if a file exists (injectable for testing)
 * @returns The detected player and its path, or undefined if none found
 *
 * @example
 * ```typescript
 * import { detectVideoPlayer } from 'blecsd';
 *
 * const result = detectVideoPlayer();
 * if (result) {
 *   console.log(`Found ${result.player} at ${result.path}`);
 * }
 * ```
 */
export function detectVideoPlayer(
	checkExists: (path: string) => boolean = defaultCheckExists,
): { player: VideoPlayer; path: string } | undefined {
	for (const path of MPV_SEARCH_PATHS) {
		if (checkExists(path)) {
			return { player: 'mpv', path };
		}
	}
	for (const path of MPLAYER_SEARCH_PATHS) {
		if (checkExists(path)) {
			return { player: 'mplayer', path };
		}
	}
	return undefined;
}

/**
 * Default file existence checker using fs.existsSync.
 */
function defaultCheckExists(path: string): boolean {
	try {
		// Dynamic import to avoid hard dependency
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const fs = require('node:fs') as { existsSync: (p: string) => boolean };
		return fs.existsSync(path);
	} catch {
		return false;
	}
}

// =============================================================================
// COMMAND BUILDING
// =============================================================================

/**
 * Builds command-line arguments for mpv.
 *
 * @param config - Video state configuration
 * @param cols - Terminal width in columns
 * @param rows - Terminal height in rows
 * @returns Array of command-line arguments
 *
 * @example
 * ```typescript
 * import { buildMpvArgs } from 'blecsd';
 *
 * const args = buildMpvArgs(
 *   { path: 'video.mp4', outputDriver: 'caca', speed: 1.0, loop: false, mute: true },
 *   80,
 *   24,
 * );
 * ```
 */
export function buildMpvArgs(
	config: Pick<VideoState, 'path' | 'outputDriver' | 'speed' | 'loop' | 'mute' | 'seekPosition'>,
	cols: number,
	rows: number,
): string[] {
	const args: string[] = [];

	// Video output driver
	if (config.outputDriver === 'caca') {
		args.push('--vo=caca');
	} else if (config.outputDriver === 'tct') {
		args.push('--vo=tct');
		args.push(`--vo-tct-width=${cols}`);
		args.push(`--vo-tct-height=${rows}`);
	} else if (config.outputDriver === 'sixel') {
		args.push('--vo=sixel');
		args.push(`--vo-sixel-width=${cols * 8}`);
		args.push(`--vo-sixel-height=${rows * 14}`);
	}

	// No terminal OSD for clean output
	args.push('--no-osc');
	args.push('--no-input-default-bindings');
	args.push('--terminal=no');
	args.push('--no-input-terminal');

	// Speed
	if (config.speed !== 1.0) {
		args.push(`--speed=${config.speed}`);
	}

	// Loop
	if (config.loop) {
		args.push('--loop=inf');
	}

	// Mute
	if (config.mute) {
		args.push('--mute=yes');
	}

	// Seek position
	if (config.seekPosition > 0) {
		args.push(`--start=${config.seekPosition}`);
	}

	// Video file
	args.push(config.path);

	return args;
}

/**
 * Builds command-line arguments for mplayer.
 *
 * @param config - Video state configuration
 * @param cols - Terminal width in columns
 * @param rows - Terminal height in rows
 * @returns Array of command-line arguments
 *
 * @example
 * ```typescript
 * import { buildMplayerArgs } from 'blecsd';
 *
 * const args = buildMplayerArgs(
 *   { path: 'video.mp4', outputDriver: 'caca', speed: 1.0, loop: false, mute: true },
 *   80,
 *   24,
 * );
 * ```
 */
export function buildMplayerArgs(
	config: Pick<VideoState, 'path' | 'outputDriver' | 'speed' | 'loop' | 'mute' | 'seekPosition'>,
	_cols: number,
	_rows: number,
): string[] {
	const args: string[] = [];

	// Video output driver
	if (config.outputDriver === 'caca') {
		args.push('-vo', 'caca');
	} else {
		// mplayer doesn't support tct/sixel, fallback to caca
		args.push('-vo', 'caca');
	}

	// Slave mode for programmatic control
	args.push('-slave');
	args.push('-quiet');

	// Speed
	if (config.speed !== 1.0) {
		args.push('-speed', String(config.speed));
	}

	// Loop
	if (config.loop) {
		args.push('-loop', '0');
	}

	// Mute
	if (config.mute) {
		args.push('-nosound');
	}

	// Seek position
	if (config.seekPosition > 0) {
		args.push('-ss', String(config.seekPosition));
	}

	// Video file
	args.push(config.path);

	return args;
}

/**
 * Builds player command arguments based on the detected player type.
 *
 * @param player - The video player to use
 * @param state - Video state
 * @param cols - Terminal width
 * @param rows - Terminal height
 * @returns Array of command-line arguments
 *
 * @example
 * ```typescript
 * import { buildPlayerArgs } from 'blecsd';
 *
 * const args = buildPlayerArgs('mpv', videoState, 80, 24);
 * ```
 */
export function buildPlayerArgs(
	player: VideoPlayer,
	state: Pick<VideoState, 'path' | 'outputDriver' | 'speed' | 'loop' | 'mute' | 'seekPosition'>,
	cols: number,
	rows: number,
): string[] {
	if (player === 'mpv') return buildMpvArgs(state, cols, rows);
	return buildMplayerArgs(state, cols, rows);
}

// =============================================================================
// PLAYER COMMANDS
// =============================================================================

/**
 * Sends a pause/unpause command to an mpv process via IPC.
 *
 * @param handle - Process handle
 * @param player - Player type
 *
 * @example
 * ```typescript
 * import { sendPauseCommand } from 'blecsd';
 *
 * sendPauseCommand(processHandle, 'mpv');
 * ```
 */
export function sendPauseCommand(handle: VideoProcessHandle, player: VideoPlayer): void {
	if (player === 'mplayer') {
		handle.write('pause\n');
	}
	// mpv without terminal doesn't accept stdin commands easily;
	// for basic use, killing and restarting is the approach
}

/**
 * Sends a seek command to a running player process.
 *
 * @param handle - Process handle
 * @param player - Player type
 * @param seconds - Position in seconds
 *
 * @example
 * ```typescript
 * import { sendSeekCommand } from 'blecsd';
 *
 * sendSeekCommand(processHandle, 'mplayer', 30);
 * ```
 */
export function sendSeekCommand(
	handle: VideoProcessHandle,
	player: VideoPlayer,
	seconds: number,
): void {
	if (player === 'mplayer') {
		handle.write(`seek ${seconds} 2\n`);
	}
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a Video widget.
 *
 * The Video widget plays video files in the terminal using external video
 * players (mpv or mplayer) with ASCII/ANSI rendering via libcaca or other
 * terminal-compatible output drivers.
 *
 * @param world - The ECS world
 * @param config - Video configuration
 * @param spawner - Optional process spawner (injectable for testing)
 * @returns VideoWidget interface
 *
 * @example
 * ```typescript
 * import { createVideo } from 'blecsd';
 *
 * const video = createVideo(world, {
 *   x: 0, y: 0, width: 80, height: 24,
 *   path: '/path/to/video.mp4',
 *   player: 'mpv',
 *   outputDriver: 'caca',
 * });
 *
 * video.play();
 *
 * // Later...
 * video.pause();
 * video.seek(30);
 * video.play();
 *
 * // Cleanup
 * video.destroy();
 * ```
 */
export function createVideo(
	world: World,
	config: VideoConfig = {},
	spawner?: VideoProcessSpawner,
): VideoWidget {
	const parsed = VideoConfigSchema.parse(config);

	const eid = addEntity(world);

	// Set position and dimensions
	setPosition(world, eid, parsed.x, parsed.y);
	setDimensions(world, eid, parsed.width, parsed.height);

	// Mark as video
	Video.isVideo[eid] = 1;

	// Create initial state
	const state: VideoState = {
		path: parsed.path,
		player: parsed.player,
		outputDriver: parsed.outputDriver,
		speed: parsed.speed,
		loop: parsed.loop,
		mute: parsed.mute,
		playbackState: 'stopped',
		visible: parsed.visible,
		process: null,
		seekPosition: 0,
		onEndCallback: null,
		onErrorCallback: null,
		onDataCallback: null,
	};

	videoStateStore.set(eid, state);

	// Set visibility
	if (!parsed.visible) {
		setVisible(world, eid, false);
	}

	const widget = createVideoWidgetInterface(world, eid, spawner);

	// Auto-play if configured
	if (parsed.autoPlay && parsed.path) {
		widget.play();
	}

	return widget;
}

// =============================================================================
// PLAY HELPERS
// =============================================================================

/**
 * Attempts to resume a paused mplayer process.
 * Returns true if resume was handled, false otherwise.
 */
function tryResumeMplayer(state: VideoState): boolean {
	if (state.playbackState !== 'paused' || !state.process || state.player !== 'mplayer') {
		return false;
	}
	sendPauseCommand(state.process, 'mplayer');
	state.playbackState = 'playing';
	return true;
}

/**
 * Kills any existing video process on the state.
 */
function killExistingProcess(state: VideoState): void {
	if (!state.process) return;
	state.process.kill();
	state.process = null;
}

/**
 * Detects and assigns a video player to the state if not already set.
 * Returns true if a player is available, false otherwise.
 */
function ensurePlayer(state: VideoState, spawner?: VideoProcessSpawner): boolean {
	if (state.player) return true;
	const checkExists = spawner?.exists ?? defaultCheckExists;
	const detected = detectVideoPlayer(checkExists);
	if (!detected) return false;
	state.player = detected.player;
	return true;
}

/**
 * Spawns a new video process and wires up callbacks.
 */
function spawnVideoProcess(
	state: VideoState,
	spawner: VideoProcessSpawner,
	world: World,
	eid: Entity,
	cols: number,
	rows: number,
): void {
	const args = buildPlayerArgs(state.player as VideoPlayer, state, cols, rows);
	const handle = spawner.spawn(state.player as VideoPlayer, args);
	state.process = handle;
	state.playbackState = 'playing';

	handle.onData((data: string) => {
		setContent(world, eid, data);
		markDirty(world, eid);
		state.onDataCallback?.(data);
	});

	handle.onExit((code: number) => {
		state.process = null;
		state.playbackState = 'stopped';
		if (code === 0) {
			state.onEndCallback?.();
		} else {
			state.onErrorCallback?.(`Player exited with code ${code}`);
		}
	});
}

/**
 * Starts new video playback: validates state, detects player, spawns process.
 * Returns an error message string if playback cannot start, or null on success.
 */
function startPlayback(
	state: VideoState,
	spawner: VideoProcessSpawner | undefined,
	world: World,
	eid: Entity,
): string | null {
	if (!state.path) return 'No video path set';

	killExistingProcess(state);

	if (!ensurePlayer(state, spawner)) {
		return 'No video player found (mpv or mplayer required)';
	}

	if (!spawner) return 'No process spawner available';

	const cols = (Dimensions.width[eid] as number) || 80;
	const rows = (Dimensions.height[eid] as number) || 24;

	try {
		spawnVideoProcess(state, spawner, world, eid, cols, rows);
	} catch (err) {
		return err instanceof Error ? err.message : String(err);
	}

	return null;
}

// =============================================================================
// WIDGET INTERFACE
// =============================================================================

/**
 * Creates the VideoWidget interface for an entity.
 */
function createVideoWidgetInterface(
	world: World,
	eid: Entity,
	spawner?: VideoProcessSpawner,
): VideoWidget {
	return {
		get eid() {
			return eid;
		},

		// Visibility
		show() {
			const state = videoStateStore.get(eid);
			if (state) state.visible = true;
			setVisible(world, eid, true);
			markDirty(world, eid);
			return this;
		},

		hide() {
			const state = videoStateStore.get(eid);
			if (state) state.visible = false;
			setVisible(world, eid, false);
			markDirty(world, eid);
			return this;
		},

		isVisible() {
			return videoStateStore.get(eid)?.visible ?? false;
		},

		// Position
		move(dx: number, dy: number) {
			const x = Position.x[eid] ?? 0;
			const y = Position.y[eid] ?? 0;
			setPosition(world, eid, x + dx, y + dy);
			markDirty(world, eid);
			return this;
		},

		setPosition(x: number, y: number) {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return this;
		},

		getPosition() {
			return {
				x: Position.x[eid] ?? 0,
				y: Position.y[eid] ?? 0,
			};
		},

		// Playback
		setPath(path: string) {
			const state = videoStateStore.get(eid);
			if (state) state.path = path;
			return this;
		},

		getPath() {
			return videoStateStore.get(eid)?.path ?? '';
		},

		play() {
			const state = videoStateStore.get(eid);
			if (!state) return this;

			if (tryResumeMplayer(state)) return this;

			const error = startPlayback(state, spawner, world, eid);
			if (error) state.onErrorCallback?.(error);

			return this;
		},

		pause() {
			const state = videoStateStore.get(eid);
			if (!state) return this;
			if (state.playbackState !== 'playing') return this;

			if (state.process && state.player === 'mplayer') {
				sendPauseCommand(state.process, 'mplayer');
			}
			state.playbackState = 'paused';
			return this;
		},

		stop() {
			const state = videoStateStore.get(eid);
			if (!state) return this;

			if (state.process) {
				state.process.kill();
				state.process = null;
			}
			state.playbackState = 'stopped';
			state.seekPosition = 0;
			setContent(world, eid, '');
			markDirty(world, eid);
			return this;
		},

		togglePlayback() {
			const state = videoStateStore.get(eid);
			if (!state) return this;

			if (state.playbackState === 'playing') {
				return this.pause();
			}
			return this.play();
		},

		seek(seconds: number) {
			const state = videoStateStore.get(eid);
			if (!state) return this;

			state.seekPosition = Math.max(0, seconds);

			if (state.process && state.player === 'mplayer') {
				sendSeekCommand(state.process, 'mplayer', seconds);
			} else if (state.playbackState === 'playing') {
				// For mpv or when process needs restart, stop and replay from position
				this.stop();
				state.seekPosition = Math.max(0, seconds);
				this.play();
			}

			return this;
		},

		getPlaybackState() {
			return videoStateStore.get(eid)?.playbackState ?? 'stopped';
		},

		// Settings
		setSpeed(speed: number) {
			const state = videoStateStore.get(eid);
			if (state) state.speed = speed;
			return this;
		},

		getSpeed() {
			return videoStateStore.get(eid)?.speed ?? 1.0;
		},

		setLoop(loop: boolean) {
			const state = videoStateStore.get(eid);
			if (state) state.loop = loop;
			return this;
		},

		getLoop() {
			return videoStateStore.get(eid)?.loop ?? false;
		},

		setMute(mute: boolean) {
			const state = videoStateStore.get(eid);
			if (state) state.mute = mute;
			return this;
		},

		getMute() {
			return videoStateStore.get(eid)?.mute ?? true;
		},

		getPlayer() {
			return videoStateStore.get(eid)?.player;
		},

		// Process management
		isRunning() {
			return videoStateStore.get(eid)?.process !== null;
		},

		resize(width: number, height: number) {
			setDimensions(world, eid, width, height);
			const state = videoStateStore.get(eid);
			if (state?.process?.resize) {
				state.process.resize(width, height);
			}
			markDirty(world, eid);
			return this;
		},

		// Events
		onEnd(callback: () => void) {
			const state = videoStateStore.get(eid);
			if (state) state.onEndCallback = callback;
			return this;
		},

		onError(callback: (error: string) => void) {
			const state = videoStateStore.get(eid);
			if (state) state.onErrorCallback = callback;
			return this;
		},

		onData(callback: (data: string) => void) {
			const state = videoStateStore.get(eid);
			if (state) state.onDataCallback = callback;
			return this;
		},

		// Lifecycle
		destroy() {
			const state = videoStateStore.get(eid);
			if (state?.process) {
				state.process.kill();
			}
			Video.isVideo[eid] = 0;
			videoStateStore.delete(eid);
			removeEntity(world, eid);
		},
	};
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Checks if an entity is a video widget.
 *
 * @param _world - The ECS world (unused, for API consistency)
 * @param eid - Entity ID
 * @returns true if entity is a video widget
 *
 * @example
 * ```typescript
 * import { isVideo } from 'blecsd';
 *
 * if (isVideo(world, entity)) {
 *   // Handle video-specific logic
 * }
 * ```
 */
export function isVideo(_world: World, eid: Entity): boolean {
	return Video.isVideo[eid] === 1;
}

/**
 * Gets the video state for an entity.
 *
 * @param eid - Entity ID
 * @returns The video playback state, or undefined
 *
 * @example
 * ```typescript
 * import { getVideoPlaybackState } from 'blecsd';
 *
 * const state = getVideoPlaybackState(videoEntity);
 * // 'stopped' | 'playing' | 'paused'
 * ```
 */
export function getVideoPlaybackState(eid: Entity): VideoPlaybackState | undefined {
	return videoStateStore.get(eid)?.playbackState;
}

/**
 * Gets the detected video player for an entity.
 *
 * @param eid - Entity ID
 * @returns The player name, or undefined
 *
 * @example
 * ```typescript
 * import { getVideoPlayer } from 'blecsd';
 *
 * const player = getVideoPlayer(videoEntity);
 * // 'mpv' | 'mplayer' | undefined
 * ```
 */
export function getVideoPlayer(eid: Entity): VideoPlayer | undefined {
	return videoStateStore.get(eid)?.player;
}

/**
 * Resets all video widget stores. Useful for testing.
 *
 * @internal
 */
export function resetVideoStore(): void {
	// Kill all running processes first
	for (const state of videoStateStore.values()) {
		if (state.process) {
			state.process.kill();
		}
	}
	Video.isVideo.fill(0);
	videoStateStore.clear();
}
