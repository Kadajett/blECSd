/**
 * Configurable key binding system.
 *
 * Provides key binding registration, parsing, and matching for keyboard shortcuts.
 *
 * @module core/keyBindings
 */

import { z } from 'zod';
import type { KeyEvent, KeyName } from '../terminal/keyParser';

/**
 * Parsed key combination for matching.
 */
export interface ParsedKey {
	/** The key name (letter, number, or special key) */
	name: KeyName;
	/** Ctrl modifier required */
	ctrl: boolean;
	/** Alt/Meta modifier required */
	meta: boolean;
	/** Shift modifier required */
	shift: boolean;
}

/**
 * A key binding configuration.
 */
export interface KeyBinding {
	/** Key combination(s) that trigger this binding */
	keys: string | readonly string[];
	/** Action identifier */
	action: string;
	/** Condition expression for when binding is active */
	when?: string;
	/** Whether to prevent default handling */
	preventDefault?: boolean;
	/** Human-readable description */
	description?: string;
}

/**
 * Result of matching a key event against bindings.
 */
export interface BindingMatch {
	/** The matched binding */
	binding: KeyBinding;
	/** The action to execute */
	action: string;
	/** Whether to prevent default handling */
	preventDefault: boolean;
}

/**
 * Key binding registry state.
 */
export interface KeyBindingRegistry {
	/** Map of action names to bindings */
	readonly bindings: ReadonlyMap<string, KeyBinding>;
	/** Parsed key combinations for quick lookup */
	readonly keyIndex: ReadonlyMap<string, readonly KeyBinding[]>;
}

/**
 * Condition context for evaluating 'when' clauses.
 */
export interface ConditionContext {
	/** Current focus target */
	readonly focus?: string;
	/** Whether modal is open */
	readonly modalOpen?: boolean;
	/** Whether text input is focused */
	readonly textInputFocused?: boolean;
	/** Custom context values */
	readonly [key: string]: unknown;
}

/**
 * Zod schema for key binding validation.
 */
export const KeyBindingSchema = z.object({
	keys: z.union([z.string(), z.array(z.string()).readonly()]),
	action: z.string().min(1),
	when: z.string().optional(),
	preventDefault: z.boolean().optional(),
	description: z.string().optional(),
});

/**
 * Zod schema for an array of key bindings.
 */
export const KeyBindingsArraySchema = z.array(KeyBindingSchema);

/**
 * Alias map for key names.
 */
const KEY_ALIASES: Readonly<Record<string, KeyName>> = {
	// Common aliases
	esc: 'escape',
	ret: 'return',
	cr: 'return',
	lf: 'enter',
	bs: 'backspace',
	del: 'delete',
	ins: 'insert',
	pgup: 'pageup',
	pgdn: 'pagedown',
	pgdown: 'pagedown',

	// Arrow aliases
	arrow_up: 'up',
	arrow_down: 'down',
	arrow_left: 'left',
	arrow_right: 'right',
};

/**
 * Modifier aliases.
 */
const MODIFIER_ALIASES: Readonly<Record<string, keyof ParsedKey>> = {
	control: 'ctrl',
	cmd: 'meta',
	command: 'meta',
	option: 'meta',
	alt: 'meta',
	win: 'meta',
	super: 'meta',
};

/**
 * Parses a key string into a ParsedKey object.
 *
 * Supports formats:
 * - Single key: 'a', 'f1', 'escape'
 * - With modifiers: 'ctrl+a', 'ctrl+shift+a', 'alt+f4'
 * - Case insensitive modifiers: 'Ctrl+A' = 'ctrl+a'
 *
 * @param keyString - Key string to parse (e.g., 'ctrl+shift+a')
 * @returns Parsed key combination, or null if invalid
 */
