/**
 * TCP Server Mode for blECSd
 *
 * Serves terminal UI to connecting clients over TCP. Each client
 * receives terminal output and can send input back. Supports
 * per-client terminal negotiation (size, capabilities).
 *
 * @module terminal/server
 *
 * @example
 * ```typescript
 * import { createTerminalServer, startServer, stopServer } from 'blecsd';
 *
 * const server = createTerminalServer({
 *   port: 3000,
 *   authToken: 'secret-token',
 * });
 *
 * startServer(server);
 * // Clients connect via: nc localhost 3000
 * // Or: telnet localhost 3000
 *
 * // Later:
 * stopServer(server);
 * ```
 */

import type { Writable } from 'node:stream';
import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Connected client session.
 */
export interface ClientSession {
	/** Unique session identifier */
	readonly id: string;
	/** Client display name (set after auth) */
	readonly name: string;
	/** Terminal width reported by client */
	readonly width: number;
	/** Terminal height reported by client */
	readonly height: number;
	/** Connection timestamp */
	readonly connectedAt: number;
	/** Last activity timestamp */
	readonly lastActivity: number;
	/** Whether the client has authenticated */
	readonly authenticated: boolean;
	/** Client permission level */
	readonly mode: ClientMode;
}

/**
 * Client permission modes.
 */
export type ClientMode = 'full' | 'input-only' | 'read-only';

/**
 * Server configuration.
 */
export interface TerminalServerConfig {
	/** TCP port to listen on */
	readonly port: number;
	/** Host to bind to (default: 'localhost') */
	readonly host?: string;
	/** Authentication token (clients must send this to connect) */
	readonly authToken?: string;
	/** Maximum concurrent clients (default: 10) */
	readonly maxClients?: number;
	/** Idle timeout in ms (default: 300000 = 5 min) */
	readonly idleTimeout?: number;
	/** Whether to echo to local stdout as well (default: true) */
	readonly localEcho?: boolean;
}

/**
 * Server event types.
 */
export type ServerEvent =
	| { readonly type: 'client_connect'; readonly session: ClientSession }
	| { readonly type: 'client_disconnect'; readonly sessionId: string; readonly reason: string }
	| { readonly type: 'client_auth'; readonly sessionId: string; readonly name: string }
	| { readonly type: 'client_input'; readonly sessionId: string; readonly data: string }
	| {
			readonly type: 'client_resize';
			readonly sessionId: string;
			readonly width: number;
			readonly height: number;
	  }
	| { readonly type: 'error'; readonly sessionId: string | null; readonly error: string };

/**
 * Server event handler.
 */
export type ServerEventHandler = (event: ServerEvent) => void;

/**
 * Internal mutable client state.
 */
interface MutableClientState {
	id: string;
	name: string;
	width: number;
	height: number;
	connectedAt: number;
	lastActivity: number;
	authenticated: boolean;
	mode: ClientMode;
	socket: Writable;
	buffer: string;
}

/**
 * Terminal server state.
 */
