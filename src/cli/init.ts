#!/usr/bin/env node

/**
 * blECSd CLI scaffolding tool.
 *
 * Usage:
 *   npx blecsd init                    # Interactive: prompts for everything
 *   npx blecsd init my-app             # Interactive with project name preset
 *   npx blecsd init --template form    # Direct: scaffold specific template
 *   npx blecsd init --list             # List available templates
 *   npx blecsd init --dir ./my-app     # Scaffold into a specific directory
 *
 * @module cli/init
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { get as httpsGet } from 'node:https';
import { basename, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A template available for scaffolding.
 */
export interface Template {
	/** Template identifier (e.g., 'basic', 'form', 'game') */
	readonly name: string;
	/** Human-readable description */
	readonly description: string;
	/** Category grouping */
	readonly category: string;
	/** Files included in the template */
	readonly files: readonly TemplateFile[];
}

/**
 * A file within a template.
 */
export interface TemplateFile {
	/** Relative path from project root */
	readonly path: string;
	/** File contents */
	readonly content: string;
}

/**
 * Supported package managers.
 */
export type PackageManager = 'pnpm' | 'yarn' | 'npm';

/**
 * CLI configuration.
 */
export interface CliConfig {
	/** Template to scaffold (undefined = interactive) */
	readonly template?: string | undefined;
	/** Target directory */
	readonly dir: string;
	/** Project name (positional arg or derived from dir) */
	readonly name?: string | undefined;
	/** List available templates */
	readonly list: boolean;
	/** Skip npm install */
	readonly skipInstall: boolean;
	/** Preferred package manager */
	readonly packageManager?: PackageManager | undefined;
}

// =============================================================================
// BUILT-IN TEMPLATES
// =============================================================================

const TSCONFIG_CONTENT = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
`;

function createPackageJson(name: string, description: string): string {
	return JSON.stringify(
		{
			name,
			version: '1.0.0',
			description,
			type: 'module',
			main: './dist/index.js',
			scripts: {
				dev: 'tsx watch src/index.ts',
				build: 'tsc',
				start: 'node dist/index.js',
			},
			dependencies: {
				blecsd: 'latest',
			},
			devDependencies: {
				tsx: '^4.21.0',
				typescript: '^5.9.0',
			},
		},
		null,
		2,
	);
}

function getBuiltinTemplates(): readonly Template[] {
	return [
		{
			name: 'hello-world',
			description: 'Minimal blECSd app using createApp() with a greeting box',
			category: 'Getting Started',
			files: [
				{
					path: 'src/index.ts',
					content: `import { createApp, createBoxEntity, createTextEntity, setText, addEntity } from 'blecsd';

async function main() {
  const app = await createApp({ fullscreen: true, fps: 30 });
  const { world, program, cols, rows } = app;

  // Create a centered box
  const box = createBoxEntity(world, {
    x: Math.floor(cols / 2) - 20,
    y: Math.floor(rows / 2) - 3,
    width: 40,
    height: 6,
  });

  // Add a greeting
  const text = createTextEntity(world, {
    x: Math.floor(cols / 2) - 10,
    y: Math.floor(rows / 2),
    width: 20,
    height: 1,
  });
  setText(world, text, 'Hello from blECSd!');

  // Handle 'q' to quit
  program.onKey((key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      app.shutdown();
    }
  });

  app.start();
}

main().catch(console.error);
`,
				},
				{ path: 'tsconfig.json', content: TSCONFIG_CONTENT },
			],
		},
		{
			name: 'dashboard',
			description: 'Multi-panel dashboard with header, sidebar, and content area',
			category: 'Getting Started',
			files: [
				{
					path: 'src/index.ts',
					content: `import {
  createApp,
  createBoxEntity,
  createTextEntity,
  setText,
} from 'blecsd';