export function parseKeyString(keyString: string): ParsedKey | null {
	if (!keyString) return null;

	const parts = keyString
		.toLowerCase()
		.split('+')
		.map((p) => p.trim());
	if (parts.length === 0) return null;

	const parsed: ParsedKey = {
		name: 'undefined' as KeyName,
		ctrl: false,
		meta: false,
		shift: false,
	};

	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (!part) continue;

		// Last part is the key name
		if (i === parts.length - 1) {
			const keyName = resolveKeyName(part);
			if (!keyName) return null;
			parsed.name = keyName;
		} else {
			// Modifier
			const modifier = resolveModifier(part);
			if (!modifier) return null;
			if (modifier === 'ctrl') parsed.ctrl = true;
			else if (modifier === 'meta') parsed.meta = true;
			else if (modifier === 'shift') parsed.shift = true;
		}
	}

	// Key name is required
	if (parsed.name === 'undefined') return null;

	return parsed;
}

/**
 * Resolves a key name, handling aliases.
 */
function resolveKeyName(name: string): KeyName | null {
	const lower = name.toLowerCase();

	// Check aliases first
	const alias = KEY_ALIASES[lower];
	if (alias) return alias;

	// Single character
	if (lower.length === 1) {
		return lower as KeyName;
	}

	// Function keys
	if (/^f(1[0-2]|[1-9])$/.test(lower)) {
		return lower as KeyName;
	}

	// Navigation and special keys
	const validNames: ReadonlySet<KeyName> = new Set([
		'up',
		'down',
		'left',
		'right',
		'home',
		'end',
		'pageup',
		'pagedown',
		'insert',
		'delete',
		'clear',
		'return',
		'enter',
		'tab',
		'backspace',
		'escape',
		'space',
	]);

	if (validNames.has(lower as KeyName)) {
		return lower as KeyName;
	}

	return null;
}

/**
 * Resolves a modifier name, handling aliases.
 */
function resolveModifier(name: string): keyof ParsedKey | null {
	const lower = name.toLowerCase();

	// Direct match
	if (lower === 'ctrl' || lower === 'meta' || lower === 'shift') {
		return lower;
	}

	// Check aliases
	return MODIFIER_ALIASES[lower] ?? null;
}

/**
 * Converts a ParsedKey to a normalized string for indexing.
 */
function keyToIndexString(key: ParsedKey): string {
	const mods: string[] = [];
	if (key.ctrl) mods.push('ctrl');
	if (key.meta) mods.push('meta');
	if (key.shift) mods.push('shift');
	mods.push(key.name);
	return mods.join('+');
}

/**
 * Converts a KeyEvent to a normalized string for matching.
 */
function eventToIndexString(event: KeyEvent): string {
	const mods: string[] = [];
	if (event.ctrl) mods.push('ctrl');
	if (event.meta) mods.push('meta');
	if (event.shift) mods.push('shift');
	mods.push(event.name);
	return mods.join('+');
}

/**
 * Creates an empty key binding registry.
 */
export function createKeyBindingRegistry(): KeyBindingRegistry {
	return {
		bindings: new Map(),
		keyIndex: new Map(),
	};
}

/**
 * Registers a key binding in the registry.
 *
 * @param registry - Current registry state
 * @param binding - Binding to register
 * @returns New registry with the binding added
 */
export function registerBinding(
	registry: KeyBindingRegistry,
	binding: KeyBinding,
): KeyBindingRegistry {
	const newBindings = new Map(registry.bindings);
	const newKeyIndex = new Map<string, KeyBinding[]>();

	// Copy existing index
	for (const [key, bindings] of registry.keyIndex) {
		newKeyIndex.set(key, [...bindings]);
	}

	// Add to bindings map
	newBindings.set(binding.action, binding);

	// Index by key combinations
	const keys = Array.isArray(binding.keys) ? binding.keys : [binding.keys];
	for (const keyStr of keys) {
		const parsed = parseKeyString(keyStr);
		if (!parsed) continue;

		const indexKey = keyToIndexString(parsed);
		const existing = newKeyIndex.get(indexKey) ?? [];
		newKeyIndex.set(indexKey, [...existing, binding]);
	}

	return {
		bindings: newBindings,
		keyIndex: newKeyIndex,
	};
}

/**
 * Registers multiple key bindings at once.
 *
 * @param registry - Current registry state
 * @param bindings - Bindings to register
 * @returns New registry with all bindings added
 */
