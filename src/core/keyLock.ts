/**
 * Key Lock and Grab System
 *
 * Provides control over key event propagation for modal dialogs and game input handling.
 *
 * @module core/keyLock
 *
 * @example
 * ```typescript
 * import {
 *   grabKeys,
 *   releaseKeys,
 *   lockAllKeys,
 *   unlockAllKeys,
 *   setIgnoredKeys,
 *   isKeyLocked,
 * } from 'blecsd';
 *
 * // Lock all keys except escape
 * lockAllKeys();
 * setIgnoredKeys(['escape']);
 *
 * // Later, unlock
 * unlockAllKeys();
 * ```
 */

import type { KeyEvent } from '../terminal/program';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Key lock state for managing key event filtering.
 */
export interface KeyLockState {
	/**
	 * Set of keys that are grabbed (propagation stopped).
	 * Events for grabbed keys are consumed but not propagated.
	 */
	readonly grabbedKeys: ReadonlySet<string>;

	/**
	 * Whether all keys are locked (blocked from processing).
	 */
	readonly allKeysLocked: boolean;

	/**
	 * Set of keys that bypass the lock when allKeysLocked is true.
	 * These keys are always processed even when locked.
	 */
	readonly ignoredKeys: ReadonlySet<string>;

	/**
	 * Custom filter function for key events.
	 * Return true to block the event, false to allow it.
	 */
	readonly customFilter: KeyLockFilter | null;
}

/**
 * Custom key filter function.
 * @param event - The key event to check
 * @returns true to block the event, false to allow
 */
export type KeyLockFilter = (event: KeyEvent) => boolean;

/**
 * Options for key lock state operations.
 */
export interface KeyLockOptions {
	/** Keys to grab (stop propagation) */
	grab?: readonly string[];
	/** Keys to release from grab */
	release?: readonly string[];
	/** Lock all keys */
	lockAll?: boolean;
	/** Keys to ignore when locked */
	ignore?: readonly string[];
	/** Custom filter function */
	filter?: KeyLockFilter | null;
}

// =============================================================================
// SINGLETON STATE
// =============================================================================

let globalKeyLockState: KeyLockState = {
	grabbedKeys: new Set<string>(),
	allKeysLocked: false,
	ignoredKeys: new Set<string>(),
	customFilter: null,
};

// =============================================================================
// STATE CREATION
// =============================================================================

/**
 * Creates a new key lock state with default values.
 *
 * @returns A new KeyLockState
 *
 * @example
 * ```typescript
 * const state = createKeyLockState();
 * ```
 */
export function createKeyLockState(): KeyLockState {
	return {
		grabbedKeys: new Set<string>(),
		allKeysLocked: false,
		ignoredKeys: new Set<string>(),
		customFilter: null,
	};
}

/**
 * Gets the global key lock state.
 *
 * @returns The current KeyLockState
 */
export function getKeyLockState(): KeyLockState {
	return globalKeyLockState;
}

/**
 * Resets the global key lock state to defaults.
 * Useful for testing.
 */
export function resetKeyLockState(): void {
	globalKeyLockState = createKeyLockState();
}

// =============================================================================
// KEY GRABBING
// =============================================================================

/**
 * Grabs specified keys, stopping their propagation.
 * Grabbed keys are consumed but not dispatched to the application.
 *
 * @param keys - Keys to grab
 *
 * @example
 * ```typescript
 * // Grab arrow keys for custom handling
 * grabKeys(['up', 'down', 'left', 'right']);
 *
 * // Check if key event should be processed
 * if (!isKeyGrabbed(event.name)) {
 *   // Process the event
 * }
 * ```
 */
export function grabKeys(keys: readonly string[]): void {
	const newGrabbed = new Set(globalKeyLockState.grabbedKeys);
	for (const key of keys) {
		newGrabbed.add(key.toLowerCase());
	}
	globalKeyLockState = {
		...globalKeyLockState,
		grabbedKeys: newGrabbed,
	};
}

/**
 * Releases previously grabbed keys.
 *
 * @param keys - Keys to release
 *
 * @example
 * ```typescript
 * // Release arrow keys
 * releaseKeys(['up', 'down', 'left', 'right']);
 * ```
 */
export function releaseKeys(keys: readonly string[]): void {
	const newGrabbed = new Set(globalKeyLockState.grabbedKeys);
	for (const key of keys) {
		newGrabbed.delete(key.toLowerCase());
	}
	globalKeyLockState = {
		...globalKeyLockState,
		grabbedKeys: newGrabbed,
	};
}

