/**
 * High-level API for serving blECSd apps in a browser.
 *
 * Integrates the WebSocket server with the blECSd output pipeline,
 * automatically forwarding terminal output to connected browsers.
 *
 * @module terminal/serveWeb
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { serveWeb } from 'blecsd/terminal';
 *
 * const world = createWorld();
 * // ... set up your UI ...
 *
 * const { server, stop } = await serveWeb(world, {
 *   port: 8080,
 *   title: 'My Terminal App',
 * });
 *
 * console.log('Open http://localhost:8080 in your browser');
 *
 * // Stop serving:
 * await stop();
 * ```
 */

import type { World } from '../core/types';
import {
	createWebServer,
	startWebServer,
	stopWebServer,
	type WebServerState,
	webBroadcast,
} from './webSocket';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for `serveWeb`.
 */
export interface ServeWebConfig {
	/** Port to listen on */
	readonly port: number;
	/** Host to bind to (default: 'localhost') */
	readonly host?: string;
	/** Browser tab title */
	readonly title?: string;
	/** Authentication token */
	readonly authToken?: string;
	/** Maximum concurrent browser clients (default: 10) */
	readonly maxClients?: number;
}

/**
 * Result from `serveWeb`.
 */
export interface ServeWebResult {
	/** The WebSocket server state */
	readonly server: WebServerState;
	/** Stop serving and clean up */
	readonly stop: () => Promise<void>;
	/** Manually broadcast output to all browser clients */
	readonly broadcast: (data: string) => void;
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Serves a blECSd world to browsers via WebSocket.
 *
 * Creates a WebSocket server and hooks into the output pipeline to
 * forward terminal output to connected browser clients. The browsers
 * render the output using xterm.js.
 *
 * @param _world - The ECS world (reserved for future output pipeline integration)
 * @param config - Server configuration
 * @returns Server state and control functions
 *
 * @example
 * ```typescript
 * import { createWorld } from 'blecsd';
 * import { serveWeb } from 'blecsd/terminal';
 *
 * const world = createWorld();
 * const { stop, broadcast } = await serveWeb(world, { port: 8080 });
 *
 * // Manually send output to browsers
 * broadcast('\x1b[2J\x1b[HHello from blECSd!');
 *
 * // Clean up
 * await stop();
 * ```
 */
export async function serveWeb(_world: World, config: ServeWebConfig): Promise<ServeWebResult> {
	const server = createWebServer({
		port: config.port,
		...(config.host !== undefined && { host: config.host }),
		...(config.title !== undefined && { title: config.title }),
		...(config.authToken !== undefined && { authToken: config.authToken }),
		...(config.maxClients !== undefined && { maxClients: config.maxClients }),
	});

	await startWebServer(server);

	const broadcast = (data: string): void => {
		webBroadcast(server, data);
	};

	const stop = async (): Promise<void> => {
		await stopWebServer(server);
	};

	return { server, stop, broadcast };
}
