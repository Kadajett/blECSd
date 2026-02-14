/**
 * Conflict resolution utilities.
 * @module terminal/conflictResolution/utils
 */

/**
 * Result of resolving a conflict between two values.
 */
export interface ConflictResult<T> {
	/** The winning value */
	readonly value: T;
	/** Which side won: 'local', 'remote', or 'merged' */
	readonly winner: 'local' | 'remote' | 'merged';
	/** The winning site ID */
	readonly siteId: string;
}

/**
 * Resolves a conflict between a local and remote LWW value.
 */
export function resolveLWWConflict<T>(
	localValue: T,
	localTimestamp: number,
	localSiteId: string,
	remoteValue: T,
	remoteTimestamp: number,
	remoteSiteId: string,
): ConflictResult<T> {
	if (remoteTimestamp > localTimestamp) {
		return { value: remoteValue, winner: 'remote', siteId: remoteSiteId };
	}
	if (remoteTimestamp < localTimestamp) {
		return { value: localValue, winner: 'local', siteId: localSiteId };
	}

	// Tie: higher site ID wins
	if (remoteSiteId > localSiteId) {
		return { value: remoteValue, winner: 'remote', siteId: remoteSiteId };
	}
	return { value: localValue, winner: 'local', siteId: localSiteId };
}
