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

import type { Entity, World } from '../../core/types';

// Re-export commands
export {
	buildMplayerArgs,
	buildMpvArgs,
	buildPlayerArgs,
	sendPauseCommand,
	sendSeekCommand,
} from './commands';

// Re-export schema
export { VideoConfigSchema } from './config';
// Re-export factory
export { createVideo } from './factory';
// Re-export state management
export { detectVideoPlayer, MPLAYER_SEARCH_PATHS, MPV_SEARCH_PATHS, Video } from './state';
// Re-export types
export type {
	VideoConfig,
	VideoOutputDriver,
	VideoPlaybackState,
	VideoPlayer,
	VideoProcessHandle,
	VideoProcessSpawner,
	VideoWidget,
} from './types';

// Import for utility functions
import { Video, videoStateStore } from './state';
import type { VideoPlaybackState, VideoPlayer } from './types';

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
 * @internal
 */
export { resetVideoStore } from './state';
