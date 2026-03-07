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

// Use a temp dir for scaffold tests
const TEST_BASE = join('/tmp', `blecsd-cli-test-${process.pid}`);

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

		it('parses positional project name', () => {
			const config = parseArgs(['my-app']);
			expect(config.name).toBe('my-app');
			expect(config.dir).toBe('my-app');
		});

		it('positional name does not override explicit --dir', () => {
			const config = parseArgs(['-d', './custom', 'my-app']);
			expect(config.name).toBe('my-app');
			expect(config.dir).toBe('./custom');
		});

		it('parses --pm flag', () => {
			const config = parseArgs(['--pm', 'yarn']);
			expect(config.packageManager).toBe('yarn');
		});

		it('ignores invalid --pm value', () => {
			const config = parseArgs(['--pm', 'bun']);
			expect(config.packageManager).toBeUndefined();
		});
	});

	describe('fetchManifest', () => {
		it('returns built-in templates', async () => {
			const templates = await fetchManifest();
			expect(templates.length).toBeGreaterThanOrEqual(4);

			const names = templates.map((t) => t.name);
			expect(names).toContain('hello-world');
			expect(names).toContain('basic');
			expect(names).toContain('dashboard');
			expect(names).toContain('game');
		});

		it('includes hello-world and dashboard as createApp templates', async () => {
			const templates = await fetchManifest();
			const helloWorld = templates.find((t) => t.name === 'hello-world');
			expect(helloWorld).toBeDefined();
			const indexFile = helloWorld!.files.find((f) => f.path === 'src/index.ts');
			expect(indexFile).toBeDefined();
			expect(indexFile!.content).toContain('createApp');

			const dashboard = templates.find((t) => t.name === 'dashboard');
			expect(dashboard).toBeDefined();
			const dashFile = dashboard!.files.find((f) => f.path === 'src/index.ts');
			expect(dashFile!.content).toContain('createApp');
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

		it('all templates use createApp API', async () => {
			const templates = await fetchManifest();
			for (const t of templates) {
				const indexFile = t.files.find((f) => f.path === 'src/index.ts');
				expect(indexFile).toBeDefined();
				expect(indexFile!.content).toContain('createApp');
			}
		});
	});

	describe('scaffoldTemplate', () => {
		const testDir = join(TEST_BASE, 'scaffold-test');

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

		it('uses custom project name when provided', async () => {
			const templates = await fetchManifest();
			const basic = templates.find((t) => t.name === 'basic');
			expect(basic).toBeDefined();

			scaffoldTemplate(basic!, testDir, 'custom-project');

			const pkgPath = join(testDir, 'package.json');
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
			expect(pkg.name).toBe('custom-project');
		});

		it('creates nested directories for file paths', async () => {
			const templates = await fetchManifest();
			const basic = templates.find((t) => t.name === 'basic');
			expect(basic).toBeDefined();

			scaffoldTemplate(basic!, testDir);

			// src/index.ts requires src/ directory
			expect(existsSync(join(testDir, 'src'))).toBe(true);
		});

		it('scaffolds hello-world template with createApp', async () => {
			const templates = await fetchManifest();
			const hw = templates.find((t) => t.name === 'hello-world');
			expect(hw).toBeDefined();

			scaffoldTemplate(hw!, testDir);

			const indexContent = readFileSync(join(testDir, 'src/index.ts'), 'utf-8');
			expect(indexContent).toContain('createApp');
			expect(indexContent).toContain('app.start()');
			expect(indexContent).toContain('app.shutdown()');
		});

		it('scaffolds dashboard template with createApp', async () => {
			const templates = await fetchManifest();
			const dash = templates.find((t) => t.name === 'dashboard');
			expect(dash).toBeDefined();

			scaffoldTemplate(dash!, testDir);

			const indexContent = readFileSync(join(testDir, 'src/index.ts'), 'utf-8');
			expect(indexContent).toContain('createApp');
			expect(indexContent).toContain('createBoxEntity');
		});

		it('generates package.json with dev script', async () => {
			const templates = await fetchManifest();
			const basic = templates.find((t) => t.name === 'basic');

			scaffoldTemplate(basic!, testDir);

			const pkg = JSON.parse(readFileSync(join(testDir, 'package.json'), 'utf-8'));
			expect(pkg.scripts.dev).toBe('tsx watch src/index.ts');
			expect(pkg.scripts.build).toBe('tsc');
			expect(pkg.scripts.start).toBe('node dist/index.js');
			expect(pkg.type).toBe('module');
		});

		it('generates tsconfig.json configured for ESM', async () => {
			const templates = await fetchManifest();
			const basic = templates.find((t) => t.name === 'basic');

			scaffoldTemplate(basic!, testDir);

			const tsconfig = JSON.parse(readFileSync(join(testDir, 'tsconfig.json'), 'utf-8'));
			expect(tsconfig.compilerOptions.module).toBe('NodeNext');
			expect(tsconfig.compilerOptions.moduleResolution).toBe('NodeNext');
			expect(tsconfig.compilerOptions.target).toBe('ES2022');
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