async function main() {
  const app = await createApp({ fullscreen: true, fps: 30 });
  const { world, program, cols, rows } = app;

  // Header
  createBoxEntity(world, { x: 0, y: 0, width: cols, height: 3 });
  const title = createTextEntity(world, { x: 2, y: 1, width: cols - 4, height: 1 });
  setText(world, title, 'blECSd Dashboard');

  // Sidebar
  const sidebarWidth = 20;
  createBoxEntity(world, { x: 0, y: 3, width: sidebarWidth, height: rows - 4 });
  const menuItems = ['Overview', 'Stats', 'Settings', 'Help'];
  for (let i = 0; i < menuItems.length; i++) {
    const item = createTextEntity(world, {
      x: 2,
      y: 5 + i * 2,
      width: sidebarWidth - 4,
      height: 1,
    });
    setText(world, item, menuItems[i]!);
  }

  // Main content area
  createBoxEntity(world, {
    x: sidebarWidth,
    y: 3,
    width: cols - sidebarWidth,
    height: rows - 4,
  });
  const content = createTextEntity(world, {
    x: sidebarWidth + 2,
    y: 5,
    width: cols - sidebarWidth - 4,
    height: 1,
  });
  setText(world, content, 'Welcome to blECSd! Press q to quit.');

  // Status bar
  createBoxEntity(world, { x: 0, y: rows - 1, width: cols, height: 1 });
  const status = createTextEntity(world, { x: 2, y: rows - 1, width: cols - 4, height: 1 });
  setText(world, status, \`\${cols}x\${rows} | FPS: 30 | Press q to quit\`);

  program.onKey((key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      app.shutdown();
    }
  });

  app.start();
}

main().catch(console.error);
`,
				},
				{ path: 'tsconfig.json', content: TSCONFIG_CONTENT },
			],
		},
		{
			name: 'basic',
			description: 'Bare-bones blECSd app with a single box',
			category: 'Getting Started',
			files: [
				{
					path: 'src/index.ts',
					content: `import { createApp, createBoxEntity } from 'blecsd';

async function main() {
  const app = await createApp({ fullscreen: true, fps: 30 });
  const { world, program, cols, rows } = app;

  // Create a box in the center
  createBoxEntity(world, {
    x: Math.floor(cols / 2) - 15,
    y: Math.floor(rows / 2) - 4,
    width: 30,
    height: 8,
  });

  program.onKey((key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      app.shutdown();
    }
  });

  app.start();
}

main().catch(console.error);
`,
				},
				{ path: 'tsconfig.json', content: TSCONFIG_CONTENT },
			],
		},
		{
			name: 'form',
			description: 'Interactive form with text inputs and buttons',
			category: 'Widgets',
			files: [
				{
					path: 'src/index.ts',
					content: `import {
  createApp,
  createBoxEntity,
  createTextEntity,
  setText,
} from 'blecsd';

async function main() {
  const app = await createApp({ fullscreen: true, fps: 30 });
  const { world, program, cols, rows } = app;

  const formX = Math.floor(cols / 2) - 30;
  const formY = Math.floor(rows / 2) - 8;

  // Form container
  createBoxEntity(world, { x: formX, y: formY, width: 60, height: 16 });

  // Title
  const title = createTextEntity(world, {
    x: formX + 2, y: formY + 1, width: 56, height: 1,
  });
  setText(world, title, 'Registration Form');

  // Name label + field
  const nameLabel = createTextEntity(world, {
    x: formX + 2, y: formY + 4, width: 10, height: 1,
  });
  setText(world, nameLabel, 'Name:');
  createBoxEntity(world, { x: formX + 14, y: formY + 3, width: 40, height: 3 });

  // Email label + field
  const emailLabel = createTextEntity(world, {
    x: formX + 2, y: formY + 8, width: 10, height: 1,
  });
  setText(world, emailLabel, 'Email:');
  createBoxEntity(world, { x: formX + 14, y: formY + 7, width: 40, height: 3 });

  // Submit button
  createBoxEntity(world, { x: formX + 22, y: formY + 12, width: 16, height: 3 });
  const btnText = createTextEntity(world, {
    x: formX + 26, y: formY + 13, width: 8, height: 1,
  });
  setText(world, btnText, 'Submit');

  program.onKey((key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      app.shutdown();
    }
  });

  app.start();
}

main().catch(console.error);
`,
				},
				{ path: 'tsconfig.json', content: TSCONFIG_CONTENT },
			],
		},
		{
			name: 'game',
			description: 'Game-style app with a movable player entity',
			category: 'Games',
			files: [
				{
					path: 'src/index.ts',
					content: `import {
  createApp,
  createBoxEntity,
  createTextEntity,
  setText,
  setPosition,
  getPosition,
} from 'blecsd';

async function main() {
  const app = await createApp({ fullscreen: true, fps: 30 });
  const { world, program, cols, rows } = app;

  // Boundary box
  createBoxEntity(world, { x: 0, y: 0, width: cols, height: rows });

  // Player entity
  let playerX = Math.floor(cols / 2);
  let playerY = Math.floor(rows / 2);
  const player = createTextEntity(world, {
    x: playerX, y: playerY, width: 1, height: 1,
  });
  setText(world, player, '@');

  // Status text
  const status = createTextEntity(world, {
    x: 2, y: rows - 2, width: cols - 4, height: 1,
  });
  setText(world, status, 'Arrow keys to move, q to quit');

  program.onKey((key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      app.shutdown();
      return;
    }

    if (key.name === 'up' && playerY > 1) playerY--;
    if (key.name === 'down' && playerY < rows - 3) playerY++;
    if (key.name === 'left' && playerX > 1) playerX--;
    if (key.name === 'right' && playerX < cols - 2) playerX++;

    setPosition(world, player, playerX, playerY);
    setText(world, status, \`Position: (\${playerX}, \${playerY})\`);
  });

  app.start();
}

main().catch(console.error);
`,
				},
				{ path: 'tsconfig.json', content: TSCONFIG_CONTENT },
			],
		},
		{
			name: 'list',
			description: 'Selectable list with keyboard navigation',
			category: 'Widgets',
			files: [
				{
					path: 'src/index.ts',
					content: `import {
  createApp,
  createBoxEntity,
  createTextEntity,
  setText,
} from 'blecsd';

async function main() {
  const app = await createApp({ fullscreen: true, fps: 30 });
  const { world, program, cols, rows } = app;

  const items = [
    'Hello World',
    'Dashboard',
    'Settings',
    'Help',
    'Quit',
  ];

  let selectedIndex = 0;

  // Container
  const listX = Math.floor(cols / 2) - 20;
  const listY = Math.floor(rows / 2) - Math.floor(items.length / 2) - 2;
  createBoxEntity(world, { x: listX, y: listY, width: 40, height: items.length + 4 });

  // Title
  const title = createTextEntity(world, {
    x: listX + 2, y: listY + 1, width: 36, height: 1,
  });
  setText(world, title, 'Select an option:');

  // List items
  const itemEntities = items.map((item, i) => {
    const eid = createTextEntity(world, {
      x: listX + 4, y: listY + 3 + i, width: 34, height: 1,
    });
    setText(world, eid, \`\${i === selectedIndex ? '> ' : '  '}\${item}\`);
    return eid;
  });

  function updateList() {
    items.forEach((item, i) => {
      setText(world, itemEntities[i]!, \`\${i === selectedIndex ? '> ' : '  '}\${item}\`);
    });
  }

  program.onKey((key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      app.shutdown();
      return;
    }

    if (key.name === 'up') {
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateList();
    } else if (key.name === 'down') {
      selectedIndex = (selectedIndex + 1) % items.length;
      updateList();
    } else if (key.name === 'return') {
      if (items[selectedIndex] === 'Quit') {
        app.shutdown();
      }
    }
  });

  app.start();
}

main().catch(console.error);
`,
				},
				{ path: 'tsconfig.json', content: TSCONFIG_CONTENT },
			],
		},
	] as const;
}

