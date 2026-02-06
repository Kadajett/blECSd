import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	detectPackageManager,
	fetchManifest,
	listTemplates,
	parseArgs,
	scaffoldTemplate,
} from './init';

describe('CLI init', () => {
	describe('parseArgs', () => {
		it('parses --template flag', () => {
			const config = parseArgs(['init', '--template', 'form']);
			expect(config.template).toBe('form');
		});

		it('parses -t shorthand', () => {
			const config = parseArgs(['init', '-t', 'game']);
			expect(config.template).toBe('game');
		});

		it('parses --dir flag', () => {
			const config = parseArgs(['init', '--dir', './my-app']);
			expect(config.dir).toBe('./my-app');
		});

		it('parses -d shorthand', () => {
			const config = parseArgs(['init', '-d', '/tmp/test']);
			expect(config.dir).toBe('/tmp/test');
		});

		it('parses --list flag', () => {
			const config = parseArgs(['init', '--list']);
			expect(config.list).toBe(true);
		});

		it('parses -l shorthand', () => {
			const config = parseArgs(['-l']);
			expect(config.list).toBe(true);
		});

		it('parses --skip-install flag', () => {
			const config = parseArgs(['init', '--skip-install']);
			expect(config.skipInstall).toBe(true);
		});

		it('defaults dir to "."', () => {
			const config = parseArgs(['init']);
			expect(config.dir).toBe('.');
		});

		it('defaults list to false', () => {
			const config = parseArgs(['init']);
			expect(config.list).toBe(false);
		});

		it('defaults skipInstall to false', () => {
			const config = parseArgs(['init']);
			expect(config.skipInstall).toBe(false);
		});

		it('handles combined flags', () => {
			const config = parseArgs(['init', '-t', 'basic', '-d', './out', '--skip-install']);
			expect(config.template).toBe('basic');
			expect(config.dir).toBe('./out');
			expect(config.skipInstall).toBe(true);
		});
	});

	describe('fetchManifest', () => {
		it('returns built-in templates', async () => {
			const templates = await fetchManifest();
			expect(templates.length).toBeGreaterThanOrEqual(4);

			const names = templates.map((t) => t.name);
			expect(names).toContain('basic');
			expect(names).toContain('form');
			expect(names).toContain('dashboard');
			expect(names).toContain('game');
		});

		it('each template has required fields', async () => {
			const templates = await fetchManifest();
			for (const t of templates) {
				expect(t.name).toBeTruthy();
				expect(t.description).toBeTruthy();
				expect(t.category).toBeTruthy();
				expect(t.files.length).toBeGreaterThan(0);
			}
		});

		it('each template file has path and content', async () => {
			const templates = await fetchManifest();
			for (const t of templates) {
				for (const f of t.files) {
					expect(f.path).toBeTruthy();
					expect(f.content).toBeTruthy();
				}
			}
		});
	});

	describe('scaffoldTemplate', () => {
		const testDir = join(
			'/tmp/claude-1000/-home-kadajett-dev-blECSd-w2/6467ea39-6c6b-4519-a6fc-158d0c5a35f8/scratchpad',
			'scaffold-test',
		);

		beforeEach(() => {
			if (existsSync(testDir)) {
				rmSync(testDir, { recursive: true });
			}
		});

		afterEach(() => {
			if (existsSync(testDir)) {
				rmSync(testDir, { recursive: true });
			}
		});

		it('creates directory if it does not exist', async () => {
			const templates = await fetchManifest();
			const basic = templates.find((t) => t.name === 'basic');
			expect(basic).toBeDefined();

			scaffoldTemplate(basic!, testDir);
			expect(existsSync(testDir)).toBe(true);
		});

		it('writes template files', async () => {
			const templates = await fetchManifest();
			const basic = templates.find((t) => t.name === 'basic');
			expect(basic).toBeDefined();

			scaffoldTemplate(basic!, testDir);

			expect(existsSync(join(testDir, 'src/index.ts'))).toBe(true);
			expect(existsSync(join(testDir, 'tsconfig.json'))).toBe(true);
		});

		it('generates package.json with project name', async () => {
			const templates = await fetchManifest();
			const basic = templates.find((t) => t.name === 'basic');
			expect(basic).toBeDefined();

			scaffoldTemplate(basic!, testDir);

			const pkgPath = join(testDir, 'package.json');
			expect(existsSync(pkgPath)).toBe(true);
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			expect(pkg.name).toBe('scaffold-test');
			expect(pkg.dependencies.blecsd).toBe('latest');
		});

		it('creates nested directories for file paths', async () => {
			const templates = await fetchManifest();
			const basic = templates.find((t) => t.name === 'basic');
			expect(basic).toBeDefined();

			scaffoldTemplate(basic!, testDir);

			// src/index.ts requires src/ directory
			expect(existsSync(join(testDir, 'src'))).toBe(true);
		});
	});

	describe('detectPackageManager', () => {
		it('returns a valid package manager', () => {
			const pm = detectPackageManager();
			expect(['pnpm', 'yarn', 'npm']).toContain(pm);
		});
	});

	describe('listTemplates', () => {
		it('does not throw', async () => {
			const templates = await fetchManifest();
			const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
			expect(() => listTemplates(templates)).not.toThrow();
			spy.mockRestore();
		});
	});
});