export interface TerminalServerState {
	/** Server configuration */
	readonly config: TerminalServerConfig;
	/** Whether the server is running */
	readonly running: boolean;
	/** Number of connected clients */
	readonly clientCount: number;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for server configuration validation.
 */
export const TerminalServerConfigSchema = z.object({
	port: z.number().int().min(1).max(65535),
	host: z.string().optional(),
	authToken: z.string().optional(),
	maxClients: z.number().int().min(1).max(100).optional(),
	idleTimeout: z.number().int().min(1000).optional(),
	localEcho: z.boolean().optional(),
});

// =============================================================================
// STATE
// =============================================================================

/** Module-level server state */
let clients: Map<string, MutableClientState> = new Map();
let eventHandlers: ServerEventHandler[] = [];
let serverRunning = false;
let serverConfig: TerminalServerConfig | null = null;
let idCounter = 0;

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Generate a unique session ID.
 */
function generateSessionId(): string {
	idCounter += 1;
	return `session-${Date.now()}-${idCounter}`;
}

/**
 * Emit a server event to all handlers.
 */
function emitEvent(event: ServerEvent): void {
	for (const handler of eventHandlers) {
		handler(event);
	}
}

/**
 * Get a readonly snapshot of a client's session.
 *
 * @param state - The mutable client state
 * @returns Readonly client session
 */
function toClientSession(state: MutableClientState): ClientSession {
	return {
		id: state.id,
		name: state.name,
		width: state.width,
		height: state.height,
		connectedAt: state.connectedAt,
		lastActivity: state.lastActivity,
		authenticated: state.authenticated,
		mode: state.mode,
	};
}

/**
 * Create a terminal server with the given configuration.
 *
 * @param config - Server configuration
 * @returns Server state
 *
 * @example
 * ```typescript
 * const server = createTerminalServer({ port: 3000 });
 * ```
 */
export function createTerminalServer(config: TerminalServerConfig): TerminalServerState {
	TerminalServerConfigSchema.parse(config);
	serverConfig = config;
	clients = new Map();
	eventHandlers = [];
	serverRunning = false;
	idCounter = 0;

	return {
		config,
		running: false,
		clientCount: 0,
	};
}

/**
 * Register an event handler for server events.
 *
 * @param handler - Event handler function
 * @returns Unsubscribe function
 *
 * @example
 * ```typescript
 * const unsub = onServerEvent((event) => {
 *   if (event.type === 'client_connect') {
 *     console.log('Client connected:', event.session.id);
 *   }
 * });
 * ```
 */
export function onServerEvent(handler: ServerEventHandler): () => void {
	eventHandlers.push(handler);
	return () => {
		eventHandlers = eventHandlers.filter((h) => h !== handler);
	};
}

/**
 * Add a client connection to the server.
 *
 * @param socket - The writable stream for the client
 * @param name - Optional client name
 * @returns The new client session, or null if at max capacity
 *
 * @example
 * ```typescript
 * const session = addClient(socket, 'Alice');
 * if (session) {
 *   console.log('Client added:', session.id);
 * }
 * ```
 */
export function addClient(socket: Writable, name?: string): ClientSession | null {
	const maxClients = serverConfig?.maxClients ?? 10;
	if (clients.size >= maxClients) {
		return null;
	}

	const id = generateSessionId();
	const now = Date.now();
	const authRequired = serverConfig?.authToken !== undefined;

	const state: MutableClientState = {
		id,
		name: name ?? `client-${idCounter}`,
		width: 80,
		height: 24,
		connectedAt: now,
		lastActivity: now,
		authenticated: !authRequired,
		mode: 'full',
		socket,
		buffer: '',
	};

	clients.set(id, state);

	const session = toClientSession(state);
	emitEvent({ type: 'client_connect', session });

	return session;
}

/**
 * Remove a client from the server.
 *
 * @param sessionId - The session ID to remove
 * @param reason - Reason for removal
 *
 * @example
 * ```typescript
 * removeClient('session-123', 'disconnected');
 * ```
 */
export function removeClient(sessionId: string, reason = 'disconnected'): void {
	if (!clients.has(sessionId)) {
		return;
	}

	clients.delete(sessionId);
	emitEvent({ type: 'client_disconnect', sessionId, reason });
}

/**
 * Authenticate a client with the server token.
 *
 * @param sessionId - The session ID
 * @param token - The authentication token
 * @param name - Display name for the client
 * @returns Whether authentication succeeded
 *
 * @example
 * ```typescript
 * const success = authenticateClient('session-123', 'secret-token', 'Alice');
 * ```
 */
export function authenticateClient(sessionId: string, token: string, name?: string): boolean {
	const client = clients.get(sessionId);
	if (!client) {
		return false;
	}

	const expected = serverConfig?.authToken;
	if (expected !== undefined && token !== expected) {
		emitEvent({
			type: 'error',
			sessionId,
			error: 'Authentication failed: invalid token',
		});
		return false;
	}

	client.authenticated = true;
	client.lastActivity = Date.now();
	if (name !== undefined) {
		client.name = name;
	}

	emitEvent({ type: 'client_auth', sessionId, name: client.name });
	return true;
}

/**
 * Handle input data from a client.
 *
 * @param sessionId - The session ID
 * @param data - Raw input data string
 *
 * @example
 * ```typescript
 * handleClientInput('session-123', '\x1b[A'); // Up arrow
 * ```
 */
export function handleClientInput(sessionId: string, data: string): void {
	const client = clients.get(sessionId);
	if (!client) {
		return;
	}
	if (!client.authenticated) {
		emitEvent({
			type: 'error',
			sessionId,
			error: 'Client not authenticated',
		});
		return;
	}
	if (client.mode === 'read-only') {
		return;
	}

	client.lastActivity = Date.now();
	emitEvent({ type: 'client_input', sessionId, data });
}

/**
 * Update a client's terminal dimensions.
 *
 * @param sessionId - The session ID
 * @param width - New terminal width
 * @param height - New terminal height
 *
 * @example
 * ```typescript
 * updateClientSize('session-123', 120, 40);
 * ```
 */
export function updateClientSize(sessionId: string, width: number, height: number): void {
	const client = clients.get(sessionId);
	if (!client) {
		return;
	}

	client.width = width;
	client.height = height;
	client.lastActivity = Date.now();

	emitEvent({ type: 'client_resize', sessionId, width, height });
}

/**
 * Set a client's permission mode.
 *
 * @param sessionId - The session ID
 * @param mode - The new permission mode
 *
 * @example
 * ```typescript
 * setClientMode('session-123', 'read-only');
 * ```
 */
export function setClientMode(sessionId: string, mode: ClientMode): void {
	const client = clients.get(sessionId);
	if (!client) {
		return;
	}

	client.mode = mode;
}

/**
 * Broadcast raw terminal output to all authenticated clients.
 *
 * @param data - ANSI terminal output to send
 *
 * @example
 * ```typescript
 * broadcastOutput('\x1b[2J\x1b[H'); // Clear screen and home
 * ```
 */
export function broadcastOutput(data: string): void {
	for (const client of clients.values()) {
		if (!client.authenticated) {
			continue;
		}

		try {
			client.socket.write(data);
		} catch {
			removeClient(client.id, 'write error');
		}
	}
}

/**
 * Send terminal output to a specific client.
 *
 * @param sessionId - The session ID
 * @param data - ANSI terminal output to send
 *
 * @example
 * ```typescript
 * sendToClient('session-123', '\x1b[31mHello!\x1b[0m');
 * ```
 */
export function sendToClient(sessionId: string, data: string): void {
	const client = clients.get(sessionId);
	if (!client) {
		return;
	}

	try {
		client.socket.write(data);
	} catch {
		removeClient(client.id, 'write error');
	}
}

/**
 * Get a list of all connected client sessions.
 *
 * @returns Array of client sessions
 *
 * @example
 * ```typescript
 * const sessions = getConnectedClients();
 * console.log(`${sessions.length} clients connected`);
 * ```
 */
export function getConnectedClients(): readonly ClientSession[] {
	const sessions: ClientSession[] = [];
	for (const client of clients.values()) {
		sessions.push(toClientSession(client));
	}
	return sessions;
}

/**
 * Get a specific client session by ID.
 *
 * @param sessionId - The session ID
 * @returns The client session, or null if not found
 */
export function getClient(sessionId: string): ClientSession | null {
	const client = clients.get(sessionId);
	if (!client) {
		return null;
	}
	return toClientSession(client);
}

/**
 * Check if the server is running.
 *
 * @returns Whether the server is running
 */
export function isServerRunning(): boolean {
	return serverRunning;
}

/**
 * Get current server state.
 *
 * @returns Server state snapshot
 */
export function getServerState(): TerminalServerState | null {
	if (!serverConfig) {
		return null;
	}
	return {
		config: serverConfig,
		running: serverRunning,
		clientCount: clients.size,
	};
}

/**
 * Mark the server as started.
 * The actual TCP listener should be created by the application
 * using Node.js net module and calling addClient for each connection.
 *
 * @example
 * ```typescript
 * import { createServer } from 'node:net';
 *
 * const server = createTerminalServer({ port: 3000 });
 * markServerStarted();
 *
 * const tcpServer = createServer((socket) => {
 *   const session = addClient(socket);
 *   socket.on('data', (data) => handleClientInput(session.id, data.toString()));
 *   socket.on('close', () => removeClient(session.id));
 * });
 * tcpServer.listen(3000);
 * ```
 */
export function markServerStarted(): void {
	serverRunning = true;
}

/**
 * Mark the server as stopped and disconnect all clients.
 */
export function markServerStopped(): void {
	serverRunning = false;
	const sessionIds = Array.from(clients.keys());
	for (const id of sessionIds) {
		removeClient(id, 'server stopped');
	}
}

/**
 * Disconnect idle clients that exceed the timeout.
 *
 * @returns Number of clients disconnected
 *
 * @example
 * ```typescript
 * // Run periodically
 * const disconnected = pruneIdleClients();
 * ```
 */
export function pruneIdleClients(): number {
	const timeout = serverConfig?.idleTimeout ?? 300000;
	const now = Date.now();
	let count = 0;

	const toRemove: string[] = [];
	for (const client of clients.values()) {
		if (now - client.lastActivity > timeout) {
			toRemove.push(client.id);
		}
	}

	for (const id of toRemove) {
		removeClient(id, 'idle timeout');
		count += 1;
	}

	return count;
}

/**
 * Reset all server state. Used for testing.
 */
export function resetServerState(): void {
	clients = new Map();
	eventHandlers = [];
	serverRunning = false;
	serverConfig = null;
	idCounter = 0;
}

/**
 * Server namespace for convenient access to all server functions.
 *
 * @example
 * ```typescript
 * import { Server } from 'blecsd';
 *
 * Server.create({ port: 3000 });
 * Server.markStarted();
 * Server.broadcast('Hello!');
 * ```
 */
export const Server = {
	create: createTerminalServer,
	onEvent: onServerEvent,
	addClient,
	removeClient,
	authenticate: authenticateClient,
	handleInput: handleClientInput,
	updateSize: updateClientSize,
	setMode: setClientMode,
	broadcast: broadcastOutput,
	sendTo: sendToClient,
	getClients: getConnectedClients,
	getClient,
	isRunning: isServerRunning,
	getState: getServerState,
	markStarted: markServerStarted,
	markStopped: markServerStopped,
	pruneIdle: pruneIdleClients,
	reset: resetServerState,
} as const;
