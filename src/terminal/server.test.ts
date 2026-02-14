/**
 * Tests for TCP server mode.
 */

import { Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ServerEvent } from './server';
import {
	addClient,
	authenticateClient,
	broadcastOutput,
	createTerminalServer,
	getClient,
	getConnectedClients,
	getServerState,
	handleClientInput,
	isServerRunning,
	markServerStarted,
	markServerStopped,
	onServerEvent,
	pruneIdleClients,
	removeClient,
	resetServerState,
	sendToClient,
	setClientMode,
	updateClientSize,
} from './server';

// =============================================================================
// HELPERS
// =============================================================================

function createMockSocket(): Writable & { written: string[] } {
	const written: string[] = [];
	const socket = new Writable({
		write(
			chunk: Buffer | string,
			_encoding: BufferEncoding,
			callback: (error?: Error | null) => void,
		): void {
			written.push(chunk.toString());
			callback();
		},
	}) as Writable & { written: string[] };
	socket.written = written;
	return socket;
}

function collectEvents(): { events: ServerEvent[]; unsub: () => void } {
	const events: ServerEvent[] = [];
	const unsub = onServerEvent((event) => {
		events.push(event);
	});
	return { events, unsub };
}

// =============================================================================
// TESTS
// =============================================================================

describe('server', () => {
	afterEach(() => {
		resetServerState();
	});

	describe('createTerminalServer', () => {
		it('creates server with valid config', () => {
			const state = createTerminalServer({ port: 3000 });
			expect(state.config.port).toBe(3000);
			expect(state.running).toBe(false);
			expect(state.clientCount).toBe(0);
		});

		it('validates port range', () => {
			expect(() => createTerminalServer({ port: 0 })).toThrow();
			expect(() => createTerminalServer({ port: 70000 })).toThrow();
		});

		it('accepts optional config fields', () => {
			const state = createTerminalServer({
				port: 3000,
				host: '0.0.0.0',
				authToken: 'secret',
				maxClients: 5,
				idleTimeout: 60000,
				localEcho: false,
			});
			expect(state.config.host).toBe('0.0.0.0');
			expect(state.config.authToken).toBe('secret');
			expect(state.config.maxClients).toBe(5);
		});
	});

	describe('addClient', () => {
		it('adds a client and returns session', () => {
			createTerminalServer({ port: 3000 });
			const socket = createMockSocket();
			const session = addClient(socket, 'Alice');

			expect(session).not.toBeNull();
			expect(session!.name).toBe('Alice');
			expect(session!.authenticated).toBe(true); // No auth token = auto-auth
			expect(session!.width).toBe(80);
			expect(session!.height).toBe(24);
		});

		it('auto-names clients', () => {
			createTerminalServer({ port: 3000 });
			const socket = createMockSocket();
			const session = addClient(socket);

			expect(session).not.toBeNull();
			expect(session!.name).toMatch(/^client-\d+$/);
		});

		it('enforces max client limit', () => {
			createTerminalServer({ port: 3000, maxClients: 2 });
			const s1 = addClient(createMockSocket());
			const s2 = addClient(createMockSocket());
			const s3 = addClient(createMockSocket());

			expect(s1).not.toBeNull();
			expect(s2).not.toBeNull();
			expect(s3).toBeNull();
		});

		it('emits client_connect event', () => {
			createTerminalServer({ port: 3000 });
			const { events } = collectEvents();

			addClient(createMockSocket(), 'Bob');

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('client_connect');
		});

		it('requires auth when token is set', () => {
			createTerminalServer({ port: 3000, authToken: 'secret' });
			const session = addClient(createMockSocket());

			expect(session!.authenticated).toBe(false);
		});
	});

	describe('removeClient', () => {
		it('removes a client', () => {
			createTerminalServer({ port: 3000 });
			const session = addClient(createMockSocket())!;

			removeClient(session.id, 'test');

			expect(getConnectedClients()).toHaveLength(0);
		});

		it('emits client_disconnect event', () => {
			createTerminalServer({ port: 3000 });
			const session = addClient(createMockSocket())!;
			const { events } = collectEvents();

			removeClient(session.id, 'bye');

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('client_disconnect');
		});

		it('handles removing non-existent client', () => {
			createTerminalServer({ port: 3000 });
			// Should not throw
			removeClient('nonexistent');
		});
	});

	describe('authenticateClient', () => {
		it('authenticates with correct token', () => {
			createTerminalServer({ port: 3000, authToken: 'secret' });
			const session = addClient(createMockSocket())!;

			const result = authenticateClient(session.id, 'secret', 'Alice');

			expect(result).toBe(true);
			const updated = getClient(session.id);
			expect(updated!.authenticated).toBe(true);
			expect(updated!.name).toBe('Alice');
		});

		it('rejects invalid token', () => {
			createTerminalServer({ port: 3000, authToken: 'secret' });
			const session = addClient(createMockSocket())!;
			const { events } = collectEvents();

			const result = authenticateClient(session.id, 'wrong');

			expect(result).toBe(false);
			expect(events.some((e) => e.type === 'error')).toBe(true);
		});

		it('returns false for non-existent session', () => {
			createTerminalServer({ port: 3000 });
			expect(authenticateClient('nope', 'token')).toBe(false);
		});
	});

	describe('handleClientInput', () => {
		it('emits input event for authenticated client', () => {
			createTerminalServer({ port: 3000 });
			const session = addClient(createMockSocket())!;
			const { events } = collectEvents();

			handleClientInput(session.id, '\x1b[A');

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('client_input');
		});

		it('rejects input from unauthenticated client', () => {
			createTerminalServer({ port: 3000, authToken: 'secret' });
			const session = addClient(createMockSocket())!;
			const { events } = collectEvents();

			handleClientInput(session.id, 'hello');

			expect(events.some((e) => e.type === 'error')).toBe(true);
		});

		it('silently ignores input from read-only client', () => {
			createTerminalServer({ port: 3000 });
			const session = addClient(createMockSocket())!;
			setClientMode(session.id, 'read-only');
			const { events } = collectEvents();

			handleClientInput(session.id, 'hello');

			expect(events).toHaveLength(0);
		});
	});

	describe('broadcastOutput', () => {
		it('sends data to all authenticated clients', () => {
			createTerminalServer({ port: 3000 });
			const s1 = createMockSocket();
			const s2 = createMockSocket();
			addClient(s1);
			addClient(s2);

			broadcastOutput('Hello');

			expect(s1.written).toEqual(['Hello']);
			expect(s2.written).toEqual(['Hello']);
		});

		it('skips unauthenticated clients', () => {
			createTerminalServer({ port: 3000, authToken: 'secret' });
			const s1 = createMockSocket();
			addClient(s1);

			broadcastOutput('Hello');

			expect(s1.written).toHaveLength(0);
		});
	});

	describe('sendToClient', () => {
		it('sends data to specific client', () => {
			createTerminalServer({ port: 3000 });
			const s1 = createMockSocket();
			const s2 = createMockSocket();
			const session1 = addClient(s1)!;
			addClient(s2);

			sendToClient(session1.id, 'Private');

			expect(s1.written).toEqual(['Private']);
			expect(s2.written).toHaveLength(0);
		});
	});

	describe('updateClientSize', () => {
		it('updates client dimensions', () => {
			createTerminalServer({ port: 3000 });
			const session = addClient(createMockSocket())!;

			updateClientSize(session.id, 120, 40);

			const updated = getClient(session.id);
			expect(updated!.width).toBe(120);
			expect(updated!.height).toBe(40);
		});

		it('emits resize event', () => {
			createTerminalServer({ port: 3000 });
			const session = addClient(createMockSocket())!;
			const { events } = collectEvents();

			updateClientSize(session.id, 120, 40);

			expect(events).toHaveLength(1);
			expect(events[0]!.type).toBe('client_resize');
		});
	});

	describe('server lifecycle', () => {
		it('tracks running state', () => {
			createTerminalServer({ port: 3000 });
			expect(isServerRunning()).toBe(false);

			markServerStarted();
			expect(isServerRunning()).toBe(true);

			markServerStopped();
			expect(isServerRunning()).toBe(false);
		});

		it('disconnects all clients on stop', () => {
			createTerminalServer({ port: 3000 });
			addClient(createMockSocket());
			addClient(createMockSocket());

			markServerStopped();

			expect(getConnectedClients()).toHaveLength(0);
		});

		it('returns state snapshot', () => {
			createTerminalServer({ port: 3000 });
			addClient(createMockSocket());

			const state = getServerState();
			expect(state!.clientCount).toBe(1);
			expect(state!.config.port).toBe(3000);
		});
	});

	describe('pruneIdleClients', () => {
		it('removes idle clients', () => {
			createTerminalServer({ port: 3000, idleTimeout: 1000 });
			addClient(createMockSocket());

			// Simulate time passing with a short timeout
			vi.useFakeTimers();
			vi.advanceTimersByTime(2000);

			const pruned = pruneIdleClients();
			expect(pruned).toBe(1);
			expect(getConnectedClients()).toHaveLength(0);

			vi.useRealTimers();
		});

		it('keeps active clients', () => {
			createTerminalServer({ port: 3000, idleTimeout: 10000 });
			addClient(createMockSocket());

			const pruned = pruneIdleClients();
			expect(pruned).toBe(0);
			expect(getConnectedClients()).toHaveLength(1);
		});
	});

	describe('getConnectedClients', () => {
		it('returns all clients', () => {
			createTerminalServer({ port: 3000 });
			addClient(createMockSocket(), 'Alice');
			addClient(createMockSocket(), 'Bob');

			const clients = getConnectedClients();
			expect(clients).toHaveLength(2);
			expect(clients.map((c) => c.name)).toContain('Alice');
			expect(clients.map((c) => c.name)).toContain('Bob');
		});
	});

	describe('event handler lifecycle', () => {
		it('can unsubscribe from events', () => {
			createTerminalServer({ port: 3000 });
			const events: ServerEvent[] = [];
			const unsub = onServerEvent((e) => events.push(e));

			addClient(createMockSocket()); // triggers event
			expect(events).toHaveLength(1);

			unsub();
			addClient(createMockSocket()); // no event
			expect(events).toHaveLength(1);
		});
	});

	describe('setClientMode', () => {
		it('changes client mode', () => {
			createTerminalServer({ port: 3000 });
			const session = addClient(createMockSocket())!;

			setClientMode(session.id, 'read-only');

			const updated = getClient(session.id);
			expect(updated!.mode).toBe('read-only');
		});
	});
});
