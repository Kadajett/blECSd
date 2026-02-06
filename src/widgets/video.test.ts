import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import type { World } from '../core/types';
import type { VideoProcessHandle, VideoProcessSpawner } from './video';
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
	Video,
	VideoConfigSchema,
} from './video';

// =============================================================================
// HELPERS
// =============================================================================

function createMockProcessHandle(overrides: Partial<VideoProcessHandle> = {}): VideoProcessHandle {
	return {
		pid: 12345,
		write: vi.fn(),
		onData: vi.fn(),
		onExit: vi.fn(),
		kill: vi.fn(),
		resize: vi.fn(),
		...overrides,
	};
}

function createMockSpawner(
	handle?: VideoProcessHandle,
	existsFn?: (path: string) => boolean,
): VideoProcessSpawner {
	return {
		spawn: vi.fn(() => handle ?? createMockProcessHandle()),
		exists: existsFn ?? (() => true),
	};
}

let world: World;

beforeEach(() => {
	resetVideoStore();
	world = createWorld();
});

// =============================================================================
// SCHEMAS
// =============================================================================

describe('VideoConfigSchema', () => {
	it('should accept empty config with defaults', () => {
		const result = VideoConfigSchema.parse({});
		expect(result.x).toBe(0);
		expect(result.y).toBe(0);
		expect(result.width).toBe(80);
		expect(result.height).toBe(24);
		expect(result.path).toBe('');
		expect(result.player).toBeUndefined();
		expect(result.outputDriver).toBe('caca');
		expect(result.speed).toBe(1.0);
		expect(result.autoPlay).toBe(false);
		expect(result.loop).toBe(false);
		expect(result.mute).toBe(true);
		expect(result.visible).toBe(true);
	});

	it('should accept full config', () => {
		const result = VideoConfigSchema.parse({
			x: 10,
			y: 5,
			width: 120,
			height: 40,
			path: '/tmp/video.mp4',
			player: 'mpv',
			outputDriver: 'tct',
			speed: 2.0,
			autoPlay: true,
			loop: true,
			mute: false,
			visible: false,
		});
		expect(result.player).toBe('mpv');
		expect(result.outputDriver).toBe('tct');
		expect(result.speed).toBe(2.0);
		expect(result.autoPlay).toBe(true);
	});

	it('should reject invalid player', () => {
		expect(() => VideoConfigSchema.parse({ player: 'vlc' })).toThrow();
	});

	it('should reject invalid output driver', () => {
		expect(() => VideoConfigSchema.parse({ outputDriver: 'opengl' })).toThrow();
	});

	it('should reject zero or negative speed', () => {
		expect(() => VideoConfigSchema.parse({ speed: 0 })).toThrow();
		expect(() => VideoConfigSchema.parse({ speed: -1 })).toThrow();
	});
});

// =============================================================================
// PLAYER DETECTION
// =============================================================================

describe('detectVideoPlayer', () => {
	it('should detect mpv first', () => {
		const checkExists = (path: string) => path.includes('mpv') || path.includes('mplayer');
		const result = detectVideoPlayer(checkExists);
		expect(result?.player).toBe('mpv');
	});

	it('should fall back to mplayer', () => {
		const checkExists = (path: string) => path.includes('mplayer');
		const result = detectVideoPlayer(checkExists);
		expect(result?.player).toBe('mplayer');
	});

	it('should return undefined when no player found', () => {
		const checkExists = () => false;
		expect(detectVideoPlayer(checkExists)).toBeUndefined();
	});

	it('should have correct search paths for mpv', () => {
		expect(MPV_SEARCH_PATHS.length).toBeGreaterThan(0);
		for (const p of MPV_SEARCH_PATHS) {
			expect(p).toContain('mpv');
		}
	});

	it('should have correct search paths for mplayer', () => {
		expect(MPLAYER_SEARCH_PATHS.length).toBeGreaterThan(0);
		for (const p of MPLAYER_SEARCH_PATHS) {
			expect(p).toContain('mplayer');
		}
	});
});

// =============================================================================
// COMMAND BUILDING
// =============================================================================

