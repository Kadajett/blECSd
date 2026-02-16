/**
 * Presence system namespace.
 *
 * Functions for managing user presence in collaborative terminal applications,
 * tracking active users, their cursors, and status.
 *
 * @example
 * ```typescript
 * import { presence } from 'blecsd/terminal';
 *
 * // Create presence manager
 * const manager = presence.createPresenceManager(config);
 *
 * // Add users
 * presence.addUser(manager, {
 *   id: 'user-1',
 *   name: 'Alice',
 *   color: '#FF0000',
 *   status: 'active',
 * });
 * presence.addUser(manager, {
 *   id: 'user-2',
 *   name: 'Bob',
 *   color: '#00FF00',
 *   status: 'active',
 * });
 *
 * // Update user cursors
 * presence.moveUserCursor(manager, 'user-1', 'file1.txt', 10, 5);
 * presence.moveUserCursor(manager, 'user-2', 'file2.txt', 20, 15);
 *
 * // Get active users
 * const activeUsers = presence.getActiveUsers(manager);
 * console.log(`${presence.getUserCount(manager)} users online`);
 *
 * // Format presence bar
 * const presenceBar = presence.formatPresenceBar(manager);
 * console.log(presenceBar);
 * ```
 */

import {
	addUser,
	createPresenceManager,
	formatPresenceBar,
	getActiveUsers,
	getPresenceState,
	getUser,
	getUserCount,
	getUserCursors,
	moveUserCursor,
	onPresenceEvent,
	Presence,
	removeUser,
	resetPresenceState,
	setUserFocus,
	updatePresenceStatus,
} from '../presence';

/**
 * Presence system namespace.
 */
export const presence = Object.freeze({
	addUser,
	createPresenceManager,
	formatPresenceBar,
	getActiveUsers,
	getPresenceState,
	getUser,
	getUserCount,
	getUserCursors,
	moveUserCursor,
	onPresenceEvent,
	Presence: Object.freeze(Presence),
	removeUser,
	resetPresenceState,
	setUserFocus,
	updatePresenceStatus,
});

export type PresenceModule = typeof presence;