// =============================================================================
// TEMPLATE MANIFEST FETCHING
// =============================================================================

const MANIFEST_URL =
	'https://raw.githubusercontent.com/Kadajett/blECSd-Examples/main/manifest.json';

/**
 * Fetches the remote template manifest from GitHub.
 * Falls back to built-in templates on failure.
 */
export function fetchManifest(): Promise<readonly Template[]> {
	return new Promise((resolve) => {
		const builtins = getBuiltinTemplates();

		const req = httpsGet(MANIFEST_URL, { timeout: 5000 }, (res) => {
			if (res.statusCode !== 200) {
				resolve(builtins);
				return;
			}

			let data = '';
			res.on('data', (chunk: Buffer) => {
				data += chunk.toString();
			});
			res.on('end', () => {
				try {
					const remote = JSON.parse(data) as readonly Template[];
					// Merge: remote templates override builtins by name
					const merged = new Map<string, Template>();
					for (const t of builtins) {
						merged.set(t.name, t);
					}
					for (const t of remote) {
						merged.set(t.name, t);
					}
					resolve([...merged.values()]);
				} catch {
					resolve(builtins);
				}
			});
		});

		req.on('error', () => {
			resolve(builtins);
		});

		req.on('timeout', () => {
			req.destroy();
			resolve(builtins);
		});
	});
}

