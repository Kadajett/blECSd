/**
 * Tests for the serve CLI command.
 */

import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseServeArgs } from './serve';

describe('serve CLI', () => {
	describe('parseServeArgs', () => {
		it('parses app path', () => {
			const config = parseServeArgs(['./app.ts']);
			expect(config).not.toBeNull();
			expect(config!.appPath).toBe(resolve('./app.ts'));
		});

		it('parses port option', () => {
			const config = parseServeArgs(['./app.ts', '--port', '3000']);
			expect(config).not.toBeNull();
			expect(config!.port).toBe(3000);
		});

		it('parses short port option', () => {
			const config = parseServeArgs(['./app.ts', '-p', '3000']);
			expect(config).not.toBeNull();
			expect(config!.port).toBe(3000);
		});

		it('parses host option', () => {
			const config = parseServeArgs(['./app.ts', '--host', '0.0.0.0']);
			expect(config).not.toBeNull();
			expect(config!.host).toBe('0.0.0.0');
		});

		it('parses title option', () => {
			const config = parseServeArgs(['./app.ts', '--title', 'My App']);
			expect(config).not.toBeNull();
			expect(config!.title).toBe('My App');
		});

		it('parses auth-token option', () => {
			const config = parseServeArgs(['./app.ts', '--auth-token', 'secret']);
			expect(config).not.toBeNull();
			expect(config!.authToken).toBe('secret');
		});

		it('uses defaults when options not provided', () => {
			const config = parseServeArgs(['./app.ts']);
			expect(config).not.toBeNull();
			expect(config!.port).toBe(8080);
			expect(config!.host).toBe('localhost');
			expect(config!.title).toBe('blECSd Terminal');
			expect(config!.authToken).toBeUndefined();
		});

		it('returns null when no app path provided', () => {
			expect(parseServeArgs([])).toBeNull();
			expect(parseServeArgs(['--port', '3000'])).toBeNull();
		});

		it('returns null for invalid port', () => {
			expect(parseServeArgs(['./app.ts', '--port', 'abc'])).toBeNull();
			expect(parseServeArgs(['./app.ts', '--port', '0'])).toBeNull();
			expect(parseServeArgs(['./app.ts', '--port', '99999'])).toBeNull();
		});

		it('handles all options together', () => {
			const config = parseServeArgs([
				'./app.ts',
				'--port',
				'9090',
				'--host',
				'0.0.0.0',
				'--title',
				'Test',
				'--auth-token',
				'tok',
			]);
			expect(config).not.toBeNull();
			expect(config!.port).toBe(9090);
			expect(config!.host).toBe('0.0.0.0');
			expect(config!.title).toBe('Test');
			expect(config!.authToken).toBe('tok');
		});
	});
});