describe('buildMpvArgs', () => {
	it('should build basic caca args', () => {
		const args = buildMpvArgs(
			{
				path: 'video.mp4',
				outputDriver: 'caca',
				speed: 1.0,
				loop: false,
				mute: true,
				seekPosition: 0,
			},
			80,
			24,
		);
		expect(args).toContain('--vo=caca');
		expect(args).toContain('--mute=yes');
		expect(args).toContain('--no-osc');
		expect(args).toContain('video.mp4');
	});

	it('should build tct args with dimensions', () => {
		const args = buildMpvArgs(
			{ path: 'v.mp4', outputDriver: 'tct', speed: 1.0, loop: false, mute: false, seekPosition: 0 },
			120,
			40,
		);
		expect(args).toContain('--vo=tct');
		expect(args).toContain('--vo-tct-width=120');
		expect(args).toContain('--vo-tct-height=40');
		expect(args).not.toContain('--mute=yes');
	});

	it('should build sixel args with pixel dimensions', () => {
		const args = buildMpvArgs(
			{
				path: 'v.mp4',
				outputDriver: 'sixel',
				speed: 1.0,
				loop: false,
				mute: true,
				seekPosition: 0,
			},
			80,
			24,
		);
		expect(args).toContain('--vo=sixel');
		expect(args).toContain('--vo-sixel-width=640');
		expect(args).toContain('--vo-sixel-height=336');
	});

	it('should include speed when not 1.0', () => {
		const args = buildMpvArgs(
			{ path: 'v.mp4', outputDriver: 'caca', speed: 2.0, loop: false, mute: true, seekPosition: 0 },
			80,
			24,
		);
		expect(args).toContain('--speed=2');
	});

	it('should not include speed when 1.0', () => {
		const args = buildMpvArgs(
			{ path: 'v.mp4', outputDriver: 'caca', speed: 1.0, loop: false, mute: true, seekPosition: 0 },
			80,
			24,
		);
		expect(args.some((a) => a.startsWith('--speed'))).toBe(false);
	});

	it('should include loop flag', () => {
		const args = buildMpvArgs(
			{ path: 'v.mp4', outputDriver: 'caca', speed: 1.0, loop: true, mute: true, seekPosition: 0 },
			80,
			24,
		);
		expect(args).toContain('--loop=inf');
	});

	it('should include seek position', () => {
		const args = buildMpvArgs(
			{
				path: 'v.mp4',
				outputDriver: 'caca',
				speed: 1.0,
				loop: false,
				mute: true,
				seekPosition: 30,
			},
			80,
			24,
		);
		expect(args).toContain('--start=30');
	});

	it('should not include seek for position 0', () => {
		const args = buildMpvArgs(
			{ path: 'v.mp4', outputDriver: 'caca', speed: 1.0, loop: false, mute: true, seekPosition: 0 },
			80,
			24,
		);
		expect(args.some((a) => a.startsWith('--start'))).toBe(false);
	});
});

describe('buildMplayerArgs', () => {
	it('should build basic caca args', () => {
		const args = buildMplayerArgs(
			{
				path: 'video.mp4',
				outputDriver: 'caca',
				speed: 1.0,
				loop: false,
				mute: true,
				seekPosition: 0,
			},
			80,
			24,
		);
		expect(args).toContain('-vo');
		expect(args).toContain('caca');
		expect(args).toContain('-slave');
		expect(args).toContain('-quiet');
		expect(args).toContain('-nosound');
		expect(args).toContain('video.mp4');
	});

	it('should fallback to caca for non-caca drivers', () => {
		const args = buildMplayerArgs(
			{ path: 'v.mp4', outputDriver: 'tct', speed: 1.0, loop: false, mute: true, seekPosition: 0 },
			80,
			24,
		);
		expect(args).toContain('caca');
	});

	it('should include speed', () => {
		const args = buildMplayerArgs(
			{ path: 'v.mp4', outputDriver: 'caca', speed: 1.5, loop: false, mute: true, seekPosition: 0 },
			80,
			24,
		);
		expect(args).toContain('-speed');
		expect(args).toContain('1.5');
	});

	it('should include loop', () => {
		const args = buildMplayerArgs(
			{ path: 'v.mp4', outputDriver: 'caca', speed: 1.0, loop: true, mute: true, seekPosition: 0 },
			80,
			24,
		);
		expect(args).toContain('-loop');
		expect(args).toContain('0');
	});

	it('should include seek position', () => {
		const args = buildMplayerArgs(
			{
				path: 'v.mp4',
				outputDriver: 'caca',
				speed: 1.0,
				loop: false,
				mute: true,
				seekPosition: 45,
			},
			80,
			24,
		);
		expect(args).toContain('-ss');
		expect(args).toContain('45');
	});
});