/**
 * Releases all grabbed keys.
 *
 * @example
 * ```typescript
 * releaseAllGrabbedKeys();
 * ```
 */
export function releaseAllGrabbedKeys(): void {
	globalKeyLockState = {
		...globalKeyLockState,
		grabbedKeys: new Set<string>(),
	};
}

/**
 * Checks if a key is currently grabbed.
 *
 * @param key - The key name to check
 * @returns true if the key is grabbed
 *
 * @example
 * ```typescript
 * if (isKeyGrabbed('escape')) {
 *   // Key is grabbed, skip normal processing
 * }
 * ```
 */
export function isKeyGrabbed(key: string): boolean {
	return globalKeyLockState.grabbedKeys.has(key.toLowerCase());
}

/**
 * Gets all currently grabbed keys.
 *
 * @returns Array of grabbed key names
 */
export function getGrabbedKeys(): readonly string[] {
	return Array.from(globalKeyLockState.grabbedKeys);
}

// =============================================================================
// KEY LOCKING
// =============================================================================

/**
 * Locks all keys, blocking them from processing.
 * Keys in the ignored list will still be processed.
 *
 * @example
 * ```typescript
 * // Lock all keys for a modal dialog
 * lockAllKeys();
 * setIgnoredKeys(['escape']); // Allow escape to close
 * ```
 */
export function lockAllKeys(): void {
	globalKeyLockState = {
		...globalKeyLockState,
		allKeysLocked: true,
	};
}

/**
 * Unlocks all keys, allowing normal processing.
 *
 * @example
 * ```typescript
 * unlockAllKeys();
 * ```
 */
export function unlockAllKeys(): void {
	globalKeyLockState = {
		...globalKeyLockState,
		allKeysLocked: false,
	};
}

/**
 * Checks if all keys are locked.
 *
 * @returns true if all keys are locked
 */
export function areAllKeysLocked(): boolean {
	return globalKeyLockState.allKeysLocked;
}

// =============================================================================
// IGNORED KEYS
// =============================================================================

/**
 * Sets keys that bypass the lock when all keys are locked.
 * These keys will be processed even when lockAllKeys is active.
 *
 * @param keys - Keys to ignore (bypass lock)
 *
 * @example
 * ```typescript
 * // Allow escape and enter through the lock
 * setIgnoredKeys(['escape', 'enter']);
 * ```
 */
export function setIgnoredKeys(keys: readonly string[]): void {
	globalKeyLockState = {
		...globalKeyLockState,
		ignoredKeys: new Set(keys.map((k) => k.toLowerCase())),
	};
}

/**
 * Adds keys to the ignored list.
 *
 * @param keys - Keys to add to ignored list
 *
 * @example
 * ```typescript
 * addIgnoredKeys(['tab']);
 * ```
 */
export function addIgnoredKeys(keys: readonly string[]): void {
	const newIgnored = new Set(globalKeyLockState.ignoredKeys);
	for (const key of keys) {
		newIgnored.add(key.toLowerCase());
	}
	globalKeyLockState = {
		...globalKeyLockState,
		ignoredKeys: newIgnored,
	};
}

/**
 * Removes keys from the ignored list.
 *
 * @param keys - Keys to remove from ignored list
 *
 * @example
 * ```typescript
 * removeIgnoredKeys(['tab']);
 * ```
 */
export function removeIgnoredKeys(keys: readonly string[]): void {
	const newIgnored = new Set(globalKeyLockState.ignoredKeys);
	for (const key of keys) {
		newIgnored.delete(key.toLowerCase());
	}
	globalKeyLockState = {
		...globalKeyLockState,
		ignoredKeys: newIgnored,
	};
}

/**
 * Clears all ignored keys.
 *
 * @example
 * ```typescript
 * clearIgnoredKeys();
 * ```
 */
export function clearIgnoredKeys(): void {
	globalKeyLockState = {
		...globalKeyLockState,
		ignoredKeys: new Set<string>(),
	};
}

/**
 * Gets all currently ignored keys.
 *
 * @returns Array of ignored key names
 */
export function getIgnoredKeys(): readonly string[] {
	return Array.from(globalKeyLockState.ignoredKeys);
}

/**
 * Checks if a key is in the ignored list.
 *
 * @param key - The key name to check
 * @returns true if the key is ignored
 */
