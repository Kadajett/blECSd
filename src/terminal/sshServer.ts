/**
 * SSH Server for blECSd
 *
 * Provides an SSH server mode using the `ssh2` package. Each connecting
 * client receives its own StreamSession with proper PTY dimensions
 * and key-based authentication.
 *
 * @module terminal/sshServer
 *
 * @example
 * ```typescript
 * import { createSSHServer, startSSHServer, stopSSHServer } from 'blecsd/terminal';
 * import { readFileSync } from 'node:fs';
 *
 * const server = createSSHServer({
 *   port: 2222,
 *   hostKey: readFileSync('/path/to/host_key'),
 *   onSession: (session) => {
 *     writeToSession(session, 'Welcome via SSH!\r\n');
 *   },
 * });
 *
 * startSSHServer(server);
 * ```
 */

import { PassThrough } from 'node:stream';
import { z } from 'zod';
import { createStreamSession, endSession, type StreamSession } from './customStream';

// =============================================================================
// SSH2 INTERFACE SHIMS (avoids `any` for the dynamic import)
// =============================================================================

/** Minimal ssh2 authentication context. */
interface SSH2AuthContext {
	method: string;
	username: string;
	password?: string;
	key?: { data: Buffer | string };
	accept(): void;
	reject(methods?: string[]): void;
}

/** Minimal ssh2 PTY/window-change info. */
interface SSH2PtyInfo {
	cols?: number;
	rows?: number;
	term?: string;
}

/** Minimal ssh2 channel (duplex stream). */
interface SSH2Channel {
	writable: boolean;
	on(event: string, cb: (...args: unknown[]) => void): void;
	write(data: Buffer | string): void;
}

/** Minimal ssh2 session object. */
interface SSH2Session {
	on(event: string, cb: (...args: unknown[]) => void): void;
}

/** Minimal ssh2 client connection. */
interface SSH2Client {
	on(event: string, cb: (...args: unknown[]) => void): void;
	end(): void;
}

/** Minimal ssh2 server. */
interface SSH2ServerInstance {
	on(event: string, cb: (...args: unknown[]) => void): void;
	listen(port: number, host: string, cb: () => void): void;
	close(cb: () => void): void;
}

// =============================================================================
// TYPES
// =============================================================================

/**
 * Authorized key entry for SSH authentication.
 */
export interface SSHAuthorizedKey {
	/** The public key data (OpenSSH format or raw Buffer) */
	readonly key: Buffer | string;
	/** Optional comment/username associated with the key */
	readonly comment?: string;
}

/**
 * SSH server configuration.
 */
export interface SSHServerConfig {
	/** TCP port to listen on */
	readonly port: number;
	/** Host to bind to (default: '0.0.0.0') */
	readonly host?: string;
	/** Host private key (PEM format) */
	readonly hostKey: Buffer | string;
	/** Authorized public keys for authentication */
	readonly authorizedKeys?: readonly SSHAuthorizedKey[];
	/** Allow password authentication (default: false) */
	readonly allowPassword?: boolean;
	/** Password validation function (required if allowPassword is true) */
	readonly validatePassword?: (username: string, password: string) => boolean;
	/** Maximum concurrent clients (default: 10) */
	readonly maxClients?: number;
	/** Called when a new client session is established */
	readonly onSession?: (session: StreamSession, username: string) => void;
	/** Called when a session ends */
	readonly onSessionEnd?: (sessionId: string, reason: string) => void;
	/** Server identification string (default: 'blECSd_SSH') */
	readonly serverIdent?: string;
}

/**
 * SSH server state.
 */
export interface SSHServerState {
	/** Server configuration */
	readonly config: SSHServerConfig;
	/** Whether the server is listening */
	running: boolean;
	/** Active sessions */
	readonly sessions: Map<string, StreamSession>;
	/** Internal server reference */
	_server: SSH2ServerInstance | null;
}

// =============================================================================
// SCHEMA
// =============================================================================

export const SSHServerConfigSchema = z.object({
	port: z.number().int().min(1).max(65535),
	host: z.string().optional(),
	maxClients: z.number().int().min(1).max(100).optional(),
	allowPassword: z.boolean().optional(),
	serverIdent: z.string().optional(),
});

// =============================================================================
// SERVER FUNCTIONS
// =============================================================================

/**
 * Create an SSH server.
 *
 * The `ssh2` package is required as a peer dependency. If not installed,
 * `startSSHServer` will throw an error with installation instructions.
 *
 * @param config - SSH server configuration
 * @returns SSH server state
 */
export function createSSHServer(config: SSHServerConfig): SSHServerState {
	SSHServerConfigSchema.parse(config);
	return {
		config,
		running: false,
		sessions: new Map(),
		_server: null,
	};
}

/**
 * Dynamically import ssh2. Returns the module or null if unavailable.
 */
async function loadSSH2(): Promise<{
	Server: new (...args: unknown[]) => SSH2ServerInstance;
} | null> {
	try {
		// @ts-expect-error ssh2 is an optional peer dependency
		return (await import('ssh2')) as {
			Server: new (...args: unknown[]) => SSH2ServerInstance;
		};
	} catch {
		return null;
	}
}

