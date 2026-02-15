/**
 * Command building and player control for Video widget.
 * @module widgets/video/commands
 */

import type { VideoPlayer, VideoProcessHandle, VideoState } from './types';

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
