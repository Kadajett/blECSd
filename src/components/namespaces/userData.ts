/**
 * UserData component namespace.
 *
 * Provides all operations for storing arbitrary user data on entities.
 *
 * @example
 * ```typescript
 * import { userData } from 'blecsd/components';
 * userData.set(world, eid, { score: 100, name: 'Player 1' });
 * const data = userData.get(world, eid);
 * ```
 */
import {
	clearAllUserData,
	getOrCreateUserData,
	getUserData,
	getUserDataCount,
	hasUserData,
	removeUserData,
	setUserData,
} from '../userData';

export const userData = Object.freeze({
	get: getUserData,
	has: hasUserData,
	set: setUserData,
	remove: removeUserData,
	getOrCreate: getOrCreateUserData,
	getCount: getUserDataCount,
	clearAll: clearAllUserData,
});

export type UserDataModule = typeof userData;
