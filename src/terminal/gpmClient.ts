/**
 * GPM (General Purpose Mouse) Protocol Client
 *
 * Provides mouse support on Linux console (TTY) environments where
 * X11/xterm mouse protocols are not available. GPM uses a Unix socket
 * for mouse event communication.
 *
 * @module terminal/gpmClient
 */

import { z } from 'zod';
import type { MouseAction, MouseButton, MouseEvent } from './mouseParser';

// =============================================================================
// TYPES
// =============================================================================

/**
 * GPM event types (from gpm.h).
 */
export const GpmEventType = {
	MOVE: 1,
	DRAG: 2,
	DOWN: 4,
	UP: 8,
	SINGLE: 16,
	DOUBLE: 32,
	TRIPLE: 64,
	MFLAG: 128,
	HARD: 256,
	ENTER: 512,
	LEAVE: 1024,
} as const;

/**
 * GPM button masks (from gpm.h).
 */
export const GpmButton = {
	NONE: 0,
	LEFT: 4,
	MIDDLE: 2,
	RIGHT: 1,
	FOURTH: 8,
	UP: 16,
	DOWN: 32,
} as const;

/**
 * GPM connection configuration.
 */
export interface GpmClientConfig {
	/** Path to GPM socket (default: /dev/gpmctl) */
	readonly socketPath: string;
	/** Event mask - which events to listen for (default: all) */
	readonly eventMask: number;
	/** Default event mask (events when not using GPM) */
	readonly defaultMask: number;
	/** Minimum modifier value (default: 0) */
	readonly minMod: number;
	/** Maximum modifier value (default: 0xffff) */
	readonly maxMod: number;
	/** Process ID override (default: process.pid) */
	readonly pid: number;
	/** Virtual console number (default: auto-detect from TTY) */
	readonly vc: number;
}

/**
 * Zod schema for GPM client configuration.
 */
export const GpmClientConfigSchema = z.object({
	socketPath: z.string().default('/dev/gpmctl'),
	eventMask: z.number().int().default(0xffff),
	defaultMask: z.number().int().default(0),
	minMod: z.number().int().default(0),
	maxMod: z.number().int().default(0xffff),
	pid: z.number().int().positive().default(0),
	vc: z.number().int().nonnegative().default(0),
});

/**
 * Raw GPM event structure (20 bytes).
 *
 * Matches the C struct Gpm_Event:
 * ```c
 * typedef struct Gpm_Event {
 *   unsigned char buttons, modifiers;
 *   unsigned short vc;
 *   short dx, dy, x, y;
 *   enum Gpm_Etype type;
 *   int clicks;
 *   enum Gpm_Margin margin;
 *   short wdx, wdy;
 * } Gpm_Event;
 * ```
 */
export interface GpmRawEvent {
	/** Button state */
	readonly buttons: number;
	/** Modifier keys */
	readonly modifiers: number;
	/** Virtual console number */
	readonly vc: number;
	/** Delta X */
	readonly dx: number;
	/** Delta Y */
	readonly dy: number;
	/** X coordinate */
	readonly x: number;
	/** Y coordinate */
	readonly y: number;
	/** Event type */
	readonly type: number;
	/** Click count */
	readonly clicks: number;
}

/**
 * GPM client state.
 */
export interface GpmClientState {
	/** Whether the client is connected */
	readonly connected: boolean;
	/** Whether GPM is available on this system */
	readonly available: boolean;
	/** Configuration */
	readonly config: GpmClientConfig;
}

/**
 * GPM client interface for receiving mouse events.
 */
