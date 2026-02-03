/**
 * Sound Feedback System
 *
 * Provides audio feedback using terminal capabilities.
 * Supports terminal bell, with graceful degradation.
 *
 * @module balatro/terminal/sound
 */

// =============================================================================
// TYPES
// =============================================================================

export type SoundType =
	| 'card_select'
	| 'card_play'
	| 'card_discard'
	| 'score'
	| 'win_round'
	| 'lose'
	| 'error'
	| 'buy'
	| 'sell'
	| 'navigate'
	| 'confirm';

export type SoundMode = 'bell' | 'none';

export interface SoundConfig {
	readonly enabled: boolean;
	readonly mode: SoundMode;
}

export interface SoundEvent {
	readonly type: SoundType;
	readonly bells: number;
	readonly delayMs: number;
}

export interface SoundQueueState {
	readonly config: SoundConfig;
	readonly queue: readonly SoundEvent[];
	readonly processing: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Bell character */
const BELL = '\x07';

/** Sound definitions: how many bells and delay between them per event type. */
const SOUND_DEFINITIONS: Readonly<Record<SoundType, { bells: number; delayMs: number }>> = {
	card_select: { bells: 1, delayMs: 0 },
	card_play: { bells: 1, delayMs: 0 },
	card_discard: { bells: 1, delayMs: 0 },
	score: { bells: 2, delayMs: 80 },
	win_round: { bells: 3, delayMs: 100 },
	lose: { bells: 2, delayMs: 200 },
	error: { bells: 1, delayMs: 0 },
	buy: { bells: 1, delayMs: 0 },
	sell: { bells: 1, delayMs: 0 },
	navigate: { bells: 1, delayMs: 0 },
	confirm: { bells: 1, delayMs: 0 },
};

// =============================================================================
// CONFIG
// =============================================================================

/**
 * Creates default sound config.
 *
 * @param enabled - Whether sound is enabled
 * @param mode - Sound output mode
 * @returns Sound config
 */
export function createSoundConfig(enabled = true, mode: SoundMode = 'bell'): SoundConfig {
	return { enabled, mode };
}

/**
 * Enables or disables sound.
 *
 * @param config - Current config
 * @param enabled - New enabled state
 * @returns Updated config
 */
export function setSoundEnabled(config: SoundConfig, enabled: boolean): SoundConfig {
	return { ...config, enabled };
}

/**
 * Sets the sound mode.
 *
 * @param config - Current config
 * @param mode - New mode
 * @returns Updated config
 */
export function setSoundMode(config: SoundConfig, mode: SoundMode): SoundConfig {
	return { ...config, mode };
}

// =============================================================================
// QUEUE STATE
// =============================================================================

/**
 * Creates initial sound queue state.
 *
 * @param config - Sound config
 * @returns Queue state
 */
export function createSoundQueue(config: SoundConfig): SoundQueueState {
	return {
		config,
		queue: [],
		processing: false,
	};
}

/**
 * Enqueues a sound event.
 *
 * @param state - Current queue state
 * @param type - Sound type to play
 * @returns Updated queue state
 */
export function enqueueSound(state: SoundQueueState, type: SoundType): SoundQueueState {
	if (!state.config.enabled || state.config.mode === 'none') {
		return state;
	}

	const def = SOUND_DEFINITIONS[type];
	const event: SoundEvent = {
		type,
		bells: def.bells,
		delayMs: def.delayMs,
	};

	return {
		...state,
		queue: [...state.queue, event],
	};
}

/**
 * Enqueues multiple sound events.
 *
 * @param state - Current queue state
 * @param types - Sound types to play
 * @returns Updated queue state
 */
export function enqueueSounds(state: SoundQueueState, types: readonly SoundType[]): SoundQueueState {
	let current = state;
	for (const type of types) {
		current = enqueueSound(current, type);
	}
	return current;
}

/**
 * Dequeues the next sound event.
 *
 * @param state - Current queue state
 * @returns Tuple of [next event or null, updated state]
 */
export function dequeueSound(state: SoundQueueState): [SoundEvent | null, SoundQueueState] {
	if (state.queue.length === 0) {
		return [null, { ...state, processing: false }];
	}

	const next = state.queue[0] ?? null;
	return [
		next,
		{
			...state,
			queue: state.queue.slice(1),
			processing: next !== null,
		},
	];
}

/**
 * Clears all queued sounds.
 *
 * @param state - Current queue state
 * @returns Cleared queue state
 */
export function clearSoundQueue(state: SoundQueueState): SoundQueueState {
	return {
		...state,
		queue: [],
		processing: false,
	};
}

// =============================================================================
// BELL OUTPUT
// =============================================================================

/**
 * Gets the terminal bell string for a sound event.
 *
 * @param event - Sound event
 * @returns Bell string to write to stdout
 */
export function getBellString(event: SoundEvent): string {
	return BELL.repeat(event.bells);
}

/**
 * Gets the bell string for a sound type.
 *
 * @param type - Sound type
 * @returns Bell string
 */
export function getSoundBells(type: SoundType): string {
	const def = SOUND_DEFINITIONS[type];
	return BELL.repeat(def.bells);
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Checks if sound is enabled.
 *
 * @param config - Sound config
 * @returns True if enabled
 */
export function isSoundEnabled(config: SoundConfig): boolean {
	return config.enabled && config.mode !== 'none';
}

/**
 * Gets the sound definition for a type.
 *
 * @param type - Sound type
 * @returns Bell count and delay
 */
export function getSoundDefinition(type: SoundType): { readonly bells: number; readonly delayMs: number } {
	return SOUND_DEFINITIONS[type];
}

/**
 * Checks if the queue has pending sounds.
 *
 * @param state - Queue state
 * @returns True if queue is non-empty
 */
export function hasPendingSounds(state: SoundQueueState): boolean {
	return state.queue.length > 0;
}

/**
 * Gets the number of pending sounds.
 *
 * @param state - Queue state
 * @returns Queue length
 */
export function getPendingCount(state: SoundQueueState): number {
	return state.queue.length;
}

/**
 * Gets all available sound types.
 *
 * @returns Array of all sound types
 */
export function getAllSoundTypes(): readonly SoundType[] {
	return Object.keys(SOUND_DEFINITIONS) as SoundType[];
}
