/**
 * PTY Options Schema Tests
 */

import { describe, expect, it } from 'vitest';
import { PtyOptionsSchema } from './terminal';

describe('PtyOptionsSchema', () => {
	it('should accept minimal valid options', () => {
		const result = PtyOptionsSchema.parse({});
		expect(result.term).toBe('xterm-256color');
		expect(result.autoResize).toBe(true);
	});

	it('should accept full PTY configuration', () => {
		const result = PtyOptionsSchema.parse({
			shell: '/bin/bash',
			args: ['--login', '-i'],
			env: { PATH: '/usr/bin', CUSTOM: 'value' },
			cwd: '/home/user',
			term: 'xterm-256color',
			cols: 120,
			rows: 40,
			autoResize: false,
		});

		expect(result.shell).toBe('/bin/bash');
		expect(result.args).toEqual(['--login', '-i']);
		expect(result.env).toEqual({ PATH: '/usr/bin', CUSTOM: 'value' });
		expect(result.cwd).toBe('/home/user');
		expect(result.term).toBe('xterm-256color');
		expect(result.cols).toBe(120);
		expect(result.rows).toBe(40);
		expect(result.autoResize).toBe(false);
	});

	it('should use default values for optional fields', () => {
		const result = PtyOptionsSchema.parse({
			shell: '/bin/sh',
		});

		expect(result.shell).toBe('/bin/sh');
		expect(result.term).toBe('xterm-256color');
		expect(result.autoResize).toBe(true);
		expect(result.args).toBeUndefined();
		expect(result.env).toBeUndefined();
		expect(result.cwd).toBeUndefined();
		expect(result.cols).toBeUndefined();
		expect(result.rows).toBeUndefined();
	});

	it('should reject invalid shell (empty string)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				shell: '',
			}),
		).toThrow();
	});

	it('should reject invalid cwd (empty string)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				cwd: '',
			}),
		).toThrow();
	});

	it('should reject invalid term (empty string)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				term: '',
			}),
		).toThrow();
	});

	it('should reject invalid cols (negative)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				cols: -1,
			}),
		).toThrow();
	});

	it('should reject invalid cols (zero)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				cols: 0,
			}),
		).toThrow();
	});

	it('should reject invalid cols (non-integer)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				cols: 80.5,
			}),
		).toThrow();
	});

	it('should reject invalid rows (negative)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				rows: -1,
			}),
		).toThrow();
	});

	it('should reject invalid rows (zero)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				rows: 0,
			}),
		).toThrow();
	});

	it('should reject invalid rows (non-integer)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				rows: 24.5,
			}),
		).toThrow();
	});

	it('should accept valid TERM values', () => {
		const terms = ['xterm', 'xterm-256color', 'screen', 'tmux-256color', 'vt100'];

		for (const term of terms) {
			const result = PtyOptionsSchema.parse({ term });
			expect(result.term).toBe(term);
		}
	});

	it('should accept environment variables as record', () => {
		const result = PtyOptionsSchema.parse({
			env: {
				VAR1: 'value1',
				VAR2: 'value2',
				PATH: '/custom/path',
			},
		});

		expect(result.env).toEqual({
			VAR1: 'value1',
			VAR2: 'value2',
			PATH: '/custom/path',
		});
	});

	it('should accept args as array of strings', () => {
		const result = PtyOptionsSchema.parse({
			args: ['--login', '-i', '--norc'],
		});

		expect(result.args).toEqual(['--login', '-i', '--norc']);
	});

	it('should reject invalid args (non-array)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				args: '--login',
			}),
		).toThrow();
	});

	it('should reject invalid env (non-record)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				env: 'PATH=/usr/bin',
			}),
		).toThrow();
	});

	it('should accept autoResize as boolean', () => {
		const resultTrue = PtyOptionsSchema.parse({ autoResize: true });
		expect(resultTrue.autoResize).toBe(true);

		const resultFalse = PtyOptionsSchema.parse({ autoResize: false });
		expect(resultFalse.autoResize).toBe(false);
	});

	it('should reject invalid autoResize (non-boolean)', () => {
		expect(() =>
			PtyOptionsSchema.parse({
				autoResize: 'yes',
			}),
		).toThrow();
	});
});
