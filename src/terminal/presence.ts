/**
 * Presence System for Collaborative Terminal Sessions
 *
 * Tracks connected users, their cursor positions, focus states,
 * and activity status. Renders remote cursors and provides a
 * presence bar widget.
 *
 * @module terminal/presence
 *
 * @example
 * ```typescript
 * import { createPresenceManager, addUser, moveUserCursor, getActiveUsers } from 'blecsd';
 *
 * const presence = createPresenceManager();
 * addUser(presence, 'alice', 'Alice');
 * moveUserCursor(presence, 'alice', 10, 5);
 *
 * const users = getActiveUsers(presence);
 * ```
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * User activity status.
 */
export type UserStatus = 'active' | 'idle' | 'away';

/**
 * Cursor position for a user.
 */
export interface CursorPosition {
	readonly x: number;
	readonly y: number;
}

/**
 * A connected user in the presence system.
 */
export interface PresenceUser {
	/** Unique session identifier */
	readonly sessionId: string;
	/** Display name */
	readonly name: string;
	/** Assigned color (ANSI color index 0-7) */
	readonly color: number;
	/** Connection timestamp */
	readonly connectedAt: number;
	/** Last activity timestamp */
	readonly lastActivity: number;
	/** Cursor position, or null if not set */
	readonly cursor: CursorPosition | null;
	/** Entity ID the user has focused, or null */
	readonly focusedEntity: number | null;
	/** Current activity status */
	readonly status: UserStatus;
}

/**
 * Presence event types.
 */
export type PresenceEvent =
	| { readonly type: 'join'; readonly user: PresenceUser }
	| { readonly type: 'leave'; readonly sessionId: string }
	| {
			readonly type: 'cursor_move';
			readonly sessionId: string;
			readonly x: number;
			readonly y: number;
	  }
	| { readonly type: 'focus_change'; readonly sessionId: string; readonly entityId: number | null }
	| { readonly type: 'status_change'; readonly sessionId: string; readonly status: UserStatus };

/**
 * Presence event handler.
 */
export type PresenceEventHandler = (event: PresenceEvent) => void;

/**
 * Presence manager state.
 */
export interface PresenceManager {
	/** All tracked users */
	readonly users: ReadonlyMap<string, PresenceUser>;
	/** Event handler count */
	readonly handlerCount: number;
}

/**
 * Presence manager configuration.
 */
export interface PresenceConfig {
	/** Timeout before marking user as idle (ms, default: 30000) */
	readonly idleTimeout?: number;
	/** Timeout before marking user as away (ms, default: 120000) */
	readonly awayTimeout?: number;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for presence configuration.
 */
export const PresenceConfigSchema = z.object({
	idleTimeout: z.number().int().min(1000).optional(),
	awayTimeout: z.number().int().min(1000).optional(),
});

// =============================================================================
// STATE
// =============================================================================

/** Mutable user state */
interface MutableUser {
	sessionId: string;
	name: string;
	color: number;
	connectedAt: number;
	lastActivity: number;
	cursor: CursorPosition | null;
	focusedEntity: number | null;
	status: UserStatus;
}

/** Module state */
let users: Map<string, MutableUser> = new Map();
let handlers: PresenceEventHandler[] = [];
let colorIndex = 0;
let config: PresenceConfig = {};

/** Color palette for user cursors (distinct ANSI colors) */
const CURSOR_COLORS = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14];

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Emit a presence event to all handlers.
 */
function emitPresenceEvent(event: PresenceEvent): void {
	for (const handler of handlers) {
		handler(event);
	}
}

/**
 * Convert mutable user to readonly snapshot.
 */
function toPresenceUser(user: MutableUser): PresenceUser {
	return {
		sessionId: user.sessionId,
		name: user.name,
		color: user.color,
		connectedAt: user.connectedAt,
		lastActivity: user.lastActivity,
		cursor: user.cursor,
		focusedEntity: user.focusedEntity,
		status: user.status,
	};
}

/**
 * Create a presence manager.
 *
 * @param presenceConfig - Optional configuration
 * @returns Presence manager state
 *
 * @example
 * ```typescript
 * const presence = createPresenceManager({ idleTimeout: 60000 });
 * ```
 */
