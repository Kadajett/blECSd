/**
 * WebSocket Server for blECSd
 *
 * Streams terminal UI output to browser clients over WebSocket.
 * Implements WebSocket protocol (RFC 6455) using only Node.js built-ins.
 * Reuses the existing TCP server session management patterns.
 *
 * @module terminal/webSocket
 *
 * @example
 * ```typescript
 * import { createWebServer, startWebServer, stopWebServer } from 'blecsd/terminal';
 *
 * const server = createWebServer({
 *   port: 8080,
 *   title: 'My Terminal App',
 *   authToken: 'secret',
 * });
 *
 * startWebServer(server);
 * // Open http://localhost:8080 in a browser
 *
 * // Stream output to all connected browsers
 * webBroadcast(server, '\x1b[2J\x1b[HHello from blECSd!');
 *
 * // Later:
 * stopWebServer(server);
 * ```
 */

import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import { Writable } from 'node:stream';
import { z } from 'zod';

import {
	addClient,
	handleClientInput,
	removeClient,
	type ServerEvent,
	type ServerEventHandler,
	updateClientSize,
} from './server';
import { getClientPage } from './webClient';

// =============================================================================
// TYPES
// =============================================================================

/**
 * WebSocket server configuration.
 */
export interface WebServerConfig {
	/** HTTP/WebSocket port to listen on */
	readonly port: number;
	/** Host to bind to (default: 'localhost') */
	readonly host?: string;
	/** Page title shown in browser tab */
	readonly title?: string;
	/** Authentication token (sent by client on connect) */
	readonly authToken?: string;
	/** Maximum concurrent WebSocket clients (default: 10) */
	readonly maxClients?: number;
}

/**
 * WebSocket server state.
 */
export interface WebServerState {
	/** Server configuration */
	readonly config: WebServerConfig;
	/** Whether the server is running */
	running: boolean;
	/** Connected WebSocket client count */
	clientCount: number;
	/** Internal HTTP server (null until started) */
	_httpServer: Server | null;
	/** Map of session ID → WebSocket raw socket */
	_sockets: Map<string, WebSocketConnection>;
	/** Event handlers */
	_handlers: ServerEventHandler[];
}

/**
 * Internal WebSocket connection state.
 */
interface WebSocketConnection {
	/** Session ID (matches server.ts session) */
	readonly sessionId: string;
	/** Raw TCP socket from HTTP upgrade */
	readonly socket: Socket;
	/** Whether the connection is open */
	open: boolean;
}

/**
 * WebSocket message from browser client.
 */