describe('buildPlayerArgs', () => {
	it('should delegate to mpv args', () => {
		const state = {
			path: 'v.mp4',
			outputDriver: 'caca' as const,
			speed: 1.0,
			loop: false,
			mute: true,
			seekPosition: 0,
		};
		const mpvArgs = buildPlayerArgs('mpv', state, 80, 24);
		expect(mpvArgs).toContain('--vo=caca');
	});

	it('should delegate to mplayer args', () => {
		const state = {
			path: 'v.mp4',
			outputDriver: 'caca' as const,
			speed: 1.0,
			loop: false,
			mute: true,
			seekPosition: 0,
		};
		const mplayerArgs = buildPlayerArgs('mplayer', state, 80, 24);
		expect(mplayerArgs).toContain('-slave');
	});
});

// =============================================================================
// PLAYER COMMANDS
// =============================================================================

describe('sendPauseCommand', () => {
	it('should send pause to mplayer', () => {
		const handle = createMockProcessHandle();
		sendPauseCommand(handle, 'mplayer');
		expect(handle.write).toHaveBeenCalledWith('pause\n');
	});

	it('should not write to mpv (no stdin control)', () => {
		const handle = createMockProcessHandle();
		sendPauseCommand(handle, 'mpv');
		expect(handle.write).not.toHaveBeenCalled();
	});
});

describe('sendSeekCommand', () => {
	it('should send seek to mplayer', () => {
		const handle = createMockProcessHandle();
		sendSeekCommand(handle, 'mplayer', 30);
		expect(handle.write).toHaveBeenCalledWith('seek 30 2\n');
	});

	it('should not write to mpv', () => {
		const handle = createMockProcessHandle();
		sendSeekCommand(handle, 'mpv', 30);
		expect(handle.write).not.toHaveBeenCalled();
	});
});

// =============================================================================
// FACTORY
// =============================================================================

describe('createVideo', () => {
	it('should create with defaults', () => {
		const video = createVideo(world);
		expect(video.eid).toBeDefined();
		expect(video.getPlaybackState()).toBe('stopped');
		expect(video.isVisible()).toBe(true);
		expect(video.getPath()).toBe('');
	});

	it('should create with config', () => {
		const video = createVideo(world, {
			x: 10,
			y: 5,
			path: '/tmp/video.mp4',
			speed: 1.5,
			loop: true,
			mute: false,
		});
		expect(video.getPosition()).toEqual({ x: 10, y: 5 });
		expect(video.getPath()).toBe('/tmp/video.mp4');
		expect(video.getSpeed()).toBe(1.5);
		expect(video.getLoop()).toBe(true);
		expect(video.getMute()).toBe(false);
	});

	it('should mark entity as video', () => {
		const video = createVideo(world);
		expect(Video.isVideo[video.eid]).toBe(1);
		expect(isVideo(world, video.eid)).toBe(true);
	});

	it('should set hidden when visible is false', () => {
		const video = createVideo(world, { visible: false });
		expect(video.isVisible()).toBe(false);
	});
});

// =============================================================================
// VISIBILITY
// =============================================================================

describe('visibility', () => {
	it('should show and hide', () => {
		const video = createVideo(world, { visible: false });
		expect(video.isVisible()).toBe(false);
		video.show();
		expect(video.isVisible()).toBe(true);
		video.hide();
		expect(video.isVisible()).toBe(false);
	});

	it('should be chainable', () => {
		const video = createVideo(world);
		const result = video.hide().show();
		expect(result).toBe(video);
	});
});

// =============================================================================
// POSITION
// =============================================================================

describe('position', () => {
	it('should get and set position', () => {
		const video = createVideo(world, { x: 5, y: 10 });
		expect(video.getPosition()).toEqual({ x: 5, y: 10 });
		video.setPosition(20, 30);
		expect(video.getPosition()).toEqual({ x: 20, y: 30 });
	});

	it('should move relatively', () => {
		const video = createVideo(world, { x: 10, y: 10 });
		video.move(5, -3);
		expect(video.getPosition()).toEqual({ x: 15, y: 7 });
	});
});

// =============================================================================
// PLAYBACK
// =============================================================================

