/**
 * Tests for the unified createServerApp factory.
 */

import { describe, expect, it } from 'vitest';
import type { StreamSession } from './customStream';
import { createServerApp } from './serverApp';

describe('createServerApp', () => {
	it('creates a TCP server app', () => {
		const app = createServerApp({ mode: 'tcp', port: 24000 });
		expect(app.mode).toBe('tcp');
		expect(app.port).toBe(24000);
		expect(app.running).toBe(false);
		expect(app.clientCount).toBe(0);
	});

	it('creates a telnet server app', () => {
		const app = createServerApp({ mode: 'telnet', port: 24001 });
		expect(app.mode).toBe('telnet');
		expect(app.port).toBe(24001);
		expect(app.running).toBe(false);
	});

	it('creates an SSH server app', () => {
		const app = createServerApp({
			mode: 'ssh',
			port: 24002,
			hostKey: 'dummy-key-for-test',
		});
		expect(app.mode).toBe('ssh');
		expect(app.port).toBe(24002);
		expect(app.running).toBe(false);
	});

	it('throws on unknown mode', () => {
		expect(() => createServerApp({ mode: 'ftp' as never, port: 24003 })).toThrow(
			'Unknown server mode',
		);
	});
});

describe('TCP server app lifecycle', () => {
	it('starts and stops', async () => {
		const app = createServerApp({ mode: 'tcp', port: 24010 });

		await app.start();
		expect(app.running).toBe(true);

		await app.stop();
		expect(app.running).toBe(false);
	});

	it('accepts connections', async () => {
		const sessions: StreamSession[] = [];
		const app = createServerApp({
			mode: 'tcp',
			port: 24011,
			onSession: (s) => sessions.push(s),
		});

		await app.start();

		const net = await import('node:net');
		const client = net.createConnection({ port: 24011, host: '127.0.0.1' });
		await new Promise<void>((resolve) => client.on('connect', () => setTimeout(resolve, 50)));

		expect(sessions.length).toBe(1);
		expect(app.clientCount).toBe(1);

		client.destroy();
		await new Promise((r) => setTimeout(r, 50));
		await app.stop();
	});
});

describe('Telnet server app lifecycle', () => {
	it('starts and stops', async () => {
		const app = createServerApp({ mode: 'telnet', port: 24020 });

		await app.start();
		expect(app.running).toBe(true);

		await app.stop();
		expect(app.running).toBe(false);
	});
});
