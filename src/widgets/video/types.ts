/**
 * Type definitions for Video widget.
 * @module widgets/video/types
 */

import type { Entity } from '../../core/types';

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

/**
 * Internal state for a video widget instance.
 * @internal
 */
export interface VideoState {
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
