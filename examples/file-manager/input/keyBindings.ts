/**
 * Keyboard bindings.
 * @module input/keyBindings
 */

import type { KeyEvent } from 'blecsd';

/**
 * Action types for the file manager.
 */
export type Action =
	// Navigation
	| 'move:up'
	| 'move:down'
	| 'move:pageUp'
	| 'move:pageDown'
	| 'move:first'
	| 'move:last'
	// Selection with shift
	| 'extend:up'
	| 'extend:down'
	| 'extend:pageUp'
	| 'extend:pageDown'
	// Multi-select
	| 'toggle:select'
	| 'select:all'
	// Directory navigation
	| 'nav:enter'
	| 'nav:back'
	| 'nav:home'
	| 'nav:refresh'
	// Filter
	| 'filter:start'
	| 'filter:cancel'
	// Settings
	| 'toggle:hidden'
	| 'cycle:sort'
	| 'toggle:sortDirection'
	| 'cycle:sizeFormat'
	// Preview
	| 'preview:scrollUp'
	| 'preview:scrollDown'
	| 'focus:toggle'
	// File operations (action bar)
	| 'file:new'
	| 'file:delete'
	| 'file:rename'
	| 'file:copy'
	| 'file:move'
	| 'app:help'
	// App
	| 'app:quit';

/**
 * Key binding configuration.
 */
export interface KeyBinding {
	key: string;
	ctrl?: boolean;
	meta?: boolean;
	shift?: boolean;
	action: Action;
}

/**
 * Default key bindings.
 */
export const DEFAULT_KEY_BINDINGS: KeyBinding[] = [
	// Movement
	{ key: 'j', action: 'move:down' },
	{ key: 'k', action: 'move:up' },
	{ key: 'down', action: 'move:down' },
	{ key: 'up', action: 'move:up' },
	{ key: 'pagedown', action: 'move:pageDown' },
	{ key: 'pageup', action: 'move:pageUp' },
	{ key: 'g', action: 'move:first' },
	{ key: 'home', action: 'move:first' },
	{ key: 'G', shift: true, action: 'move:last' },
	{ key: 'end', action: 'move:last' },

	// Shift-select (extend selection)
	{ key: 'down', shift: true, action: 'extend:down' },
	{ key: 'up', shift: true, action: 'extend:up' },
	{ key: 'J', shift: true, action: 'extend:down' },
	{ key: 'K', shift: true, action: 'extend:up' },
	{ key: 'pagedown', shift: true, action: 'extend:pageDown' },
	{ key: 'pageup', shift: true, action: 'extend:pageUp' },

	// Multi-select
	{ key: ' ', action: 'toggle:select' },
	{ key: 'a', ctrl: true, action: 'select:all' },

	// Directory navigation
	{ key: 'enter', action: 'nav:enter' },
	{ key: 'return', action: 'nav:enter' },
	{ key: 'backspace', action: 'nav:back' },
	{ key: 'h', action: 'nav:back' },
	{ key: 'l', action: 'nav:enter' },
	{ key: '~', action: 'nav:home' },
	{ key: 'r', ctrl: true, action: 'nav:refresh' },

	// Filter
	{ key: '/', action: 'filter:start' },
	{ key: 'escape', action: 'filter:cancel' },

	// Settings
	{ key: 'h', ctrl: true, action: 'toggle:hidden' },
	{ key: '.', action: 'toggle:hidden' },
	{ key: 's', action: 'cycle:sort' },
	{ key: 'S', shift: true, action: 'toggle:sortDirection' },
	{ key: 'f', action: 'cycle:sizeFormat' },

	// Preview
	{ key: '[', action: 'preview:scrollUp' },
	{ key: ']', action: 'preview:scrollDown' },
	{ key: 'tab', action: 'focus:toggle' },

	// File operations (action bar)
	{ key: 'n', action: 'file:new' },
	{ key: 'd', action: 'file:delete' },
	{ key: 'r', action: 'file:rename' },
	{ key: 'c', action: 'file:copy' },
	{ key: 'm', action: 'file:move' },
	{ key: 'R', shift: true, action: 'nav:refresh' },
	{ key: '?', action: 'app:help' },

	// Quit
	{ key: 'q', action: 'app:quit' },
	{ key: 'c', ctrl: true, action: 'app:quit' },
];

/**
 * Matches a key event against bindings and returns the action.
 */
export function matchKeyBinding(event: KeyEvent, bindings: KeyBinding[]): Action | null {
	for (const binding of bindings) {
		if (matchesBinding(event, binding)) {
			return binding.action;
		}
	}
	return null;
}

/**
 * Checks if a key event matches a binding.
 */
function matchesBinding(event: KeyEvent, binding: KeyBinding): boolean {
	// Key name must match (case-insensitive for regular keys)
	const eventKey = event.name.toLowerCase();
	const bindingKey = binding.key.toLowerCase();

	if (eventKey !== bindingKey) {
		// Also check for special key name mappings
		if (!isKeyMatch(event.name, binding.key)) {
			return false;
		}
	}

	// Modifier flags must match
	if (binding.ctrl && !event.ctrl) return false;
	if (binding.meta && !event.meta) return false;
	if (binding.shift && !event.shift) return false;

	// If binding doesn't specify modifier, event should not have it
	// (unless it's shift for uppercase letters)
	if (!binding.ctrl && event.ctrl) return false;
	if (!binding.meta && event.meta) return false;
	if (!binding.shift && event.shift) {
		// Allow shift for uppercase letters
		if (binding.key.length === 1 && binding.key === binding.key.toUpperCase()) {
			// Uppercase binding, shift is expected
		} else if (binding.key.length === 1) {
			return false;
		}
	}

	return true;
}

/**
 * Checks if two key names match (handling aliases).
 */
function isKeyMatch(eventKey: string, bindingKey: string): boolean {
	const eventLower = eventKey.toLowerCase();
	const bindingLower = bindingKey.toLowerCase();

	if (eventLower === bindingLower) return true;

	// Handle aliases
	const aliases: Record<string, string[]> = {
		enter: ['return', 'enter'],
		return: ['return', 'enter'],
		backspace: ['backspace', 'delete'],
		escape: ['escape', 'esc'],
		' ': ['space', ' '],
		space: ['space', ' '],
	};

	const eventAliases = aliases[eventLower] ?? [eventLower];
	const bindingAliases = aliases[bindingLower] ?? [bindingLower];

	return eventAliases.some((a) => bindingAliases.includes(a));
}