// =============================================================================
// ARGUMENT PARSING
// =============================================================================

const VALUE_FLAGS: Record<string, string> = {
	'--template': 'template',
	'-t': 'template',
	'--dir': 'dir',
	'-d': 'dir',
	'--pm': 'pm',
};

const BOOL_FLAGS: Record<string, string> = {
	'--list': 'list',
	'-l': 'list',
	'--skip-install': 'skipInstall',
};

const VALID_PMS = new Set<string>(['pnpm', 'yarn', 'npm']);

function isValidPm(val: string | undefined): val is PackageManager {
	return val !== undefined && VALID_PMS.has(val);
}

function classifyArg(
	arg: string,
):
	| { type: 'value'; key: string }
	| { type: 'bool'; key: string }
	| { type: 'skip' }
	| { type: 'positional' } {
	if (VALUE_FLAGS[arg]) return { type: 'value', key: VALUE_FLAGS[arg] };
	if (BOOL_FLAGS[arg]) return { type: 'bool', key: BOOL_FLAGS[arg] };
	if (arg === 'init' || arg.startsWith('-')) return { type: 'skip' };
	return { type: 'positional' };
}

/**
 * Parses CLI arguments into a config object.
 */
export function parseArgs(argv: readonly string[]): CliConfig {
	const values: Record<string, string | undefined> = {};
	const bools: Record<string, boolean> = {};
	let name: string | undefined;

	for (let i = 0; i < argv.length; i++) {
		const classified = classifyArg(argv[i] ?? '');
		if (classified.type === 'value') {
			values[classified.key] = argv[i + 1];
			i++;
		} else if (classified.type === 'bool') {
			bools[classified.key] = true;
		} else if (classified.type === 'positional' && !name) {
			name = argv[i];
		}
	}

	const hasExplicitDir = 'dir' in values;
	return {
		template: values.template,
		dir: values.dir ?? (name && !hasExplicitDir ? name : '.'),
		name,
		list: bools.list ?? false,
		skipInstall: bools.skipInstall ?? false,
		packageManager: isValidPm(values.pm) ? values.pm : undefined,
	};
}

// =============================================================================
// PACKAGE MANAGER DETECTION
// =============================================================================

/**
 * Detects which package manager is available.
 */
export function detectPackageManager(): PackageManager {
	try {
		execSync('pnpm --version', { stdio: 'ignore' });
		return 'pnpm';
	} catch {
		// not available
	}
	try {
		execSync('yarn --version', { stdio: 'ignore' });
		return 'yarn';
	} catch {
		// not available
	}
	return 'npm';
}

// =============================================================================
// INTERACTIVE PROMPTS
// =============================================================================

/**
 * Prompts user for a line of text.
 */
export function prompt(question: string, defaultValue?: string): Promise<string> {
	return new Promise((resolve) => {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const suffix = defaultValue ? ` (${defaultValue})` : '';
		rl.question(`  ${question}${suffix}: `, (answer) => {
			rl.close();
			resolve(answer.trim() || defaultValue || '');
		});
	});
}

