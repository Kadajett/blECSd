#!/usr/bin/env node

/**
 * blECSd CLI serve command.
 *
 * Runs a blECSd app and serves it to browsers via WebSocket.
 *
 * Usage:
 *   npx blecsd serve ./app.ts --port 8080
 *   npx blecsd serve ./app.ts --port 8080 --host 0.0.0.0
 *   npx blecsd serve ./app.ts --port 8080 --auth-token secret
 *
 * @module cli/serve
 */

import { resolve } from 'node:path';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Serve CLI configuration.
 */
export interface ServeConfig {
	/** Path to the app file */
	readonly appPath: string;
	/** Port to serve on */
	readonly port: number;
	/** Host to bind to */
	readonly host: string;
	/** Page title */
	readonly title: string;
	/** Authentication token */
	readonly authToken?: string;
}

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

/** Known flags that take a value argument. */
const FLAG_OPTIONS: ReadonlyMap<string, string> = new Map([
	['--port', 'port'],
	['-p', 'port'],
	['--host', 'host'],
	['-h', 'host'],
	['--title', 'title'],
	['--auth-token', 'authToken'],
]);

/**
 * Parses serve CLI arguments.
 *
 * @param argv - CLI arguments (after 'serve' subcommand)
 * @returns Parsed configuration, or null if invalid
 */
export function parseServeArgs(argv: readonly string[]): ServeConfig | null {
	const opts: Record<string, string> = {};
	let appPath = '';

	const args = [...argv];
	for (let i = 0; i < args.length; i++) {
		const arg = args[i] ?? '';
		const key = FLAG_OPTIONS.get(arg);
		if (key) {
			const val = args[i + 1];
			if (val !== undefined) {
				opts[key] = val;
				i++;
			}
		} else if (!arg.startsWith('-')) {
			appPath = arg;
		}
	}

	if (!appPath) return null;

	const port = opts.port !== undefined ? Number.parseInt(opts.port, 10) : 8080;
	if (Number.isNaN(port) || port < 1 || port > 65535) return null;

	return {
		appPath: resolve(appPath),
		port,
		host: opts.host ?? 'localhost',
		title: opts.title ?? 'blECSd Terminal',
		...(opts.authToken !== undefined ? { authToken: opts.authToken } : {}),
	};
}

/**
 * Prints serve command usage.
 */
export function printServeUsage(): void {
	console.log(`
  blECSd serve - Serve a terminal app to the browser

  Usage:
    npx blecsd serve <app-file> [options]

  Options:
    --port, -p <port>      Port to serve on (default: 8080)
    --host, -h <host>      Host to bind to (default: localhost)
    --title <title>        Browser tab title (default: "blECSd Terminal")
    --auth-token <token>   Require auth token from clients

  Examples:
    npx blecsd serve ./app.ts --port 3000
    npx blecsd serve ./src/main.ts --host 0.0.0.0 --port 8080
    npx blecsd serve ./app.ts --auth-token mysecret
`);
}

/**
 * Main serve entry point.
 *
 * @param argv - CLI arguments after 'serve'
 */
export async function serveMain(argv: readonly string[]): Promise<void> {
	const config = parseServeArgs(argv);

	if (!config) {
		printServeUsage();
		process.exitCode = 1;
		return;
	}

	// Dynamic import of the WebSocket server
	const { createWebServer, startWebServer, stopWebServer } = await import('../terminal/webSocket');

	const server = createWebServer({
		port: config.port,
		host: config.host,
		title: config.title,
		...(config.authToken !== undefined ? { authToken: config.authToken } : {}),
	});

	try {
		await startWebServer(server);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`  Error: Could not start server: ${message}`);
		process.exitCode = 1;
		return;
	}

	console.log(`
  blECSd WebSocket server running

  Local:   http://${config.host}:${config.port}
  App:     ${config.appPath}
${config.authToken ? '  Auth:    required\n' : ''}
  Press Ctrl+C to stop
`);

	// Graceful shutdown
	const shutdown = async (): Promise<void> => {
		console.log('\n  Shutting down...');
		await stopWebServer(server);
		process.exit(0);
	};

	process.on('SIGINT', () => {
		void shutdown();
	});
	process.on('SIGTERM', () => {
		void shutdown();
	});

	// Import and run the app
	try {
		await import(config.appPath);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error(`  Error loading app: ${message}`);
		await stopWebServer(server);
		process.exitCode = 1;
	}
}
