/**
 * WebSocket Server Mode for blECSd
 *
 * Serves terminal UI to connecting browsers over WebSocket. Each client
 * receives terminal output rendered via xterm.js in the browser and can
 * send keyboard/mouse input back. Reuses the existing TCP server patterns
 * for client session management, auth, and broadcasting.
 *
 * Uses only Node.js built-in modules — no external WebSocket dependency.
 *
 * @module terminal/webServer
 *
 * @example
 * ```typescript
 * import { serveWeb } from 'blecsd';
 *
 * const handle = serveWeb({
 *   port: 8080,
 *   title: 'My blECSd App',
 *   authToken: 'secret',
 * });
 *
 * // Stream terminal output to all connected browsers
 * handle.broadcast('Hello from blECSd!');
 *
 * // Listen for client events
 * handle.onEvent((event) => {
 *   if (event.type === 'client_input') {
 *     console.log('Browser input:', event.data);
 *   }
 * });
 *
 * // Later:
 * handle.stop();
 * ```
 */

import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import { z } from 'zod';
import {
	addClient,
	authenticateClient,
	broadcastOutput,
	type ClientSession,
	createTerminalServer,
	handleClientInput,
	markServerStarted,
	markServerStopped,
	onServerEvent,
	removeClient,
	type ServerEventHandler,
	type TerminalServerConfig,
	updateClientSize,
} from './server';
import { generateWebClientHtml } from './webClient';

// =============================================================================
// TYPES
// =============================================================================

/**
 * WebSocket server configuration.
 */
export interface WebServerConfig {
	/** HTTP port to listen on */
	readonly port: number;
	/** Host to bind to (default: '0.0.0.0') */
	readonly host?: string;
	/** Page title shown in the browser tab */
	readonly title?: string;
	/** Authentication token (clients must send this in their first WS message) */
	readonly authToken?: string;
	/** Maximum concurrent WebSocket clients (default: 10) */
	readonly maxClients?: number;
}

/**
 * Handle returned by serveWeb for controlling the running server.
 */
export interface WebServerHandle {
	/** Broadcast terminal output to all authenticated browser clients */
	readonly broadcast: (data: string) => void;
	/** Register an event handler */
	readonly onEvent: (handler: ServerEventHandler) => () => void;
	/** Stop the server and disconnect all clients */
	readonly stop: () => Promise<void>;
	/** Whether the server is currently running */
	readonly running: boolean;
	/** The actual port the server is listening on */
	readonly port: number;
}

/**
 * Internal WebSocket connection state.
 */
interface WsConnection {
	socket: Duplex;
	sessionId: string;
	alive: boolean;
}

// =============================================================================
// SCHEMAS
// =============================================================================

/**
 * Zod schema for web server configuration validation.
 */
export const WebServerConfigSchema = z.object({
	port: z.number().int().min(1).max(65535),
	host: z.string().optional(),
	title: z.string().optional(),
	authToken: z.string().optional(),
	maxClients: z.number().int().min(1).max(100).optional(),
});

// =============================================================================
// WEBSOCKET PROTOCOL HELPERS
// =============================================================================

/** WebSocket magic GUID for handshake */
const WS_MAGIC = '258EAFA5-E914-47DA-95CA-5AB5DC65C97B';

/** WebSocket opcodes */
const WS_OPCODE_TEXT = 0x01;
const WS_OPCODE_CLOSE = 0x08;
const WS_OPCODE_PING = 0x09;
const WS_OPCODE_PONG = 0x0a;

/**
 * Compute the Sec-WebSocket-Accept header value.
 */
function computeAcceptKey(key: string): string {
	return createHash('sha1')
		.update(key + WS_MAGIC)
		.digest('base64');
}

/**
 * Encode a string as a WebSocket text frame.
 */
