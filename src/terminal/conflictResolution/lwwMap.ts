/**
 * Last-Write-Wins Map implementation.
 * @module terminal/conflictResolution/lwwMap
 */

import type { LWWRegister } from './lwwRegister';
import { createLWWRegister, mergeLWWRegisters, setLWWValue } from './lwwRegister';

// =============================================================================
// LWW MAP
// =============================================================================

/**
 * Map of Last-Write-Wins registers, one per key.
 */
export interface LWWMap<T> {
	/** Map of keys to LWW registers */
	readonly data: Map<string, LWWRegister<T>>;
}

/**
 * Creates a new empty LWW map.
 */
export function createLWWMap<T>(): LWWMap<T> {
	return {
		data: new Map(),
	};
}

/**
 * Sets a value for a key in the LWW map.
 */
export function setLWWMapValue<T>(
	map: LWWMap<T>,
	key: string,
	value: T,
	siteId: string,
	timestamp: number,
): boolean {
	const existing = map.data.get(key);
	if (existing) {
		return setLWWValue(existing, value, siteId, timestamp);
	}

	const newReg = createLWWRegister(value, siteId);
	newReg.timestamp = timestamp;
	map.data.set(key, newReg);
	return true;
}

/**
 * Gets a value from the LWW map.
 */
export function getLWWMapValue<T>(map: LWWMap<T>, key: string): T | undefined {
	const reg = map.data.get(key);
	return reg?.value;
}

/**
 * Checks if a key exists in the LWW map.
 */
export function hasLWWMapKey<T>(map: LWWMap<T>, key: string): boolean {
	return map.data.has(key);
}

/**
 * Gets all keys in the LWW map.
 */
export function getLWWMapKeys<T>(map: LWWMap<T>): readonly string[] {
	return Array.from(map.data.keys());
}

/**
 * Gets the size of the LWW map.
 */
export function getLWWMapSize<T>(map: LWWMap<T>): number {
	return map.data.size;
}

/**
 * Merges two LWW maps, key by key.
 */
export function mergeLWWMaps<T>(a: LWWMap<T>, b: LWWMap<T>): LWWMap<T> {
	const result = createLWWMap<T>();

	// Copy all keys from map a
	for (const [key, reg] of a.data.entries()) {
		result.data.set(key, { ...reg });
	}

	// Merge in keys from map b
	for (const [key, regB] of b.data.entries()) {
		const regA = result.data.get(key);
		if (regA) {
			result.data.set(key, mergeLWWRegisters(regA, regB));
		} else {
			result.data.set(key, { ...regB });
		}
	}

	return result;
}
