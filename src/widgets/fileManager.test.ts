/**
 * Tests for the FileManager widget.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPosition } from '../components/position';
import { getRenderable } from '../components/renderable';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import type { FileEntry } from './fileManager';
import {
	createFileManager,
	FileManager,
	FileManagerConfigSchema,
	fileManagerStateMap,
	handleFileManagerKey,
	isFileManager,
	resetFileManagerStore,
	setReadDirFn,
} from './fileManager';

// =============================================================================
// Mock data
// =============================================================================

function createMockEntries(dir: string): FileEntry[] {
	return [
		{ name: 'src', path: `${dir}/src`, isDirectory: true, size: 0 },
		{ name: 'docs', path: `${dir}/docs`, isDirectory: true, size: 0 },
		{ name: 'README.md', path: `${dir}/README.md`, isDirectory: false, size: 500 },
		{ name: 'package.json', path: `${dir}/package.json`, isDirectory: false, size: 200 },
		{ name: 'index.ts', path: `${dir}/index.ts`, isDirectory: false, size: 100 },
	];
}

function createMockEntriesWithHidden(dir: string): FileEntry[] {
	return [
		...createMockEntries(dir),
		{ name: '.gitignore', path: `${dir}/.gitignore`, isDirectory: false, size: 50 },
		{ name: '.env', path: `${dir}/.env`, isDirectory: false, size: 30 },
		{ name: '.config', path: `${dir}/.config`, isDirectory: true, size: 0 },
	];
}

function createSubdirEntries(dir: string): FileEntry[] {
	return [
		{ name: 'components', path: `${dir}/components`, isDirectory: true, size: 0 },
		{ name: 'utils', path: `${dir}/utils`, isDirectory: true, size: 0 },
		{ name: 'main.ts', path: `${dir}/main.ts`, isDirectory: false, size: 300 },
	];
}

function mockReadDir(dir: string): FileEntry[] {
	if (dir.endsWith('/src')) return createSubdirEntries(dir);
	return createMockEntries(dir);
}

function mockReadDirWithHidden(dir: string): FileEntry[] {
	if (dir.endsWith('/src')) return createSubdirEntries(dir);
	return createMockEntriesWithHidden(dir);
}

// =============================================================================
// Tests
// =============================================================================

describe('FileManager widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetFileManagerStore();
	});

	afterEach(() => {
		resetFileManagerStore();
	});

	// =========================================================================
	// Schema validation
	// =========================================================================

	describe('FileManagerConfigSchema', () => {
		it('validates empty config with defaults', () => {
			const result = FileManagerConfigSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.showHidden).toBe(false);
			}
		});

		it('validates all config options', () => {
			const result = FileManagerConfigSchema.safeParse({
				cwd: '/home/user',
				showHidden: true,
				filePattern: '*.ts',
				width: 50,
				height: 25,
				left: 10,
				top: 5,
				fg: '#ffffff',
				bg: '#333333',
				border: { type: 'line', fg: '#888888' },
				padding: 1,
			});
			expect(result.success).toBe(true);
		});

		it('validates numeric colors', () => {
			const result = FileManagerConfigSchema.safeParse({
				fg: 0xffffffff,
				bg: 0x333333ff,
			});
			expect(result.success).toBe(true);
		});

		it('validates padding as object', () => {
			const result = FileManagerConfigSchema.safeParse({
				padding: { left: 1, top: 2, right: 1, bottom: 0 },
			});
			expect(result.success).toBe(true);
		});

		it('rejects negative padding', () => {
			const result = FileManagerConfigSchema.safeParse({ padding: -5 });
			expect(result.success).toBe(false);
		});

		it('rejects non-positive width', () => {
			const result = FileManagerConfigSchema.safeParse({ width: 0 });
			expect(result.success).toBe(false);
		});

		it('rejects non-positive height', () => {
			const result = FileManagerConfigSchema.safeParse({ height: -1 });
			expect(result.success).toBe(false);
		});
	});

	// =========================================================================
	// Creation
	// =========================================================================

	describe('createFileManager', () => {
		it('creates a file manager with default config', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			expect(fm.eid).toBeDefined();
			expect(isFileManager(world, fm.eid)).toBe(true);
		});

		it('creates a file manager with custom config', () => {
			const fm = createFileManager(world, {
				cwd: '/test',
				width: 60,
				height: 30,
				left: 10,
				top: 5,
			});
			setReadDirFn(fm.eid, mockReadDir);

			expect(fm.getCwd()).toContain('test');
			const pos = getPosition(world, fm.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('marks entity as file manager in component', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			expect(FileManager.isFileManager[fm.eid]).toBe(1);
		});

		it('starts visible by default', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			const renderable = getRenderable(world, fm.eid);
			expect(renderable?.visible).toBe(true);
		});
	});

	// =========================================================================
	// setCwd / getCwd
	// =========================================================================

	describe('setCwd / getCwd', () => {
		it('setCwd changes the current directory', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);

			fm.setCwd('/other');

			expect(fm.getCwd()).toContain('other');
		});

		it('setCwd refreshes entries', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			const readFn = vi.fn(mockReadDir);
			setReadDirFn(fm.eid, readFn);

			fm.setCwd('/test/src');

			expect(readFn).toHaveBeenCalled();
			const entries = fm.getEntries();
			expect(entries.length).toBeGreaterThan(0);
		});

		it('setCwd resets selected index to 0', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			// Move selection down
			handleFileManagerKey(world, fm.eid, 'down');
			expect(FileManager.selectedIndex[fm.eid]).toBe(1);

			// Change directory
			fm.setCwd('/test/src');
			expect(FileManager.selectedIndex[fm.eid]).toBe(0);
		});

		it('setCwd returns widget for chaining', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);

			const result = fm.setCwd('/test/src');
			expect(result).toBe(fm);
		});
	});

	// =========================================================================
	// getSelected
	// =========================================================================

	describe('getSelected', () => {
		it('returns the first entry by default', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const selected = fm.getSelected();
			expect(selected).toBeDefined();
			// Directories come first when sorted
			expect(selected?.isDirectory).toBe(true);
		});

		it('returns the entry at the current selected index', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			handleFileManagerKey(world, fm.eid, 'down');
			handleFileManagerKey(world, fm.eid, 'down');

			const selected = fm.getSelected();
			expect(selected).toBeDefined();
		});

		it('returns undefined when no entries exist', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, () => []);
			fm.refresh();

			expect(fm.getSelected()).toBeUndefined();
		});
	});

	// =========================================================================
	// getEntries (sorted: dirs first)
	// =========================================================================

	describe('getEntries', () => {
		it('returns sorted entries with directories first', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const entries = fm.getEntries();
			// Find the index where files start
			let firstFileIndex = entries.length;
			for (let i = 0; i < entries.length; i++) {
				if (!entries[i]?.isDirectory) {
					firstFileIndex = i;
					break;
				}
			}

			// All entries before firstFileIndex should be directories
			for (let i = 0; i < firstFileIndex; i++) {
				expect(entries[i]?.isDirectory).toBe(true);
			}
			// All entries from firstFileIndex onward should be files
			for (let i = firstFileIndex; i < entries.length; i++) {
				expect(entries[i]?.isDirectory).toBe(false);
			}
		});

		it('sorts directories alphabetically', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const entries = fm.getEntries();
			const dirs = entries.filter((e) => e.isDirectory);
			for (let i = 1; i < dirs.length; i++) {
				const prev = dirs[i - 1] as FileEntry;
				const curr = dirs[i] as FileEntry;
				expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
			}
		});

		it('sorts files alphabetically', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const entries = fm.getEntries();
			const files = entries.filter((e) => !e.isDirectory);
			for (let i = 1; i < files.length; i++) {
				const prev = files[i - 1] as FileEntry;
				const curr = files[i] as FileEntry;
				expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
			}
		});

		it('hides hidden files by default', () => {
			const fm = createFileManager(world, { cwd: '/test', showHidden: false });
			setReadDirFn(fm.eid, mockReadDirWithHidden);
			fm.refresh();

			const entries = fm.getEntries();
			const hiddenEntries = entries.filter((e) => e.name.startsWith('.'));
			expect(hiddenEntries).toHaveLength(0);
		});

		it('shows hidden files when showHidden is true', () => {
			const fm = createFileManager(world, { cwd: '/test', showHidden: true });
			setReadDirFn(fm.eid, mockReadDirWithHidden);
			fm.refresh();

			const entries = fm.getEntries();
			const hiddenEntries = entries.filter((e) => e.name.startsWith('.'));
			expect(hiddenEntries.length).toBeGreaterThan(0);
		});

		it('filters by file pattern (directories always shown)', () => {
			const fm = createFileManager(world, { cwd: '/test', filePattern: '*.ts' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const entries = fm.getEntries();
			const files = entries.filter((e) => !e.isDirectory);
			for (const file of files) {
				expect(file.name.endsWith('.ts')).toBe(true);
			}
			// Directories should still be present
			const dirs = entries.filter((e) => e.isDirectory);
			expect(dirs.length).toBeGreaterThan(0);
		});

		it('returns empty array when directory read fails', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, () => {
				throw new Error('Permission denied');
			});
			fm.refresh();

			expect(fm.getEntries()).toHaveLength(0);
		});
	});

	// =========================================================================
	// show / hide
	// =========================================================================

	describe('show / hide', () => {
		it('show() makes the widget visible', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			fm.hide().show();

			const renderable = getRenderable(world, fm.eid);
			expect(renderable?.visible).toBe(true);
		});

		it('hide() makes the widget invisible', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			fm.hide();

			const renderable = getRenderable(world, fm.eid);
			expect(renderable?.visible).toBe(false);
		});

		it('show() returns widget for chaining', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			expect(fm.show()).toBe(fm);
		});

		it('hide() returns widget for chaining', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			expect(fm.hide()).toBe(fm);
		});
	});

	// =========================================================================
	// center / move / setPosition
	// =========================================================================

	describe('position', () => {
		it('center() centers the widget', () => {
			const fm = createFileManager(world, { cwd: '/test', width: 40, height: 20 });

			fm.center(80, 24);

			const pos = getPosition(world, fm.eid);
			expect(pos?.x).toBe(20); // (80 - 40) / 2
			expect(pos?.y).toBe(2); // (24 - 20) / 2
		});

		it('move() changes position by delta', () => {
			const fm = createFileManager(world, { cwd: '/test', left: 10, top: 5 });

			fm.move(5, -3);

			const pos = getPosition(world, fm.eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(2);
		});

		it('setPosition() sets absolute position', () => {
			const fm = createFileManager(world, { cwd: '/test' });

			fm.setPosition(50, 30);

			const pos = getPosition(world, fm.eid);
			expect(pos?.x).toBe(50);
			expect(pos?.y).toBe(30);
		});

		it('center() returns widget for chaining', () => {
			const fm = createFileManager(world, { cwd: '/test', width: 40, height: 20 });
			expect(fm.center(80, 24)).toBe(fm);
		});

		it('move() returns widget for chaining', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			expect(fm.move(1, 1)).toBe(fm);
		});

		it('setPosition() returns widget for chaining', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			expect(fm.setPosition(1, 1)).toBe(fm);
		});
	});

	// =========================================================================
	// Key handling
	// =========================================================================

	describe('handleFileManagerKey', () => {
		it('up moves selection up', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			handleFileManagerKey(world, fm.eid, 'down');
			handleFileManagerKey(world, fm.eid, 'down');
			handleFileManagerKey(world, fm.eid, 'up');

			expect(FileManager.selectedIndex[fm.eid]).toBe(1);
		});

		it('down moves selection down', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			handleFileManagerKey(world, fm.eid, 'down');

			expect(FileManager.selectedIndex[fm.eid]).toBe(1);
		});

		it('up does not go below 0', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			handleFileManagerKey(world, fm.eid, 'up');

			expect(FileManager.selectedIndex[fm.eid]).toBe(0);
		});

		it('down does not exceed entry count', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const entryCount = fm.getEntries().length;
			for (let i = 0; i < entryCount + 5; i++) {
				handleFileManagerKey(world, fm.eid, 'down');
			}

			expect(FileManager.selectedIndex[fm.eid]).toBe(entryCount - 1);
		});

		it('enter on directory navigates into it', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const navCb = vi.fn();
			fm.onNavigate(navCb);

			// First entry should be a directory (dirs sorted first)
			handleFileManagerKey(world, fm.eid, 'enter');

			expect(navCb).toHaveBeenCalledOnce();
			expect(fm.getCwd()).toContain('docs'); // 'docs' is alphabetically first dir
		});

		it('enter on file fires onSelect callback', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const selectCb = vi.fn();
			fm.onSelect(selectCb);

			// Navigate past directories to first file
			const dirs = fm.getEntries().filter((e) => e.isDirectory);
			for (let i = 0; i < dirs.length; i++) {
				handleFileManagerKey(world, fm.eid, 'down');
			}

			handleFileManagerKey(world, fm.eid, 'enter');

			expect(selectCb).toHaveBeenCalledOnce();
			expect(selectCb.mock.calls[0]?.[0]?.isDirectory).toBe(false);
		});

		it('backspace navigates to parent directory', () => {
			const fm = createFileManager(world, { cwd: '/test/nested' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const navCb = vi.fn();
			fm.onNavigate(navCb);

			handleFileManagerKey(world, fm.eid, 'backspace');

			expect(fm.getCwd()).toContain('test');
			expect(navCb).toHaveBeenCalledOnce();
		});

		it('returns false for non-file-manager entities', () => {
			const eid = addEntity(world);
			expect(handleFileManagerKey(world, eid, 'enter')).toBe(false);
		});

		it('returns false for unhandled keys', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			expect(handleFileManagerKey(world, fm.eid, 'tab')).toBe(false);
		});
	});

	// =========================================================================
	// Callbacks
	// =========================================================================

	describe('callbacks', () => {
		it('onSelect returns widget for chaining', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			expect(fm.onSelect(() => {})).toBe(fm);
		});

		it('onNavigate returns widget for chaining', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			expect(fm.onNavigate(() => {})).toBe(fm);
		});

		it('supports multiple onSelect callbacks', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const cb1 = vi.fn();
			const cb2 = vi.fn();
			fm.onSelect(cb1).onSelect(cb2);

			// Navigate to first file
			const dirs = fm.getEntries().filter((e) => e.isDirectory);
			for (let i = 0; i < dirs.length; i++) {
				handleFileManagerKey(world, fm.eid, 'down');
			}
			handleFileManagerKey(world, fm.eid, 'enter');

			expect(cb1).toHaveBeenCalledOnce();
			expect(cb2).toHaveBeenCalledOnce();
		});

		it('supports multiple onNavigate callbacks', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			const cb1 = vi.fn();
			const cb2 = vi.fn();
			fm.onNavigate(cb1).onNavigate(cb2);

			// Enter first directory
			handleFileManagerKey(world, fm.eid, 'enter');

			expect(cb1).toHaveBeenCalledOnce();
			expect(cb2).toHaveBeenCalledOnce();
		});
	});

	// =========================================================================
	// refresh
	// =========================================================================

	describe('refresh', () => {
		it('reloads entries from the filesystem', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			let callCount = 0;
			setReadDirFn(fm.eid, (dir) => {
				callCount++;
				return mockReadDir(dir);
			});

			fm.refresh();
			fm.refresh();

			expect(callCount).toBe(2);
		});

		it('clamps selected index when entries shrink', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			fm.refresh();

			// Move to last entry
			const entries = fm.getEntries();
			for (let i = 0; i < entries.length - 1; i++) {
				handleFileManagerKey(world, fm.eid, 'down');
			}

			// Replace with fewer entries
			setReadDirFn(fm.eid, () => [
				{ name: 'only.txt', path: '/test/only.txt', isDirectory: false, size: 10 },
			]);
			fm.refresh();

			expect(FileManager.selectedIndex[fm.eid]).toBe(0);
		});

		it('returns widget for chaining', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, mockReadDir);
			expect(fm.refresh()).toBe(fm);
		});
	});

	// =========================================================================
	// destroy
	// =========================================================================

	describe('destroy', () => {
		it('removes file manager marker', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			const eid = fm.eid;

			expect(isFileManager(world, eid)).toBe(true);
			fm.destroy();
			expect(isFileManager(world, eid)).toBe(false);
		});

		it('clears typed array data', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			const eid = fm.eid;

			fm.destroy();

			expect(FileManager.isFileManager[eid]).toBe(0);
			expect(FileManager.selectedIndex[eid]).toBe(0);
		});

		it('removes state from map', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			const eid = fm.eid;

			fm.destroy();

			expect(fileManagerStateMap.has(eid)).toBe(false);
		});
	});

	// =========================================================================
	// isFileManager utility
	// =========================================================================

	describe('isFileManager', () => {
		it('returns true for file manager entities', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			expect(isFileManager(world, fm.eid)).toBe(true);
		});

		it('returns false for non-file-manager entities', () => {
			const eid = addEntity(world);
			expect(isFileManager(world, eid)).toBe(false);
		});
	});

	// =========================================================================
	// resetFileManagerStore
	// =========================================================================

	describe('resetFileManagerStore', () => {
		it('clears all file manager state', () => {
			const fm1 = createFileManager(world, { cwd: '/test' });
			const fm2 = createFileManager(world, { cwd: '/test' });

			resetFileManagerStore();

			expect(FileManager.isFileManager[fm1.eid]).toBe(0);
			expect(FileManager.isFileManager[fm2.eid]).toBe(0);
			expect(fileManagerStateMap.size).toBe(0);
		});
	});

	// =========================================================================
	// Method chaining
	// =========================================================================

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const fm = createFileManager(world, { cwd: '/test', width: 40, height: 20 });
			setReadDirFn(fm.eid, mockReadDir);

			fm.show().setPosition(10, 10).move(5, 5).setCwd('/test').refresh().center(80, 24);

			const pos = getPosition(world, fm.eid);
			expect(pos?.x).toBe(20); // (80 - 40) / 2
			expect(pos?.y).toBe(2); // (24 - 20) / 2
		});
	});

	// =========================================================================
	// Error handling
	// =========================================================================

	describe('error handling', () => {
		it('handles readDir errors gracefully', () => {
			const fm = createFileManager(world, { cwd: '/test' });
			setReadDirFn(fm.eid, () => {
				throw new Error('EACCES: permission denied');
			});

			expect(() => fm.refresh()).not.toThrow();
			expect(fm.getEntries()).toHaveLength(0);
		});
	});
});
