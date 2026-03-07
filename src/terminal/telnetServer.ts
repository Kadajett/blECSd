/**
 * Telnet Server for blECSd
 *
 * Implements a telnet server with proper protocol negotiation:
 * - NAWS (Negotiate About Window Size, RFC 1073)
 * - TTYPE (Terminal Type, RFC 1091)
 * - SGA (Suppress Go Ahead)
 * - ECHO
 *
 * Each connecting client receives its own StreamSession for integration
 * with the blECSd terminal system.
 *
 * @module terminal/telnetServer
 *
 * @example
 * ```typescript
 * import { createTelnetServer, startTelnetServer, stopTelnetServer } from 'blecsd/terminal';
 *
 * const server = createTelnetServer({
 *   port: 2323,
 *   onSession: (session) => {
 *     writeToSession(session, 'Welcome to blECSd!\r\n');
 *     session.onData((data) => console.log('Input:', data));
 *   },
 * });
 *
 * startTelnetServer(server);
 * ```
 */

import { createServer, type Server, type Socket } from 'node:net';
import { PassThrough } from 'node:stream';
import { z } from 'zod';
import { createStreamSession, endSession, type StreamSession } from './customStream';

// =============================================================================
// TELNET PROTOCOL CONSTANTS
// =============================================================================

/** Telnet command bytes */
export const TELNET = {
	/** Interpret As Command */
	IAC: 255,
	/** End of subnegotiation */
	SE: 240,
	/** Subnegotiation begin */
	SB: 250,
	/** Will */
	WILL: 251,
	/** Won't */
	WONT: 252,
	/** Do */
	DO: 253,
	/** Don't */
	DONT: 254,
} as const;

/** Telnet option codes */
export const TELNET_OPT = {
	/** Echo */
	ECHO: 1,
	/** Suppress Go Ahead */
	SGA: 3,
	/** Terminal Type */
	TTYPE: 24,
	/** Negotiate About Window Size */
	NAWS: 31,
} as const;

/** TTYPE subnegotiation: IS = 0, SEND = 1 */
const TTYPE_IS = 0;
const TTYPE_SEND = 1;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Telnet server configuration.
 */
export interface TelnetServerConfig {
	/** TCP port to listen on */
	readonly port: number;
	/** Host to bind to (default: '0.0.0.0') */
	readonly host?: string;
	/** Maximum concurrent clients (default: 10) */
	readonly maxClients?: number;
	/** Called when a new client session is established */
	readonly onSession?: (session: StreamSession) => void;
	/** Called when a session ends */
	readonly onSessionEnd?: (sessionId: string, reason: string) => void;
}

/**
 * Telnet server state.
 */
