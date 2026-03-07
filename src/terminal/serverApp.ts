/**
 * Unified Server App Factory for blECSd
 *
 * Provides a single `createServerApp` entry point that supports
 * TCP, Telnet, and SSH server modes. Each client gets its own
 * StreamSession for integration with blECSd terminal UI.
 *
 * @module terminal/serverApp
 *
 * @example
 * ```typescript
 * import { createServerApp } from 'blecsd/terminal';
 *
 * // Telnet server
 * const app = createServerApp({
 *   mode: 'telnet',
 *   port: 2323,
 *   onSession: (session) => {
 *     writeToSession(session, 'Welcome!\r\n');
 *   },
 * });
 *
 * await app.start();
 * console.log(`Listening on port ${app.port}`);
 *
 * // Later:
 * await app.stop();
 * ```
 */

import { createServer, type Server, type Socket } from 'node:net';
import { PassThrough } from 'node:stream';
import { createStreamSession, endSession, type StreamSession } from './customStream';
import { createSSHServer, type SSHServerConfig, startSSHServer, stopSSHServer } from './sshServer';
import {
	createTelnetServer,
	startTelnetServer,
	stopTelnetServer,
	type TelnetServerConfig,
} from './telnetServer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Server mode.
 */
export type ServerMode = 'tcp' | 'telnet' | 'ssh';

/**
 * Base server app configuration.
 */
interface ServerAppConfigBase {
	/** Server mode */
	readonly mode: ServerMode;
	/** TCP port to listen on */
	readonly port: number;
	/** Host to bind to (default: '0.0.0.0') */
	readonly host?: string;
	/** Maximum concurrent clients (default: 10) */
	readonly maxClients?: number;
	/** Called when a new client session is established */
	readonly onSession?: (session: StreamSession, info?: string) => void;
	/** Called when a session ends */
	readonly onSessionEnd?: (sessionId: string, reason: string) => void;
}

/**
 * TCP-specific configuration.
 */
export interface TCPServerAppConfig extends ServerAppConfigBase {
	readonly mode: 'tcp';
}

/**
 * Telnet-specific configuration.
 */
export interface TelnetServerAppConfig extends ServerAppConfigBase {
	readonly mode: 'telnet';
}

/**
 * SSH-specific configuration.
 */
export interface SSHServerAppConfig extends ServerAppConfigBase {
	readonly mode: 'ssh';
	/** Host private key (PEM format) */
	readonly hostKey: Buffer | string;
	/** Authorized public keys */
	readonly authorizedKeys?: SSHServerConfig['authorizedKeys'];
	/** Allow password authentication */
	readonly allowPassword?: boolean;
	/** Password validation function */
	readonly validatePassword?: (username: string, password: string) => boolean;
	/** Server identification string */
	readonly serverIdent?: string;
}

/**
 * Union of all server app configurations.
 */
export type ServerAppConfig = TCPServerAppConfig | TelnetServerAppConfig | SSHServerAppConfig;

/**
 * Running server app instance.
 */
export interface ServerApp {
	/** Server mode */
	readonly mode: ServerMode;
	/** Port the server is listening on */
	readonly port: number;
	/** Whether the server is running */
	readonly running: boolean;
	/** Number of active client sessions */
	readonly clientCount: number;
	/** Active sessions */
	readonly sessions: ReadonlyMap<string, StreamSession>;
	/** Start the server */
	start(): Promise<void>;
	/** Stop the server and disconnect all clients */
	stop(): Promise<void>;
}

// =============================================================================
// TCP MODE
// =============================================================================

function createTCPApp(config: TCPServerAppConfig): ServerApp {
	const sessions = new Map<string, StreamSession>();
	let server: Server | null = null;
	let running = false;

	const app: ServerApp = {
		get mode() {
			return 'tcp' as const;
		},
		get port() {
			return config.port;
		},
		get running() {
			return running;
		},
		get clientCount() {
			return sessions.size;
		},
		get sessions() {
			return sessions;
		},

		start(): Promise<void> {
			return new Promise((resolve, reject) => {
				const maxClients = config.maxClients ?? 10;

				server = createServer((socket: Socket) => {
					if (sessions.size >= maxClients) {
						socket.end('Server full.\r\n');
						return;
					}

					const inputStream = new PassThrough();
					const outputStream = new PassThrough();

					const session = createStreamSession({
						input: inputStream,
						output: outputStream,
						width: 80,
						height: 24,
					});

					sessions.set(session.id, session);

					outputStream.on('data', (chunk: Buffer) => {
						if (!socket.destroyed) socket.write(chunk);
					});

					socket.on('data', (data: Buffer) => {
						inputStream.write(data);
					});

					socket.on('close', () => {
						sessions.delete(session.id);
						inputStream.end();
						endSession(session, 'socket closed');
						config.onSessionEnd?.(session.id, 'disconnected');
					});

					socket.on('error', () => {
						sessions.delete(session.id);
						inputStream.end();
						endSession(session, 'socket error');
						config.onSessionEnd?.(session.id, 'error');
					});

					config.onSession?.(session);
				});

				server.on('error', reject);
				const host = config.host ?? '0.0.0.0';
				server.listen(config.port, host, () => {
					running = true;
					resolve();
				});
			});
		},

		stop(): Promise<void> {
			return new Promise((resolve) => {
				running = false;
				for (const [id, session] of sessions) {
					endSession(session, 'server stopped');
					sessions.delete(id);
				}
				if (server) {
					server.close(() => {
						server = null;
						resolve();
					});
				} else {
					resolve();
				}
			});
		},
	};

	return app;
}

