/**
 * Tests for WebSocket server.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetServerState } from './server';
import {
	createWebServer,
	encodeFrame,
	getWebClientCount,
	parseFrame,
	startWebServer,
	stopWebServer,
	type WebServerState,
	webBroadcast,
} from './webSocket';

// =============================================================================
// TESTS
// =============================================================================

describe('webSocket', () => {
	afterEach(() => {
		resetServerState();
	});

	describe('createWebServer', () => {
		it('creates server with valid config', () => {
			const state = createWebServer({ port: 9090 });
			expect(state.config.port).toBe(9090);
			expect(state.running).toBe(false);
			expect(state.clientCount).toBe(0);
		});

		it('validates port range', () => {
			expect(() => createWebServer({ port: 0 })).toThrow();
			expect(() => createWebServer({ port: 70000 })).toThrow();
		});

		it('accepts optional config fields', () => {
			const state = createWebServer({
				port: 8080,
				host: '0.0.0.0',
				title: 'Test App',
				authToken: 'secret',
				maxClients: 5,
			});
			expect(state.config.host).toBe('0.0.0.0');
			expect(state.config.title).toBe('Test App');
			expect(state.config.authToken).toBe('secret');
			expect(state.config.maxClients).toBe(5);
		});
	});

	describe('encodeFrame', () => {
		it('encodes short text frames', () => {
			const frame = encodeFrame('hello');
			expect(frame[0]).toBe(0x81); // FIN + text
			expect(frame[1]).toBe(5); // payload length
			expect(frame.subarray(2).toString('utf-8')).toBe('hello');
		});

		it('encodes medium text frames (126-65535 bytes)', () => {
			const data = 'x'.repeat(200);
			const frame = encodeFrame(data);
			expect(frame[0]).toBe(0x81);
			expect(frame[1]).toBe(126);
			expect(frame.readUInt16BE(2)).toBe(200);
			expect(frame.subarray(4).toString('utf-8')).toBe(data);
		});

		it('encodes empty text frames', () => {
			const frame = encodeFrame('');
			expect(frame[0]).toBe(0x81);
			expect(frame[1]).toBe(0);
			expect(frame.length).toBe(2);
		});
	});

	describe('parseFrame', () => {
		it('parses unmasked text frames', () => {
			const frame = encodeFrame('test');
			const parsed = parseFrame(frame);
			expect(parsed).not.toBeNull();
			expect(parsed!.opcode).toBe(1); // text
			expect(parsed!.payload.toString('utf-8')).toBe('test');
			expect(parsed!.bytesConsumed).toBe(frame.length);
		});

		it('parses masked text frames (from browser)', () => {
			// Build a masked frame manually
			const payload = Buffer.from('hi', 'utf-8');
			const maskKey = Buffer.from([0x12, 0x34, 0x56, 0x78]);
			const masked = Buffer.alloc(payload.length);
			for (let i = 0; i < payload.length; i++) {
				masked[i] = payload[i]! ^ maskKey[i % 4]!;
			}

			const frame = Buffer.alloc(2 + 4 + payload.length);
			frame[0] = 0x81; // FIN + text
			frame[1] = 0x80 | payload.length; // masked + length
			maskKey.copy(frame, 2);
			masked.copy(frame, 6);

			const parsed = parseFrame(frame);
			expect(parsed).not.toBeNull();
			expect(parsed!.opcode).toBe(1);
			expect(parsed!.payload.toString('utf-8')).toBe('hi');
		});

		it('returns null for incomplete frames', () => {
			expect(parseFrame(Buffer.alloc(0))).toBeNull();
			expect(parseFrame(Buffer.alloc(1))).toBeNull();

			// Header says 5 bytes but only 3 available
			const partial = Buffer.alloc(4);
			partial[0] = 0x81;
			partial[1] = 5;
			expect(parseFrame(partial)).toBeNull();
		});

		it('parses close frames', () => {
			const frame = Buffer.alloc(4);
			frame[0] = 0x88; // FIN + close
			frame[1] = 2;
			frame.writeUInt16BE(1000, 2);

			const parsed = parseFrame(frame);
			expect(parsed).not.toBeNull();
			expect(parsed!.opcode).toBe(8); // close
		});

		it('parses ping frames', () => {
			const frame = Buffer.alloc(2);
			frame[0] = 0x89; // FIN + ping
			frame[1] = 0;

			const parsed = parseFrame(frame);
			expect(parsed).not.toBeNull();
			expect(parsed!.opcode).toBe(9); // ping
		});
	});

	describe('startWebServer / stopWebServer', () => {
		let server: WebServerState;

		beforeEach(() => {
			// Use a random high port to avoid conflicts
			const port = 30000 + Math.floor(Math.random() * 30000);
			server = createWebServer({ port });
		});

		afterEach(async () => {
			if (server.running) {
				await stopWebServer(server);
			}
			resetServerState();
		});

		it('starts and stops the server', async () => {
			await startWebServer(server);
			expect(server.running).toBe(true);

			await stopWebServer(server);
			expect(server.running).toBe(false);
		});

		it('is idempotent on start', async () => {
			await startWebServer(server);
			await startWebServer(server); // Should not throw
			expect(server.running).toBe(true);
		});

		it('is idempotent on stop', async () => {
			await stopWebServer(server); // Not started — should not throw
			expect(server.running).toBe(false);
		});

		it('resets client count on stop', async () => {
			await startWebServer(server);
			await stopWebServer(server);
			expect(server.clientCount).toBe(0);
		});
	});

	describe('getWebClientCount', () => {
		it('returns 0 when no clients connected', () => {
			const server = createWebServer({ port: 9999 });
			expect(getWebClientCount(server)).toBe(0);
		});
	});

	describe('webBroadcast', () => {
		it('does not throw when no clients connected', () => {
			const server = createWebServer({ port: 9999 });
			expect(() => webBroadcast(server, 'test')).not.toThrow();
		});
	});
});
