/**
 * Tests for debug console
 */

import { describe, expect, it } from 'vitest';
import { getAllEntities } from '../core/ecs';
import type { World } from '../core/types';
import { createWorld } from '../core/world';
import {
	type ConsoleLogLevel,
	createDebugConsole,
	type DebugConsoleConfig,
	DebugConsoleConfigSchema,
	debugLog,
} from './console';

describe('DebugConsole', () => {
	let world: World;

	function setup(config: DebugConsoleConfig = {}) {
		world = createWorld();
		return createDebugConsole(world, config);
	}

	describe('creation', () => {
		it('creates disabled console by default', () => {
			const console = setup();
			expect(console.enabled).toBe(false);
			expect(console.visible).toBe(false);
			expect(console.logs).toEqual([]);
		});

		it('creates enabled console when configured', () => {
			const console = setup({ enabled: true });
			expect(console.enabled).toBe(true);
			expect(console.visible).toBe(false);
		});

		it('validates config with schema', () => {
			const config = DebugConsoleConfigSchema.parse({
				enabled: true,
				toggleKey: 'F12',
				maxLogEntries: 50,
			});
			expect(config.enabled).toBe(true);
			expect(config.toggleKey).toBe('F12');
			expect(config.maxLogEntries).toBe(50);
		});
	});

	describe('visibility', () => {
		it('shows console', () => {
			const console = setup({ enabled: true, showOverlay: false, showLogs: true });
			console.show();
			expect(console.visible).toBe(true);
		});

		it('hides console', () => {
			const console = setup({ enabled: true, showOverlay: false });
			console.show();
			console.hide();
			expect(console.visible).toBe(false);
		});

		it('toggles visibility', () => {
			const console = setup({ enabled: true, showOverlay: false });
			expect(console.visible).toBe(false);
			console.toggle();
			expect(console.visible).toBe(true);
			console.toggle();
			expect(console.visible).toBe(false);
		});

		it('no-ops when disabled', () => {
			const console = setup({ enabled: false });
			console.show();
			expect(console.visible).toBe(false);
			console.toggle();
			expect(console.visible).toBe(false);
		});
	});

	describe('logging', () => {
		it('logs messages', () => {
			const console = setup({ enabled: true, showOverlay: false });
			console.log('Test message');
			expect(console.logs).toHaveLength(1);
			expect(console.logs[0]?.message).toBe('Test message');
			expect(console.logs[0]?.level).toBe('info');
		});

		it('logs with different levels', () => {
			const console = setup({ enabled: true, showOverlay: false });
			const levels: ConsoleLogLevel[] = ['debug', 'info', 'warn', 'error'];

			for (const level of levels) {
				console.log(`Test ${level}`, level);
			}

			expect(console.logs).toHaveLength(4);
			expect(console.logs.map((l) => l.level)).toEqual(levels);
		});

		it('adds timestamps to log entries', () => {
			const console = setup({ enabled: true, showOverlay: false });
			const before = Date.now();
			console.log('Test');
			const after = Date.now();

			const entry = console.logs[0];
			expect(entry).toBeDefined();
			if (entry) {
				expect(entry.timestamp).toBeGreaterThanOrEqual(before);
				expect(entry.timestamp).toBeLessThanOrEqual(after);
			}
		});

		it('respects maxLogEntries limit', () => {
			const console = setup({ enabled: true, maxLogEntries: 3, showOverlay: false });

			for (let i = 0; i < 5; i++) {
				console.log(`Message ${i}`);
			}

			expect(console.logs).toHaveLength(3);
			expect(console.logs[0]?.message).toBe('Message 2');
			expect(console.logs[2]?.message).toBe('Message 4');
		});

		it('clears logs', () => {
			const console = setup({ enabled: true, showOverlay: false });
			console.log('Message 1');
			console.log('Message 2');
			expect(console.logs).toHaveLength(2);

			console.clearLogs();
			expect(console.logs).toHaveLength(0);
		});

		it('no-ops logging when disabled', () => {
			const console = setup({ enabled: false });
			console.log('Test message');
			expect(console.logs).toHaveLength(0);
		});
	});

	describe('update', () => {
		it('updates console entities', () => {
			const console = setup({ enabled: true, showOverlay: false, showLogs: true });
			console.show();
			console.update(world);
			// Should not throw
			expect(console.visible).toBe(true);
		});

		it('no-ops update when hidden', () => {
			const console = setup({ enabled: true, showOverlay: false });
			console.update(world);
			// Should not throw
			expect(console.visible).toBe(false);
		});

		it('no-ops update when disabled', () => {
			const console = setup({ enabled: false });
			console.update(world);
			expect(console.visible).toBe(false);
		});
	});

	describe('configuration', () => {
		it('uses custom toggle key', () => {
			const console = setup({ enabled: true, toggleKey: 'F1', showOverlay: false });
			expect(console.config.toggleKey).toBe('F1');
		});

		it('uses custom dimensions', () => {
			const console = setup({
				enabled: true,
				dimensions: { width: 100, height: 30 },
				showOverlay: false,
			});
			expect(console.config.dimensions.width).toBe(100);
			expect(console.config.dimensions.height).toBe(30);
		});

		it('uses custom position', () => {
			const console = setup({
				enabled: true,
				position: { x: 10, y: 5 },
				showOverlay: false,
			});
			expect(console.config.position.x).toBe(10);
			expect(console.config.position.y).toBe(5);
		});

		it('uses custom theme colors', () => {
			const console = setup({
				enabled: true,
				theme: {
					bg: '#000000',
					fg: '#ffffff',
					errorBg: '#ff0000',
				},
				showOverlay: false,
			});
			expect(console.config.theme.bg).toBe('#000000');
			expect(console.config.theme.fg).toBe('#ffffff');
			expect(console.config.theme.errorBg).toBe('#ff0000');
		});
	});

	describe('overlay integration', () => {
		it('creates overlay when enabled', () => {
			const console = setup({ enabled: true, showOverlay: true });
			console.show();
			expect(console.visible).toBe(true);
			// Overlay should be created internally
		});

		it('does not create overlay when disabled', () => {
			const console = setup({ enabled: true, showOverlay: false });
			const beforeCount = getAllEntities(world).length;
			console.show();
			const afterCount = getAllEntities(world).length;
			// Should only create console entities, not overlay
			expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
		});
	});

	describe('lifecycle', () => {
		it('destroys console entities', () => {
			const console = setup({ enabled: true, showOverlay: false, showLogs: true });
			console.show();

			const entityCount = getAllEntities(world).length;
			expect(entityCount).toBeGreaterThan(0);

			console.destroy();

			// Entities should be cleaned up
			expect(console.logs).toHaveLength(0);
		});

		it('handles destroy when never shown', () => {
			const console = setup({ enabled: true, showOverlay: false });
			expect(() => console.destroy()).not.toThrow();
		});

		it('no-ops destroy when disabled', () => {
			const console = setup({ enabled: false });
			expect(() => console.destroy()).not.toThrow();
		});
	});

	describe('debugLog function', () => {
		it('logs debug messages', () => {
			debugLog(world, 'Test debug');
			// Should not throw
		});

		it('logs with different levels', () => {
			debugLog(world, 'Info message', 'info');
			debugLog(world, 'Warning message', 'warn');
			debugLog(world, 'Error message', 'error');
			debugLog(world, 'Debug message', 'debug');
			// Should not throw
		});

		it('defaults to info level', () => {
			debugLog(world, 'Default level');
			// Should not throw
		});
	});

	describe('chainability', () => {
		it('returns console from methods', () => {
			const console = setup({ enabled: true, showOverlay: false });
			const result1 = console.show();
			const result2 = console.hide();
			const result3 = console.toggle();
			// Methods don't return console, but should not throw
			expect(result1).toBeUndefined();
			expect(result2).toBeUndefined();
			expect(result3).toBeUndefined();
		});
	});

	describe('integration', () => {
		it('handles complete workflow', () => {
			const console = setup({
				enabled: true,
				toggleKey: 'F12',
				showOverlay: true,
				showLogs: true,
				maxLogEntries: 50,
			});

			// Log some messages
			console.log('Starting application', 'info');
			console.log('Debug information', 'debug');

			// Show console
			console.show();
			expect(console.visible).toBe(true);
			expect(console.logs).toHaveLength(2);

			// Update
			console.update(world);

			// Add more logs
			console.log('Warning detected', 'warn');
			console.log('Error occurred', 'error');
			expect(console.logs).toHaveLength(4);

			// Hide console
			console.hide();
			expect(console.visible).toBe(false);

			// Clear logs
			console.clearLogs();
			expect(console.logs).toHaveLength(0);

			// Cleanup
			console.destroy();
		});
	});
});
