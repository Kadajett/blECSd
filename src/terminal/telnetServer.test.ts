/**
 * Tests for telnet server.
 */

import { describe, expect, it } from 'vitest';
import type { StreamSession } from './customStream';
import { writeToSession } from './customStream';
import {
	createTelnetServer,
	getTelnetClientCount,
	startTelnetServer,
	stopTelnetServer,
	TELNET,
	TELNET_OPT,
} from './telnetServer';

describe('createTelnetServer', () => {
	it('creates a server with default state', () => {
		const state = createTelnetServer({ port: 2323 });
		expect(state.running).toBe(false);
		expect(state.sessions.size).toBe(0);
		expect(state.config.port).toBe(2323);
	});

	it('validates port range', () => {
		expect(() => createTelnetServer({ port: 0 })).toThrow();
		expect(() => createTelnetServer({ port: 99999 })).toThrow();
	});
});

describe('telnet server lifecycle', () => {
	it('starts and stops cleanly', async () => {
		const state2 = createTelnetServer({ port: 23230 });
		await startTelnetServer(state2);
		expect(state2.running).toBe(true);
		expect(getTelnetClientCount(state2)).toBe(0);

		await stopTelnetServer(state2);
		expect(state2.running).toBe(false);
	});

	it('accepts client connections', async () => {
		const sessions: StreamSession[] = [];
		const state = createTelnetServer({
			port: 23231,
			onSession: (session) => sessions.push(session),
		});

		await startTelnetServer(state);

		// Connect a raw TCP client
		const net = await import('node:net');
		const client = net.createConnection({ port: 23231, host: '127.0.0.1' });

		await new Promise<void>((resolve) => {
			client.on('connect', () => {
				// Wait a tick for session creation
				setTimeout(resolve, 50);
			});
		});

		expect(sessions.length).toBe(1);
		expect(sessions[0]!.active).toBe(true);
		expect(getTelnetClientCount(state)).toBe(1);

		client.destroy();
		await new Promise((r) => setTimeout(r, 50));

		await stopTelnetServer(state);
	});

	it('handles NAWS negotiation', async () => {
		const sessions: StreamSession[] = [];
		const state = createTelnetServer({
			port: 23232,
			onSession: (session) => sessions.push(session),
		});

		await startTelnetServer(state);

		const net = await import('node:net');
		const client = net.createConnection({ port: 23232, host: '127.0.0.1' });

		await new Promise<void>((resolve) => client.on('connect', () => setTimeout(resolve, 50)));

		// Send NAWS subnegotiation: 120 cols x 40 rows
		const nawsData = Buffer.from([
			TELNET.IAC,
			TELNET.SB,
			TELNET_OPT.NAWS,
			0,
			120, // width = 120
			0,
			40, // height = 40
			TELNET.IAC,
			TELNET.SE,
		]);
		client.write(nawsData);

		await new Promise((r) => setTimeout(r, 50));

		expect(sessions[0]!.width).toBe(120);
		expect(sessions[0]!.height).toBe(40);

		client.destroy();
		await stopTelnetServer(state);
	});

	it('forwards clean data to session', async () => {
		const received: string[] = [];
		const state = createTelnetServer({
			port: 23233,
			onSession: (session) => {
				session.onData((data) => received.push(data));
			},
		});

		await startTelnetServer(state);

		const net = await import('node:net');
		const client = net.createConnection({ port: 23233, host: '127.0.0.1' });

		await new Promise<void>((resolve) => client.on('connect', () => setTimeout(resolve, 50)));

		client.write('hello world');
		await new Promise((r) => setTimeout(r, 50));

		expect(received.join('')).toContain('hello world');

		client.destroy();
		await stopTelnetServer(state);
	});

	it('sends output back to client', async () => {
		let sessionRef: StreamSession | null = null;
		const state = createTelnetServer({
			port: 23234,
			onSession: (session) => {
				sessionRef = session;
			},
		});

		await startTelnetServer(state);

		const net = await import('node:net');
		const clientData: Buffer[] = [];
		const client = net.createConnection({ port: 23234, host: '127.0.0.1' });
		client.on('data', (d: Buffer) => clientData.push(d));

		await new Promise<void>((resolve) => client.on('connect', () => setTimeout(resolve, 50)));

		writeToSession(sessionRef!, 'Hello from server');
		await new Promise((r) => setTimeout(r, 50));

		const allData = Buffer.concat(clientData).toString();
		expect(allData).toContain('Hello from server');

		client.destroy();
		await stopTelnetServer(state);
	});
});