function encodeWsFrame(data: string, opcode = WS_OPCODE_TEXT): Buffer {
	const payload = Buffer.from(data, 'utf-8');
	const len = payload.length;

	let header: Buffer;
	if (len < 126) {
		header = Buffer.alloc(2);
		header[0] = 0x80 | opcode; // FIN + opcode
		header[1] = len;
	} else if (len < 65536) {
		header = Buffer.alloc(4);
		header[0] = 0x80 | opcode;
		header[1] = 126;
		header.writeUInt16BE(len, 2);
	} else {
		header = Buffer.alloc(10);
		header[0] = 0x80 | opcode;
		header[1] = 127;
		// Write as 64-bit (upper 32 bits will be 0 for reasonable payloads)
		header.writeUInt32BE(0, 2);
		header.writeUInt32BE(len, 6);
	}

	return Buffer.concat([header, payload]);
}

/**
 * Encode a WebSocket close frame.
 */
function encodeCloseFrame(code = 1000): Buffer {
	const header = Buffer.alloc(4);
	header[0] = 0x80 | WS_OPCODE_CLOSE;
	header[1] = 2;
	header.writeUInt16BE(code, 2);
	return header;
}

/** Parsed frame header info, or null if buffer is incomplete. */
interface FrameHeader {
	opcode: number;
	masked: boolean;
	payloadLen: number;
	headerLen: number;
	totalLen: number;
}

/**
 * Parse a single WebSocket frame header from the buffer at the given offset.
 * Returns null if the buffer doesn't contain a complete frame.
 */
function parseFrameHeader(buffer: Buffer, offset: number): FrameHeader | null {
	if (buffer.length - offset < 2) return null;

	const byte0 = buffer.readUInt8(offset);
	const byte1 = buffer.readUInt8(offset + 1);
	const opcode = byte0 & 0x0f;
	const masked = (byte1 & 0x80) !== 0;
	let payloadLen = byte1 & 0x7f;
	let headerLen = 2;

	if (payloadLen === 126) {
		if (buffer.length - offset < 4) return null;
		payloadLen = buffer.readUInt16BE(offset + 2);
		headerLen = 4;
	} else if (payloadLen === 127) {
		if (buffer.length - offset < 10) return null;
		payloadLen = buffer.readUInt32BE(offset + 6);
		headerLen = 10;
	}

	if (masked) headerLen += 4;
	const totalLen = headerLen + payloadLen;
	if (buffer.length - offset < totalLen) return null;

	return { opcode, masked, payloadLen, headerLen, totalLen };
}

/**
 * Unmask a WebSocket payload using the 4-byte mask key.
 */
function unmaskPayload(payload: Buffer<ArrayBuffer>, mask: Buffer): void {
	for (let i = 0; i < payload.length; i++) {
		payload[i] = (payload.readUInt8(i) ^ mask.readUInt8(i % 4)) & 0xff;
	}
}

/**
 * Decode WebSocket frames from a buffer. Returns decoded messages and remaining buffer.
 * Handles fragmented frames and masking (clients MUST mask per RFC 6455).
 */
function decodeWsFrames(buffer: Buffer): {
	messages: Array<{ opcode: number; data: string }>;
	remaining: Buffer;
} {
	const messages: Array<{ opcode: number; data: string }> = [];
	let offset = 0;

	while (offset < buffer.length) {
		const header = parseFrameHeader(buffer, offset);
		if (!header) break;

		const payload: Buffer<ArrayBuffer> = Buffer.from(
			buffer.subarray(offset + header.headerLen, offset + header.headerLen + header.payloadLen),
		);

		if (header.masked) {
			const maskOffset = header.headerLen - 4;
			const mask = buffer.subarray(offset + maskOffset, offset + maskOffset + 4);
			unmaskPayload(payload, mask);
		}

		messages.push({ opcode: header.opcode, data: payload.toString('utf-8') });
		offset += header.totalLen;
	}

	return { messages, remaining: buffer.subarray(offset) };
}

// =============================================================================
// MAIN API
// =============================================================================

/** Parsed client JSON message shape. */
interface ClientMessage {
	type: string;
	token?: string;
	name?: string;
	data?: string;
	cols?: number;
	rows?: number;
}

/**
 * Handle a parsed JSON text message from a WebSocket client.
 */