// =============================================================================
// TELNET MODE
// =============================================================================

function createTelnetApp(config: TelnetServerAppConfig): ServerApp {
	const telnetCfg: TelnetServerConfig = { port: config.port };
	if (config.host !== undefined) Object.assign(telnetCfg, { host: config.host });
	if (config.maxClients !== undefined) Object.assign(telnetCfg, { maxClients: config.maxClients });
	if (config.onSession)
		Object.assign(telnetCfg, {
			onSession: (session: StreamSession) => config.onSession?.(session),
		});
	if (config.onSessionEnd) Object.assign(telnetCfg, { onSessionEnd: config.onSessionEnd });
	const telnetState = createTelnetServer(telnetCfg);

	const app: ServerApp = {
		get mode() {
			return 'telnet' as const;
		},
		get port() {
			return config.port;
		},
		get running() {
			return telnetState.running;
		},
		get clientCount() {
			return telnetState.sessions.size;
		},
		get sessions() {
			return telnetState.sessions;
		},

		async start() {
			await startTelnetServer(telnetState);
		},

		async stop() {
			await stopTelnetServer(telnetState);
		},
	};

	return app;
}

// =============================================================================
// SSH MODE
// =============================================================================

function createSSHApp(config: SSHServerAppConfig): ServerApp {
	const sshCfg: SSHServerConfig = { port: config.port, hostKey: config.hostKey };
	if (config.host !== undefined) Object.assign(sshCfg, { host: config.host });
	if (config.authorizedKeys !== undefined)
		Object.assign(sshCfg, { authorizedKeys: config.authorizedKeys });
	if (config.allowPassword !== undefined)
		Object.assign(sshCfg, { allowPassword: config.allowPassword });
	if (config.validatePassword) Object.assign(sshCfg, { validatePassword: config.validatePassword });
	if (config.maxClients !== undefined) Object.assign(sshCfg, { maxClients: config.maxClients });
	if (config.onSession)
		Object.assign(sshCfg, {
			onSession: (session: StreamSession, username: string) =>
				config.onSession?.(session, username),
		});
	if (config.onSessionEnd) Object.assign(sshCfg, { onSessionEnd: config.onSessionEnd });
	if (config.serverIdent !== undefined) Object.assign(sshCfg, { serverIdent: config.serverIdent });
	const sshState = createSSHServer(sshCfg);

	const app: ServerApp = {
		get mode() {
			return 'ssh' as const;
		},
		get port() {
			return config.port;
		},
		get running() {
			return sshState.running;
		},
		get clientCount() {
			return sshState.sessions.size;
		},
		get sessions() {
			return sshState.sessions;
		},

		async start() {
			await startSSHServer(sshState);
		},

		async stop() {
			await stopSSHServer(sshState);
		},
	};

	return app;
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a server app for the specified mode.
 *
 * @param config - Server app configuration with mode, port, and mode-specific options
 * @returns A ServerApp instance with start/stop methods
 *
 * @example
 * ```typescript
 * // TCP mode
 * const tcp = createServerApp({ mode: 'tcp', port: 3000, onSession: (s) => {} });
 *
 * // Telnet mode (with NAWS + TTYPE negotiation)
 * const telnet = createServerApp({ mode: 'telnet', port: 2323, onSession: (s) => {} });
 *
 * // SSH mode (with key auth)
 * const ssh = createServerApp({
 *   mode: 'ssh',
 *   port: 2222,
 *   hostKey: readFileSync('host_key'),
 *   onSession: (s, username) => {},
 * });
 *
 * await tcp.start();
 * ```
 */
export function createServerApp(config: ServerAppConfig): ServerApp {
	switch (config.mode) {
		case 'tcp':
			return createTCPApp(config);
		case 'telnet':
			return createTelnetApp(config);
		case 'ssh':
			return createSSHApp(config);
		default: {
			const _exhaustive: never = config;
			throw new Error(`Unknown server mode: ${(_exhaustive as ServerAppConfigBase).mode}`);
		}
	}
}
