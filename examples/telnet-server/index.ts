#!/usr/bin/env node
/**
 * Telnet Server Example
 *
 * Demonstrates serving blECSd UIs to remote telnet clients.
 * Each client gets their own isolated UI session.
 *
 * Features:
 * - Multi-client support with isolated sessions
 * - Telnet protocol negotiation (NAWS for window size)
 * - Terminal type detection
 * - 256-color support when available
 * - Clean disconnect handling
 *
 * Usage:
 *   pnpm dev                    # Start server on default port 2300
 *   TELNET_PORT=3000 pnpm dev   # Start on custom port
 *
 * Connecting:
 *   telnet localhost 2300
 *
 * Security Note:
 *   Telnet is unencrypted. Use only on trusted networks.
 */

import * as net from 'node:net';
import { PassThrough } from 'node:stream';
import { createWorld, type World } from 'blecsd';
import { createProgram, type Program, type ProgramConfig } from 'blecsd/terminal';
import { createInputHandler, type InputHandler } from 'blecsd/terminal';

// =============================================================================
// TELNET PROTOCOL CONSTANTS
// =============================================================================

// Telnet commands
const IAC = 255; // Interpret As Command
const DONT = 254;
const DO = 253;
const WONT = 252;
const WILL = 251;
const SB = 250; // Subnegotiation Begin
const SE = 240; // Subnegotiation End

// Telnet options
const ECHO = 1; // Echo
const SGA = 3; // Suppress Go Ahead
const TTYPE = 24; // Terminal Type
const NAWS = 31; // Negotiate About Window Size
const LINEMODE = 34; // Linemode

// Terminal type subnegotiation
const TTYPE_IS = 0;
const TTYPE_SEND = 1;

// =============================================================================
// TYPES
// =============================================================================

interface ClientSession {
	id: number;
	socket: net.Socket;
	world: World;
	program: Program;
	inputHandler: InputHandler;
	width: number;
	height: number;
	terminalType: string;
	connectedAt: Date;
	negotiationTimeout: ReturnType<typeof setTimeout> | null;
}

interface TelnetStream {
	input: PassThrough;
	output: PassThrough;
	width: number;
	height: number;
	terminalType: string;
	onResize: (callback: (width: number, height: number) => void) => void;
	destroy: () => void;
}

// =============================================================================
// TELNET STREAM WRAPPER
// =============================================================================

/**
 * Creates streams that handle telnet protocol negotiation.
 * Strips telnet commands from input and provides clean data to the application.
 */
