import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../core/events';
import type { AudioAdapter } from './hooks';
import { AudioChannel, createAudioManager } from './hooks';

function createMockAdapter(): AudioAdapter {
	return {
		play: vi.fn(),
		stop: vi.fn(),
		stopAll: vi.fn(),
		setVolume: vi.fn(),
		setMuted: vi.fn(),
	};
}

describe('AudioChannel', () => {
	it('has Music and SFX values', () => {
		expect(AudioChannel.Music).toBe(0);
		expect(AudioChannel.SFX).toBe(1);
	});
});

describe('createAudioManager', () => {
	let adapter: AudioAdapter;

	beforeEach(() => {
		adapter = createMockAdapter();
	});

	describe('adapter management', () => {
		it('creates manager without adapter', () => {
			const audio = createAudioManager();
			const state = audio.getState();
			expect(state.adapter).toBeUndefined();
		});

		it('creates manager with initial adapter', () => {
			const audio = createAudioManager(adapter);
			const state = audio.getState();
			expect(state.adapter).toBe(adapter);
		});

		it('sets adapter after creation', () => {
			const audio = createAudioManager();
			audio.setAdapter(adapter);
			expect(audio.getState().adapter).toBe(adapter);
		});

		it('clears adapter', () => {
			const audio = createAudioManager(adapter);
			audio.clearAdapter();
			expect(audio.getState().adapter).toBeUndefined();
		});
	});

	describe('default state', () => {
		it('starts with full volume on both channels', () => {
			const audio = createAudioManager();
			const state = audio.getState();
			expect(state.musicVolume).toBe(1);
			expect(state.sfxVolume).toBe(1);
		});

		it('starts unmuted on both channels', () => {
			const audio = createAudioManager();
			const state = audio.getState();
			expect(state.musicMuted).toBe(false);
			expect(state.sfxMuted).toBe(false);
		});
	});

	describe('play', () => {
		it('plays a sound through the adapter', () => {
			const audio = createAudioManager(adapter);
			audio.play({ id: 'click' });
			expect(adapter.play).toHaveBeenCalledWith({
				id: 'click',
				volume: 1,
				channel: AudioChannel.SFX,
			});
		});

		it('uses SFX channel by default', () => {
			const audio = createAudioManager(adapter);
			audio.play({ id: 'test' });
			expect(adapter.play).toHaveBeenCalledWith(
				expect.objectContaining({ channel: AudioChannel.SFX }),
			);
		});

		it('respects explicit channel', () => {
			const audio = createAudioManager(adapter);
			audio.play({ id: 'theme', channel: AudioChannel.Music });
			expect(adapter.play).toHaveBeenCalledWith(
				expect.objectContaining({ channel: AudioChannel.Music }),
			);
		});

		it('scales volume by channel volume', () => {
			const audio = createAudioManager(adapter);
			audio.setVolume(AudioChannel.SFX, 0.5);
			audio.play({ id: 'click', volume: 0.8 });
			expect(adapter.play).toHaveBeenCalledWith(expect.objectContaining({ volume: 0.4 }));
		});

		it('plays at zero volume when channel is muted', () => {
			const audio = createAudioManager(adapter);
			audio.mute(AudioChannel.SFX);
			audio.play({ id: 'click', volume: 0.8 });
			expect(adapter.play).toHaveBeenCalledWith(expect.objectContaining({ volume: 0 }));
		});

		it('passes loop option through', () => {
			const audio = createAudioManager(adapter);
			audio.play({ id: 'bgm', loop: true });
			expect(adapter.play).toHaveBeenCalledWith(expect.objectContaining({ loop: true }));
		});

		it('does not throw when no adapter is set', () => {
			const audio = createAudioManager();
			expect(() => audio.play({ id: 'click' })).not.toThrow();
		});
	});

	describe('playSound', () => {
		it('plays sound with default SFX channel', () => {
			const audio = createAudioManager(adapter);
			audio.playSound('explosion');
			expect(adapter.play).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'explosion',
					channel: AudioChannel.SFX,
				}),
			);
		});

		it('plays sound with explicit channel', () => {
			const audio = createAudioManager(adapter);
			audio.playSound('ding', AudioChannel.Music);
			expect(adapter.play).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'ding',
					channel: AudioChannel.Music,
				}),
			);
		});
	});

	describe('playMusic', () => {
		it('plays music with loop enabled on Music channel', () => {
			const audio = createAudioManager(adapter);
			audio.playMusic('theme');
			expect(adapter.play).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'theme',
					loop: true,
					channel: AudioChannel.Music,
				}),
			);
		});

		it('accepts custom volume', () => {
			const audio = createAudioManager(adapter);
			audio.playMusic('theme', 0.6);
			expect(adapter.play).toHaveBeenCalledWith(expect.objectContaining({ volume: 0.6 }));
		});
	});

	describe('stop', () => {
		it('stops a specific sound', () => {
			const audio = createAudioManager(adapter);
			audio.stop('click');
			expect(adapter.stop).toHaveBeenCalledWith('click');
		});
	});

	describe('stopAll', () => {
		it('stops all sounds', () => {
			const audio = createAudioManager(adapter);
			audio.stopAll();
			expect(adapter.stopAll).toHaveBeenCalled();
		});
	});

	describe('volume control', () => {
		it('sets music volume', () => {
			const audio = createAudioManager(adapter);
			audio.setVolume(AudioChannel.Music, 0.5);
			expect(audio.getVolume(AudioChannel.Music)).toBe(0.5);
			expect(adapter.setVolume).toHaveBeenCalledWith(AudioChannel.Music, 0.5);
		});

		it('sets SFX volume', () => {
			const audio = createAudioManager(adapter);
			audio.setVolume(AudioChannel.SFX, 0.3);
			expect(audio.getVolume(AudioChannel.SFX)).toBe(0.3);
			expect(adapter.setVolume).toHaveBeenCalledWith(AudioChannel.SFX, 0.3);
		});

		it('clamps volume to 0-1 range', () => {
			const audio = createAudioManager(adapter);
			audio.setVolume(AudioChannel.Music, 2);
			expect(audio.getVolume(AudioChannel.Music)).toBe(1);
			audio.setVolume(AudioChannel.Music, -0.5);
			expect(audio.getVolume(AudioChannel.Music)).toBe(0);
		});
	});

	describe('mute control', () => {
		it('mutes music channel', () => {
			const audio = createAudioManager(adapter);
			audio.mute(AudioChannel.Music);
			expect(audio.isMuted(AudioChannel.Music)).toBe(true);
			expect(adapter.setMuted).toHaveBeenCalledWith(AudioChannel.Music, true);
		});

		it('mutes SFX channel', () => {
			const audio = createAudioManager(adapter);
			audio.mute(AudioChannel.SFX);
			expect(audio.isMuted(AudioChannel.SFX)).toBe(true);
			expect(adapter.setMuted).toHaveBeenCalledWith(AudioChannel.SFX, true);
		});

		it('unmutes a channel', () => {
			const audio = createAudioManager(adapter);
			audio.mute(AudioChannel.Music);
			audio.unmute(AudioChannel.Music);
			expect(audio.isMuted(AudioChannel.Music)).toBe(false);
			expect(adapter.setMuted).toHaveBeenCalledWith(AudioChannel.Music, false);
		});

		it('toggles mute', () => {
			const audio = createAudioManager(adapter);
			audio.toggleMute(AudioChannel.SFX);
			expect(audio.isMuted(AudioChannel.SFX)).toBe(true);
			audio.toggleMute(AudioChannel.SFX);
			expect(audio.isMuted(AudioChannel.SFX)).toBe(false);
		});
	});

	describe('event-based triggers', () => {
		interface GameEvents {
			'player:hit': { damage: number };
			'player:death': { cause: string };
			'item:pickup': { item: string };
		}

		it('triggers sound on event', () => {
			const audio = createAudioManager(adapter);
			const bus = new EventBus<GameEvents>();

			audio.onEvent(bus, {
				event: 'player:hit',
				soundId: 'damage_sound',
			});

			bus.emit('player:hit', { damage: 10 });
			expect(adapter.play).toHaveBeenCalledWith(expect.objectContaining({ id: 'damage_sound' }));
		});

		it('applies play options to triggered sound', () => {
			const audio = createAudioManager(adapter);
			const bus = new EventBus<GameEvents>();

			audio.onEvent(bus, {
				event: 'player:death',
				soundId: 'death_sound',
				options: { volume: 0.9, channel: AudioChannel.SFX },
			});

			bus.emit('player:death', { cause: 'fall' });
			expect(adapter.play).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'death_sound',
					channel: AudioChannel.SFX,
				}),
			);
		});

		it('respects conditional predicate', () => {
			const audio = createAudioManager(adapter);
			const bus = new EventBus<GameEvents>();

			audio.onEvent(bus, {
				event: 'player:hit',
				soundId: 'critical_hit',
				when: (payload) => payload.damage > 50,
			});

			bus.emit('player:hit', { damage: 10 });
			expect(adapter.play).not.toHaveBeenCalled();

			bus.emit('player:hit', { damage: 100 });
			expect(adapter.play).toHaveBeenCalledWith(expect.objectContaining({ id: 'critical_hit' }));
		});

		it('unsubscribes from single trigger', () => {
			const audio = createAudioManager(adapter);
			const bus = new EventBus<GameEvents>();

			const unsub = audio.onEvent(bus, {
				event: 'player:hit',
				soundId: 'damage_sound',
			});

			unsub();
			bus.emit('player:hit', { damage: 10 });
			expect(adapter.play).not.toHaveBeenCalled();
		});

		it('registers multiple triggers at once', () => {
			const audio = createAudioManager(adapter);
			const bus = new EventBus<GameEvents>();

			audio.onEvents(bus, [
				{ event: 'player:hit', soundId: 'hit' },
				{ event: 'item:pickup', soundId: 'pickup' },
			]);

			bus.emit('player:hit', { damage: 5 });
			expect(adapter.play).toHaveBeenCalledWith(expect.objectContaining({ id: 'hit' }));

			bus.emit('item:pickup', { item: 'coin' });
			expect(adapter.play).toHaveBeenCalledWith(expect.objectContaining({ id: 'pickup' }));
		});

		it('unsubscribes all triggers from onEvents', () => {
			const audio = createAudioManager(adapter);
			const bus = new EventBus<GameEvents>();

			const unsub = audio.onEvents(bus, [
				{ event: 'player:hit', soundId: 'hit' },
				{ event: 'item:pickup', soundId: 'pickup' },
			]);

			unsub();
			bus.emit('player:hit', { damage: 5 });
			bus.emit('item:pickup', { item: 'coin' });
			expect(adapter.play).not.toHaveBeenCalled();
		});
	});

	describe('destroy', () => {
		it('stops all sounds on destroy', () => {
			const audio = createAudioManager(adapter);
			audio.destroy();
			expect(adapter.stopAll).toHaveBeenCalled();
		});

		it('clears adapter on destroy', () => {
			const audio = createAudioManager(adapter);
			audio.destroy();
			expect(audio.getState().adapter).toBeUndefined();
		});

		it('unsubscribes all event triggers on destroy', () => {
			const audio = createAudioManager(adapter);

			interface TestEvents {
				test: { value: number };
			}

			const bus = new EventBus<TestEvents>();
			audio.onEvent(bus, {
				event: 'test',
				soundId: 'test_sound',
			});

			audio.destroy();

			bus.emit('test', { value: 1 });
			expect(adapter.play).not.toHaveBeenCalled();
		});
	});
});