export function isKeyIgnored(key: string): boolean {
	return globalKeyLockState.ignoredKeys.has(key.toLowerCase());
}

// =============================================================================
// CUSTOM FILTER
// =============================================================================

/**
 * Sets a custom filter function for key events.
 * The filter is called for each key event after grab/lock checks.
 *
 * @param filter - Filter function, or null to clear
 *
 * @example
 * ```typescript
 * // Block all number keys
 * setKeyLockFilter((event) => {
 *   return /^[0-9]$/.test(event.name);
 * });
 *
 * // Clear filter
 * setKeyLockFilter(null);
 * ```
 */
export function setKeyLockFilter(filter: KeyLockFilter | null): void {
	globalKeyLockState = {
		...globalKeyLockState,
		customFilter: filter,
	};
}

/**
 * Gets the current custom filter.
 *
 * @returns The current filter or null
 */
export function getKeyLockFilter(): KeyLockFilter | null {
	return globalKeyLockState.customFilter;
}

// =============================================================================
// KEY EVENT FILTERING
// =============================================================================

/**
 * Checks if a key event should be blocked based on current lock state.
 * Use this in your input processing to filter blocked events.
 *
 * @param event - The key event to check
 * @returns true if the event should be blocked
 *
 * @example
 * ```typescript
 * function processKeyEvent(event: KeyEvent): void {
 *   if (shouldBlockKeyEvent(event)) {
 *     return; // Event is blocked
 *   }
 *   // Process event normally
 * }
 * ```
 */
export function shouldBlockKeyEvent(event: KeyEvent): boolean {
	const keyName = event.name.toLowerCase();

	// Check if key is grabbed (consumed)
	if (globalKeyLockState.grabbedKeys.has(keyName)) {
		return true;
	}

	// Check if all keys are locked
	if (globalKeyLockState.allKeysLocked) {
		// Check if this key is in the ignored list
		if (!globalKeyLockState.ignoredKeys.has(keyName)) {
			return true;
		}
	}

	// Check custom filter
	if (globalKeyLockState.customFilter) {
		if (globalKeyLockState.customFilter(event)) {
			return true;
		}
	}

	return false;
}

/**
 * Checks if a key name should be blocked (simplified version without full event).
 *
 * @param keyName - The key name to check
 * @returns true if the key should be blocked
 */
export function isKeyLocked(keyName: string): boolean {
	const key = keyName.toLowerCase();

	// Check if key is grabbed
	if (globalKeyLockState.grabbedKeys.has(key)) {
		return true;
	}

	// Check if all keys are locked (and this key is not ignored)
	if (globalKeyLockState.allKeysLocked) {
		if (!globalKeyLockState.ignoredKeys.has(key)) {
			return true;
		}
	}

	return false;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Applies key lock options to the global state.
 * Useful for setting multiple options at once.
 *
 * @param options - Key lock options to apply
 *
 * @example
 * ```typescript
 * applyKeyLockOptions({
 *   lockAll: true,
 *   ignore: ['escape', 'enter'],
 *   grab: ['tab'],
 * });
 * ```
 */
export function applyKeyLockOptions(options: KeyLockOptions): void {
	if (options.release) {
		releaseKeys(options.release);
	}
	if (options.grab) {
		grabKeys(options.grab);
	}
	if (options.lockAll !== undefined) {
		if (options.lockAll) {
			lockAllKeys();
		} else {
			unlockAllKeys();
		}
	}
	if (options.ignore) {
		setIgnoredKeys(options.ignore);
	}
	if (options.filter !== undefined) {
		setKeyLockFilter(options.filter);
	}
}

/**
 * Creates a scoped key lock context that auto-restores on cleanup.
 *
 * @param options - Key lock options for the scope
 * @returns Cleanup function to restore previous state
 *
 * @example
 * ```typescript
 * // Create a modal lock scope
 * const restore = createKeyLockScope({
 *   lockAll: true,
 *   ignore: ['escape'],
 * });
 *
 * // ... modal is open ...
 *
 * // Restore previous state when modal closes
 * restore();
 * ```
 */
export function createKeyLockScope(options: KeyLockOptions): () => void {
	// Save current state
	const previousState = globalKeyLockState;

	// Apply new options
	applyKeyLockOptions(options);

	// Return cleanup function
	return () => {
		globalKeyLockState = previousState;
	};
}
