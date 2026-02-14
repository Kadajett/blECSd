/**
 * Tests for debug toggle state management.
 */

import { describe, expect, it } from 'vitest';
import { createDebugToggle, type DebugToggleConfig, DebugToggleConfigSchema } from './debugToggle';

describe('DebugToggleConfigSchema', () => {
	it('validates valid config', () => {
		const config: DebugToggleConfig = {
			toggleKey: 'f12',
			initialVisible: false,
		};
		expect(() => DebugToggleConfigSchema.parse(config)).not.toThrow();
	});

	it('rejects empty toggleKey', () => {
		const config = {
			toggleKey: '',
			initialVisible: false,
		};
		expect(() => DebugToggleConfigSchema.parse(config)).toThrow();
	});

	it('accepts any non-empty toggleKey', () => {
		const config = {
			toggleKey: 'escape',
			initialVisible: true,
		};
		expect(() => DebugToggleConfigSchema.parse(config)).not.toThrow();
	});
});

describe('createDebugToggle', () => {
	it('creates toggle with default config', () => {
		const toggle = createDebugToggle();
		const state = toggle.getState();

		expect(toggle.isVisible()).toBe(false);
		expect(state.visible).toBe(false);
		expect(state.toggleCount).toBe(0);
	});

	it('creates toggle with custom config', () => {
		const toggle = createDebugToggle({
			toggleKey: 'escape',
			initialVisible: true,
		});

		expect(toggle.isVisible()).toBe(true);
		expect(toggle.getState().visible).toBe(true);
	});

	it('processes matching key and toggles state', () => {
		const toggle = createDebugToggle({
			toggleKey: 'f12',
			initialVisible: false,
		});

		const consumed = toggle.processKey('f12');
		expect(consumed).toBe(true);
		expect(toggle.isVisible()).toBe(true);
		expect(toggle.getState().toggleCount).toBe(1);
	});

	it('ignores non-matching keys', () => {
		const toggle = createDebugToggle({
			toggleKey: 'f12',
		});

		const consumed = toggle.processKey('escape');
		expect(consumed).toBe(false);
		expect(toggle.isVisible()).toBe(false);
		expect(toggle.getState().toggleCount).toBe(0);
	});

	it('is case-insensitive for key matching', () => {
		const toggle = createDebugToggle({
			toggleKey: 'F12',
		});

		const consumed1 = toggle.processKey('f12');
		expect(consumed1).toBe(true);
		expect(toggle.isVisible()).toBe(true);

		const consumed2 = toggle.processKey('F12');
		expect(consumed2).toBe(true);
		expect(toggle.isVisible()).toBe(false);
	});

	it('toggles state multiple times', () => {
		const toggle = createDebugToggle();

		expect(toggle.isVisible()).toBe(false);

		toggle.processKey('f12');
		expect(toggle.isVisible()).toBe(true);

		toggle.processKey('f12');
		expect(toggle.isVisible()).toBe(false);

		toggle.processKey('f12');
		expect(toggle.isVisible()).toBe(true);

		const state = toggle.getState();
		expect(state.toggleCount).toBe(3);
	});

	it('toggle() method works', () => {
		const toggle = createDebugToggle();

		toggle.toggle();
		expect(toggle.isVisible()).toBe(true);
		expect(toggle.getState().toggleCount).toBe(1);

		toggle.toggle();
		expect(toggle.isVisible()).toBe(false);
		expect(toggle.getState().toggleCount).toBe(2);
	});

	it('setVisible() sets state explicitly', () => {
		const toggle = createDebugToggle();

		toggle.setVisible(true);
		expect(toggle.isVisible()).toBe(true);
		expect(toggle.getState().toggleCount).toBe(1);

		toggle.setVisible(true); // No change
		expect(toggle.isVisible()).toBe(true);
		expect(toggle.getState().toggleCount).toBe(1); // Count unchanged

		toggle.setVisible(false);
		expect(toggle.isVisible()).toBe(false);
		expect(toggle.getState().toggleCount).toBe(2);
	});

	it('setVisible() only increments count on actual change', () => {
		const toggle = createDebugToggle();

		toggle.setVisible(false); // Already false
		expect(toggle.getState().toggleCount).toBe(0);

		toggle.setVisible(true);
		expect(toggle.getState().toggleCount).toBe(1);

		toggle.setVisible(true); // No change
		expect(toggle.getState().toggleCount).toBe(1);
	});

	it('getState() returns current state', () => {
		const toggle = createDebugToggle({
			initialVisible: true,
		});

		let state = toggle.getState();
		expect(state.visible).toBe(true);
		expect(state.toggleCount).toBe(0);

		toggle.toggle();
		state = toggle.getState();
		expect(state.visible).toBe(false);
		expect(state.toggleCount).toBe(1);
	});

	it('handles different toggle keys', () => {
		const toggle1 = createDebugToggle({ toggleKey: 'f1' });
		const toggle2 = createDebugToggle({ toggleKey: 'escape' });
		const toggle3 = createDebugToggle({ toggleKey: '~' });

		expect(toggle1.processKey('f1')).toBe(true);
		expect(toggle2.processKey('escape')).toBe(true);
		expect(toggle3.processKey('~')).toBe(true);

		expect(toggle1.processKey('escape')).toBe(false);
		expect(toggle2.processKey('f1')).toBe(false);
		expect(toggle3.processKey('f1')).toBe(false);
	});

	it('returns fresh state object on each getState call', () => {
		const toggle = createDebugToggle();

		const state1 = toggle.getState();
		const state2 = toggle.getState();

		// Should be equal but not the same object
		expect(state1).toEqual(state2);
		expect(state1).not.toBe(state2);
	});
});