export interface GpmClient {
	/** Current connection state */
	readonly state: GpmClientState;
	/** Register a mouse event handler */
	onMouse(handler: (event: MouseEvent) => void): () => void;
	/** Register a connection state handler */
	onConnectionChange(handler: (connected: boolean) => void): () => void;
	/** Attempt to connect to GPM */
	connect(): boolean;
	/** Disconnect from GPM */
	disconnect(): void;
	/** Check if GPM is available */
	isAvailable(): boolean;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG: GpmClientConfig = {
	socketPath: '/dev/gpmctl',
	eventMask: 0xffff,
	defaultMask: 0,
	minMod: 0,
	maxMod: 0xffff,
	pid: 0,
	vc: 0,
};

const GPM_EVENT_SIZE = 20;

// =============================================================================
// EVENT PARSING
// =============================================================================

/**
 * Parses a raw GPM event buffer (20 bytes) into a GpmRawEvent.
 *
 * @param buffer - 20-byte buffer containing GPM event data
 * @returns Parsed GPM raw event, or null if buffer is too small
 *
 * @example
 * ```typescript
 * import { parseGpmEventBuffer } from 'blecsd';
 *
 * const raw = parseGpmEventBuffer(buffer);
 * if (raw) {
 *   console.log(`Mouse at ${raw.x}, ${raw.y}`);
 * }
 * ```
 */
export function parseGpmEventBuffer(buffer: Uint8Array): GpmRawEvent | null {
	if (buffer.length < GPM_EVENT_SIZE) return null;

	const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

	return {
		buttons: buffer[0] ?? 0,
		modifiers: buffer[1] ?? 0,
		vc: view.getUint16(2, true),
		dx: view.getInt16(4, true),
		dy: view.getInt16(6, true),
		x: view.getInt16(8, true),
		y: view.getInt16(10, true),
		type: view.getInt16(12, true),
		clicks: view.getInt32(14, true),
	};
}

/**
 * Converts GPM button flags to a MouseButton identifier.
 *
 * @param buttons - GPM button bitmask
 * @returns The mouse button identifier
 */
export function gpmButtonToMouseButton(buttons: number): MouseButton {
	if (buttons & GpmButton.LEFT) return 'left';
	if (buttons & GpmButton.MIDDLE) return 'middle';
	if (buttons & GpmButton.RIGHT) return 'right';
	if (buttons & GpmButton.UP) return 'wheelUp';
	if (buttons & GpmButton.DOWN) return 'wheelDown';
	return 'unknown';
}

/**
 * Converts GPM event type to a MouseAction.
 *
 * @param type - GPM event type bitmask
 * @param buttons - GPM button bitmask
 * @returns The mouse action
 */
export function gpmTypeToMouseAction(type: number, buttons: number): MouseAction {
	if (buttons & (GpmButton.UP | GpmButton.DOWN)) return 'wheel';
	if (type & GpmEventType.DOWN) return 'press';
	if (type & GpmEventType.UP) return 'release';
	if (type & (GpmEventType.MOVE | GpmEventType.DRAG)) return 'move';
	return 'press';
}

/**
 * Extracts modifier state from GPM modifier byte.
 *
 * @param modifiers - GPM modifier bitmask
 * @returns Object with shift, meta, ctrl flags
 */
export function parseGpmModifiers(modifiers: number): {
	shift: boolean;
	meta: boolean;
	ctrl: boolean;
} {
	return {
		shift: !!(modifiers & 1),
		ctrl: !!(modifiers & 4),
		meta: !!(modifiers & 8),
	};
}

/**
 * Converts a GPM raw event to a standard MouseEvent.
 *
 * @param raw - The raw GPM event
 * @returns A standard MouseEvent object
 *
 * @example
 * ```typescript
 * import { parseGpmEventBuffer, gpmEventToMouseEvent } from 'blecsd';
 *
 * const raw = parseGpmEventBuffer(buffer);
 * if (raw) {
 *   const event = gpmEventToMouseEvent(raw);
 *   console.log(`${event.action} at ${event.x}, ${event.y}`);
 * }
 * ```
 */
export function gpmEventToMouseEvent(raw: GpmRawEvent): MouseEvent {
	const button = gpmButtonToMouseButton(raw.buttons);
	const action = gpmTypeToMouseAction(raw.type, raw.buttons);
	const modifiers = parseGpmModifiers(raw.modifiers);

	// GPM coordinates are 1-indexed, convert to 0-indexed
	const x = Math.max(0, raw.x - 1);
	const y = Math.max(0, raw.y - 1);

	return {
		x,
		y,
		button,
		action,
		ctrl: modifiers.ctrl,
		meta: modifiers.meta,
		shift: modifiers.shift,
		protocol: 'x10', // GPM maps to x10-compatible events
		raw: new Uint8Array(0),
	};
}

/**
 * Builds the GPM connection request packet.
 *
 * The connection request is a 16-byte packet:
 * - eventMask (2 bytes, LE)
 * - defaultMask (2 bytes, LE)
 * - minMod (2 bytes, LE)
 * - maxMod (2 bytes, LE)
 * - pid (4 bytes, LE)
 * - vc (4 bytes, LE)
 *
 * @param config - GPM client configuration
 * @returns The connection request buffer
 */
export function buildGpmConnectPacket(config: GpmClientConfig): Uint8Array {
	const buffer = new ArrayBuffer(16);
	const view = new DataView(buffer);

	view.setUint16(0, config.eventMask, true);
	view.setUint16(2, config.defaultMask, true);
	view.setUint16(4, config.minMod, true);
	view.setUint16(6, config.maxMod, true);
	view.setInt32(8, config.pid || process.pid, true);
	view.setInt32(12, config.vc, true);

	return new Uint8Array(buffer);
}

/**
 * Detects the virtual console number from the current TTY.
 *
 * @returns The VC number, or 0 if not on a Linux console
 */
export function detectVirtualConsole(): number {
	const ttyName = process.env.GPM_TTY ?? '';
	const match = /tty(\d+)/.exec(ttyName);
	if (match?.[1]) {
		return Number.parseInt(match[1], 10);
	}
	return 0;
}

/**
 * Checks if GPM is likely available on this system.
 * GPM is a Linux-only feature for virtual console mouse support.
 *
 * @returns True if GPM might be available
 *
 * @example
 * ```typescript
 * import { isGpmAvailable } from 'blecsd';
 *
 * if (isGpmAvailable()) {
 *   const client = createGpmClient();
 *   client.connect();
 * }
 * ```
 */
export function isGpmAvailable(): boolean {
	// GPM is Linux-only
	if (process.platform !== 'linux') return false;

	// Check if we're on a virtual console (not a pty)
	const term = process.env.TERM ?? '';
	if (term === 'linux' || term === 'console') return true;

	return false;
}

// =============================================================================
// CLIENT FACTORY
// =============================================================================

/**
 * Creates a GPM mouse client for Linux console mouse support.
 *
 * GPM (General Purpose Mouse) provides mouse support on Linux virtual
 * consoles where xterm mouse protocols are not available.
 *
 * @param config - Optional configuration
 * @returns GPM client instance
 *
 * @example
 * ```typescript
 * import { createGpmClient, isGpmAvailable } from 'blecsd';
 *
 * if (isGpmAvailable()) {
 *   const client = createGpmClient();
 *
 *   client.onMouse((event) => {
 *     console.log(`${event.action} ${event.button} at ${event.x},${event.y}`);
 *   });
 *
 *   if (client.connect()) {
 *     console.log('GPM connected');
 *   }
 *
 *   // Clean up
 *   client.disconnect();
 * }
 * ```
 */
export function createGpmClient(config?: Partial<GpmClientConfig>): GpmClient {
	const cfg: GpmClientConfig = { ...DEFAULT_CONFIG, ...config };

	let connected = false;
	let socket: ReturnType<typeof import('node:net').createConnection> | null = null;
	const mouseHandlers = new Set<(event: MouseEvent) => void>();
	const connectionHandlers = new Set<(connected: boolean) => void>();

	function emitMouse(event: MouseEvent): void {
		for (const handler of mouseHandlers) {
			try {
				handler(event);
			} catch {
				// Ignore handler errors
			}
		}
	}

	function emitConnectionChange(state: boolean): void {
		for (const handler of connectionHandlers) {
			try {
				handler(state);
			} catch {
				// Ignore handler errors
			}
		}
	}

	function handleData(data: Buffer): void {
		// Process all complete events in the buffer
		let offset = 0;
		while (offset + GPM_EVENT_SIZE <= data.length) {
			const eventBuf = new Uint8Array(data.buffer, data.byteOffset + offset, GPM_EVENT_SIZE);
			const raw = parseGpmEventBuffer(eventBuf);
			if (raw) {
				const mouseEvent = gpmEventToMouseEvent(raw);
				emitMouse(mouseEvent);
			}
			offset += GPM_EVENT_SIZE;
		}
	}

	const client: GpmClient = {
		get state(): GpmClientState {
			return {
				connected,
				available: isGpmAvailable(),
				config: cfg,
			};
		},

		onMouse(handler: (event: MouseEvent) => void): () => void {
			mouseHandlers.add(handler);
			return () => {
				mouseHandlers.delete(handler);
			};
		},

		onConnectionChange(handler: (connected: boolean) => void): () => void {
			connectionHandlers.add(handler);
			return () => {
				connectionHandlers.delete(handler);
			};
		},

		connect(): boolean {
			if (connected) return true;
			if (!isGpmAvailable()) return false;

			try {
				// Dynamic import to avoid issues on non-Linux
				// biome-ignore lint/suspicious/noExplicitAny: Dynamic require for optional dependency
				const net = require('node:net') as any;
				socket = net.createConnection(cfg.socketPath);
				// biome-ignore lint/style/noNonNullAssertion: socket was just assigned above
				const sock = socket!;

				sock.on('connect', () => {
					connected = true;
					// Send connection request
					const packet = buildGpmConnectPacket(cfg);
					sock.write(packet);
					emitConnectionChange(true);
				});

				sock.on('data', (data: Buffer) => {
					handleData(data);
				});

				sock.on('error', () => {
					connected = false;
					socket = null;
					emitConnectionChange(false);
				});

				sock.on('close', () => {
					connected = false;
					socket = null;
					emitConnectionChange(false);
				});

				return true;
			} catch {
				return false;
			}
		},

		disconnect(): void {
			if (socket) {
				socket.destroy();
				socket = null;
			}
			connected = false;
			emitConnectionChange(false);
		},

		isAvailable(): boolean {
			return isGpmAvailable();
		},
	};

	return client;
}
