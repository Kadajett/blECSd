/**
 * State management for Video widget.
 * @module widgets/video/state
 */

import type { Entity } from '../../core/types';
import type { VideoPlayer, VideoProcessSpawner, VideoState } from './types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Video component marker for identifying video entities.
 */
export const Video = {
	/** Tag indicating this is a video widget (1 = yes) */
	isVideo: new Uint8Array(DEFAULT_CAPACITY),
};

/** Maps entity IDs to their video state */
export const videoStateStore = new Map<Entity, VideoState>();

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
 * @internal
 */
export function defaultCheckExists(path: string): boolean {
	try {
		// Dynamic import to avoid hard dependency
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const fs = require('node:fs') as { existsSync: (p: string) => boolean };
		return fs.existsSync(path);
	} catch {
		return false;
	}
}

/**
 * Detects and assigns a video player to the state if not already set.
 * Returns true if a player is available, false otherwise.
 * @internal
 */
export function ensurePlayer(state: VideoState, spawner?: VideoProcessSpawner): boolean {
	if (state.player) return true;
	const checkExists = spawner?.exists ?? defaultCheckExists;
	const detected = detectVideoPlayer(checkExists);
	if (!detected) return false;
	state.player = detected.player;
	return true;
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