/**
 * Prompts user to select from a numbered list.
 */
export function promptSelect<T>(
	question: string,
	options: readonly { label: string; value: T }[],
	defaultIndex = 0,
): Promise<T> {
	return new Promise((resolve) => {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		console.log('');
		for (let i = 0; i < options.length; i++) {
			const marker = i === defaultIndex ? '●' : '○';
			console.log(`  ${marker} ${i + 1}. ${options[i]?.label}`);
		}

		rl.question(`\n  ${question} (${defaultIndex + 1}): `, (answer) => {
			rl.close();
			const num = Number.parseInt(answer, 10);
			if (!Number.isNaN(num) && num >= 1 && num <= options.length) {
				const opt = options[num - 1];
				if (opt) resolve(opt.value);
				else resolve(options[defaultIndex]?.value as T);
			} else {
				resolve(options[defaultIndex]?.value as T);
			}
		});
	});
}

// =============================================================================
// INTERACTIVE TEMPLATE PICKER
// =============================================================================

/**
 * Prompts user to select a template interactively.
 */
export function pickTemplate(templates: readonly Template[]): Promise<Template | null> {
	return new Promise((resolve) => {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		console.log('\n  Available templates:\n');

		// Group by category
		const categories = new Map<string, Template[]>();
		for (const t of templates) {
			const list = categories.get(t.category) ?? [];
			list.push(t);
			categories.set(t.category, list);
		}

		let idx = 1;
		const indexMap = new Map<number, Template>();
		for (const [category, items] of categories) {
			console.log(`  ${category}:`);
			for (const t of items) {
				console.log(`    ${idx}. ${t.name} - ${t.description}`);
				indexMap.set(idx, t);
				idx++;
			}
			console.log('');
		}

		rl.question('  Select a template (number or name): ', (answer) => {
			rl.close();

			// Try as number
			const num = Number.parseInt(answer, 10);
			if (!Number.isNaN(num) && indexMap.has(num)) {
				resolve(indexMap.get(num) ?? null);
				return;
			}

			// Try as name
			const byName = templates.find((t) => t.name === answer.trim());
			resolve(byName ?? null);
		});
	});
}

// =============================================================================
// SCAFFOLDING
// =============================================================================

/**
 * Writes template files to the target directory.
 */
export function scaffoldTemplate(
	template: Template,
	targetDir: string,
	projectName?: string,
): void {
	const absDir = resolve(targetDir);

	if (!existsSync(absDir)) {
		mkdirSync(absDir, { recursive: true });
	}

	// Write template files
	for (const file of template.files) {
		const filePath = join(absDir, file.path);
		const fileDir = join(filePath, '..');
		if (!existsSync(fileDir)) {
			mkdirSync(fileDir, { recursive: true });
		}
		writeFileSync(filePath, file.content, 'utf-8');
	}

	// Write package.json with directory name
	const name = projectName || (basename(absDir) === '.' ? 'my-blecsd-app' : basename(absDir));
	const pkgJsonPath = join(absDir, 'package.json');
	if (!existsSync(pkgJsonPath)) {
		writeFileSync(pkgJsonPath, createPackageJson(name, template.description), 'utf-8');
	}
}

/**
 * Runs package manager install in the target directory.
 */
export function runInstall(targetDir: string, pm: PackageManager): boolean {
	const absDir = resolve(targetDir);
	try {
		console.log(`\n  Running ${pm} install...`);
		execSync(`${pm} install`, { cwd: absDir, stdio: 'inherit' });
		return true;
	} catch {
		console.error(`\n  Failed to run ${pm} install. Run it manually.`);
		return false;
	}
}

/**
 * Prints getting-started instructions.
 */