export interface TelnetServerState {
	/** Server configuration */
	readonly config: TelnetServerConfig;
	/** Whether the server is listening */
	running: boolean;
	/** Active sessions */
	readonly sessions: Map<string, StreamSession>;
	/** Internal TCP server */
	_server: Server | null;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const TelnetServerConfigSchema = z.object({
	port: z.number().int().min(1).max(65535),
	host: z.string().optional(),
	maxClients: z.number().int().min(1).max(100).optional(),
});

// =============================================================================
// TELNET PARSER
// =============================================================================

/**
 * Parse state for telnet protocol data.
 */
interface TelnetParseState {
	/** Whether we're inside an IAC sequence */
	inIAC: boolean;
	/** Current IAC command byte */
	iacCommand: number;
	/** Whether we're in a subnegotiation */
	inSub: boolean;
	/** Current subnegotiation option */
	subOption: number;
	/** Subnegotiation data buffer */
	subData: number[];
}

/**
 * Process a raw buffer from a telnet client, extracting commands and clean data.
 */
function processTelnetData(
	buffer: Buffer,
	state: TelnetParseState,
	onNAWS: (width: number, height: number) => void,
	onTTYPE: (termType: string) => void,
): Buffer {
	const cleanData: number[] = [];

	for (let i = 0; i < buffer.length; i++) {
		const byte = buffer[i] as number;

		if (state.inSub) {
			if (byte === TELNET.IAC) {
				// Check next byte
				const next = buffer[i + 1];
				if (next === TELNET.SE) {
					// End of subnegotiation
					i++; // skip SE
					state.inSub = false;
					handleSubnegotiation(state.subOption, state.subData, onNAWS, onTTYPE);
					state.subData = [];
				} else if (next === TELNET.IAC) {
					// Escaped IAC in subnegotiation
					i++;
					state.subData.push(TELNET.IAC);
				}
			} else {
				state.subData.push(byte);
			}
			continue;
		}

		if (state.inIAC) {
			if (state.iacCommand === 0) {
				// First byte after IAC
				if (byte === TELNET.SB) {
					state.inSub = true;
					state.inIAC = false;
					state.iacCommand = 0;
					// Next byte is the option
					const optByte = buffer[i + 1];
					if (optByte !== undefined) {
						state.subOption = optByte;
						i++;
					}
				} else if (
					byte === TELNET.WILL ||
					byte === TELNET.WONT ||
					byte === TELNET.DO ||
					byte === TELNET.DONT
				) {
					state.iacCommand = byte;
				} else if (byte === TELNET.IAC) {
					// Escaped IAC → literal 0xFF
					cleanData.push(TELNET.IAC);
					state.inIAC = false;
				} else {
					// Unknown command, skip
					state.inIAC = false;
					state.iacCommand = 0;
				}
			} else {
				// Option byte for WILL/WONT/DO/DONT — just consume it
				state.inIAC = false;
				state.iacCommand = 0;
			}
			continue;
		}

		if (byte === TELNET.IAC) {
			state.inIAC = true;
			state.iacCommand = 0;
			continue;
		}

		cleanData.push(byte);
	}

	return Buffer.from(cleanData);
}

/**
 * Handle completed subnegotiation data.
 */
function handleSubnegotiation(
	option: number,
	data: number[],
	onNAWS: (width: number, height: number) => void,
	onTTYPE: (termType: string) => void,
): void {
	if (option === TELNET_OPT.NAWS && data.length >= 4) {
		const width = ((data[0] as number) << 8) | (data[1] as number);
		const height = ((data[2] as number) << 8) | (data[3] as number);
		if (width > 0 && height > 0 && width <= 500 && height <= 500) {
			onNAWS(width, height);
		}
	} else if (option === TELNET_OPT.TTYPE && data.length > 1 && data[0] === TTYPE_IS) {
		const termType = Buffer.from(data.slice(1)).toString('ascii').trim();
		if (termType.length > 0) {
			onTTYPE(termType);
		}
	}
}

/**
 * Build a telnet negotiation sequence to send to the client on connect.
 */
function buildNegotiationSequence(): Buffer {
	return Buffer.from([
		// Server WILL ECHO (suppress client local echo)
		TELNET.IAC,
		TELNET.WILL,
		TELNET_OPT.ECHO,
		// Server WILL SGA
		TELNET.IAC,
		TELNET.WILL,
		TELNET_OPT.SGA,
		// Request client DO NAWS
		TELNET.IAC,
		TELNET.DO,
		TELNET_OPT.NAWS,
		// Request client DO TTYPE
		TELNET.IAC,
		TELNET.DO,
		TELNET_OPT.TTYPE,
		// Then request TTYPE subnegotiation
		TELNET.IAC,
		TELNET.SB,
		TELNET_OPT.TTYPE,
		TTYPE_SEND,
		TELNET.IAC,
		TELNET.SE,
	]);
}

// =============================================================================
// SERVER FUNCTIONS
// =============================================================================

/**
 * Create a telnet server.
 *
 * @param config - Telnet server configuration
 * @returns Telnet server state
 */
export function createTelnetServer(config: TelnetServerConfig): TelnetServerState {
	TelnetServerConfigSchema.parse(config);
	return {
		config,
		running: false,
		sessions: new Map(),
		_server: null,
	};
}

/**
 * Start the telnet server, accepting connections.
 *
 * @param state - Telnet server state
 * @returns Promise that resolves when the server is listening
 */
export function startTelnetServer(state: TelnetServerState): Promise<void> {
	return new Promise((resolve, reject) => {
		const maxClients = state.config.maxClients ?? 10;

		const server = createServer((socket: Socket) => {
			if (state.sessions.size >= maxClients) {
				socket.end('Server full.\r\n');
				return;
			}

			handleTelnetConnection(state, socket);
		});

		server.on('error', reject);

		const host = state.config.host ?? '0.0.0.0';
		server.listen(state.config.port, host, () => {
			state.running = true;
			state._server = server;
			resolve();
		});
	});
}

/**
 * Handle a new telnet client connection.
 */
function handleTelnetConnection(state: TelnetServerState, socket: Socket): void {
	// Create PassThrough streams to decouple telnet protocol from application data
	const inputStream = new PassThrough();
	const outputStream = new PassThrough();

	const session = createStreamSession({
		input: inputStream,
		output: outputStream,
		width: 80,
		height: 24,
		termType: 'xterm',
	});

	state.sessions.set(session.id, session);

	// Telnet parse state per connection
	const parseState: TelnetParseState = {
		inIAC: false,
		iacCommand: 0,
		inSub: false,
		subOption: 0,
		subData: [],
	};

	// Send negotiation sequence
	socket.write(buildNegotiationSequence());

	// Forward output from session to socket
	outputStream.on('data', (chunk: Buffer) => {
		if (!socket.destroyed) {
			socket.write(chunk);
		}
	});

	// Process incoming data through telnet parser
	socket.on('data', (data: Buffer) => {
		const clean = processTelnetData(
			data,
			parseState,
			(width, height) => session.emitResize(width, height),
			(_termType) => {
				// termType is read-only on session, but we've captured it
			},
		);
		if (clean.length > 0) {
			inputStream.write(clean);
		}
	});

	socket.on('close', () => {
		state.sessions.delete(session.id);
		inputStream.end();
		endSession(session, 'socket closed');
		state.config.onSessionEnd?.(session.id, 'disconnected');
	});

	socket.on('error', () => {
		state.sessions.delete(session.id);
		inputStream.end();
		endSession(session, 'socket error');
		state.config.onSessionEnd?.(session.id, 'error');
	});

	// Notify application
	state.config.onSession?.(session);
}

/**
 * Stop the telnet server and disconnect all clients.
 *
 * @param state - Telnet server state
 * @returns Promise that resolves when the server has stopped
 */
export function stopTelnetServer(state: TelnetServerState): Promise<void> {
	return new Promise((resolve) => {
		state.running = false;

		// End all sessions
		for (const [id, session] of state.sessions) {
			endSession(session, 'server stopped');
			state.sessions.delete(id);
		}

		if (state._server) {
			state._server.close(() => {
				state._server = null;
				resolve();
			});
		} else {
			resolve();
		}
	});
}

/**
 * Get the number of active telnet sessions.
 */
export function getTelnetClientCount(state: TelnetServerState): number {
	return state.sessions.size;
}