function handleTextMessage(parsed: ClientMessage, conn: WsConnection, socket: Duplex): void {
	switch (parsed.type) {
		case 'auth':
			if (parsed.token) {
				const ok = authenticateClient(conn.sessionId, parsed.token, parsed.name);
				socket.write(
					encodeWsFrame(
						JSON.stringify({
							type: ok ? 'ready' : 'auth_failed',
							sessionId: ok ? conn.sessionId : undefined,
						}),
					),
				);
			}
			break;

		case 'input':
			if (parsed.data) {
				handleClientInput(conn.sessionId, parsed.data);
			}
			break;

		case 'resize':
			if (typeof parsed.cols === 'number' && typeof parsed.rows === 'number') {
				updateClientSize(conn.sessionId, parsed.cols, parsed.rows);
			}
			break;

		default:
			break;
	}
}

/**
 * Process a single decoded WebSocket message. Returns true if the connection should close.
 */
function handleWsMessage(
	msg: { opcode: number; data: string },
	conn: WsConnection,
	socket: Duplex,
	connections: Map<string, WsConnection>,
): boolean {
	if (msg.opcode === WS_OPCODE_CLOSE) {
		removeClient(conn.sessionId, 'client closed');
		connections.delete(conn.sessionId);
		socket.write(encodeCloseFrame());
		socket.end();
		return true;
	}

	if (msg.opcode === WS_OPCODE_PING) {
		socket.write(encodeWsFrame(msg.data, WS_OPCODE_PONG));
		return false;
	}

	if (msg.opcode === WS_OPCODE_PONG) {
		conn.alive = true;
		return false;
	}

	if (msg.opcode === WS_OPCODE_TEXT) {
		try {
			const parsed = JSON.parse(msg.data) as ClientMessage;
			handleTextMessage(parsed, conn, socket);
		} catch {
			handleClientInput(conn.sessionId, msg.data);
		}
	}

	return false;
}

/**
 * Start a WebSocket server that serves a browser-based terminal client.
 *
 * Serves an HTML page with xterm.js at the root URL, and accepts WebSocket
 * connections at `/ws`. Terminal output is streamed to connected browsers,
 * and keyboard input is forwarded back.
 *
 * @param config - Server configuration
 * @returns A handle to control the running server
 *
 * @example
 * ```typescript
 * import { serveWeb } from 'blecsd';
 *
 * const handle = serveWeb({ port: 8080, title: 'My App' });
 *
 * // Broadcast output
 * handle.broadcast('\x1b[32mHello from blECSd!\x1b[0m\r\n');
 *
 * // Stop later
 * await handle.stop();
 * ```
 */
