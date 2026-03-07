/**
 * blECSd CLI serve subcommand.
 *
 * Usage:
 *   npx blecsd serve ./app.ts --port 8080
 *   npx blecsd serve ./app.ts --port 8080 --auth secret-token
 *   npx blecsd serve ./app.ts --title "My App"
 *
 * Starts a WebSocket server that serves the app's terminal output to
 * browser clients via xterm.js.
 *
 * @module cli/serve
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Serve CLI configuration.
 */
export interface ServeConfig {
	/** Path to the app entry file */
	readonly appPath: string;
	/** HTTP port (default: 8080) */
	readonly port: number;
	/** Host to bind to (default: '0.0.0.0') */
	readonly host: string;
	/** Page title */
	readonly title: string;
	/** Optional auth token */
	readonly authToken?: string;
}

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

/** Map of flag names to their aliases. */
const FLAG_ALIASES: Record<string, string> = {
	'--port': 'port',
	'-p': 'port',
	'--host': 'host',
	'-h': 'host',
	'--title': 'title',
	'--auth': 'auth',
};

/**
 * Parse serve subcommand arguments.
 */
export function parseServeArgs(argv: readonly string[]): ServeConfig {
	const flags: Record<string, string> = {};
	let appPath = '';

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i] ?? '';
		const flagKey = FLAG_ALIASES[arg];
		if (flagKey) {
			const val = argv[i + 1];
			if (val) {
				flags[flagKey] = val;
				i++;
			}
		} else if (!arg.startsWith('-') && !appPath) {
			appPath = arg;
		}
	}

	if (!appPath) {
		console.error(
			'Usage: npx blecsd serve <app.ts> [--port 8080] [--auth token] [--title "My App"]',
		);
		process.exitCode = 1;
	}

	const result: ServeConfig = {
		appPath,
		port: flags.port ? Number.parseInt(flags.port, 10) : 8080,
		host: flags.host ?? '0.0.0.0',
		title: flags.title ?? 'blECSd',
	};
	return flags.auth !== undefined ? { ...result, authToken: flags.auth } : result;
}

// =============================================================================
// MAIN
// =============================================================================

/**
 * Main entry point for the serve subcommand.
 */
export async function serveMain(argv: readonly string[]): Promise<void> {
	const config = parseServeArgs(argv);
	if (!config.appPath) return;

	// Dynamic import of the web server
	const { serveWeb } = await import('../terminal/webServer');

	const handle = serveWeb({
		port: config.port,
		host: config.host,
		title: config.title,
		...(config.authToken !== undefined ? { authToken: config.authToken } : {}),
	});

	console.log(`\n  blECSd web server started`);
	console.log(`  ========================`);
	console.log(
		`  URL:   http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`,
	);
	console.log(`  Auth:  ${config.authToken ? 'enabled' : 'disabled'}`);
	console.log(`  Title: ${config.title}`);
	console.log(`\n  Press Ctrl+C to stop\n`);

	// Handle clean shutdown
	const shutdown = async () => {
		console.log('\n  Shutting down...');
		await handle.stop();
		process.exit(0);
	};

	process.on('SIGINT', () => {
		shutdown();
	});
	process.on('SIGTERM', () => {
		shutdown();
	});

	// Import and run the user's app
	// The app should use broadcastOutput or handle.broadcast to send output
	try {
		await import(config.appPath);
	} catch (err) {
		console.error(`\n  Failed to load app: ${config.appPath}`);
		console.error(`  ${err instanceof Error ? err.message : String(err)}\n`);
		await handle.stop();
		process.exitCode = 1;
	}
}
