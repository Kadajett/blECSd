/**
 * Tests for Spinner component.
 *
 * @module components/spinner.test
 */

import { addEntity, createWorld } from 'bitecs';
import { afterEach, describe, expect, it } from 'vitest';
import {
	addSpinner,
	advanceSpinnerFrame,
	BLOCK_SPINNER_CHARS,
	BRAILLE_SPINNER_CHARS,
	DEFAULT_SPINNER_CHARS,
	DEFAULT_SPINNER_INTERVAL,
	DOTS_SPINNER_CHARS,
	getSpinnerChar,
	getSpinnerData,
	hasSpinner,
	removeSpinner,
	resetSpinner,
	resetSpinnerStore,
	Spinner,
	setSpinnerFrames,
	setSpinnerInterval,
	updateSpinner,
} from './spinner';

describe('spinner component', () => {
	afterEach(() => {
		resetSpinnerStore();
	});

	describe('constants', () => {
		it('provides default spinner characters', () => {
			expect(DEFAULT_SPINNER_CHARS).toEqual(['|', '/', '-', '\\']);
		});

		it('provides alternative spinner styles', () => {
			expect(DOTS_SPINNER_CHARS.length).toBeGreaterThan(0);
			expect(BRAILLE_SPINNER_CHARS.length).toBeGreaterThan(0);
			expect(BLOCK_SPINNER_CHARS.length).toBeGreaterThan(0);
		});

		it('has default interval of 100ms', () => {
			expect(DEFAULT_SPINNER_INTERVAL).toBe(100);
		});
	});

	describe('addSpinner', () => {
		it('adds spinner with default options', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid);

			expect(hasSpinner(world, eid)).toBe(true);
			expect(Spinner.frame[eid]).toBe(0);
			expect(Spinner.frameCount[eid]).toBe(DEFAULT_SPINNER_CHARS.length);
			expect(Spinner.interval[eid]).toBe(DEFAULT_SPINNER_INTERVAL);
		});

		it('adds spinner with custom frames', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const frames = ['a', 'b', 'c'];

			addSpinner(world, eid, { frames });

			expect(Spinner.frameCount[eid]).toBe(3);
			expect(getSpinnerChar(eid)).toBe('a');
		});

		it('adds spinner with custom interval', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid, { interval: 200 });

			expect(Spinner.interval[eid]).toBe(200);
		});
	});

	describe('removeSpinner', () => {
		it('removes spinner component', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid);
			expect(hasSpinner(world, eid)).toBe(true);

			removeSpinner(world, eid);
			expect(hasSpinner(world, eid)).toBe(false);
		});

		it('handles non-existent spinner', () => {
			const world = createWorld();
			const eid = addEntity(world);

			// Should not throw
			removeSpinner(world, eid);
			expect(hasSpinner(world, eid)).toBe(false);
		});
	});

	describe('getSpinnerChar', () => {
		it('returns current frame character', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid, { frames: ['X', 'Y', 'Z'] });

			expect(getSpinnerChar(eid)).toBe('X');

			Spinner.frame[eid] = 1;
			expect(getSpinnerChar(eid)).toBe('Y');

			Spinner.frame[eid] = 2;
			expect(getSpinnerChar(eid)).toBe('Z');
		});

		it('returns empty string for non-existent spinner', () => {
			expect(getSpinnerChar(999)).toBe('');
		});
	});

	describe('getSpinnerData', () => {
		it('returns full spinner data', () => {
			const world = createWorld();
			const eid = addEntity(world);
			const frames = ['a', 'b'];

			addSpinner(world, eid, { frames, interval: 150 });

			const data = getSpinnerData(eid);
			expect(data).toEqual({
				frame: 0,
				frameCount: 2,
				interval: 150,
				elapsed: 0,
				frames: ['a', 'b'],
			});
		});

		it('returns null for non-existent spinner', () => {
			expect(getSpinnerData(999)).toBeNull();
		});
	});

	describe('setSpinnerInterval', () => {
		it('updates interval', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid);
			setSpinnerInterval(eid, 50);

			expect(Spinner.interval[eid]).toBe(50);
		});
	});

	describe('setSpinnerFrames', () => {
		it('updates frame characters', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid, { frames: ['X'] });
			setSpinnerFrames(eid, ['A', 'B', 'C']);

			expect(Spinner.frameCount[eid]).toBe(3);
			expect(getSpinnerChar(eid)).toBe('A');
		});

		it('resets frame if out of bounds', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid, { frames: ['X', 'Y', 'Z'] });
			Spinner.frame[eid] = 2;

			setSpinnerFrames(eid, ['A', 'B']); // Only 2 frames now

			expect(Spinner.frame[eid]).toBe(0);
		});
	});

	describe('advanceSpinnerFrame', () => {
		it('advances to next frame', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid, { frames: ['A', 'B', 'C'] });

			expect(advanceSpinnerFrame(eid)).toBe(1);
			expect(Spinner.frame[eid]).toBe(1);

			expect(advanceSpinnerFrame(eid)).toBe(2);
			expect(Spinner.frame[eid]).toBe(2);
		});

		it('wraps around to first frame', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid, { frames: ['A', 'B', 'C'] });
			Spinner.frame[eid] = 2;

			expect(advanceSpinnerFrame(eid)).toBe(0);
			expect(Spinner.frame[eid]).toBe(0);
		});
	});

	describe('updateSpinner', () => {
		it('accumulates elapsed time', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid, { interval: 100 });

			updateSpinner(eid, 30);
			expect(Spinner.elapsed[eid]).toBe(30);

			updateSpinner(eid, 30);
			expect(Spinner.elapsed[eid]).toBe(60);
		});

		it('advances frame when interval exceeded', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid, { interval: 100 });

			expect(updateSpinner(eid, 50)).toBe(false);
			expect(Spinner.frame[eid]).toBe(0);

			expect(updateSpinner(eid, 60)).toBe(true);
			expect(Spinner.frame[eid]).toBe(1);
		});

		it('handles large delta exceeding interval', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid, { interval: 100, frames: ['A', 'B', 'C'] });

			expect(updateSpinner(eid, 150)).toBe(true);
			expect(Spinner.frame[eid]).toBe(1);
			expect(Spinner.elapsed[eid]).toBe(50); // Remainder
		});
	});

	describe('resetSpinner', () => {
		it('resets frame and elapsed to zero', () => {
			const world = createWorld();
			const eid = addEntity(world);

			addSpinner(world, eid);
			Spinner.frame[eid] = 2;
			Spinner.elapsed[eid] = 50;

			resetSpinner(eid);

			expect(Spinner.frame[eid]).toBe(0);
			expect(Spinner.elapsed[eid]).toBe(0);
		});
	});
});