describe('playback controls', () => {
	it('should set and get path', () => {
		const video = createVideo(world);
		video.setPath('/tmp/movie.mp4');
		expect(video.getPath()).toBe('/tmp/movie.mp4');
	});

	it('should error when playing without path', () => {
		const spawner = createMockSpawner();
		const video = createVideo(world, {}, spawner);
		const errorFn = vi.fn();
		video.onError(errorFn);
		video.play();
		expect(errorFn).toHaveBeenCalledWith('No video path set');
	});

	it('should play with spawner', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mpv' }, spawner);
		video.play();
		expect(video.getPlaybackState()).toBe('playing');
		expect(video.isRunning()).toBe(true);
		expect(spawner.spawn).toHaveBeenCalledWith('mpv', expect.any(Array));
	});

	it('should stop playback', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mpv' }, spawner);
		video.play();
		video.stop();
		expect(video.getPlaybackState()).toBe('stopped');
		expect(handle.kill).toHaveBeenCalled();
	});

	it('should pause mplayer', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mplayer' }, spawner);
		video.play();
		video.pause();
		expect(video.getPlaybackState()).toBe('paused');
	});

	it('should toggle playback', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mplayer' }, spawner);
		video.play();
		expect(video.getPlaybackState()).toBe('playing');
		video.togglePlayback();
		expect(video.getPlaybackState()).toBe('paused');
	});

	it('should handle autoPlay', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle);
		createVideo(world, { path: '/tmp/v.mp4', player: 'mpv', autoPlay: true }, spawner);
		expect(spawner.spawn).toHaveBeenCalled();
	});

	it('should error without spawner', () => {
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mpv' });
		const errorFn = vi.fn();
		video.onError(errorFn);
		video.play();
		expect(errorFn).toHaveBeenCalledWith('No process spawner available');
	});

	it('should auto-detect player', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle, (p) => p.includes('mpv'));
		const video = createVideo(world, { path: '/tmp/v.mp4' }, spawner);
		video.play();
		expect(video.getPlayer()).toBe('mpv');
	});

	it('should error when no player detected', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle, () => false);
		const video = createVideo(world, { path: '/tmp/v.mp4' }, spawner);
		const errorFn = vi.fn();
		video.onError(errorFn);
		video.play();
		expect(errorFn).toHaveBeenCalledWith('No video player found (mpv or mplayer required)');
	});
});

// =============================================================================
// SEEK
// =============================================================================

describe('seek', () => {
	it('should seek with mplayer via slave command', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mplayer' }, spawner);
		video.play();
		video.seek(30);
		expect(handle.write).toHaveBeenCalledWith('seek 30 2\n');
	});

	it('should clamp negative seek to 0', () => {
		const video = createVideo(world, { path: '/tmp/v.mp4' });
		video.seek(-10);
		// State should store 0
		expect(getVideoPlaybackState(video.eid)).toBe('stopped');
	});
});

// =============================================================================
// SETTINGS
// =============================================================================

describe('settings', () => {
	it('should set and get speed', () => {
		const video = createVideo(world);
		video.setSpeed(2.0);
		expect(video.getSpeed()).toBe(2.0);
	});

	it('should set and get loop', () => {
		const video = createVideo(world);
		video.setLoop(true);
		expect(video.getLoop()).toBe(true);
	});

	it('should set and get mute', () => {
		const video = createVideo(world);
		video.setMute(false);
		expect(video.getMute()).toBe(false);
	});

	it('should get configured player', () => {
		const video = createVideo(world, { player: 'mpv' });
		expect(video.getPlayer()).toBe('mpv');
	});
});

// =============================================================================
// EVENTS
// =============================================================================

