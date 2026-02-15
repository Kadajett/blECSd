/**
 * Factory function for creating Video widgets.
 * @module widgets/video/factory
 */

import { setContent } from '../../components/content';
import { Dimensions, setDimensions } from '../../components/dimensions';
import { Position, setPosition } from '../../components/position';
import { markDirty, setVisible } from '../../components/renderable';
import { addEntity, removeEntity } from '../../core/ecs';
import type { World } from '../../core/types';
import { buildPlayerArgs, sendPauseCommand, sendSeekCommand } from './commands';
import { VideoConfigSchema } from './config';
import { Video, ensurePlayer, videoStateStore } from './state';
import type {
	VideoConfig,
	VideoPlayer,
	VideoProcessSpawner,
	VideoState,
	VideoWidget,
} from './types';

/**
 * Attempts to resume a paused mplayer process.
 * Returns true if resume was handled, false otherwise.
 * @internal
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
 * @internal
 */
function killExistingProcess(state: VideoState): void {
	if (!state.process) return;
	state.process.kill();
	state.process = null;
}

/**
 * Spawns a new video process and wires up callbacks.
 * @internal
 */
function spawnVideoProcess(
	state: VideoState,
	spawner: VideoProcessSpawner,
	world: World,
	eid: number,
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
 * @internal
 */
function startPlayback(
	state: VideoState,
	spawner: VideoProcessSpawner | undefined,
	world: World,
	eid: number,
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

/**
 * Creates the VideoWidget interface for an entity.
 * @internal
 */
function createVideoWidgetInterface(
	world: World,
	eid: number,
	spawner?: VideoProcessSpawner,
): VideoWidget {
	// Define methods that will be referenced by other methods
	const play = (): VideoWidget => {
		const state = videoStateStore.get(eid);
		if (!state) return widget;

		if (tryResumeMplayer(state)) return widget;

		const error = startPlayback(state, spawner, world, eid);
		if (error) state.onErrorCallback?.(error);

		return widget;
	};

	const pause = (): VideoWidget => {
		const state = videoStateStore.get(eid);
		if (!state) return widget;
		if (state.playbackState !== 'playing') return widget;

		if (state.process && state.player === 'mplayer') {
			sendPauseCommand(state.process, 'mplayer');
		}
		state.playbackState = 'paused';
		return widget;
	};

	const stop = (): VideoWidget => {
		const state = videoStateStore.get(eid);
		if (!state) return widget;

		if (state.process) {
			state.process.kill();
			state.process = null;
		}
		state.playbackState = 'stopped';
		state.seekPosition = 0;
		setContent(world, eid, '');
		markDirty(world, eid);
		return widget;
	};

	const widget: VideoWidget = {
		get eid() {
			return eid;
		},

		// Visibility
		show() {
			const state = videoStateStore.get(eid);
			if (state) state.visible = true;
			setVisible(world, eid, true);
			markDirty(world, eid);
			return widget;
		},

		hide() {
			const state = videoStateStore.get(eid);
			if (state) state.visible = false;
			setVisible(world, eid, false);
			markDirty(world, eid);
			return widget;
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
			return widget;
		},

		setPosition(x: number, y: number) {
			setPosition(world, eid, x, y);
			markDirty(world, eid);
			return widget;
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
			return widget;
		},

		getPath() {
			return videoStateStore.get(eid)?.path ?? '';
		},

		play,

		pause,

		stop,

		togglePlayback() {
			const state = videoStateStore.get(eid);
			if (!state) return widget;

			if (state.playbackState === 'playing') {
				return pause();
			}
			return play();
		},

		seek(seconds: number) {
			const state = videoStateStore.get(eid);
			if (!state) return widget;

			state.seekPosition = Math.max(0, seconds);

			if (state.process && state.player === 'mplayer') {
				sendSeekCommand(state.process, 'mplayer', seconds);
			} else if (state.playbackState === 'playing') {
				// For mpv or when process needs restart, stop and replay from position
				stop();
				state.seekPosition = Math.max(0, seconds);
				play();
			}

			return widget;
		},

		getPlaybackState() {
			return videoStateStore.get(eid)?.playbackState ?? 'stopped';
		},

		// Settings
		setSpeed(speed: number) {
			const state = videoStateStore.get(eid);
			if (state) state.speed = speed;
			return widget;
		},

		getSpeed() {
			return videoStateStore.get(eid)?.speed ?? 1.0;
		},

		setLoop(loop: boolean) {
			const state = videoStateStore.get(eid);
			if (state) state.loop = loop;
			return widget;
		},

		getLoop() {
			return videoStateStore.get(eid)?.loop ?? false;
		},

		setMute(mute: boolean) {
			const state = videoStateStore.get(eid);
			if (state) state.mute = mute;
			return widget;
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
			return widget;
		},

		// Events
		onEnd(callback: () => void) {
			const state = videoStateStore.get(eid);
			if (state) state.onEndCallback = callback;
			return widget;
		},

		onError(callback: (error: string) => void) {
			const state = videoStateStore.get(eid);
			if (state) state.onErrorCallback = callback;
			return widget;
		},

		onData(callback: (data: string) => void) {
			const state = videoStateStore.get(eid);
			if (state) state.onDataCallback = callback;
			return widget;
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

	return widget;
}

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