export function printInstructions(template: Template, targetDir: string, pm: string): void {
	const dir = targetDir === '.' ? '' : `  cd ${targetDir}\n`;
	console.log('\n  ✨ Done! Your blECSd project is ready.\n');
	if (dir) {
		console.log(dir);
	}
	console.log(`  ${pm} run dev     # Start development`);
	console.log(`  ${pm} run build   # Build for production`);
	console.log(`  ${pm} run start   # Run the built app\n`);
	console.log(`  Template: ${template.name} - ${template.description}`);
	console.log('  Docs: https://github.com/Kadajett/blECSd\n');
}

/**
 * Lists all available templates to stdout.
 */
export function listTemplates(templates: readonly Template[]): void {
	console.log('\n  Available blECSd templates:\n');

	const categories = new Map<string, Template[]>();
	for (const t of templates) {
		const list = categories.get(t.category) ?? [];
		list.push(t);
		categories.set(t.category, list);
	}

	for (const [category, items] of categories) {
		console.log(`  ${category}:`);
		for (const t of items) {
			console.log(`    ${t.name.padEnd(15)} ${t.description}`);
		}
		console.log('');
	}

	console.log('  Usage: npx blecsd init --template <name>\n');
}

// =============================================================================
// MAIN
// =============================================================================

/**
 * Resolves the template from config or interactive picker.
 */
async function resolveTemplate(
	config: CliConfig,
	templates: readonly Template[],
): Promise<Template | null> {
	if (config.template) {
		const found = templates.find((t) => t.name === config.template) ?? null;
		if (!found) {
			console.error(`\n  Error: Template "${config.template}" not found.`);
			console.error('  Use --list to see available templates.\n');
		}
		return found;
	}
	return pickTemplate(templates);
}

const PM_OPTIONS: readonly { label: string; value: PackageManager }[] = [
	{ label: 'pnpm', value: 'pnpm' },
	{ label: 'npm', value: 'npm' },
	{ label: 'yarn', value: 'yarn' },
];

/**
 * Resolves package manager from config, detection, or interactive prompt.
 */
async function resolvePackageManager(config: CliConfig): Promise<PackageManager> {
	if (config.packageManager) return config.packageManager;
	const detected = detectPackageManager();
	if (config.skipInstall) return detected;
	const defaultIdx = detected === 'pnpm' ? 0 : detected === 'npm' ? 1 : 2;
	return promptSelect<PackageManager>('Package manager', PM_OPTIONS, defaultIdx);
}

/**
 * Main CLI entry point.
 */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
	const config = parseArgs(argv);
	const templates = await fetchManifest();

	if (config.list) {
		listTemplates(templates);
		return;
	}

	console.log('\n  🧱 blECSd — Terminal UI Framework\n');

	const projectName = config.name || (await prompt('Project name', 'my-blecsd-app'));
	const targetDir = config.dir !== '.' ? config.dir : projectName;

	const selected = await resolveTemplate(config, templates);
	if (!selected) {
		console.error('\n  No template selected.\n');
		process.exitCode = 1;
		return;
	}

	const pm = await resolvePackageManager(config);

	console.log(`\n  Scaffolding "${selected.name}" into ${resolve(targetDir)}...`);
	scaffoldTemplate(selected, targetDir, projectName);

	if (!config.skipInstall) {
		runInstall(targetDir, pm);
	}

	printInstructions(selected, targetDir, pm);
}

/**
 * Top-level CLI dispatcher. Routes subcommands to their handlers.
 */
async function dispatch(argv: readonly string[]): Promise<void> {
	const subcommand = argv[0];

	if (subcommand === 'serve') {
		const { serveMain } = await import('./serve');
		return serveMain(argv.slice(1));
	}

	// Default: init subcommand (or no subcommand)
	const initArgs = subcommand === 'init' ? argv.slice(1) : argv;
	return main(initArgs);
}

// Run if invoked directly
const isDirectRun =
	process.argv[1]?.endsWith('init.js') ||
	process.argv[1]?.endsWith('init.ts') ||
	process.argv[1]?.endsWith('cli.js');

if (isDirectRun) {
	dispatch(process.argv.slice(2)).catch((err: unknown) => {
		console.error('CLI error:', err);
		process.exitCode = 1;
	});
}