function createTelnetStream(socket: net.Socket): TelnetStream {
	const input = new PassThrough();
	const output = new PassThrough();

	let width = 80;
	let height = 24;
	let terminalType = 'xterm-256color';
	let inSubnegotiation = false;
	let subnegBuffer: number[] = [];
	const resizeCallbacks: Array<(width: number, height: number) => void> = [];

	// Parse incoming telnet data
	let pendingIAC = false;
	let pendingCommand = 0;

	function handleData(data: Buffer): void {
		const cleanData: number[] = [];

		for (let i = 0; i < data.length; i++) {
			const byte = data[i] ?? 0;

			if (inSubnegotiation) {
				if (byte === IAC && i + 1 < data.length && data[i + 1] === SE) {
					// End of subnegotiation
					handleSubnegotiation(subnegBuffer);
					subnegBuffer = [];
					inSubnegotiation = false;
					i++; // Skip SE
				} else if (byte !== IAC) {
					subnegBuffer.push(byte);
				}
				continue;
			}

			if (pendingIAC) {
				pendingIAC = false;

				if (byte === IAC) {
					// Escaped IAC
					cleanData.push(IAC);
				} else if (byte === SB) {
					// Start subnegotiation
					inSubnegotiation = true;
					subnegBuffer = [];
				} else if (byte === WILL || byte === WONT || byte === DO || byte === DONT) {
					pendingCommand = byte;
				} else {
					// Other telnet command, ignore
				}
				continue;
			}

			if (pendingCommand !== 0) {
				handleTelnetOption(pendingCommand, byte);
				pendingCommand = 0;
				continue;
			}

			if (byte === IAC) {
				pendingIAC = true;
				continue;
			}

			// Clean data byte
			cleanData.push(byte);
		}

		if (cleanData.length > 0) {
			input.push(Buffer.from(cleanData));
		}
	}

	// Handle telnet option negotiation
	function handleTelnetOption(command: number, option: number): void {
		switch (option) {
			case NAWS:
				if (command === WILL) {
					// Client will send window size
				}
				break;
			case TTYPE:
				if (command === WILL) {
					// Request terminal type
					socket.write(Buffer.from([IAC, SB, TTYPE, TTYPE_SEND, IAC, SE]));
				}
				break;
			case SGA:
			case ECHO:
				// Accept these options
				break;
		}
	}

	// Handle subnegotiation data
	function handleSubnegotiation(data: number[]): void {
		if (data.length === 0) return;

		const option = data[0];

		if (option === NAWS && data.length >= 5) {
			// Window size: 2 bytes for width, 2 bytes for height
			const newWidth = ((data[1] ?? 0) << 8) | (data[2] ?? 0);
			const newHeight = ((data[3] ?? 0) << 8) | (data[4] ?? 0);

			if (newWidth > 0 && newHeight > 0 && newWidth < 1000 && newHeight < 1000) {
				width = newWidth;
				height = newHeight;
				for (const callback of resizeCallbacks) {
					callback(width, height);
				}
			}
		} else if (option === TTYPE && data.length >= 2 && data[1] === TTYPE_IS) {
			// Terminal type
			const typeBytes = data.slice(2);
			terminalType = String.fromCharCode(...typeBytes) || 'xterm-256color';
		}
	}

	// Send telnet negotiation requests
	function negotiate(): void {
		// Tell client we will echo
		socket.write(Buffer.from([IAC, WILL, ECHO]));
		// Tell client we will suppress go-ahead
		socket.write(Buffer.from([IAC, WILL, SGA]));
		// Request client to suppress go-ahead
		socket.write(Buffer.from([IAC, DO, SGA]));
		// Request window size negotiation
		socket.write(Buffer.from([IAC, DO, NAWS]));
		// Request terminal type
		socket.write(Buffer.from([IAC, DO, TTYPE]));
		// Disable linemode
		socket.write(Buffer.from([IAC, DONT, LINEMODE]));
	}

	// Forward output to socket
	output.on('data', (chunk: Buffer) => {
		if (!socket.destroyed) {
			socket.write(chunk);
		}
	});

	// Handle socket data
	const dataHandler = (data: Buffer) => handleData(data);
	socket.on('data', dataHandler);

	socket.on('close', () => {
		input.push(null);
		output.end();
	});

	socket.on('error', () => {
		input.push(null);
		output.end();
	});

	// Start negotiation
	negotiate();

	return {
		input,
		output,
		get width() {
			return width;
		},
		get height() {
			return height;
		},
		get terminalType() {
			return terminalType;
		},
		onResize: (callback: (width: number, height: number) => void) => {
			resizeCallbacks.push(callback);
		},
		destroy: () => {
			socket.off('data', dataHandler);
			resizeCallbacks.length = 0;
			input.destroy();
			output.destroy();
		},
	};
}

// =============================================================================
// DEMO UI
// =============================================================================

/**
 * Creates a demo UI for a connected client.
 * Displays server info, client stats, and interactive elements.
 */