export function serveWeb(config: WebServerConfig): WebServerHandle {
	WebServerConfigSchema.parse(config);

	const host = config.host ?? '0.0.0.0';
	const title = config.title ?? 'blECSd';
	const htmlContent = generateWebClientHtml(title, config.authToken !== undefined);

	// Initialize the underlying terminal server state
	const tcpConfig: TerminalServerConfig = {
		port: config.port,
		host,
		...(config.authToken !== undefined ? { authToken: config.authToken } : {}),
		...(config.maxClients !== undefined ? { maxClients: config.maxClients } : {}),
	};
	createTerminalServer(tcpConfig);

	const connections = new Map<string, WsConnection>();
	let running = true;

	// Create a writable adapter for each WS connection
	function createWsWritable(conn: WsConnection) {
		return {
			write(data: string | Buffer): boolean {
				if (!conn.alive) return false;
				try {
					const str = typeof data === 'string' ? data : data.toString('utf-8');
					conn.socket.write(encodeWsFrame(str));
					return true;
				} catch {
					return false;
				}
			},
			end(): void {
				conn.alive = false;
			},
			// Satisfy Writable interface minimally
			on(): typeof this {
				return this;
			},
			once(): typeof this {
				return this;
			},
			emit(): boolean {
				return false;
			},
			removeListener(): typeof this {
				return this;
			},
		};
	}

	// HTTP server
	const httpServer: Server = createServer((req: IncomingMessage, res: ServerResponse) => {
		if (req.url === '/' || req.url === '/index.html') {
			res.writeHead(200, {
				'Content-Type': 'text/html; charset=utf-8',
				'Content-Length': Buffer.byteLength(htmlContent),
			});
			res.end(htmlContent);
		} else {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		}
	});

	// WebSocket upgrade handler
	httpServer.on('upgrade', (req: IncomingMessage, socket: Duplex) => {
		const wsKey = req.headers['sec-websocket-key'];
		if (!wsKey || req.headers.upgrade?.toLowerCase() !== 'websocket') {
			socket.destroy();
			return;
		}

		// Perform WebSocket handshake
		const acceptKey = computeAcceptKey(wsKey);
		const response = [
			'HTTP/1.1 101 Switching Protocols',
			'Upgrade: websocket',
			'Connection: Upgrade',
			`Sec-WebSocket-Accept: ${acceptKey}`,
			'',
			'',
		].join('\r\n');

		socket.write(response);

		// Create connection state
		const conn: WsConnection = {
			socket,
			sessionId: '',
			alive: true,
		};

		// Add as a terminal server client
		const writable = createWsWritable(conn);
		const session: ClientSession | null = addClient(
			writable as unknown as import('node:stream').Writable,
		);
		if (!session) {
			socket.write(encodeCloseFrame(1013)); // Try Again Later
			socket.end();
			return;
		}

		conn.sessionId = session.id;
		connections.set(session.id, conn);

		// If no auth required, client is already authenticated
		// Send a welcome message
		if (!config.authToken) {
			socket.write(encodeWsFrame(JSON.stringify({ type: 'ready', sessionId: session.id })));
		} else {
			socket.write(encodeWsFrame(JSON.stringify({ type: 'auth_required' })));
		}

		// Handle incoming data
		let buffer: Buffer = Buffer.alloc(0);

		socket.on('data', (chunk: Buffer) => {
			buffer = Buffer.concat([buffer, chunk]) as Buffer;
			const { messages, remaining } = decodeWsFrames(buffer);
			buffer = remaining;

			for (const msg of messages) {
				const shouldClose = handleWsMessage(msg, conn, socket, connections);
				if (shouldClose) return;
			}
		});

		socket.on('close', () => {
			conn.alive = false;
			removeClient(conn.sessionId, 'socket closed');
			connections.delete(conn.sessionId);
		});

		socket.on('error', () => {
			conn.alive = false;
			removeClient(conn.sessionId, 'socket error');
			connections.delete(conn.sessionId);
		});
	});

	// Heartbeat: ping clients every 30s to detect dead connections
	const heartbeatInterval = setInterval(() => {
		for (const [id, conn] of connections) {
			if (!conn.alive) {
				removeClient(id, 'heartbeat timeout');
				connections.delete(id);
				conn.socket.destroy();
				continue;
			}
			conn.alive = false;
			try {
				conn.socket.write(encodeWsFrame('', WS_OPCODE_PING));
			} catch {
				removeClient(id, 'ping failed');
				connections.delete(id);
			}
		}
	}, 30000);

	// Start listening
	httpServer.listen(config.port, host, () => {
		markServerStarted();
	});

	// Build the handle
	const handle: WebServerHandle = {
		broadcast: (data: string) => {
			broadcastOutput(data);
		},
		onEvent: (handler: ServerEventHandler) => {
			return onServerEvent(handler);
		},
		stop: () => {
			return new Promise<void>((resolve) => {
				running = false;
				clearInterval(heartbeatInterval);

				// Close all WebSocket connections
				for (const [id, conn] of connections) {
					try {
						conn.socket.write(encodeCloseFrame());
						conn.socket.end();
					} catch {
						// ignore
					}
					removeClient(id, 'server stopped');
				}
				connections.clear();

				markServerStopped();

				httpServer.close(() => {
					resolve();
				});
			});
		},
		get running() {
			return running;
		},
		port: config.port,
	};

	return handle;
}
