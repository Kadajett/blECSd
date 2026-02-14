/**
 * Tests for presence system.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PresenceEvent } from './presence';
import {
	addUser,
	createPresenceManager,
	formatPresenceBar,
	getActiveUsers,
	getUser,
	getUserCount,
	getUserCursors,
	moveUserCursor,
	onPresenceEvent,
	removeUser,
	resetPresenceState,
	setUserFocus,
	updatePresenceStatus,
} from './presence';

// =============================================================================
// HELPERS
// =============================================================================

function collectEvents(): { events: PresenceEvent[]; unsub: () => void } {
	const events: PresenceEvent[] = [];
	const unsub = onPresenceEvent((event) => {
		events.push(event);
	});
	return { events, unsub };
}

// =============================================================================
// TESTS
// =============================================================================

describe('presence', () => {
	afterEach(() => {
		resetPresenceState();
		vi.useRealTimers();
	});

	describe('createPresenceManager', () => {
		it('creates manager with default config', () => {
			const manager = createPresenceManager();
			expect(manager.users.size).toBe(0);
			expect(manager.handlerCount).toBe(0);
		});

		it('accepts custom config', () => {
			const manager = createPresenceManager({
				idleTimeout: 60000,
				awayTimeout: 300000,
			});
			expect(manager.users.size).toBe(0);
		});

		it('validates config', () => {
			expect(() => createPresenceManager({ idleTimeout: 100 })).toThrow();
		});
	});

	describe('addUser', () => {
		it('adds a user', () => {
			createPresenceManager();
			const user = addUser('s1', 'Alice');

			expect(user.sessionId).toBe('s1');
			expect(user.name).toBe('Alice');
			expect(user.status).toBe('active');
			expect(user.cursor).toBeNull();
			expect(user.focusedEntity).toBeNull();
		});

		it('assigns different colors to users', () => {
			createPresenceManager();
			const u1 = addUser('s1', 'Alice');
			const u2 = addUser('s2', 'Bob');

			expect(u1.color).not.toBe(u2.color);
		});

		it('emits join event', () => {
			createPresenceManager();
			const { events } = collectEvents();

			addUser('s1', 'Alice');

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('join');
		});

		it('sets connectedAt timestamp', () => {
			createPresenceManager();
			const before = Date.now();
			const user = addUser('s1', 'Alice');
			const after = Date.now();

			expect(user.connectedAt).toBeGreaterThanOrEqual(before);
			expect(user.connectedAt).toBeLessThanOrEqual(after);
		});
	});

	describe('removeUser', () => {
		it('removes a user', () => {
			createPresenceManager();
			addUser('s1', 'Alice');

			removeUser('s1');

			expect(getUserCount()).toBe(0);
		});

		it('emits leave event', () => {
			createPresenceManager();
			addUser('s1', 'Alice');
			const { events } = collectEvents();

			removeUser('s1');

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('leave');
		});

		it('handles non-existent user', () => {
			createPresenceManager();
			removeUser('nonexistent'); // should not throw
		});
	});

	describe('moveUserCursor', () => {
		it('updates cursor position', () => {
			createPresenceManager();
			addUser('s1', 'Alice');

			moveUserCursor('s1', 10, 5);

			const user = getUser('s1');
			expect(user!.cursor).toEqual({ x: 10, y: 5 });
		});

		it('emits cursor_move event', () => {
			createPresenceManager();
			addUser('s1', 'Alice');
			const { events } = collectEvents();

			moveUserCursor('s1', 10, 5);

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('cursor_move');
		});

		it('updates activity timestamp', () => {
			createPresenceManager();
			addUser('s1', 'Alice');

			vi.useFakeTimers();
			vi.advanceTimersByTime(5000);
			moveUserCursor('s1', 1, 1);

			const user = getUser('s1');
			expect(user!.status).toBe('active');
		});

		it('ignores non-existent user', () => {
			createPresenceManager();
			moveUserCursor('nonexistent', 1, 1); // should not throw
		});
	});

	describe('setUserFocus', () => {
		it('sets focused entity', () => {
			createPresenceManager();
			addUser('s1', 'Alice');

			setUserFocus('s1', 42);

			const user = getUser('s1');
			expect(user!.focusedEntity).toBe(42);
		});

		it('clears focus with null', () => {
			createPresenceManager();
			addUser('s1', 'Alice');
			setUserFocus('s1', 42);

			setUserFocus('s1', null);

			const user = getUser('s1');
			expect(user!.focusedEntity).toBeNull();
		});

		it('emits focus_change event', () => {
			createPresenceManager();
			addUser('s1', 'Alice');
			const { events } = collectEvents();

			setUserFocus('s1', 42);

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('focus_change');
		});
	});

	describe('getActiveUsers', () => {
		it('returns all active users', () => {
			createPresenceManager();
			addUser('s1', 'Alice');
			addUser('s2', 'Bob');

			const active = getActiveUsers();
			expect(active).toHaveLength(2);
		});

		it('excludes away users', () => {
			createPresenceManager({ idleTimeout: 1000, awayTimeout: 2000 });
			addUser('s1', 'Alice');

			vi.useFakeTimers();
			vi.advanceTimersByTime(3000);
			updatePresenceStatus();

			const active = getActiveUsers();
			expect(active).toHaveLength(0);
		});

		it('includes idle users', () => {
			createPresenceManager({ idleTimeout: 1000, awayTimeout: 50000 });
			addUser('s1', 'Alice');

			vi.useFakeTimers();
			vi.advanceTimersByTime(2000);
			updatePresenceStatus();

			const active = getActiveUsers();
			expect(active).toHaveLength(1);
			expect(active[0]!.status).toBe('idle');
		});
	});

	describe('getUserCursors', () => {
		it('returns users with cursor positions', () => {
			createPresenceManager();
			addUser('s1', 'Alice');
			addUser('s2', 'Bob');
			moveUserCursor('s1', 10, 5);

			const cursors = getUserCursors();
			expect(cursors).toHaveLength(1);
			expect(cursors[0]!.name).toBe('Alice');
			expect(cursors[0]!.cursor.x).toBe(10);
		});

		it('returns empty when no cursors', () => {
			createPresenceManager();
			addUser('s1', 'Alice');

			const cursors = getUserCursors();
			expect(cursors).toHaveLength(0);
		});
	});

	describe('updatePresenceStatus', () => {
		it('marks users as idle after timeout', () => {
			createPresenceManager({ idleTimeout: 1000, awayTimeout: 5000 });
			addUser('s1', 'Alice');

			vi.useFakeTimers();
			vi.advanceTimersByTime(2000);

			const changes = updatePresenceStatus();
			expect(changes).toBe(1);

			const user = getUser('s1');
			expect(user!.status).toBe('idle');
		});

		it('marks users as away after longer timeout', () => {
			createPresenceManager({ idleTimeout: 1000, awayTimeout: 3000 });
			addUser('s1', 'Alice');

			vi.useFakeTimers();
			vi.advanceTimersByTime(4000);

			updatePresenceStatus();

			const user = getUser('s1');
			expect(user!.status).toBe('away');
		});

		it('emits status_change events', () => {
			createPresenceManager({ idleTimeout: 1000, awayTimeout: 5000 });
			addUser('s1', 'Alice');
			const { events } = collectEvents();

			vi.useFakeTimers();
			vi.advanceTimersByTime(2000);
			updatePresenceStatus();

			expect(events.some((e) => e.type === 'status_change')).toBe(true);
		});

		it('returns 0 when no changes', () => {
			createPresenceManager();
			addUser('s1', 'Alice');

			const changes = updatePresenceStatus();
			expect(changes).toBe(0);
		});
	});

	describe('formatPresenceBar', () => {
		it('formats users in a bar', () => {
			createPresenceManager();
			addUser('s1', 'Alice');
			addUser('s2', 'Bob');

			const bar = formatPresenceBar();
			expect(bar).toContain('Alice');
			expect(bar).toContain('Bob');
			expect(bar).toContain('|');
		});

		it('shows status icons', () => {
			createPresenceManager({ idleTimeout: 1000, awayTimeout: 5000 });
			addUser('s1', 'Alice');

			const bar1 = formatPresenceBar();
			expect(bar1).toContain('*Alice'); // active

			vi.useFakeTimers();
			vi.advanceTimersByTime(2000);
			updatePresenceStatus();

			const bar2 = formatPresenceBar();
			expect(bar2).toContain('~Alice'); // idle
		});

		it('shows message when no users', () => {
			createPresenceManager();
			const bar = formatPresenceBar();
			expect(bar).toBe('No users connected');
		});

		it('truncates when too wide', () => {
			createPresenceManager();
			addUser('s1', 'LongNameAlice');
			addUser('s2', 'LongNameBob');
			addUser('s3', 'LongNameCarol');

			const bar = formatPresenceBar(30);
			expect(bar.length).toBeLessThanOrEqual(30);
		});
	});

	describe('getUserCount', () => {
		it('returns correct count', () => {
			createPresenceManager();
			expect(getUserCount()).toBe(0);

			addUser('s1', 'Alice');
			expect(getUserCount()).toBe(1);

			addUser('s2', 'Bob');
			expect(getUserCount()).toBe(2);

			removeUser('s1');
			expect(getUserCount()).toBe(1);
		});
	});

	describe('event handler lifecycle', () => {
		it('can unsubscribe', () => {
			createPresenceManager();
			const events: PresenceEvent[] = [];
			const unsub = onPresenceEvent((e) => events.push(e));

			addUser('s1', 'Alice');
			expect(events).toHaveLength(1);

			unsub();
			addUser('s2', 'Bob');
			expect(events).toHaveLength(1); // no new event
		});

		it('supports multiple handlers', () => {
			createPresenceManager();
			let count1 = 0;
			let count2 = 0;

			onPresenceEvent(() => {
				count1 += 1;
			});
			onPresenceEvent(() => {
				count2 += 1;
			});

			addUser('s1', 'Alice');

			expect(count1).toBe(1);
			expect(count2).toBe(1);
		});
	});
});
