/**
 * Tests for sound feedback system
 */

import { describe, expect, it } from 'vitest';
import {
	createSoundConfig,
	setSoundEnabled,
	setSoundMode,
	createSoundQueue,
	enqueueSound,
	enqueueSounds,
	dequeueSound,
	clearSoundQueue,
	getBellString,
	getSoundBells,
	isSoundEnabled,
	getSoundDefinition,
	hasPendingSounds,
	getPendingCount,
	getAllSoundTypes,
} from './sound';

describe('createSoundConfig', () => {
	it('creates default config', () => {
		const config = createSoundConfig();

		expect(config.enabled).toBe(true);
		expect(config.mode).toBe('bell');
	});

	it('accepts custom values', () => {
		const config = createSoundConfig(false, 'none');

		expect(config.enabled).toBe(false);
		expect(config.mode).toBe('none');
	});
});

describe('setSoundEnabled', () => {
	it('enables sound', () => {
		const config = createSoundConfig(false);
		const updated = setSoundEnabled(config, true);

		expect(updated.enabled).toBe(true);
	});

	it('disables sound', () => {
		const config = createSoundConfig(true);
		const updated = setSoundEnabled(config, false);

		expect(updated.enabled).toBe(false);
	});
});

describe('setSoundMode', () => {
	it('sets mode to none', () => {
		const config = createSoundConfig();
		const updated = setSoundMode(config, 'none');

		expect(updated.mode).toBe('none');
	});
});

describe('isSoundEnabled', () => {
	it('returns true when enabled with bell mode', () => {
		const config = createSoundConfig(true, 'bell');
		expect(isSoundEnabled(config)).toBe(true);
	});

	it('returns false when disabled', () => {
		const config = createSoundConfig(false, 'bell');
		expect(isSoundEnabled(config)).toBe(false);
	});

	it('returns false when mode is none', () => {
		const config = createSoundConfig(true, 'none');
		expect(isSoundEnabled(config)).toBe(false);
	});
});

describe('createSoundQueue', () => {
	it('creates empty queue', () => {
		const config = createSoundConfig();
		const queue = createSoundQueue(config);

		expect(queue.queue).toHaveLength(0);
		expect(queue.processing).toBe(false);
		expect(queue.config).toBe(config);
	});
});

describe('enqueueSound', () => {
	it('adds sound to queue', () => {
		const config = createSoundConfig();
		let state = createSoundQueue(config);

		state = enqueueSound(state, 'card_select');

		expect(state.queue).toHaveLength(1);
		expect(state.queue[0]?.type).toBe('card_select');
	});

	it('adds multiple sounds', () => {
		const config = createSoundConfig();
		let state = createSoundQueue(config);

		state = enqueueSound(state, 'card_select');
		state = enqueueSound(state, 'card_play');

		expect(state.queue).toHaveLength(2);
	});

	it('does not add when disabled', () => {
		const config = createSoundConfig(false);
		let state = createSoundQueue(config);

		state = enqueueSound(state, 'card_select');

		expect(state.queue).toHaveLength(0);
	});

	it('does not add when mode is none', () => {
		const config = createSoundConfig(true, 'none');
		let state = createSoundQueue(config);

		state = enqueueSound(state, 'card_select');

		expect(state.queue).toHaveLength(0);
	});
});

describe('enqueueSounds', () => {
	it('adds multiple sounds at once', () => {
		const config = createSoundConfig();
		let state = createSoundQueue(config);

		state = enqueueSounds(state, ['card_select', 'card_play', 'score']);

		expect(state.queue).toHaveLength(3);
	});
});

describe('dequeueSound', () => {
	it('returns next event and updated state', () => {
		const config = createSoundConfig();
		let state = createSoundQueue(config);
		state = enqueueSound(state, 'card_select');
		state = enqueueSound(state, 'card_play');

		const [event, newState] = dequeueSound(state);

		expect(event?.type).toBe('card_select');
		expect(newState.queue).toHaveLength(1);
		expect(newState.processing).toBe(true);
	});

	it('returns null for empty queue', () => {
		const config = createSoundConfig();
		const state = createSoundQueue(config);

		const [event, newState] = dequeueSound(state);

		expect(event).toBeNull();
		expect(newState.processing).toBe(false);
	});
});

describe('clearSoundQueue', () => {
	it('empties the queue', () => {
		const config = createSoundConfig();
		let state = createSoundQueue(config);
		state = enqueueSounds(state, ['card_select', 'card_play']);

		const cleared = clearSoundQueue(state);

		expect(cleared.queue).toHaveLength(0);
		expect(cleared.processing).toBe(false);
	});
});

describe('getBellString', () => {
	it('returns bell characters for event', () => {
		const config = createSoundConfig();
		let state = createSoundQueue(config);
		state = enqueueSound(state, 'card_select');

		const [event] = dequeueSound(state);
		if (event) {
			const bells = getBellString(event);
			expect(bells).toBe('\x07');
		}
	});

	it('returns multiple bells for win_round', () => {
		const config = createSoundConfig();
		let state = createSoundQueue(config);
		state = enqueueSound(state, 'win_round');

		const [event] = dequeueSound(state);
		if (event) {
			const bells = getBellString(event);
			expect(bells).toBe('\x07\x07\x07');
		}
	});
});

describe('getSoundBells', () => {
	it('returns bell string for sound type', () => {
		expect(getSoundBells('card_select')).toBe('\x07');
	});

	it('returns multiple bells for score', () => {
		expect(getSoundBells('score')).toBe('\x07\x07');
	});
});

describe('getSoundDefinition', () => {
	it('returns definition for card_select', () => {
		const def = getSoundDefinition('card_select');

		expect(def.bells).toBe(1);
		expect(def.delayMs).toBe(0);
	});

	it('returns definition for win_round', () => {
		const def = getSoundDefinition('win_round');

		expect(def.bells).toBe(3);
		expect(def.delayMs).toBe(100);
	});
});

describe('hasPendingSounds', () => {
	it('returns false for empty queue', () => {
		const state = createSoundQueue(createSoundConfig());
		expect(hasPendingSounds(state)).toBe(false);
	});

	it('returns true when sounds queued', () => {
		const config = createSoundConfig();
		let state = createSoundQueue(config);
		state = enqueueSound(state, 'card_select');

		expect(hasPendingSounds(state)).toBe(true);
	});
});

describe('getPendingCount', () => {
	it('returns 0 for empty queue', () => {
		const state = createSoundQueue(createSoundConfig());
		expect(getPendingCount(state)).toBe(0);
	});

	it('returns count of queued sounds', () => {
		const config = createSoundConfig();
		let state = createSoundQueue(config);
		state = enqueueSounds(state, ['card_select', 'card_play']);

		expect(getPendingCount(state)).toBe(2);
	});
});

describe('getAllSoundTypes', () => {
	it('returns all sound types', () => {
		const types = getAllSoundTypes();

		expect(types).toContain('card_select');
		expect(types).toContain('card_play');
		expect(types).toContain('score');
		expect(types).toContain('win_round');
		expect(types).toContain('lose');
		expect(types).toContain('error');
		expect(types.length).toBeGreaterThanOrEqual(10);
	});
});
