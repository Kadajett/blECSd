/**
 * Video widget helper functions.
 *
 * @module widgets/video/helpers
 */

import { Dimensions, markDirty, setContent } from 'blecsd/components';
import type { World } from 'blecsd/core';
import { buildPlayerArgs, sendPauseCommand, sendSeekCommand } from './commands';
import { ensurePlayer } from './state';
import type { VideoPlayer, VideoProcessSpawner, VideoState } from './types';

/**
 * Attempts to resume a paused mplayer process.
 */
export function tryResumeMplayer(state: VideoState): boolean {
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
export function killExistingProcess(state: VideoState): void {
	if (!state.process) return;
	state.process.kill();
	state.process = null;
}

/**
 * Spawns a new video process and wires up callbacks.
 */
export function spawnVideoProcess(
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
 */
export function startPlayback(
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
 * Handles seeking logic for different players.
 */
export function handleSeek(
	state: VideoState,
	seconds: number,
	stopFn: () => void,
	playFn: () => void,
): void {
	state.seekPosition = Math.max(0, seconds);

	if (state.process && state.player === 'mplayer') {
		sendSeekCommand(state.process, 'mplayer', seconds);
	} else if (state.playbackState === 'playing') {
		stopFn();
		state.seekPosition = Math.max(0, seconds);
		playFn();
	}
}