/**
 * Start the SSH server.
 *
 * @param state - SSH server state
 * @returns Promise that resolves when the server is listening
 * @throws Error if `ssh2` package is not installed
 */
export async function startSSHServer(state: SSHServerState): Promise<void> {
	const ssh2 = await loadSSH2();
	if (!ssh2) {
		throw new Error('SSH server requires the "ssh2" package. Install it with: npm install ssh2');
	}

	const { Server: SSH2Server } = ssh2;
	const maxClients = state.config.maxClients ?? 10;

	return new Promise((resolve, reject) => {
		const server = new SSH2Server(
			{
				hostKeys: [
					typeof state.config.hostKey === 'string' ? state.config.hostKey : state.config.hostKey,
				],
				ident: state.config.serverIdent ?? 'blECSd_SSH',
			},
			(client: unknown) => {
				const sshClient = client as SSH2Client;
				if (state.sessions.size >= maxClients) {
					sshClient.end();
					return;
				}
				handleSSHClient(state, sshClient);
			},
		);

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
 * Handle a new SSH client connection.
 */
function handleSSHClient(state: SSHServerState, client: SSH2Client): void {
	let authenticatedUser = '';

	client.on('authentication', (rawCtx: unknown) => {
		const ctx = rawCtx as SSH2AuthContext;
		if (ctx.method === 'publickey' && state.config.authorizedKeys) {
			const matchedKey = state.config.authorizedKeys.find((ak) => {
				const akBuf = typeof ak.key === 'string' ? Buffer.from(ak.key, 'utf-8') : ak.key;
				return (
					ctx.key &&
					akBuf.equals(typeof ctx.key.data === 'string' ? Buffer.from(ctx.key.data) : ctx.key.data)
				);
			});
			if (matchedKey) {
				authenticatedUser = ctx.username;
				ctx.accept();
				return;
			}
		}

		if (ctx.method === 'password' && state.config.allowPassword && state.config.validatePassword) {
			if (state.config.validatePassword(ctx.username, ctx.password ?? '')) {
				authenticatedUser = ctx.username;
				ctx.accept();
				return;
			}
		}

		if (
			ctx.method === 'none' &&
			!state.config.authorizedKeys?.length &&
			!state.config.allowPassword
		) {
			authenticatedUser = ctx.username;
			ctx.accept();
			return;
		}

		ctx.reject(['publickey', 'password']);
	});

	client.on('ready', () => {
		client.on('session', (rawAccept: unknown) => {
			const accept = rawAccept as () => SSH2Session;
			const sshSession = accept();

			let ptyWidth = 80;
			let ptyHeight = 24;
			let ptyTerm = 'xterm';
			let streamSession: StreamSession | null = null;

			sshSession.on('pty', (rawPtyAccept: unknown, _reject: unknown, rawInfo: unknown) => {
				const info = rawInfo as SSH2PtyInfo;
				const ptyAccept = rawPtyAccept as (() => void) | undefined;
				ptyWidth = info.cols ?? 80;
				ptyHeight = info.rows ?? 24;
				ptyTerm = info.term ?? 'xterm';
				ptyAccept?.();
			});

			sshSession.on('window-change', (_accept: unknown, _reject: unknown, rawInfo: unknown) => {
				const info = rawInfo as SSH2PtyInfo;
				if (streamSession) {
					streamSession.emitResize(info.cols ?? 80, info.rows ?? 24);
				}
			});

			sshSession.on('shell', (rawShellAccept: unknown) => {
				const shellAccept = rawShellAccept as () => SSH2Channel;
				const channel = shellAccept();

				const inputStream = new PassThrough();
				const outputStream = new PassThrough();

				streamSession = createStreamSession({
					input: inputStream,
					output: outputStream,
					width: ptyWidth,
					height: ptyHeight,
					termType: ptyTerm,
				});

				state.sessions.set(streamSession.id, streamSession);

				channel.on('data', (rawData: unknown) => {
					inputStream.write(rawData as Buffer);
				});

				outputStream.on('data', (chunk: Buffer) => {
					if (channel.writable) {
						channel.write(chunk);
					}
				});

				channel.on('close', () => {
					if (streamSession) {
						state.sessions.delete(streamSession.id);
						inputStream.end();
						endSession(streamSession, 'channel closed');
						state.config.onSessionEnd?.(streamSession.id, 'disconnected');
					}
				});

				state.config.onSession?.(streamSession, authenticatedUser);
			});
		});
	});

	client.on('error', () => {
		// Client error, handled by ssh2
	});

	client.on('end', () => {
		// Connection ended
	});
}

/**
 * Stop the SSH server and disconnect all clients.
 *
 * @param state - SSH server state
 * @returns Promise that resolves when the server has stopped
 */
export function stopSSHServer(state: SSHServerState): Promise<void> {
	return new Promise((resolve) => {
		state.running = false;

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
 * Get the number of active SSH sessions.
 */
export function getSSHClientCount(state: SSHServerState): number {
	return state.sessions.size;
}
