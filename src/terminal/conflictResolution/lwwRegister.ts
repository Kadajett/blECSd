/**
 * Last-Write-Wins Register implementation.
 * @module terminal/conflictResolution/lwwRegister
 */

// =============================================================================
// LWW REGISTER (Last-Write-Wins)
// =============================================================================

/**
 * Last-Write-Wins register for discrete shared state.
 * The value with the highest timestamp wins. Ties broken by site ID.
 */
export interface LWWRegister<T> {
	/** Current value */
	value: T;
	/** Timestamp of last write */
	timestamp: number;
	/** Site ID that performed the last write */
	siteId: string;
}

/**
 * Creates a new LWW register with an initial value.
 */
export function createLWWRegister<T>(initialValue: T, siteId = 'local'): LWWRegister<T> {
	return {
		value: initialValue,
		timestamp: 0,
		siteId,
	};
}

/**
 * Sets a new value in the LWW register if the timestamp is newer.
 * Returns true if the value was updated, false if the existing value won.
 */
export function setLWWValue<T>(
	register: LWWRegister<T>,
	value: T,
	siteId: string,
	timestamp: number,
): boolean {
	// If timestamps are equal, break ties with site ID (lexicographic)
	const shouldUpdate =
		timestamp > register.timestamp ||
		(timestamp === register.timestamp && siteId > register.siteId);

	if (shouldUpdate) {
		register.value = value;
		register.timestamp = timestamp;
		register.siteId = siteId;
		return true;
	}

	return false;
}

/**
 * Gets the current value from the LWW register.
 */
export function getLWWValue<T>(register: LWWRegister<T>): T {
	return register.value;
}

/**
 * Gets the metadata (timestamp, siteId) from the LWW register.
 */
export function getLWWMetadata<T>(register: LWWRegister<T>): { timestamp: number; siteId: string } {
	return {
		timestamp: register.timestamp,
		siteId: register.siteId,
	};
}

/**
 * Merges two LWW registers, keeping the value with the higher timestamp.
 */
export function mergeLWWRegisters<T>(a: LWWRegister<T>, b: LWWRegister<T>): LWWRegister<T> {
	return a.timestamp > b.timestamp || (a.timestamp === b.timestamp && a.siteId > b.siteId) ? a : b;
}
