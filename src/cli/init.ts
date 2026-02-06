#!/usr/bin/env node

/**
 * blECSd CLI scaffolding tool.
 *
 * Usage:
 *   npx blecsd init                    # Interactive: prompts for template selection
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
 * CLI configuration.
 */
export interface CliConfig {
	/** Template to scaffold (undefined = interactive) */
	readonly template?: string;
	/** Target directory */
	readonly dir: string;
	/** List available templates */
	readonly list: boolean;
	/** Skip npm install */
	readonly skipInstall: boolean;
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
			name: 'basic',
			description: 'Minimal blECSd app with a single box',
			category: 'Getting Started',
			files: [
				{
					path: 'src/index.ts',
					content: `import { createWorld, addEntity } from 'blecsd';
import { setPosition } from 'blecsd';
import { setDimensions } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

setPosition(world, eid, 0, 0);
setDimensions(world, eid, 40, 10);

console.log('blECSd app initialized!');
console.log('Entity:', eid);
console.log('World created with ECS architecture.');
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
					content: `import { createWorld, addEntity } from 'blecsd';
import { setPosition } from 'blecsd';
import { setDimensions } from 'blecsd';

// Create world and form entities
const world = createWorld();

// Create a form container
const formEid = addEntity(world);
setPosition(world, formEid, 2, 2);
setDimensions(world, formEid, 60, 20);

// Create input fields
const nameInput = addEntity(world);
setPosition(world, nameInput, 4, 4);
setDimensions(world, nameInput, 40, 1);

const emailInput = addEntity(world);
setPosition(world, emailInput, 4, 7);
setDimensions(world, emailInput, 40, 1);

// Create submit button
const submitBtn = addEntity(world);
setPosition(world, submitBtn, 4, 10);
setDimensions(world, submitBtn, 12, 3);

console.log('Form app initialized!');
console.log('Form entity:', formEid);
console.log('Inputs:', nameInput, emailInput);
console.log('Submit button:', submitBtn);
`,
				},
				{ path: 'tsconfig.json', content: TSCONFIG_CONTENT },
			],
		},
		{
			name: 'dashboard',
			description: 'Multi-panel dashboard with layout system',
			category: 'Widgets',
			files: [
				{
					path: 'src/index.ts',
					content: `import { createWorld, addEntity } from 'blecsd';
import { setPosition } from 'blecsd';
import { setDimensions } from 'blecsd';

const world = createWorld();

// Header panel
const header = addEntity(world);
setPosition(world, header, 0, 0);
setDimensions(world, header, 80, 3);

// Left sidebar
const sidebar = addEntity(world);
setPosition(world, sidebar, 0, 3);
setDimensions(world, sidebar, 20, 21);

// Main content area
const main = addEntity(world);
setPosition(world, main, 20, 3);
setDimensions(world, main, 60, 21);

// Status bar
const statusBar = addEntity(world);
setPosition(world, statusBar, 0, 24);
setDimensions(world, statusBar, 80, 1);

console.log('Dashboard initialized!');
console.log('Panels: header, sidebar, main, statusBar');
`,
				},
				{ path: 'tsconfig.json', content: TSCONFIG_CONTENT },
			],
		},
		{
			name: 'game',
			description: 'Game template with game loop, input handling, and ECS',
			category: 'Games',
			files: [
				{
					path: 'src/index.ts',
					content: `import { createWorld, addEntity } from 'blecsd';
import { createGameLoop, LoopPhase } from 'blecsd';
import { setPosition } from 'blecsd';

const world = createWorld();

// Create player entity
const player = addEntity(world);
setPosition(world, player, 40, 12);

// Create game loop
const loop = createGameLoop(world, { targetFPS: 60 });

// Input system
loop.registerSystem(LoopPhase.INPUT, (w) => {
  // Process input here
  return w;
});

// Update system
loop.registerSystem(LoopPhase.UPDATE, (w) => {
  // Game logic here
  return w;
});

// Render system
loop.registerSystem(LoopPhase.RENDER, (w) => {
  // Render here
  return w;
});

console.log('Game initialized!');
console.log('Player entity:', player);
console.log('Game loop created at 60 FPS');
console.log('Press Ctrl+C to exit');

loop.start();

process.on('SIGINT', () => {
  loop.stop();
  process.exit(0);
});
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
					content: `import { createWorld, addEntity } from 'blecsd';
import { createList } from 'blecsd';

const world = createWorld();
const eid = addEntity(world);

const list = createList(world, eid, {
  x: 5,
  y: 5,
  width: 30,
  height: 10,
  items: [
    'Option 1: Hello World',
    'Option 2: Dashboard',
    'Option 3: Settings',
    'Option 4: Help',
    'Option 5: Quit',
  ],
});

list.focus();

list.onSelect((index, item) => {
  console.log(\`Selected: \${item.text} at index \${index}\`);
});

list.onActivate((index, item) => {
  console.log(\`Activated: \${item.text}\`);
});

console.log('List widget initialized!');
console.log('Use arrow keys to navigate, Enter to select.');
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

/**
 * Parses CLI arguments into a config object.
 */
export function parseArgs(argv: readonly string[]): CliConfig {
	let template: string | undefined;
	let dir = '.';
	let list = false;
	let skipInstall = false;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--template' || arg === '-t') {
			template = argv[i + 1];
			i++;
		} else if (arg === '--dir' || arg === '-d') {
			dir = argv[i + 1] ?? '.';
			i++;
		} else if (arg === '--list' || arg === '-l') {
			list = true;
		} else if (arg === '--skip-install') {
			skipInstall = true;
		} else if (arg === 'init') {
			// Skip the 'init' subcommand itself
		}
	}

	return { template, dir, list, skipInstall };
}

// =============================================================================
// PACKAGE MANAGER DETECTION
// =============================================================================

/**
 * Detects which package manager is available.
 */
export function detectPackageManager(): 'pnpm' | 'yarn' | 'npm' {
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

		console.log('\n  blECSd - Terminal UI Library\n');
		console.log('  Available templates:\n');

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
export function scaffoldTemplate(template: Template, targetDir: string): void {
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
	const projectName = basename(absDir) === '.' ? 'my-blecsd-app' : basename(absDir);
	const pkgJsonPath = join(absDir, 'package.json');
	if (!existsSync(pkgJsonPath)) {
		writeFileSync(pkgJsonPath, createPackageJson(projectName, template.description), 'utf-8');
	}
}

/**
 * Runs package manager install in the target directory.
 */
export function runInstall(targetDir: string, pm: 'pnpm' | 'yarn' | 'npm'): boolean {
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
	console.log('\n  Done! Your blECSd project is ready.\n');
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
 * Main CLI entry point.
 */
export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
	const config = parseArgs(argv);
	const templates = await fetchManifest();

	// --list flag
	if (config.list) {
		listTemplates(templates);
		return;
	}

	let selected: Template | null = null;

	if (config.template) {
		// Direct template selection
		selected = templates.find((t) => t.name === config.template) ?? null;
		if (!selected) {
			console.error(`\n  Error: Template "${config.template}" not found.`);
			console.error('  Use --list to see available templates.\n');
			process.exitCode = 1;
			return;
		}
	} else {
		// Interactive picker
		selected = await pickTemplate(templates);
		if (!selected) {
			console.error('\n  No template selected.\n');
			process.exitCode = 1;
			return;
		}
	}

	// Scaffold
	console.log(`\n  Scaffolding "${selected.name}" into ${resolve(config.dir)}...`);
	scaffoldTemplate(selected, config.dir);

	// Install dependencies
	if (!config.skipInstall) {
		const pm = detectPackageManager();
		runInstall(config.dir, pm);
		printInstructions(selected, config.dir, pm);
	} else {
		const pm = detectPackageManager();
		printInstructions(selected, config.dir, pm);
	}
}

// Run if invoked directly
const isDirectRun =
	process.argv[1]?.endsWith('init.js') ||
	process.argv[1]?.endsWith('init.ts') ||
	process.argv[1]?.endsWith('cli.js');

if (isDirectRun) {
	main().catch((err: unknown) => {
		console.error('CLI error:', err);
		process.exitCode = 1;
	});
}