interface ClientMessage {
	/** Message type */
	readonly type: 'input' | 'resize' | 'auth';
	/** Input data (for type='input') */
	readonly data?: string;
	/** Terminal width (for type='resize') */
	readonly width?: number;
	/** Terminal height (for type='resize') */
	readonly height?: number;
	/** Auth token (for type='auth') */
	readonly token?: string;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for WebSocket server configuration.
 */
export const WebServerConfigSchema = z.object({
	port: z.number().int().min(1).max(65535),
	host: z.string().optional(),
	title: z.string().optional(),
	authToken: z.string().optional(),
	maxClients: z.number().int().min(1).max(100).optional(),
});

// =============================================================================
// WEBSOCKET FRAME HANDLING (RFC 6455)
// =============================================================================

/** WebSocket GUID for handshake */
const WS_GUID = '258EAFA5-E914-47DA-95CA-5AB5DC175AB2';

/**
 * Computes the Sec-WebSocket-Accept header value.
 */
function computeAcceptKey(clientKey: string): string {
	return createHash('sha1')
		.update(clientKey + WS_GUID)
		.digest('base64');
}

/**
 * Encodes a string as a WebSocket text frame.
 */
export function encodeFrame(data: string): Buffer {
	const payload = Buffer.from(data, 'utf-8');
	const len = payload.length;

	let header: Buffer;
	if (len < 126) {
		header = Buffer.alloc(2);
		header[0] = 0x81; // FIN + text opcode
		header[1] = len;
	} else if (len < 65536) {
		header = Buffer.alloc(4);
		header[0] = 0x81;
		header[1] = 126;
		header.writeUInt16BE(len, 2);
	} else {
		header = Buffer.alloc(10);
		header[0] = 0x81;
		header[1] = 127;
		// Write as two 32-bit values (BigInt not needed for reasonable sizes)
		header.writeUInt32BE(0, 2);
		header.writeUInt32BE(len, 6);
	}

	return Buffer.concat([header, payload]);
}

/**
 * Encodes a WebSocket close frame.
 */
function encodeCloseFrame(code = 1000): Buffer {
	const header = Buffer.alloc(4);
	header[0] = 0x88; // FIN + close opcode
	header[1] = 2; // payload length
	header.writeUInt16BE(code, 2);
	return header;
}

/**
 * Encodes a WebSocket pong frame.
 */
function encodePongFrame(payload: Buffer): Buffer {
	const len = payload.length;
	let header: Buffer;
	if (len < 126) {
		header = Buffer.alloc(2);
		header[0] = 0x8a; // FIN + pong opcode
		header[1] = len;
	} else {
		header = Buffer.alloc(4);
		header[0] = 0x8a;
		header[1] = 126;
		header.writeUInt16BE(len, 2);
	}
	return Buffer.concat([header, payload]);
}

/**
 * Parsed WebSocket frame result.
 */
interface ParsedFrame {
	/** Opcode (1=text, 8=close, 9=ping, 10=pong) */
	readonly opcode: number;
	/** Decoded payload */
	readonly payload: Buffer;
	/** Total bytes consumed from the buffer */
	readonly bytesConsumed: number;
}

/**
 * Attempts to parse a single WebSocket frame from a buffer.
 * Returns null if the buffer doesn't contain a complete frame.
 */
export function parseFrame(buffer: Buffer): ParsedFrame | null {
	if (buffer.length < 2) return null;

	// biome-ignore lint/style/noNonNullAssertion: length checked above
	const firstByte = buffer[0]!;
	// biome-ignore lint/style/noNonNullAssertion: length checked above
	const secondByte = buffer[1]!;
	const opcode = firstByte & 0x0f;
	const masked = (secondByte & 0x80) !== 0;
	let payloadLen = secondByte & 0x7f;
	let offset = 2;

	if (payloadLen === 126) {
		if (buffer.length < 4) return null;
		payloadLen = buffer.readUInt16BE(2);
		offset = 4;
	} else if (payloadLen === 127) {
		if (buffer.length < 10) return null;
		// Read lower 32 bits (sufficient for practical use)
		payloadLen = buffer.readUInt32BE(6);
		offset = 10;
	}

	const maskSize = masked ? 4 : 0;
	const totalLen = offset + maskSize + payloadLen;
	if (buffer.length < totalLen) return null;

	let payload: Buffer;
	if (masked) {
		const maskKey = buffer.subarray(offset, offset + 4);
		const maskedData = buffer.subarray(offset + 4, offset + 4 + payloadLen);
		payload = Buffer.alloc(payloadLen);
		for (let i = 0; i < payloadLen; i++) {
			const maskedByte = maskedData[i] ?? 0;
			const keyByte = maskKey[i % 4] ?? 0;
			payload[i] = maskedByte ^ keyByte;
		}
	} else {
		payload = Buffer.from(buffer.subarray(offset, offset + payloadLen));
	}

	return { opcode, payload, bytesConsumed: totalLen };
}

// =============================================================================
// SERVER FUNCTIONS
// =============================================================================

/**
 * Creates a WebSocket server configuration.
 *
 * @param config - Server configuration
 * @returns WebSocket server state
 *
 * @example
 * ```typescript
 * const server = createWebServer({ port: 8080, title: 'My App' });
 * ```
 */
export function createWebServer(config: WebServerConfig): WebServerState {
	WebServerConfigSchema.parse(config);

	return {
		config,
		running: false,
		clientCount: 0,
		_httpServer: null,
		_sockets: new Map(),
		_handlers: [],
	};
}

/**
 * Registers an event handler for WebSocket server events.
 *
 * @param state - WebSocket server state
 * @param handler - Event handler function
 * @returns Unsubscribe function
 */
export function onWebServerEvent(state: WebServerState, handler: ServerEventHandler): () => void {
	state._handlers.push(handler);
	return () => {
		state._handlers = state._handlers.filter((h) => h !== handler);
	};
}

/**
 * Emits an event to all registered handlers.
 */
function emitWebEvent(state: WebServerState, event: ServerEvent): void {
	for (const handler of state._handlers) {
		handler(event);
	}
}

/**
 * A writable wrapper for WebSocket connections, implementing
 * the Writable interface expected by addClient.
 */
class WebSocketWritable extends Writable {
	private readonly _wsSocket: Socket;
	private _open: boolean;