function createDemoUI(session: ClientSession, sessions: Map<number, ClientSession>): void {
	const { program, inputHandler } = session;
	let selectedItem = 0;
	const menuItems = ['System Info', 'Client Stats', 'Color Test', 'Box Drawing', 'Quit'];

	function render(): void {
		const { width, height } = session;

		// Clear screen
		program.write('\x1b[2J\x1b[H');

		// Draw header
		const title = ' blECSd Telnet Server Demo ';
		const headerPad = Math.max(0, Math.floor((width - title.length) / 2));
		program.write('\x1b[1;44;97m');
		program.write(' '.repeat(width));
		program.write('\x1b[H');
		program.write(' '.repeat(headerPad) + title);
		program.write('\x1b[0m\n\n');

		// Draw menu
		for (let i = 0; i < menuItems.length; i++) {
			const item = menuItems[i] ?? '';
			if (i === selectedItem) {
				program.write(`  \x1b[1;46;30m > ${item} \x1b[0m\n`);
			} else {
				program.write(`    ${item}\n`);
			}
		}

		program.write('\n');

		// Draw content area based on selection
		drawContent(session, sessions, selectedItem);

		// Draw footer
		program.write(`\x1b[${height};1H`);
		program.write('\x1b[7m');
		program.write(` j/k: Navigate | Enter: Select | q: Quit `.padEnd(width));
		program.write('\x1b[0m');

		program.flush();
	}

	function drawContent(
		sess: ClientSession,
		allSessions: Map<number, ClientSession>,
		selection: number,
	): void {
		const divider = '\x1b[90m' + '─'.repeat(sess.width - 4) + '\x1b[0m\n';
		program.write(divider);

		switch (selection) {
			case 0: // System Info
				drawSystemInfo(sess);
				break;
			case 1: // Client Stats
				drawClientStats(allSessions);
				break;
			case 2: // Color Test
				drawColorTest();
				break;
			case 3: // Box Drawing
				drawBoxDrawing();
				break;
			case 4: // Quit
				program.write('  Press Enter to disconnect.\n');
				break;
		}
	}

	function drawSystemInfo(sess: ClientSession): void {
		const uptime = Math.floor((Date.now() - sess.connectedAt.getTime()) / 1000);
		const info = [
			`  Server: blECSd Telnet Server v1.0.0`,
			`  Client ID: #${sess.id}`,
			`  Terminal: ${sess.terminalType}`,
			`  Window Size: ${sess.width}x${sess.height}`,
			`  Connected: ${uptime}s ago`,
			`  Node.js: ${process.version}`,
			`  Platform: ${process.platform}`,
		];

		for (const line of info) {
			program.write(line + '\n');
		}
	}

	function drawClientStats(allSessions: Map<number, ClientSession>): void {
		program.write(`  Connected Clients: ${allSessions.size}\n\n`);

		for (const [id, clientSess] of allSessions) {
			const uptime = Math.floor((Date.now() - clientSess.connectedAt.getTime()) / 1000);
			const isCurrent = id === session.id;
			const marker = isCurrent ? '\x1b[32m*\x1b[0m' : ' ';
			program.write(`  ${marker} Client #${id}: ${clientSess.width}x${clientSess.height} (${uptime}s)\n`);
		}
	}

	function drawColorTest(): void {
		program.write('  Standard Colors:\n  ');
		for (let i = 0; i < 8; i++) {
			program.write(`\x1b[48;5;${i}m  \x1b[0m`);
		}
		program.write('\n  ');
		for (let i = 8; i < 16; i++) {
			program.write(`\x1b[48;5;${i}m  \x1b[0m`);
		}

		program.write('\n\n  256-Color Cube:\n  ');
		for (let row = 0; row < 6; row++) {
			program.write('  ');
			for (let col = 0; col < 36; col++) {
				const color = 16 + row * 36 + col;
				program.write(`\x1b[48;5;${color}m \x1b[0m`);
			}
			program.write('\n');
		}

		program.write('\n  Grayscale:\n  ');
		for (let i = 232; i < 256; i++) {
			program.write(`\x1b[48;5;${i}m \x1b[0m`);
		}
		program.write('\n');
	}

	function drawBoxDrawing(): void {
		const box = [
			'  ┌────────────────────────────────┐',
			'  │  Box Drawing Characters        │',
			'  ├────────────────────────────────┤',
			'  │  ┌─┬─┐  ╔═╦═╗  ╭──╮  ░▒▓█     │',
			'  │  ├─┼─┤  ╠═╬═╣  │  │            │',
			'  │  └─┴─┘  ╚═╩═╝  ╰──╯            │',
			'  │                                │',
			'  │  Arrows: ← → ↑ ↓ ↔ ↕           │',
			'  │  Blocks: ▀ ▄ █ ▌ ▐ ░ ▒ ▓       │',
			'  │  Lines:  ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ │',
			'  └────────────────────────────────┘',
		];

		for (const line of box) {
			program.write(line + '\n');
		}
	}

	// Handle input using InputHandler
	inputHandler.onKey((event) => {
		const { name, ctrl } = event;

		if (name === 'q' || (ctrl && name === 'c')) {
			session.socket.end();
			return;
		}

		if (name === 'j' || name === 'down') {
			selectedItem = Math.min(menuItems.length - 1, selectedItem + 1);
			render();
		} else if (name === 'k' || name === 'up') {
			selectedItem = Math.max(0, selectedItem - 1);
			render();
		} else if (name === 'enter' || name === 'return') {
			if (selectedItem === 4) {
				// Quit
				session.socket.end();
			}
		}
	});

	// Initial render
	render();
}