export function registerBindings(
	registry: KeyBindingRegistry,
	bindings: readonly KeyBinding[],
): KeyBindingRegistry {
	return bindings.reduce((reg, binding) => registerBinding(reg, binding), registry);
}

/**
 * Unregisters a key binding by action name.
 *
 * @param registry - Current registry state
 * @param action - Action name to unregister
 * @returns New registry with the binding removed
 */
export function unregisterBinding(
	registry: KeyBindingRegistry,
	action: string,
): KeyBindingRegistry {
	const binding = registry.bindings.get(action);
	if (!binding) return registry;

	const newBindings = new Map(registry.bindings);
	const newKeyIndex = new Map<string, KeyBinding[]>();

	// Copy and filter key index
	for (const [key, bindings] of registry.keyIndex) {
		const filtered = bindings.filter((b) => b.action !== action);
		if (filtered.length > 0) {
			newKeyIndex.set(key, filtered);
		}
	}

	newBindings.delete(action);

	return {
		bindings: newBindings,
		keyIndex: newKeyIndex,
	};
}

/**
 * Gets the binding for a specific action.
 *
 * @param registry - Registry to search
 * @param action - Action name to find
 * @returns The binding, or undefined if not found
 */
export function getBindingForAction(
	registry: KeyBindingRegistry,
	action: string,
): KeyBinding | undefined {
	return registry.bindings.get(action);
}

/**
 * Gets all bindings that match a key combination.
 *
 * @param registry - Registry to search
 * @param key - Parsed key to match
 * @returns Array of matching bindings
 */
export function getBindingsForKey(
	registry: KeyBindingRegistry,
	key: ParsedKey,
): readonly KeyBinding[] {
	const indexKey = keyToIndexString(key);
	return registry.keyIndex.get(indexKey) ?? [];
}

/**
 * Checks if a key event matches a key binding.
 *
 * @param binding - Binding to check
 * @param event - Key event to match against
 * @returns true if the event matches one of the binding's key combinations
 */
export function matchesKey(binding: KeyBinding, event: KeyEvent): boolean {
	const keys = Array.isArray(binding.keys) ? binding.keys : [binding.keys];

	for (const keyStr of keys) {
		const parsed = parseKeyString(keyStr);
		if (!parsed) continue;

		if (
			parsed.name === event.name &&
			parsed.ctrl === event.ctrl &&
			parsed.meta === event.meta &&
			parsed.shift === event.shift
		) {
			return true;
		}
	}

	return false;
}

/**
 * Evaluates a 'when' condition expression.
 *
 * Supports simple conditions:
 * - 'focus == textbox'
 * - 'modalOpen'
 * - '!textInputFocused'
 * - 'focus == menu && !modalOpen'
 *
 * @param condition - Condition expression
 * @param context - Context for evaluation
 * @returns true if condition is met
 */
export function evaluateCondition(condition: string, context: ConditionContext): boolean {
	if (!condition) return true;

	// Split on && for AND conditions
	const andParts = condition.split('&&').map((s) => s.trim());

	for (const part of andParts) {
		if (!evaluateSingleCondition(part, context)) {
			return false;
		}
	}

	return true;
}

/**
 * Evaluates a single condition (without &&).
 */
