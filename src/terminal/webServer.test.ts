/**
 * Tests for WebSocket server module.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { resetServerState } from './server';
import { serveWeb, WebServerConfigSchema, type WebServerHandle } from './webServer';

let handle: WebServerHandle | null = null;

afterEach(async () => {
	if (handle) {
		await handle.stop();
		handle = null;
	}
	resetServerState();
});

describe('WebServerConfigSchema', () => {
	it('validates a correct config', () => {
		const result = WebServerConfigSchema.safeParse({
			port: 8080,
			title: 'Test',
		});
		expect(result.success).toBe(true);
	});

	it('rejects port 0', () => {
		const result = WebServerConfigSchema.safeParse({ port: 0 });
		expect(result.success).toBe(false);
	});

	it('rejects port > 65535', () => {
		const result = WebServerConfigSchema.safeParse({ port: 70000 });
		expect(result.success).toBe(false);
	});

	it('accepts optional fields', () => {
		const result = WebServerConfigSchema.safeParse({
			port: 3000,
			host: 'localhost',
			title: 'My App',
			authToken: 'secret',
			maxClients: 5,
		});
		expect(result.success).toBe(true);
	});
});

describe('serveWeb', () => {
	it('starts and stops a server', async () => {
		handle = serveWeb({ port: 49321 });
		expect(handle.running).toBe(true);
		expect(handle.port).toBe(49321);

		await handle.stop();
		expect(handle.running).toBe(false);
		handle = null;
	});

	it('accepts a title config', async () => {
		handle = serveWeb({ port: 49322, title: 'Test App' });
		expect(handle.running).toBe(true);
		await handle.stop();
		handle = null;
	});

	it('accepts auth token config', async () => {
		handle = serveWeb({ port: 49323, authToken: 'my-secret' });
		expect(handle.running).toBe(true);
		await handle.stop();
		handle = null;
	});

	it('broadcast does not throw when no clients connected', async () => {
		handle = serveWeb({ port: 49324 });
		expect(() => handle!.broadcast('hello')).not.toThrow();
		await handle.stop();
		handle = null;
	});

	it('onEvent returns an unsubscribe function', async () => {
		handle = serveWeb({ port: 49325 });
		const unsub = handle.onEvent(() => {});
		expect(typeof unsub).toBe('function');
		unsub();
		await handle.stop();
		handle = null;
	});
});

describe('generateWebClientHtml', () => {
	it('generates HTML with the correct title', async () => {
		const { generateWebClientHtml } = await import('./webClient');
		const html = generateWebClientHtml('Test Title', false);
		expect(html).toContain('<title>Test Title</title>');
		expect(html).toContain('xterm');
		expect(html).toContain('WebSocket');
	});

	it('includes auth form when requiresAuth is true', async () => {
		const { generateWebClientHtml } = await import('./webClient');
		const html = generateWebClientHtml('Auth App', true);
		expect(html).toContain('auth-form');
		expect(html).toContain('token-input');
		expect(html).toContain('auth-btn');
	});

	it('hides auth overlay when requiresAuth is false', async () => {
		const { generateWebClientHtml } = await import('./webClient');
		const html = generateWebClientHtml('No Auth', false);
		expect(html).toContain('class="hidden"');
		// The auth form input/button elements should not be in the DOM
		expect(html).not.toContain('id="token-input"');
		expect(html).not.toContain('id="auth-btn"');
	});

	it('escapes HTML in title', async () => {
		const { generateWebClientHtml } = await import('./webClient');
		const html = generateWebClientHtml('<script>alert(1)</script>', false);
		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).toContain('&lt;script&gt;');
	});
});