	constructor(socket: Socket) {
		super();
		this._wsSocket = socket;
		this._open = true;
	}

	override _write(
		chunk: Buffer | string,
		_encoding: BufferEncoding,
		callback: (error?: Error | null) => void,
	): void {
		if (!this._open || this._wsSocket.destroyed) {
			callback();
			return;
		}
		const data = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
		const frame = encodeFrame(data);
		this._wsSocket.write(frame, callback);
	}

	close(): void {
		this._open = false;
	}
}

/**
 * Handles an upgraded WebSocket connection.
 */
function handleWebSocketConnection(state: WebServerState, rawSocket: Socket): void {
	const writable = new WebSocketWritable(rawSocket);
	const session = addClient(writable);
	if (!session) {
		// At capacity — send close frame
		rawSocket.write(encodeCloseFrame(1013)); // Try again later
		rawSocket.end();
		return;
	}

	const conn: WebSocketConnection = {
		sessionId: session.id,
		socket: rawSocket,
		open: true,
	};

	state._sockets.set(session.id, conn);
	state.clientCount = state._sockets.size;

	emitWebEvent(state, { type: 'client_connect', session });

	let frameBuffer = Buffer.alloc(0);

	rawSocket.on('data', (chunk: Buffer) => {
		frameBuffer = Buffer.concat([frameBuffer, chunk]);

		// Process all complete frames in the buffer
		let frame = parseFrame(frameBuffer);
		while (frame !== null) {
			frameBuffer = frameBuffer.subarray(frame.bytesConsumed);

			switch (frame.opcode) {
				case 0x01: {
					// Text frame
					try {
						const msg = JSON.parse(frame.payload.toString('utf-8')) as ClientMessage;
						handleClientMessage(state, session.id, msg);
					} catch {
						// Ignore malformed JSON
					}
					break;
				}
				case 0x08: {
					// Close frame
					rawSocket.write(encodeCloseFrame(1000));
					rawSocket.end();
					break;
				}
				case 0x09: {
					// Ping — respond with pong
					rawSocket.write(encodePongFrame(frame.payload));
					break;
				}
				// 0x0a = pong — ignore
			}

			frame = parseFrame(frameBuffer);
		}
	});

	rawSocket.on('close', () => {
		conn.open = false;
		writable.close();
		state._sockets.delete(session.id);
		state.clientCount = state._sockets.size;
		removeClient(session.id, 'WebSocket closed');
		emitWebEvent(state, {
			type: 'client_disconnect',
			sessionId: session.id,
			reason: 'WebSocket closed',
		});
	});

	rawSocket.on('error', () => {
		conn.open = false;
		writable.close();
		state._sockets.delete(session.id);
		state.clientCount = state._sockets.size;
		removeClient(session.id, 'WebSocket error');
	});
}

/**
 * Handles a parsed client message.
 */
function handleClientMessage(state: WebServerState, sessionId: string, msg: ClientMessage): void {
	switch (msg.type) {
		case 'input':
			if (msg.data !== undefined) {
				handleClientInput(sessionId, msg.data);
				emitWebEvent(state, { type: 'client_input', sessionId, data: msg.data });
			}
			break;
		case 'resize':
			if (msg.width !== undefined && msg.height !== undefined) {
				updateClientSize(sessionId, msg.width, msg.height);
				emitWebEvent(state, {
					type: 'client_resize',
					sessionId,
					width: msg.width,
					height: msg.height,
				});
			}
			break;
		case 'auth':
			// Auth handled via server.ts authenticateClient
			break;
	}
}

/**
 * Starts the WebSocket server.
 *
 * Creates an HTTP server that:
 * - Serves the HTML client page on GET /
 * - Upgrades WebSocket connections on the /ws path
 *
 * @param state - WebSocket server state
 * @returns Promise that resolves when the server is listening
 *
 * @example
 * ```typescript
 * const server = createWebServer({ port: 8080 });
 * await startWebServer(server);
 * console.log('Server running on http://localhost:8080');
 * ```
 */
export function startWebServer(state: WebServerState): Promise<void> {
	return new Promise((resolve, reject) => {
		if (state.running) {
			resolve();
			return;
		}

		const host = state.config.host ?? 'localhost';
		const title = state.config.title ?? 'blECSd Terminal';
		const clientHtml = getClientPage(title, state.config.authToken);

		const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
			if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
				res.writeHead(200, {
					'Content-Type': 'text/html; charset=utf-8',
					'Content-Length': Buffer.byteLength(clientHtml, 'utf-8'),
				});
				res.end(clientHtml);
			} else if (req.method === 'GET' && req.url === '/health') {
				const body = JSON.stringify({
					status: 'ok',
					clients: state.clientCount,
				});
				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(body);
			} else {
				res.writeHead(404);
				res.end('Not found');
			}
		});