function evaluateSingleCondition(condition: string, context: ConditionContext): boolean {
	const trimmed = condition.trim();

	// Negation
	if (trimmed.startsWith('!')) {
		return !evaluateSingleCondition(trimmed.slice(1), context);
	}

	// Equality check
	if (trimmed.includes('==')) {
		const parts = trimmed.split('==').map((s) => s.trim());
		const left = parts[0];
		const right = parts[1];
		if (!left || !right) return false;
		const leftValue = getContextValue(left, context);
		const rightValue = right.replace(/^['"]|['"]$/g, ''); // Remove quotes
		return String(leftValue) === rightValue;
	}

	// Inequality check
	if (trimmed.includes('!=')) {
		const parts = trimmed.split('!=').map((s) => s.trim());
		const left = parts[0];
		const right = parts[1];
		if (!left || !right) return false;
		const leftValue = getContextValue(left, context);
		const rightValue = right.replace(/^['"]|['"]$/g, '');
		return String(leftValue) !== rightValue;
	}

	// Boolean check (just the variable name)
	const value = getContextValue(trimmed, context);
	return Boolean(value);
}

/**
 * Gets a value from the condition context.
 */
function getContextValue(name: string, context: ConditionContext): unknown {
	const key = name.trim();
	return context[key];
}

/**
 * Matches a key event against the registry and returns matching bindings.
 *
 * @param registry - Registry to search
 * @param event - Key event to match
 * @param context - Condition context for 'when' evaluation
 * @returns Array of matching bindings (with condition passed)
 */
export function matchEvent(
	registry: KeyBindingRegistry,
	event: KeyEvent,
	context: ConditionContext = {},
): readonly BindingMatch[] {
	const indexKey = eventToIndexString(event);
	const candidates = registry.keyIndex.get(indexKey) ?? [];

	const matches: BindingMatch[] = [];

	for (const binding of candidates) {
		// Check 'when' condition
		if (binding.when && !evaluateCondition(binding.when, context)) {
			continue;
		}

		matches.push({
			binding,
			action: binding.action,
			preventDefault: binding.preventDefault ?? true,
		});
	}

	return matches;
}

/**
 * Formats a ParsedKey back to a string.
 *
 * @param key - Parsed key to format
 * @returns Formatted key string (e.g., 'ctrl+shift+a')
 */
export function formatKey(key: ParsedKey): string {
	return keyToIndexString(key);
}

/**
 * Formats a KeyEvent as a key binding string.
 *
 * @param event - Key event to format
 * @returns Formatted key string
 */
export function formatKeyEvent(event: KeyEvent): string {
	return eventToIndexString(event);
}

/**
 * Gets all registered bindings as an array.
 *
 * @param registry - Registry to list
 * @returns Array of all bindings
 */
export function listBindings(registry: KeyBindingRegistry): readonly KeyBinding[] {
	return [...registry.bindings.values()];
}

/**
 * Common default key bindings for text editing.
 */
export const DEFAULT_TEXT_BINDINGS: readonly KeyBinding[] = [
	{ keys: ['ctrl+c'], action: 'copy', description: 'Copy selection' },
	{ keys: ['ctrl+v'], action: 'paste', description: 'Paste clipboard' },
	{ keys: ['ctrl+x'], action: 'cut', description: 'Cut selection' },
	{ keys: ['ctrl+z'], action: 'undo', description: 'Undo' },
	{ keys: ['ctrl+shift+z', 'ctrl+y'], action: 'redo', description: 'Redo' },
	{ keys: ['ctrl+a'], action: 'selectAll', description: 'Select all' },
	{ keys: ['backspace'], action: 'deleteBack', description: 'Delete backwards' },
	{ keys: ['delete'], action: 'deleteForward', description: 'Delete forwards' },
	{ keys: ['home'], action: 'moveToLineStart', description: 'Move to line start' },
	{ keys: ['end'], action: 'moveToLineEnd', description: 'Move to line end' },
	{ keys: ['ctrl+home'], action: 'moveToStart', description: 'Move to document start' },
	{ keys: ['ctrl+end'], action: 'moveToEnd', description: 'Move to document end' },
];

/**
 * Common default key bindings for navigation.
 */
export const DEFAULT_NAV_BINDINGS: readonly KeyBinding[] = [
	{ keys: ['tab'], action: 'focusNext', description: 'Focus next element' },
	{ keys: ['shift+tab'], action: 'focusPrev', description: 'Focus previous element' },
	{ keys: ['escape'], action: 'cancel', description: 'Cancel/close' },
	{ keys: ['enter', 'return'], action: 'confirm', description: 'Confirm/submit' },
	{ keys: ['up'], action: 'moveUp', description: 'Move up' },
	{ keys: ['down'], action: 'moveDown', description: 'Move down' },
	{ keys: ['left'], action: 'moveLeft', description: 'Move left' },
	{ keys: ['right'], action: 'moveRight', description: 'Move right' },
	{ keys: ['pageup'], action: 'pageUp', description: 'Page up' },
	{ keys: ['pagedown'], action: 'pageDown', description: 'Page down' },
];
