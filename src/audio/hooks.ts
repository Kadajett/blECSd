/**
 * Audio integration hooks for games.
 *
 * Provides typed interfaces and hook functions for integrating audio
 * into terminal games. blECSd does not play audio directly; instead,
 * users supply an AudioAdapter implementation and the library wires
 * event-based sound triggers, volume control, and channel management.
 *
 * @module audio/hooks
 */

import type { EventBus, EventMap } from '../core/events';
import type { Unsubscribe } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Audio channel for routing sounds.
 */
export const AudioChannel = {
	Music: 0,
	SFX: 1,
} as const;

export type AudioChannelValue = (typeof AudioChannel)[keyof typeof AudioChannel];

/**
 * Options for playing a sound.
 *
 * @example
 * ```typescript
 * import { AudioChannel } from 'blecsd';
 *
 * const options: PlayOptions = {
 *   id: 'explosion',
 *   loop: false,
 *   volume: 0.8,
 *   channel: AudioChannel.SFX,
 * };
 * ```
 */
export interface PlayOptions {
	/** Unique identifier for the sound */
	readonly id: string;
	/** Whether the sound should loop (default: false) */
	readonly loop?: boolean;
	/** Volume level from 0 to 1 (default: 1) */
	readonly volume?: number;
	/** Audio channel to play on (default: AudioChannel.SFX) */
	readonly channel?: AudioChannelValue;
}

/**
 * User-provided audio adapter that handles actual audio playback.
 * blECSd never plays audio directly; this interface is what users implement.
 *
 * @example
 * ```typescript
 * import type { AudioAdapter } from 'blecsd';
 *
 * const myAudio: AudioAdapter = {
 *   play: (opts) => { console.log(`Playing ${opts.id}`); },
 *   stop: (id) => { console.log(`Stopping ${id}`); },
 *   stopAll: () => { console.log('Stopping all'); },
 *   setVolume: (channel, volume) => { ... },
 *   setMuted: (channel, muted) => { ... },
 * };
 * ```
 */
export interface AudioAdapter {
	/** Play a sound with the given options */
	play(options: PlayOptions): void;
	/** Stop a specific sound by its ID */
	stop(id: string): void;
	/** Stop all currently playing sounds */
	stopAll(): void;
	/** Set the volume for a channel (0 to 1) */
	setVolume(channel: AudioChannelValue, volume: number): void;
	/** Mute or unmute a channel */
	setMuted(channel: AudioChannelValue, muted: boolean): void;
}

/**
 * A sound trigger that maps an event to a sound.
 */
export interface SoundTrigger<T extends EventMap, K extends keyof T> {
	/** The event name to listen for */
	readonly event: K;
	/** The sound ID to play when the event fires */
	readonly soundId: string;
	/** Optional play options override */
	readonly options?: Omit<PlayOptions, 'id'>;
	/** Optional predicate to conditionally trigger the sound */
	readonly when?: (payload: T[K]) => boolean;
}

/**
 * Audio manager state.
 */
export interface AudioState {
	readonly musicVolume: number;
	readonly sfxVolume: number;
	readonly musicMuted: boolean;
	readonly sfxMuted: boolean;
	readonly adapter: AudioAdapter | undefined;
}

/**
 * Audio manager returned by createAudioManager.
 */
export interface AudioManager {
	/** Get current audio state */
	getState(): AudioState;
	/** Set the audio adapter implementation */
	setAdapter(adapter: AudioAdapter): void;
	/** Remove the current adapter */
	clearAdapter(): void;
	/** Play a sound */
	play(options: PlayOptions): void;
	/** Play a sound by ID with default options */
	playSound(id: string, channel?: AudioChannelValue): void;
	/** Play background music (loops by default) */
	playMusic(id: string, volume?: number): void;
	/** Stop a specific sound */
	stop(id: string): void;
	/** Stop all sounds */
	stopAll(): void;
	/** Set volume for a channel (0 to 1) */
	setVolume(channel: AudioChannelValue, volume: number): void;
	/** Get volume for a channel */
	getVolume(channel: AudioChannelValue): number;
	/** Mute a channel */
	mute(channel: AudioChannelValue): void;
	/** Unmute a channel */
	unmute(channel: AudioChannelValue): void;
	/** Toggle mute for a channel */
	toggleMute(channel: AudioChannelValue): void;
	/** Check if a channel is muted */
	isMuted(channel: AudioChannelValue): boolean;
	/** Register a sound trigger for an event bus */
	onEvent<T extends EventMap, K extends keyof T>(
		bus: EventBus<T>,
		trigger: SoundTrigger<T, K>,
	): Unsubscribe;
	/** Register multiple sound triggers at once */
	onEvents<T extends EventMap>(
		bus: EventBus<T>,
		triggers: ReadonlyArray<SoundTrigger<T, keyof T>>,
	): Unsubscribe;
	/** Destroy the audio manager and clean up */
	destroy(): void;
}

// =============================================================================
// IMPLEMENTATION
// =============================================================================

/**
 * No-op audio adapter used when no real adapter is set.
 */
const NOOP_ADAPTER: AudioAdapter = {
	play: () => {},
	stop: () => {},
	stopAll: () => {},
	setVolume: () => {},
	setMuted: () => {},
};