export function createPresenceManager(presenceConfig: PresenceConfig = {}): PresenceManager {
	if (presenceConfig.idleTimeout !== undefined || presenceConfig.awayTimeout !== undefined) {
		PresenceConfigSchema.parse(presenceConfig);
	}
	config = presenceConfig;
	users = new Map();
	handlers = [];
	colorIndex = 0;

	return getPresenceState();
}

/**
 * Get current presence manager state.
 *
 * @returns Readonly presence state
 */
export function getPresenceState(): PresenceManager {
	const readonlyUsers = new Map<string, PresenceUser>();
	for (const [id, user] of users) {
		readonlyUsers.set(id, toPresenceUser(user));
	}
	return {
		users: readonlyUsers,
		handlerCount: handlers.length,
	};
}

/**
 * Register a presence event handler.
 *
 * @param handler - Event handler function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsub = onPresenceEvent((event) => {
 *   if (event.type === 'join') {
 *     console.log(`${event.user.name} joined`);
 *   }
 * });
 * ```
 */
export function onPresenceEvent(handler: PresenceEventHandler): () => void {
	handlers.push(handler);
	return () => {
		handlers = handlers.filter((h) => h !== handler);
	};
}

/**
 * Add a user to the presence system.
 *
 * @param sessionId - Unique session identifier
 * @param name - Display name
 * @returns The new presence user
 *
 * @example
 * ```typescript
 * const user = addUser('session-1', 'Alice');
 * ```
 */
export function addUser(sessionId: string, name: string): PresenceUser {
	const now = Date.now();
	const color = CURSOR_COLORS[colorIndex % CURSOR_COLORS.length] ?? 1;
	colorIndex += 1;

	const user: MutableUser = {
		sessionId,
		name,
		color,
		connectedAt: now,
		lastActivity: now,
		cursor: null,
		focusedEntity: null,
		status: 'active',
	};

	users.set(sessionId, user);

	const snapshot = toPresenceUser(user);
	emitPresenceEvent({ type: 'join', user: snapshot });

	return snapshot;
}

/**
 * Remove a user from the presence system.
 *
 * @param sessionId - The session ID to remove
 *
 * @example
 * ```typescript
 * removeUser('session-1');
 * ```
 */
export function removeUser(sessionId: string): void {
	if (!users.has(sessionId)) {
		return;
	}
	users.delete(sessionId);
	emitPresenceEvent({ type: 'leave', sessionId });
}

/**
 * Move a user's cursor position.
 *
 * @param sessionId - The session ID
 * @param x - Column position
 * @param y - Row position
 *
 * @example
 * ```typescript
 * moveUserCursor('session-1', 10, 5);
 * ```
 */
export function moveUserCursor(sessionId: string, x: number, y: number): void {
	const user = users.get(sessionId);
	if (!user) {
		return;
	}

	user.cursor = { x, y };
	user.lastActivity = Date.now();
	user.status = 'active';

	emitPresenceEvent({ type: 'cursor_move', sessionId, x, y });
}

/**
 * Update which entity a user has focused.
 *
 * @param sessionId - The session ID
 * @param entityId - The focused entity ID, or null to clear focus
 *
 * @example
 * ```typescript
 * setUserFocus('session-1', 42);
 * ```
 */
export function setUserFocus(sessionId: string, entityId: number | null): void {
	const user = users.get(sessionId);
	if (!user) {
		return;
	}

	user.focusedEntity = entityId;
	user.lastActivity = Date.now();
	user.status = 'active';

	emitPresenceEvent({ type: 'focus_change', sessionId, entityId });
}

/**
 * Get all active users (not away).
 *
 * @returns Array of active presence users
 *
 * @example
 * ```typescript
 * const active = getActiveUsers();
 * console.log(`${active.length} users active`);
 * ```
 */
export function getActiveUsers(): readonly PresenceUser[] {
	const result: PresenceUser[] = [];
	for (const user of users.values()) {
		if (user.status !== 'away') {
			result.push(toPresenceUser(user));
		}
	}
	return result;
}