// =============================================================================
// SERVER
// =============================================================================

const PORT = parseInt(process.env['TELNET_PORT'] ?? '2300', 10);
const NEGOTIATION_DELAY = parseInt(process.env['TELNET_NEGOTIATION_DELAY'] ?? '200', 10);
const sessions = new Map<number, ClientSession>();
let nextSessionId = 1;

const server = net.createServer((socket) => {
	const sessionId = nextSessionId++;
	const remoteAddr = socket.remoteAddress ?? 'unknown';

	console.log(`[${new Date().toISOString()}] Client #${sessionId} connected from ${remoteAddr}`);

	// Create telnet stream wrapper
	const telnetStream = createTelnetStream(socket);

	// Track the timeout so we can cancel it if socket closes
	let negotiationTimeout: ReturnType<typeof setTimeout> | null = null;

	// Wait a moment for telnet negotiation
	negotiationTimeout = setTimeout(() => {
		// Check if socket was closed during negotiation
		if (socket.destroyed) {
			console.log(`[${new Date().toISOString()}] Client #${sessionId} disconnected during negotiation`);
			telnetStream.destroy();
			return;
		}

		// Create world and program
		const world = createWorld();

		// Use PassThrough for proper output stream
		const programOutput = new PassThrough();
		programOutput.on('data', (chunk: Buffer) => {
			if (!socket.destroyed) {
				telnetStream.output.write(chunk);
			}
		});

		const programConfig: ProgramConfig = {
			input: telnetStream.input,
			output: programOutput as NodeJS.WritableStream,
			useAlternateScreen: false, // Telnet clients may have issues with alternate screen
			hideCursor: false,
			forceWidth: telnetStream.width,
			forceHeight: telnetStream.height,
		};

		const program = createProgram(programConfig);

		// Create InputHandler to parse key events from the telnet stream
		const inputHandler = createInputHandler(telnetStream.input);

		const session: ClientSession = {
			id: sessionId,
			socket,
			world,
			program,
			inputHandler,
			width: telnetStream.width,
			height: telnetStream.height,
			terminalType: telnetStream.terminalType,
			connectedAt: new Date(),
			negotiationTimeout: null,
		};

		sessions.set(sessionId, session);

		// Handle window resize
		telnetStream.onResize((cols, rows) => {
			session.width = cols;
			session.height = rows;
			program.emit('resize', { cols, rows });
		});

		// Initialize program and create UI
		program
			.init()
			.then(() => {
				// Start the input handler
				inputHandler.start();
				createDemoUI(session, sessions);
			})
			.catch((err) => {
				console.error(`[Session #${sessionId}] Failed to initialize:`, err);
				socket.end();
			});
	}, NEGOTIATION_DELAY);

	socket.on('close', () => {
		console.log(`[${new Date().toISOString()}] Client #${sessionId} disconnected`);

		// Clear negotiation timeout if still pending
		if (negotiationTimeout) {
			clearTimeout(negotiationTimeout);
			negotiationTimeout = null;
		}

		const session = sessions.get(sessionId);
		if (session) {
			session.inputHandler.stop();
			session.program.destroy();
			sessions.delete(sessionId);
		}

		telnetStream.destroy();
	});

	socket.on('error', (err) => {
		console.error(`[Session #${sessionId}] Socket error:`, err.message);
	});
});

server.on('error', (err) => {
	console.error('Server error:', err);
	process.exit(1);
});

server.listen(PORT, () => {
	console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   blECSd Telnet Server Example                            ║
║                                                           ║
║   Server listening on port ${PORT.toString().padEnd(28)}║
║                                                           ║
║   Connect with:  telnet localhost ${PORT.toString().padEnd(22)}║
║                                                           ║
║   Press Ctrl+C to stop the server                         ║
║                                                           ║
║   Security Note: Telnet is unencrypted.                   ║
║   Use only on trusted networks.                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
	console.log('\nShutting down...');

	for (const [id, session] of sessions) {
		console.log(`Closing session #${id}`);
		session.inputHandler.stop();
		session.socket.end();
		session.program.destroy();
	}

	server.close(() => {
		console.log('Server closed.');
		process.exit(0);
	});
});