/**
 * Creates an audio manager for integrating sound into a game.
 *
 * The manager does not play audio directly. Instead, users provide an
 * AudioAdapter that handles actual playback. The manager handles
 * channel volumes, muting, and event-based sound triggers.
 *
 * @param adapter - Optional initial audio adapter
 * @returns An AudioManager instance
 *
 * @example
 * ```typescript
 * import { createAudioManager, AudioChannel } from 'blecsd';
 *
 * const audio = createAudioManager();
 *
 * // Set an adapter (user-provided audio implementation)
 * audio.setAdapter(myAudioAdapter);
 *
 * // Play sounds
 * audio.playSound('click', AudioChannel.SFX);
 * audio.playMusic('background_theme');
 *
 * // Volume control
 * audio.setVolume(AudioChannel.Music, 0.5);
 * audio.mute(AudioChannel.SFX);
 *
 * // Event-based triggers
 * const unsub = audio.onEvent(eventBus, {
 *   event: 'player:hit',
 *   soundId: 'damage',
 *   options: { volume: 0.8 },
 * });
 * ```
 */
export function createAudioManager(adapter?: AudioAdapter): AudioManager {
	let currentAdapter: AudioAdapter | undefined = adapter;
	let musicVolume = 1;
	let sfxVolume = 1;
	let musicMuted = false;
	let sfxMuted = false;
	const unsubscribers: Unsubscribe[] = [];

	function getAdapter(): AudioAdapter {
		return currentAdapter ?? NOOP_ADAPTER;
	}

	function getChannelVolume(channel: AudioChannelValue): number {
		return channel === AudioChannel.Music ? musicVolume : sfxVolume;
	}

	function isChannelMuted(channel: AudioChannelValue): boolean {
		return channel === AudioChannel.Music ? musicMuted : sfxMuted;
	}

	function effectiveVolume(channel: AudioChannelValue, volume: number): number {
		if (isChannelMuted(channel)) {
			return 0;
		}
		return volume * getChannelVolume(channel);
	}

	const manager: AudioManager = {
		getState(): AudioState {
			return {
				musicVolume,
				sfxVolume,
				musicMuted,
				sfxMuted,
				adapter: currentAdapter,
			};
		},

		setAdapter(newAdapter: AudioAdapter): void {
			currentAdapter = newAdapter;
		},

		clearAdapter(): void {
			currentAdapter = undefined;
		},

		play(options: PlayOptions): void {
			const channel = options.channel ?? AudioChannel.SFX;
			const volume = options.volume ?? 1;
			const resolved = effectiveVolume(channel, volume);
			getAdapter().play({
				...options,
				volume: resolved,
				channel,
			});
		},

		playSound(id: string, channel?: AudioChannelValue): void {
			manager.play({ id, channel: channel ?? AudioChannel.SFX });
		},

		playMusic(id: string, volume?: number): void {
			manager.play({
				id,
				loop: true,
				volume: volume ?? 1,
				channel: AudioChannel.Music,
			});
		},

		stop(id: string): void {
			getAdapter().stop(id);
		},

		stopAll(): void {
			getAdapter().stopAll();
		},

		setVolume(channel: AudioChannelValue, volume: number): void {
			const clamped = Math.max(0, Math.min(1, volume));
			if (channel === AudioChannel.Music) {
				musicVolume = clamped;
			} else {
				sfxVolume = clamped;
			}
			getAdapter().setVolume(channel, clamped);
		},

		getVolume(channel: AudioChannelValue): number {
			return getChannelVolume(channel);
		},

		mute(channel: AudioChannelValue): void {
			if (channel === AudioChannel.Music) {
				musicMuted = true;
			} else {
				sfxMuted = true;
			}
			getAdapter().setMuted(channel, true);
		},

		unmute(channel: AudioChannelValue): void {
			if (channel === AudioChannel.Music) {
				musicMuted = false;
			} else {
				sfxMuted = false;
			}
			getAdapter().setMuted(channel, false);
		},

		toggleMute(channel: AudioChannelValue): void {
			if (isChannelMuted(channel)) {
				manager.unmute(channel);
			} else {
				manager.mute(channel);
			}
		},

		isMuted(channel: AudioChannelValue): boolean {
			return isChannelMuted(channel);
		},

		onEvent<T extends EventMap, K extends keyof T>(
			bus: EventBus<T>,
			trigger: SoundTrigger<T, K>,
		): Unsubscribe {
			const unsub = bus.on(trigger.event, (payload: T[K]) => {
				if (trigger.when && !trigger.when(payload)) {
					return;
				}
				manager.play({
					id: trigger.soundId,
					...trigger.options,
				});
			});
			unsubscribers.push(unsub);
			return unsub;
		},

		onEvents<T extends EventMap>(
			bus: EventBus<T>,
			triggers: ReadonlyArray<SoundTrigger<T, keyof T>>,
		): Unsubscribe {
			const subs: Unsubscribe[] = [];
			for (const trigger of triggers) {
				subs.push(manager.onEvent(bus, trigger));
			}
			return () => {
				for (const unsub of subs) {
					unsub();
				}
			};
		},

		destroy(): void {
			for (const unsub of unsubscribers) {
				unsub();
			}
			unsubscribers.length = 0;
			getAdapter().stopAll();
			currentAdapter = undefined;
		},
	};

	return manager;
}
