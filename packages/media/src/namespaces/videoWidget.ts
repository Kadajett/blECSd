/**
 * Video widget namespace for playing video files in the terminal.
 *
 * @example
 * ```typescript
 * import { videoWidget } from '@blecsd/media';
 *
 * const vid = videoWidget.createVideo(world, {
 *   width: 80,
 *   height: 30,
 *   source: 'path/to/video.mp4',
 *   player: 'mpv',
 * });
 * videoWidget.sendPauseCommand(vid);
 * videoWidget.sendSeekCommand(vid, 30);
 * const state = videoWidget.getVideoPlaybackState(vid);
 * ```
 */

import {
	buildMplayerArgs,
	buildMpvArgs,
	buildPlayerArgs,
	createVideo,
	detectVideoPlayer,
	getVideoPlaybackState,
	getVideoPlayer,
	isVideo,
	MPLAYER_SEARCH_PATHS,
	MPV_SEARCH_PATHS,
	resetVideoStore,
	sendPauseCommand,
	sendSeekCommand,
} from '../widgets/video';

export const videoWidget = Object.freeze({
	createVideo,
	isVideo,
	getVideoPlaybackState,
	getVideoPlayer,
	detectVideoPlayer,
	buildMpvArgs,
	buildMplayerArgs,
	buildPlayerArgs,
	sendPauseCommand,
	sendSeekCommand,
	MPV_SEARCH_PATHS,
	MPLAYER_SEARCH_PATHS,
	resetVideoStore,
});

export type VideoWidgetModule = typeof videoWidget;