/**
 * Get all users with cursor positions (for rendering remote cursors).
 *
 * @returns Array of users that have cursor positions set
 *
 * @example
 * ```typescript
 * const cursors = getUserCursors();
 * for (const user of cursors) {
 *   renderCursor(user.cursor.x, user.cursor.y, user.color);
 * }
 * ```
 */
export function getUserCursors(): readonly (PresenceUser & { readonly cursor: CursorPosition })[] {
	const result: (PresenceUser & { readonly cursor: CursorPosition })[] = [];
	for (const user of users.values()) {
		if (user.cursor !== null) {
			result.push(toPresenceUser(user) as PresenceUser & { readonly cursor: CursorPosition });
		}
	}
	return result;
}

/**
 * Get a specific user by session ID.
 *
 * @param sessionId - The session ID
 * @returns The presence user, or null if not found
 */
export function getUser(sessionId: string): PresenceUser | null {
	const user = users.get(sessionId);
	if (!user) {
		return null;
	}
	return toPresenceUser(user);
}

/**
 * Update user activity status based on timeouts.
 * Call this periodically (e.g., every 10 seconds).
 *
 * @returns Number of status changes made
 *
 * @example
 * ```typescript
 * // In your update loop
 * const changes = updatePresenceStatus();
 * ```
 */
export function updatePresenceStatus(): number {
	const now = Date.now();
	const idleTimeout = config.idleTimeout ?? 30000;
	const awayTimeout = config.awayTimeout ?? 120000;
	let changes = 0;

	for (const user of users.values()) {
		const elapsed = now - user.lastActivity;
		let newStatus: UserStatus = 'active';

		if (elapsed > awayTimeout) {
			newStatus = 'away';
		} else if (elapsed > idleTimeout) {
			newStatus = 'idle';
		}

		if (newStatus !== user.status) {
			user.status = newStatus;
			changes += 1;
			emitPresenceEvent({
				type: 'status_change',
				sessionId: user.sessionId,
				status: newStatus,
			});
		}
	}

	return changes;
}

/**
 * Format a presence bar string showing connected users.
 *
 * @param maxWidth - Maximum width in columns
 * @returns Formatted presence bar string
 *
 * @example
 * ```typescript
 * const bar = formatPresenceBar(80);
 * // "Alice (active) | Bob (idle) | Carol (away)"
 * ```
 */
export function formatPresenceBar(maxWidth = 80): string {
	const userList: string[] = [];

	for (const user of users.values()) {
		const statusIcon = user.status === 'active' ? '*' : user.status === 'idle' ? '~' : '.';
		userList.push(`${statusIcon}${user.name}`);
	}

	if (userList.length === 0) {
		return 'No users connected';
	}

	const joined = userList.join(' | ');
	if (joined.length <= maxWidth) {
		return joined;
	}

	// Truncate with count
	const count = `(${userList.length} users)`;
	const available = maxWidth - count.length - 3;
	if (available <= 0) {
		return count;
	}

	let result = '';
	for (const entry of userList) {
		const next = result.length === 0 ? entry : `${result} | ${entry}`;
		if (next.length > available) {
			break;
		}
		result = next;
	}

	return `${result}.. ${count}`;
}

/**
 * Get the total number of connected users.
 *
 * @returns User count
 */
export function getUserCount(): number {
	return users.size;
}

/**
 * Reset all presence state. Used for testing.
 */
export function resetPresenceState(): void {
	users = new Map();
	handlers = [];
	colorIndex = 0;
	config = {};
}

/**
 * Presence namespace for convenient access.
 *
 * @example
 * ```typescript
 * import { Presence } from 'blecsd';
 *
 * Presence.create();
 * Presence.addUser('s1', 'Alice');
 * ```
 */
export const Presence = {
	create: createPresenceManager,
	onEvent: onPresenceEvent,
	addUser,
	removeUser,
	moveCursor: moveUserCursor,
	setFocus: setUserFocus,
	getActive: getActiveUsers,
	getCursors: getUserCursors,
	getUser,
	getState: getPresenceState,
	updateStatus: updatePresenceStatus,
	formatBar: formatPresenceBar,
	getUserCount,
	reset: resetPresenceState,
} as const;
