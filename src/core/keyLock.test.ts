/**
 * Tests for Key Lock and Grab System
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KeyEvent } from '../terminal/program';
import {
	addIgnoredKeys,
	applyKeyLockOptions,
	areAllKeysLocked,
	clearIgnoredKeys,
	createKeyLockScope,
	createKeyLockState,
	getGrabbedKeys,
	getIgnoredKeys,
	getKeyLockFilter,
	getKeyLockState,
	grabKeys,
	isKeyGrabbed,
	isKeyIgnored,
	isKeyLocked,
	lockAllKeys,
	releaseAllGrabbedKeys,
	releaseKeys,
	removeIgnoredKeys,
	resetKeyLockState,
	setIgnoredKeys,
	setKeyLockFilter,
	shouldBlockKeyEvent,
	unlockAllKeys,
} from './keyLock';

function createKeyEvent(name: string, modifiers: Partial<KeyEvent> = {}): KeyEvent {
	return {
		name,
		sequence: name,
		ctrl: false,
		meta: false,
		shift: false,
		...modifiers,
	};
}

describe('keyLock', () => {
	beforeEach(() => {
		resetKeyLockState();
	});

	describe('createKeyLockState', () => {
		it('creates state with default values', () => {
			const state = createKeyLockState();

			expect(state.grabbedKeys.size).toBe(0);
			expect(state.allKeysLocked).toBe(false);
			expect(state.ignoredKeys.size).toBe(0);
			expect(state.customFilter).toBeNull();
		});
	});

	describe('getKeyLockState', () => {
		it('returns global state', () => {
			const state = getKeyLockState();

			expect(state).toBeDefined();
			expect(state.grabbedKeys).toBeDefined();
		});
	});

	describe('resetKeyLockState', () => {
		it('resets state to defaults', () => {
			grabKeys(['a', 'b']);
			lockAllKeys();
			setIgnoredKeys(['escape']);

			resetKeyLockState();

			const state = getKeyLockState();
			expect(state.grabbedKeys.size).toBe(0);
			expect(state.allKeysLocked).toBe(false);
			expect(state.ignoredKeys.size).toBe(0);
		});
	});

	describe('key grabbing', () => {
		describe('grabKeys', () => {
			it('grabs specified keys', () => {
				grabKeys(['up', 'down']);

				expect(isKeyGrabbed('up')).toBe(true);
				expect(isKeyGrabbed('down')).toBe(true);
				expect(isKeyGrabbed('left')).toBe(false);
			});

			it('normalizes key names to lowercase', () => {
				grabKeys(['UP', 'Down']);

				expect(isKeyGrabbed('up')).toBe(true);
				expect(isKeyGrabbed('down')).toBe(true);
			});

			it('accumulates grabbed keys', () => {
				grabKeys(['a']);
				grabKeys(['b']);

				expect(isKeyGrabbed('a')).toBe(true);
				expect(isKeyGrabbed('b')).toBe(true);
			});
		});

		describe('releaseKeys', () => {
			it('releases specified keys', () => {
				grabKeys(['up', 'down', 'left']);
				releaseKeys(['down']);

				expect(isKeyGrabbed('up')).toBe(true);
				expect(isKeyGrabbed('down')).toBe(false);
				expect(isKeyGrabbed('left')).toBe(true);
			});

			it('handles releasing ungrabbed keys', () => {
				releaseKeys(['notgrabbed']);
				// Should not throw
				expect(isKeyGrabbed('notgrabbed')).toBe(false);
			});
		});

		describe('releaseAllGrabbedKeys', () => {
			it('releases all grabbed keys', () => {
				grabKeys(['a', 'b', 'c']);
				releaseAllGrabbedKeys();

				expect(isKeyGrabbed('a')).toBe(false);
				expect(isKeyGrabbed('b')).toBe(false);
				expect(isKeyGrabbed('c')).toBe(false);
			});
		});

		describe('isKeyGrabbed', () => {
			it('returns true for grabbed keys', () => {
				grabKeys(['escape']);
				expect(isKeyGrabbed('escape')).toBe(true);
			});

			it('returns false for ungrabbed keys', () => {
				expect(isKeyGrabbed('escape')).toBe(false);
			});

			it('is case-insensitive', () => {
				grabKeys(['escape']);
				expect(isKeyGrabbed('ESCAPE')).toBe(true);
			});
		});

		describe('getGrabbedKeys', () => {
			it('returns array of grabbed keys', () => {
				grabKeys(['a', 'b', 'c']);
				const keys = getGrabbedKeys();

				expect(keys).toContain('a');
				expect(keys).toContain('b');
				expect(keys).toContain('c');
			});

			it('returns empty array when nothing grabbed', () => {
				const keys = getGrabbedKeys();
				expect(keys).toEqual([]);
			});
		});
	});

	describe('key locking', () => {
		describe('lockAllKeys', () => {
			it('locks all keys', () => {
				lockAllKeys();
				expect(areAllKeysLocked()).toBe(true);
			});
		});

		describe('unlockAllKeys', () => {
			it('unlocks all keys', () => {
				lockAllKeys();
				unlockAllKeys();
				expect(areAllKeysLocked()).toBe(false);
			});
		});

		describe('areAllKeysLocked', () => {
			it('returns false by default', () => {
				expect(areAllKeysLocked()).toBe(false);
			});

			it('returns true after lockAllKeys', () => {
				lockAllKeys();
				expect(areAllKeysLocked()).toBe(true);
			});
		});
	});

	describe('ignored keys', () => {
		describe('setIgnoredKeys', () => {
			it('sets ignored keys', () => {
				setIgnoredKeys(['escape', 'enter']);

				expect(isKeyIgnored('escape')).toBe(true);
				expect(isKeyIgnored('enter')).toBe(true);
				expect(isKeyIgnored('tab')).toBe(false);
			});

			it('replaces previous ignored keys', () => {
				setIgnoredKeys(['a', 'b']);
				setIgnoredKeys(['c', 'd']);

				expect(isKeyIgnored('a')).toBe(false);
				expect(isKeyIgnored('b')).toBe(false);
				expect(isKeyIgnored('c')).toBe(true);
				expect(isKeyIgnored('d')).toBe(true);
			});

			it('normalizes to lowercase', () => {
				setIgnoredKeys(['ESCAPE']);
				expect(isKeyIgnored('escape')).toBe(true);
			});
		});

		describe('addIgnoredKeys', () => {
			it('adds to existing ignored keys', () => {
				setIgnoredKeys(['a']);
				addIgnoredKeys(['b']);

				expect(isKeyIgnored('a')).toBe(true);
				expect(isKeyIgnored('b')).toBe(true);
			});
		});

		describe('removeIgnoredKeys', () => {
			it('removes from ignored keys', () => {
				setIgnoredKeys(['a', 'b', 'c']);
				removeIgnoredKeys(['b']);

				expect(isKeyIgnored('a')).toBe(true);
				expect(isKeyIgnored('b')).toBe(false);
				expect(isKeyIgnored('c')).toBe(true);
			});
		});

		describe('clearIgnoredKeys', () => {
			it('clears all ignored keys', () => {
				setIgnoredKeys(['a', 'b', 'c']);
				clearIgnoredKeys();

				expect(getIgnoredKeys()).toEqual([]);
			});
		});

		describe('getIgnoredKeys', () => {
			it('returns array of ignored keys', () => {
				setIgnoredKeys(['escape', 'enter']);
				const keys = getIgnoredKeys();

				expect(keys).toContain('escape');
				expect(keys).toContain('enter');
			});
		});
	});

	describe('custom filter', () => {
		describe('setKeyLockFilter', () => {
			it('sets custom filter', () => {
				const filter = vi.fn(() => false);
				setKeyLockFilter(filter);

				expect(getKeyLockFilter()).toBe(filter);
			});

			it('clears filter with null', () => {
				setKeyLockFilter(() => true);
				setKeyLockFilter(null);

				expect(getKeyLockFilter()).toBeNull();
			});
		});

		describe('getKeyLockFilter', () => {
			it('returns null by default', () => {
				expect(getKeyLockFilter()).toBeNull();
			});

			it('returns set filter', () => {
				const filter = () => true;
				setKeyLockFilter(filter);
				expect(getKeyLockFilter()).toBe(filter);
			});
		});
	});

	describe('shouldBlockKeyEvent', () => {
		it('returns false by default', () => {
			const event = createKeyEvent('a');
			expect(shouldBlockKeyEvent(event)).toBe(false);
		});

		it('blocks grabbed keys', () => {
			grabKeys(['escape']);
			const event = createKeyEvent('escape');
			expect(shouldBlockKeyEvent(event)).toBe(true);
		});

		it('allows ungrabbed keys', () => {
			grabKeys(['escape']);
			const event = createKeyEvent('enter');
			expect(shouldBlockKeyEvent(event)).toBe(false);
		});

		it('blocks all keys when locked', () => {
			lockAllKeys();

			expect(shouldBlockKeyEvent(createKeyEvent('a'))).toBe(true);
			expect(shouldBlockKeyEvent(createKeyEvent('b'))).toBe(true);
			expect(shouldBlockKeyEvent(createKeyEvent('escape'))).toBe(true);
		});

		it('allows ignored keys when locked', () => {
			lockAllKeys();
			setIgnoredKeys(['escape']);

			expect(shouldBlockKeyEvent(createKeyEvent('a'))).toBe(true);
			expect(shouldBlockKeyEvent(createKeyEvent('escape'))).toBe(false);
		});

		it('applies custom filter', () => {
			setKeyLockFilter((event) => event.name === 'blocked');

			expect(shouldBlockKeyEvent(createKeyEvent('blocked'))).toBe(true);
			expect(shouldBlockKeyEvent(createKeyEvent('allowed'))).toBe(false);
		});

		it('checks grab before lock before filter', () => {
			// Grab takes priority
			grabKeys(['a']);
			lockAllKeys();
			setIgnoredKeys(['a']); // Would allow if not grabbed

			expect(shouldBlockKeyEvent(createKeyEvent('a'))).toBe(true);
		});
	});

	describe('isKeyLocked', () => {
		it('returns false by default', () => {
			expect(isKeyLocked('a')).toBe(false);
		});

		it('returns true for grabbed keys', () => {
			grabKeys(['escape']);
			expect(isKeyLocked('escape')).toBe(true);
		});

		it('returns true for all keys when locked', () => {
			lockAllKeys();
			expect(isKeyLocked('a')).toBe(true);
			expect(isKeyLocked('z')).toBe(true);
		});

		it('returns false for ignored keys when locked', () => {
			lockAllKeys();
			setIgnoredKeys(['escape']);

			expect(isKeyLocked('a')).toBe(true);
			expect(isKeyLocked('escape')).toBe(false);
		});

		it('is case-insensitive', () => {
			grabKeys(['escape']);
			expect(isKeyLocked('ESCAPE')).toBe(true);
		});
	});

	describe('applyKeyLockOptions', () => {
		it('applies grab option', () => {
			applyKeyLockOptions({ grab: ['a', 'b'] });

			expect(isKeyGrabbed('a')).toBe(true);
			expect(isKeyGrabbed('b')).toBe(true);
		});

		it('applies release option', () => {
			grabKeys(['a', 'b', 'c']);
			applyKeyLockOptions({ release: ['b'] });

			expect(isKeyGrabbed('a')).toBe(true);
			expect(isKeyGrabbed('b')).toBe(false);
			expect(isKeyGrabbed('c')).toBe(true);
		});

		it('applies lockAll option', () => {
			applyKeyLockOptions({ lockAll: true });
			expect(areAllKeysLocked()).toBe(true);

			applyKeyLockOptions({ lockAll: false });
			expect(areAllKeysLocked()).toBe(false);
		});

		it('applies ignore option', () => {
			applyKeyLockOptions({ ignore: ['escape', 'enter'] });

			expect(isKeyIgnored('escape')).toBe(true);
			expect(isKeyIgnored('enter')).toBe(true);
		});

		it('applies filter option', () => {
			const filter = () => true;
			applyKeyLockOptions({ filter });
			expect(getKeyLockFilter()).toBe(filter);

			applyKeyLockOptions({ filter: null });
			expect(getKeyLockFilter()).toBeNull();
		});

		it('applies multiple options', () => {
			applyKeyLockOptions({
				grab: ['tab'],
				lockAll: true,
				ignore: ['escape'],
			});

			expect(isKeyGrabbed('tab')).toBe(true);
			expect(areAllKeysLocked()).toBe(true);
			expect(isKeyIgnored('escape')).toBe(true);
		});
	});

	describe('createKeyLockScope', () => {
		it('applies options and returns restore function', () => {
			const restore = createKeyLockScope({
				lockAll: true,
				ignore: ['escape'],
			});

			expect(areAllKeysLocked()).toBe(true);
			expect(isKeyIgnored('escape')).toBe(true);

			restore();

			expect(areAllKeysLocked()).toBe(false);
			expect(isKeyIgnored('escape')).toBe(false);
		});

		it('restores previous state exactly', () => {
			grabKeys(['a', 'b']);
			setIgnoredKeys(['c']);

			const restore = createKeyLockScope({
				grab: ['x', 'y'],
				ignore: ['z'],
			});

			expect(isKeyGrabbed('x')).toBe(true);
			expect(isKeyIgnored('z')).toBe(true);

			restore();

			expect(isKeyGrabbed('a')).toBe(true);
			expect(isKeyGrabbed('b')).toBe(true);
			expect(isKeyGrabbed('x')).toBe(false);
			expect(isKeyIgnored('c')).toBe(true);
			expect(isKeyIgnored('z')).toBe(false);
		});

		it('can be nested', () => {
			const restore1 = createKeyLockScope({
				lockAll: true,
				ignore: ['escape'],
			});

			const restore2 = createKeyLockScope({
				ignore: ['enter'],
			});

			expect(isKeyIgnored('enter')).toBe(true);
			expect(isKeyIgnored('escape')).toBe(false); // Replaced by inner scope

			restore2();

			expect(isKeyIgnored('escape')).toBe(true);
			expect(isKeyIgnored('enter')).toBe(false);

			restore1();

			expect(areAllKeysLocked()).toBe(false);
		});
	});

	describe('integration scenarios', () => {
		it('modal dialog scenario', () => {
			// Simulate opening a modal
			const restore = createKeyLockScope({
				lockAll: true,
				ignore: ['escape', 'enter', 'tab'],
			});

			// All keys blocked except escape, enter, tab
			expect(shouldBlockKeyEvent(createKeyEvent('a'))).toBe(true);
			expect(shouldBlockKeyEvent(createKeyEvent('escape'))).toBe(false);
			expect(shouldBlockKeyEvent(createKeyEvent('enter'))).toBe(false);
			expect(shouldBlockKeyEvent(createKeyEvent('tab'))).toBe(false);

			// Close modal
			restore();

			// All keys work again
			expect(shouldBlockKeyEvent(createKeyEvent('a'))).toBe(false);
		});

		it('game input grab scenario', () => {
			// Game grabs movement keys
			grabKeys(['up', 'down', 'left', 'right', 'space']);

			// These keys are grabbed
			expect(isKeyLocked('up')).toBe(true);
			expect(isKeyLocked('space')).toBe(true);

			// Other keys still work
			expect(isKeyLocked('a')).toBe(false);
			expect(isKeyLocked('escape')).toBe(false);

			// Release when game pauses
			releaseAllGrabbedKeys();

			expect(isKeyLocked('up')).toBe(false);
		});

		it('custom filter for number keys', () => {
			// Block number input
			setKeyLockFilter((event) => /^[0-9]$/.test(event.name));

			expect(shouldBlockKeyEvent(createKeyEvent('1'))).toBe(true);
			expect(shouldBlockKeyEvent(createKeyEvent('9'))).toBe(true);
			expect(shouldBlockKeyEvent(createKeyEvent('a'))).toBe(false);
			expect(shouldBlockKeyEvent(createKeyEvent('enter'))).toBe(false);

			setKeyLockFilter(null);

			expect(shouldBlockKeyEvent(createKeyEvent('1'))).toBe(false);
		});
	});
});