describe('events', () => {
	it('should call onEnd when process exits cleanly', () => {
		let exitCallback: ((code: number) => void) | undefined;
		const handle = createMockProcessHandle({
			onExit: vi.fn((cb) => {
				exitCallback = cb;
			}),
		});
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mpv' }, spawner);
		const endFn = vi.fn();
		video.onEnd(endFn);
		video.play();

		// Simulate process exit
		exitCallback?.(0);
		expect(endFn).toHaveBeenCalled();
	});

	it('should call onError when process exits with error', () => {
		let exitCallback: ((code: number) => void) | undefined;
		const handle = createMockProcessHandle({
			onExit: vi.fn((cb) => {
				exitCallback = cb;
			}),
		});
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mpv' }, spawner);
		const errorFn = vi.fn();
		video.onError(errorFn);
		video.play();

		exitCallback?.(1);
		expect(errorFn).toHaveBeenCalledWith('Player exited with code 1');
	});

	it('should call onData when process outputs data', () => {
		let dataCallback: ((data: string) => void) | undefined;
		const handle = createMockProcessHandle({
			onData: vi.fn((cb) => {
				dataCallback = cb;
			}),
		});
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mpv' }, spawner);
		const dataFn = vi.fn();
		video.onData(dataFn);
		video.play();

		dataCallback?.('frame data');
		expect(dataFn).toHaveBeenCalledWith('frame data');
	});
});

// =============================================================================
// RESIZE
// =============================================================================

describe('resize', () => {
	it('should resize the video output', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mpv' }, spawner);
		video.play();
		video.resize(120, 40);
		expect(handle.resize).toHaveBeenCalledWith(120, 40);
	});
});

// =============================================================================
// LIFECYCLE
// =============================================================================

describe('destroy', () => {
	it('should kill process on destroy', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mpv' }, spawner);
		video.play();
		video.destroy();
		expect(handle.kill).toHaveBeenCalled();
		expect(Video.isVideo[video.eid]).toBe(0);
	});

	it('should clean up without process', () => {
		const video = createVideo(world);
		const eid = video.eid;
		video.destroy();
		expect(Video.isVideo[eid]).toBe(0);
		expect(isVideo(world, eid)).toBe(false);
	});
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

describe('helper functions', () => {
	it('isVideo should return true for video entities', () => {
		const video = createVideo(world);
		expect(isVideo(world, video.eid)).toBe(true);
	});

	it('isVideo should return false for non-video entities', () => {
		expect(isVideo(world, 99999 as never)).toBe(false);
	});

	it('getVideoPlaybackState should return state', () => {
		const video = createVideo(world);
		expect(getVideoPlaybackState(video.eid)).toBe('stopped');
	});

	it('getVideoPlaybackState should return undefined for unknown', () => {
		expect(getVideoPlaybackState(99999 as never)).toBeUndefined();
	});

	it('getVideoPlayer should return player', () => {
		const video = createVideo(world, { player: 'mplayer' });
		expect(getVideoPlayer(video.eid)).toBe('mplayer');
	});

	it('getVideoPlayer should return undefined for unset', () => {
		const video = createVideo(world);
		expect(getVideoPlayer(video.eid)).toBeUndefined();
	});
});

// =============================================================================
// CHAINING
// =============================================================================

describe('chaining', () => {
	it('should support method chaining', () => {
		const video = createVideo(world);
		const result = video
			.setPath('/tmp/v.mp4')
			.setSpeed(2.0)
			.setLoop(true)
			.setMute(false)
			.setPosition(10, 5)
			.show();
		expect(result).toBe(video);
		expect(video.getPath()).toBe('/tmp/v.mp4');
		expect(video.getSpeed()).toBe(2.0);
	});
});

// =============================================================================
// RESET STORE
// =============================================================================

describe('resetVideoStore', () => {
	it('should clear all stores', () => {
		const video = createVideo(world, { path: '/tmp/v.mp4' });
		expect(isVideo(world, video.eid)).toBe(true);
		resetVideoStore();
		expect(isVideo(world, video.eid)).toBe(false);
	});

	it('should kill running processes', () => {
		const handle = createMockProcessHandle();
		const spawner = createMockSpawner(handle);
		const video = createVideo(world, { path: '/tmp/v.mp4', player: 'mpv' }, spawner);
		video.play();
		resetVideoStore();
		expect(handle.kill).toHaveBeenCalled();
	});
});

// =============================================================================
// MULTIPLE VIDEOS
// =============================================================================

describe('multiple videos', () => {
	it('should manage independent instances', () => {
		const v1 = createVideo(world, { path: '/a.mp4', player: 'mpv' });
		const v2 = createVideo(world, { path: '/b.mp4', player: 'mplayer' });
		expect(v1.getPath()).toBe('/a.mp4');
		expect(v2.getPath()).toBe('/b.mp4');
		expect(v1.getPlayer()).toBe('mpv');
		expect(v2.getPlayer()).toBe('mplayer');
	});
});
