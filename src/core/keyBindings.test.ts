/**
 * Tests for key binding system.
 *
 * @module core/keyBindings.test
 */

import { describe, expect, it } from 'vitest';
import type { KeyEvent } from '../terminal/keyParser';
import {
	createKeyBindingRegistry,
	evaluateCondition,
	formatKey,
	formatKeyEvent,
	getBindingForAction,
	getBindingsForKey,
	listBindings,
	matchEvent,
	matchesKey,
	parseKeyString,
	registerBinding,
	registerBindings,
	unregisterBinding,
	DEFAULT_NAV_BINDINGS,
	DEFAULT_TEXT_BINDINGS,
} from './keyBindings';

// Helper to create a mock KeyEvent
function createKeyEvent(
	name: string,
	modifiers: { ctrl?: boolean; meta?: boolean; shift?: boolean } = {},
): KeyEvent {
	return {
		sequence: name,
		name: name as KeyEvent['name'],
		ctrl: modifiers.ctrl ?? false,
		meta: modifiers.meta ?? false,
		shift: modifiers.shift ?? false,
		raw: new Uint8Array([]),
	};
}

describe('keyBindings', () => {
	describe('parseKeyString', () => {
		it('parses single letter', () => {
			const result = parseKeyString('a');
			expect(result).toEqual({
				name: 'a',
				ctrl: false,
				meta: false,
				shift: false,
			});
		});

		it('parses ctrl+letter', () => {
			const result = parseKeyString('ctrl+c');
			expect(result).toEqual({
				name: 'c',
				ctrl: true,
				meta: false,
				shift: false,
			});
		});

		it('parses ctrl+shift+letter', () => {
			const result = parseKeyString('ctrl+shift+z');
			expect(result).toEqual({
				name: 'z',
				ctrl: true,
				meta: false,
				shift: true,
			});
		});

		it('parses alt/meta modifier', () => {
			expect(parseKeyString('alt+f4')).toEqual({
				name: 'f4',
				ctrl: false,
				meta: true,
				shift: false,
			});

			expect(parseKeyString('meta+a')).toEqual({
				name: 'a',
				ctrl: false,
				meta: true,
				shift: false,
			});
		});

		it('handles modifier aliases', () => {
			expect(parseKeyString('control+a')?.ctrl).toBe(true);
			expect(parseKeyString('cmd+a')?.meta).toBe(true);
			expect(parseKeyString('command+a')?.meta).toBe(true);
			expect(parseKeyString('option+a')?.meta).toBe(true);
		});

		it('parses function keys', () => {
			expect(parseKeyString('f1')?.name).toBe('f1');
			expect(parseKeyString('f12')?.name).toBe('f12');
			expect(parseKeyString('ctrl+f5')?.name).toBe('f5');
		});

		it('parses navigation keys', () => {
			expect(parseKeyString('up')?.name).toBe('up');
			expect(parseKeyString('down')?.name).toBe('down');
			expect(parseKeyString('left')?.name).toBe('left');
			expect(parseKeyString('right')?.name).toBe('right');
			expect(parseKeyString('home')?.name).toBe('home');
			expect(parseKeyString('end')?.name).toBe('end');
			expect(parseKeyString('pageup')?.name).toBe('pageup');
			expect(parseKeyString('pagedown')?.name).toBe('pagedown');
		});

		it('parses special keys', () => {
			expect(parseKeyString('escape')?.name).toBe('escape');
			expect(parseKeyString('enter')?.name).toBe('enter');
			expect(parseKeyString('return')?.name).toBe('return');
			expect(parseKeyString('tab')?.name).toBe('tab');
			expect(parseKeyString('space')?.name).toBe('space');
			expect(parseKeyString('backspace')?.name).toBe('backspace');
		});

		it('handles key aliases', () => {
			expect(parseKeyString('esc')?.name).toBe('escape');
			expect(parseKeyString('del')?.name).toBe('delete');
			expect(parseKeyString('bs')?.name).toBe('backspace');
			expect(parseKeyString('pgup')?.name).toBe('pageup');
			expect(parseKeyString('pgdn')?.name).toBe('pagedown');
		});

		it('is case insensitive', () => {
			expect(parseKeyString('CTRL+A')).toEqual(parseKeyString('ctrl+a'));
			expect(parseKeyString('Ctrl+Shift+Z')).toEqual(parseKeyString('ctrl+shift+z'));
		});

		it('returns null for invalid input', () => {
			expect(parseKeyString('')).toBeNull();
			expect(parseKeyString('ctrl+')).toBeNull();
			expect(parseKeyString('invalid')).toBeNull();
		});
	});

	describe('registry operations', () => {
		it('creates empty registry', () => {
			const registry = createKeyBindingRegistry();
			expect(registry.bindings.size).toBe(0);
			expect(registry.keyIndex.size).toBe(0);
		});

		it('registers a binding', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBinding(registry, {
				keys: 'ctrl+s',
				action: 'save',
			});

			expect(registry.bindings.has('save')).toBe(true);
			expect(getBindingForAction(registry, 'save')).toBeDefined();
		});

		it('registers binding with multiple keys', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBinding(registry, {
				keys: ['ctrl+z', 'cmd+z'],
				action: 'undo',
			});

			const parsed1 = parseKeyString('ctrl+z')!;
			const parsed2 = parseKeyString('cmd+z')!;

			expect(getBindingsForKey(registry, parsed1)).toHaveLength(1);
			expect(getBindingsForKey(registry, parsed2)).toHaveLength(1);
		});

		it('unregisters a binding', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBinding(registry, {
				keys: 'ctrl+s',
				action: 'save',
			});
			registry = unregisterBinding(registry, 'save');

			expect(registry.bindings.has('save')).toBe(false);
			const parsed = parseKeyString('ctrl+s')!;
			expect(getBindingsForKey(registry, parsed)).toHaveLength(0);
		});

		it('registers multiple bindings at once', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBindings(registry, [
				{ keys: 'ctrl+s', action: 'save' },
				{ keys: 'ctrl+o', action: 'open' },
			]);

			expect(registry.bindings.size).toBe(2);
		});

		it('lists all bindings', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBindings(registry, [
				{ keys: 'ctrl+s', action: 'save' },
				{ keys: 'ctrl+o', action: 'open' },
			]);

			const list = listBindings(registry);
			expect(list).toHaveLength(2);
		});
	});

	describe('matchesKey', () => {
		it('matches exact key event', () => {
			const binding = { keys: 'ctrl+c', action: 'copy' };
			const event = createKeyEvent('c', { ctrl: true });
			expect(matchesKey(binding, event)).toBe(true);
		});

		it('does not match different key', () => {
			const binding = { keys: 'ctrl+c', action: 'copy' };
			const event = createKeyEvent('v', { ctrl: true });
			expect(matchesKey(binding, event)).toBe(false);
		});

		it('does not match missing modifier', () => {
			const binding = { keys: 'ctrl+c', action: 'copy' };
			const event = createKeyEvent('c'); // No ctrl
			expect(matchesKey(binding, event)).toBe(false);
		});

		it('does not match extra modifier', () => {
			const binding = { keys: 'ctrl+c', action: 'copy' };
			const event = createKeyEvent('c', { ctrl: true, shift: true });
			expect(matchesKey(binding, event)).toBe(false);
		});

		it('matches one of multiple keys', () => {
			const binding = { keys: ['ctrl+z', 'cmd+z'], action: 'undo' };
			expect(matchesKey(binding, createKeyEvent('z', { ctrl: true }))).toBe(true);
			expect(matchesKey(binding, createKeyEvent('z', { meta: true }))).toBe(true);
		});
	});

	describe('matchEvent', () => {
		it('returns matching bindings', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBinding(registry, {
				keys: 'ctrl+s',
				action: 'save',
			});

			const event = createKeyEvent('s', { ctrl: true });
			const matches = matchEvent(registry, event);

			expect(matches).toHaveLength(1);
			expect(matches[0]?.action).toBe('save');
		});

		it('returns empty for no match', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBinding(registry, {
				keys: 'ctrl+s',
				action: 'save',
			});

			const event = createKeyEvent('o', { ctrl: true });
			expect(matchEvent(registry, event)).toHaveLength(0);
		});

		it('filters by when condition', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBinding(registry, {
				keys: 'ctrl+s',
				action: 'save',
				when: 'textInputFocused',
			});

			const event = createKeyEvent('s', { ctrl: true });

			// Without context - fails condition
			expect(matchEvent(registry, event, {})).toHaveLength(0);

			// With matching context
			expect(matchEvent(registry, event, { textInputFocused: true })).toHaveLength(1);
		});

		it('returns preventDefault from binding', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBinding(registry, {
				keys: 'ctrl+s',
				action: 'save',
				preventDefault: false,
			});

			const event = createKeyEvent('s', { ctrl: true });
			const matches = matchEvent(registry, event);

			expect(matches[0]?.preventDefault).toBe(false);
		});

		it('defaults preventDefault to true', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBinding(registry, {
				keys: 'ctrl+s',
				action: 'save',
			});

			const event = createKeyEvent('s', { ctrl: true });
			const matches = matchEvent(registry, event);

			expect(matches[0]?.preventDefault).toBe(true);
		});
	});

	describe('evaluateCondition', () => {
		it('returns true for empty condition', () => {
			expect(evaluateCondition('', {})).toBe(true);
		});

		it('evaluates boolean context value', () => {
			expect(evaluateCondition('modalOpen', { modalOpen: true })).toBe(true);
			expect(evaluateCondition('modalOpen', { modalOpen: false })).toBe(false);
			expect(evaluateCondition('modalOpen', {})).toBe(false);
		});

		it('evaluates negation', () => {
			expect(evaluateCondition('!modalOpen', { modalOpen: false })).toBe(true);
			expect(evaluateCondition('!modalOpen', { modalOpen: true })).toBe(false);
		});

		it('evaluates equality', () => {
			expect(evaluateCondition('focus == textbox', { focus: 'textbox' })).toBe(true);
			expect(evaluateCondition('focus == textbox', { focus: 'button' })).toBe(false);
		});

		it('evaluates inequality', () => {
			expect(evaluateCondition('focus != textbox', { focus: 'button' })).toBe(true);
			expect(evaluateCondition('focus != textbox', { focus: 'textbox' })).toBe(false);
		});

		it('evaluates AND conditions', () => {
			expect(
				evaluateCondition('modalOpen && textInputFocused', {
					modalOpen: true,
					textInputFocused: true,
				}),
			).toBe(true);

			expect(
				evaluateCondition('modalOpen && textInputFocused', {
					modalOpen: true,
					textInputFocused: false,
				}),
			).toBe(false);
		});

		it('handles complex conditions', () => {
			expect(
				evaluateCondition('focus == editor && !modalOpen', {
					focus: 'editor',
					modalOpen: false,
				}),
			).toBe(true);
		});
	});

	describe('formatKey', () => {
		it('formats key without modifiers', () => {
			const key = parseKeyString('a')!;
			expect(formatKey(key)).toBe('a');
		});

		it('formats key with modifiers', () => {
			const key = parseKeyString('ctrl+shift+a')!;
			expect(formatKey(key)).toBe('ctrl+shift+a');
		});

		it('orders modifiers consistently', () => {
			const key1 = parseKeyString('shift+ctrl+a')!;
			const key2 = parseKeyString('ctrl+shift+a')!;
			expect(formatKey(key1)).toBe(formatKey(key2));
		});
	});

	describe('formatKeyEvent', () => {
		it('formats event without modifiers', () => {
			const event = createKeyEvent('a');
			expect(formatKeyEvent(event)).toBe('a');
		});

		it('formats event with modifiers', () => {
			const event = createKeyEvent('a', { ctrl: true, shift: true });
			expect(formatKeyEvent(event)).toBe('ctrl+shift+a');
		});
	});

	describe('default bindings', () => {
		it('provides text editing bindings', () => {
			expect(DEFAULT_TEXT_BINDINGS.length).toBeGreaterThan(0);
			expect(DEFAULT_TEXT_BINDINGS.find((b) => b.action === 'copy')).toBeDefined();
			expect(DEFAULT_TEXT_BINDINGS.find((b) => b.action === 'paste')).toBeDefined();
			expect(DEFAULT_TEXT_BINDINGS.find((b) => b.action === 'undo')).toBeDefined();
		});

		it('provides navigation bindings', () => {
			expect(DEFAULT_NAV_BINDINGS.length).toBeGreaterThan(0);
			expect(DEFAULT_NAV_BINDINGS.find((b) => b.action === 'focusNext')).toBeDefined();
			expect(DEFAULT_NAV_BINDINGS.find((b) => b.action === 'confirm')).toBeDefined();
			expect(DEFAULT_NAV_BINDINGS.find((b) => b.action === 'cancel')).toBeDefined();
		});

		it('can register default bindings', () => {
			let registry = createKeyBindingRegistry();
			registry = registerBindings(registry, DEFAULT_TEXT_BINDINGS);
			registry = registerBindings(registry, DEFAULT_NAV_BINDINGS);

			expect(registry.bindings.size).toBe(
				DEFAULT_TEXT_BINDINGS.length + DEFAULT_NAV_BINDINGS.length,
			);
		});
	});
});