		httpServer.on('upgrade', (req: IncomingMessage, socket: Socket) => {
			const key = req.headers['sec-websocket-key'];
			if (!key || req.url !== '/ws') {
				socket.destroy();
				return;
			}

			const acceptKey = computeAcceptKey(key);
			const responseHeaders = [
				'HTTP/1.1 101 Switching Protocols',
				'Upgrade: websocket',
				'Connection: Upgrade',
				`Sec-WebSocket-Accept: ${acceptKey}`,
				'',
				'',
			].join('\r\n');

			socket.write(responseHeaders);
			handleWebSocketConnection(state, socket);
		});

		httpServer.on('error', (err: Error) => {
			reject(err);
		});

		httpServer.listen(state.config.port, host, () => {
			state.running = true;
			state._httpServer = httpServer;
			resolve();
		});
	});
}

/**
 * Stops the WebSocket server.
 *
 * @param state - WebSocket server state
 * @returns Promise that resolves when the server has stopped
 */
export function stopWebServer(state: WebServerState): Promise<void> {
	return new Promise((resolve) => {
		if (!state.running || !state._httpServer) {
			resolve();
			return;
		}

		// Close all WebSocket connections
		for (const conn of state._sockets.values()) {
			if (conn.open) {
				conn.socket.write(encodeCloseFrame(1001)); // Going away
				conn.socket.end();
			}
		}
		state._sockets.clear();
		state.clientCount = 0;

		state._httpServer.close(() => {
			state.running = false;
			state._httpServer = null;
			resolve();
		});
	});
}

/**
 * Broadcasts terminal output to all connected WebSocket clients.
 *
 * @param state - WebSocket server state
 * @param data - ANSI terminal output string
 *
 * @example
 * ```typescript
 * webBroadcast(server, '\x1b[2J\x1b[HHello, browser!');
 * ```
 */
export function webBroadcast(state: WebServerState, data: string): void {
	const frame = encodeFrame(data);
	for (const conn of state._sockets.values()) {
		if (conn.open) {
			try {
				conn.socket.write(frame);
			} catch {
				// Connection lost — will be cleaned up on 'close' event
			}
		}
	}
}

/**
 * Sends terminal output to a specific WebSocket client.
 *
 * @param state - WebSocket server state
 * @param sessionId - Target session ID
 * @param data - ANSI terminal output string
 */
export function webSendTo(state: WebServerState, sessionId: string, data: string): void {
	const conn = state._sockets.get(sessionId);
	if (!conn?.open) return;

	try {
		conn.socket.write(encodeFrame(data));
	} catch {
		// Connection lost
	}
}

/**
 * Gets the number of connected WebSocket clients.
 *
 * @param state - WebSocket server state
 * @returns Number of connected clients
 */
export function getWebClientCount(state: WebServerState): number {
	return state._sockets.size;
}

/**
 * Convenience object for all WebSocket server functions.
 *
 * @example
 * ```typescript
 * import { WebServer } from 'blecsd/terminal';
 *
 * const server = WebServer.create({ port: 8080 });
 * await WebServer.start(server);
 * WebServer.broadcast(server, 'Hello!');
 * await WebServer.stop(server);
 * ```
 */
export const WebServer = {
	create: createWebServer,
	start: startWebServer,
	stop: stopWebServer,
	broadcast: webBroadcast,
	sendTo: webSendTo,
	onEvent: onWebServerEvent,
	getClientCount: getWebClientCount,
} as const;
