/**
 * Tests for terminal initialization and CLI parsing
 */

import { describe, expect, it } from 'vitest';
import {
	parseArgs,
	createConfigFromArgs,
	createDefaultConfig,
	VERSION,
	APP_NAME,
	HELP_TEXT,
} from './init';

describe('parseArgs', () => {
	it('parses empty args', () => {
		const args = parseArgs([]);

		expect(args.mouseEnabled).toBe(true);
		expect(args.soundEnabled).toBe(true);
		expect(args.seed).toBeNull();
		expect(args.help).toBe(false);
		expect(args.version).toBe(false);
	});

	it('parses --no-mouse', () => {
		const args = parseArgs(['--no-mouse']);

		expect(args.mouseEnabled).toBe(false);
		expect(args.soundEnabled).toBe(true);
	});

	it('parses --no-sound', () => {
		const args = parseArgs(['--no-sound']);

		expect(args.soundEnabled).toBe(false);
		expect(args.mouseEnabled).toBe(true);
	});

	it('parses --seed with value', () => {
		const args = parseArgs(['--seed', '12345']);

		expect(args.seed).toBe(12345);
	});

	it('ignores invalid seed', () => {
		const args = parseArgs(['--seed', 'abc']);

		expect(args.seed).toBeNull();
	});

	it('ignores --seed without value', () => {
		const args = parseArgs(['--seed']);

		expect(args.seed).toBeNull();
	});

	it('parses --help', () => {
		const argsLong = parseArgs(['--help']);
		const argsShort = parseArgs(['-h']);

		expect(argsLong.help).toBe(true);
		expect(argsShort.help).toBe(true);
	});

	it('parses --version', () => {
		const args = parseArgs(['--version']);

		expect(args.version).toBe(true);
	});

	it('parses multiple flags', () => {
		const args = parseArgs(['--no-mouse', '--no-sound', '--seed', '42']);

		expect(args.mouseEnabled).toBe(false);
		expect(args.soundEnabled).toBe(false);
		expect(args.seed).toBe(42);
	});
});

describe('createConfigFromArgs', () => {
	it('creates config from args', () => {
		const args = {
			mouseEnabled: false,
			soundEnabled: true,
			seed: 123,
			help: false,
			version: false,
		};
		const config = createConfigFromArgs(args);

		expect(config.mouseEnabled).toBe(false);
		expect(config.soundEnabled).toBe(true);
		expect(config.seed).toBe(123);
	});
});

describe('createDefaultConfig', () => {
	it('creates default config', () => {
		const config = createDefaultConfig();

		expect(config.mouseEnabled).toBe(true);
		expect(config.soundEnabled).toBe(true);
		expect(config.seed).toBeNull();
	});
});

describe('constants', () => {
	it('has version string', () => {
		expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
	});

	it('has app name', () => {
		expect(APP_NAME).toBe('balatro-terminal');
	});

	it('has help text', () => {
		expect(HELP_TEXT).toContain('--no-mouse');
		expect(HELP_TEXT).toContain('--seed');
		expect(HELP_TEXT).toContain('--help');
	});
});
