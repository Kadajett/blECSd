/**
 * Game API tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hierarchy } from '../components/hierarchy';
import { LoopPhase } from '../core/types';
import { createGame, type Game, type GameConfig, GameConfigSchema } from './index';

describe('createGame', () => {
	let game: Game;

	afterEach(() => {
		if (game?.isRunning()) {
			game.stop();
		}
	});

	describe('initialization', () => {
		it('creates a game with default config', () => {
			game = createGame();

			expect(game.world).toBeDefined();
			expect(game.config.width).toBe(80);
			expect(game.config.height).toBe(24);
			expect(game.config.targetFPS).toBe(60);
			expect(game.screen).toBeDefined();
			expect(game.loop).toBeDefined();
		});

		it('creates a game with custom config', () => {
			game = createGame({
				title: 'Test Game',
				width: 120,
				height: 40,
				targetFPS: 30,
			});

			expect(game.config.width).toBe(120);
			expect(game.config.height).toBe(40);
			expect(game.config.targetFPS).toBe(30);
		});

		it('creates a root screen entity', () => {
			game = createGame();

			expect(game.screen).toBeGreaterThan(0);
			// Screen entity is created with base components by createScreenEntity
		});

		it('supports fixed timestep config', () => {
			game = createGame({
				fixedTimestep: {
					tickRate: 30,
					maxUpdatesPerFrame: 3,
					interpolate: false,
				},
			});

			const config = game.loop.getFixedTimestepConfig();
			expect(config).toBeDefined();
			expect(config?.tickRate).toBe(30);
			expect(config?.maxUpdatesPerFrame).toBe(3);
			expect(config?.interpolate).toBe(false);
		});
	});

	describe('widget creation', () => {
		beforeEach(() => {
			game = createGame();
		});

		it('creates a box entity', () => {
			const box = game.createBox({
				x: 5,
				y: 2,
				width: 20,
				height: 10,
			});

			expect(box).toBeGreaterThan(0);
			// Box entity is created with base components by createBoxEntity
		});

		it('creates a text entity', () => {
			const text = game.createText({
				x: 10,
				y: 5,
				text: 'Hello World!',
			});

			expect(text).toBeGreaterThan(0);
			// Text entity is created with base components by createTextEntity
		});

		it('creates a button entity', () => {
			const button = game.createButton({
				x: 5,
				y: 10,
				text: 'Click Me',
			});

			expect(button).toBeGreaterThan(0);
		});

		it('creates an input entity', () => {
			const input = game.createInput({
				x: 0,
				y: 0,
				width: 30,
			});

			expect(input).toBeGreaterThan(0);
		});

		it('creates a checkbox entity', () => {
			const checkbox = game.createCheckbox({
				x: 0,
				y: 0,
				label: 'Option',
			});

			expect(checkbox).toBeGreaterThan(0);
		});

		it('creates a select entity', () => {
			const select = game.createSelect({
				x: 0,
				y: 0,
				options: [
					{ label: 'Option 1', value: 'opt1' },
					{ label: 'Option 2', value: 'opt2' },
				],
			});

			expect(select).toBeGreaterThan(0);
		});

		it('creates a slider entity', () => {
			const slider = game.createSlider({
				x: 0,
				y: 0,
				width: 20,
				min: 0,
				max: 100,
			});

			expect(slider).toBeGreaterThan(0);
		});

		it('creates a progress bar entity', () => {
			const progressBar = game.createProgressBar({
				x: 0,
				y: 0,
				width: 30,
				min: 0,
				max: 100,
			});

			expect(progressBar).toBeGreaterThan(0);
		});

		it('creates a list entity', () => {
			const list = game.createList({
				x: 0,
				y: 0,
				width: 30,
				height: 10,
				items: ['Item 1', 'Item 2'],
			});

			expect(list).toBeGreaterThan(0);
		});

		it('creates a form entity', () => {
			const form = game.createForm({
				x: 0,
				y: 0,
				width: 40,
				height: 20,
			});

			expect(form).toBeGreaterThan(0);
		});

		it('attaches widgets to screen by default', () => {
			const box = game.createBox({ x: 0, y: 0, width: 10, height: 5 });

			// Box should be parented to screen via Hierarchy component
			expect(Hierarchy.parent[box]).toBe(game.screen);
		});

		it('attaches widgets to custom parent', () => {
			const parent = game.createBox({ x: 0, y: 0, width: 40, height: 20 });
			const child = game.createBox({ x: 1, y: 1, width: 10, height: 5, parent });

			expect(Hierarchy.parent[child]).toBe(parent);
		});
	});

	describe('input handling', () => {
		beforeEach(() => {
			game = createGame();
		});

		it('registers key handlers', () => {
			const handler = vi.fn();
			const unsub = game.onKey('q', handler);

			expect(typeof unsub).toBe('function');
		});

		it('unsubscribes key handlers', () => {
			const handler = vi.fn();
			const unsub = game.onKey('q', handler);

			unsub();
			// Handler should be removed
		});

		it('registers any-key handlers', () => {
			const handler = vi.fn();
			const unsub = game.onAnyKey(handler);

			expect(typeof unsub).toBe('function');
		});

		it('registers mouse handlers', () => {
			const handler = vi.fn();
			const unsub = game.onMouse(handler);

			expect(typeof unsub).toBe('function');
		});

		it('defines action bindings', () => {
			game.defineActions([
				{ action: 'jump', keys: ['space', 'w'] },
				{ action: 'shoot', keys: ['f'] },
			]);

			// Actions are registered
			expect(game.isActionActive('jump')).toBe(false);
			expect(game.isActionActive('shoot')).toBe(false);
		});
	});

	describe('game loop hooks', () => {
		beforeEach(() => {
			game = createGame();
		});

		it('registers update callbacks', () => {
			const callback = vi.fn();
			const unsub = game.onUpdate(callback);

			expect(typeof unsub).toBe('function');
		});

		it('unsubscribes update callbacks', () => {
			const callback = vi.fn();
			const unsub = game.onUpdate(callback);

			unsub();
		});

		it('registers fixed update callbacks', () => {
			game = createGame({
				fixedTimestep: { tickRate: 60 },
			});

			const callback = vi.fn();
			const unsub = game.onFixedUpdate(callback);

			expect(typeof unsub).toBe('function');
		});

		it('registers render callbacks', () => {
			const callback = vi.fn();
			const unsub = game.onRender(callback);

			expect(typeof unsub).toBe('function');
		});

		it('registers systems', () => {
			const system = vi.fn().mockReturnValue(game.world);
			const unsub = game.registerSystem(LoopPhase.UPDATE, system);

			expect(typeof unsub).toBe('function');
		});

		it('unregisters systems', () => {
			const system = vi.fn().mockReturnValue(game.world);
			const unsub = game.registerSystem(LoopPhase.UPDATE, system);

			unsub();
		});
	});

	describe('lifecycle', () => {
		beforeEach(() => {
			game = createGame();
		});

		it('starts the game loop', () => {
			expect(game.isRunning()).toBe(false);

			game.start();

			expect(game.isRunning()).toBe(true);

			game.stop();
		});

		it('stops the game loop', () => {
			game.start();
			expect(game.isRunning()).toBe(true);

			game.stop();
			expect(game.isRunning()).toBe(false);
		});

		it('pauses the game loop', () => {
			game.start();
			expect(game.isPaused()).toBe(false);

			game.pause();
			expect(game.isPaused()).toBe(true);

			game.stop();
		});

		it('resumes from pause', () => {
			game.start();
			game.pause();
			expect(game.isPaused()).toBe(true);

			game.resume();
			expect(game.isPaused()).toBe(false);
			expect(game.isRunning()).toBe(true);

			game.stop();
		});

		it('quits the game', () => {
			game.start();
			expect(game.isRunning()).toBe(true);

			game.quit();
			expect(game.isRunning()).toBe(false);
		});

		it('gets loop stats', () => {
			const stats = game.getStats();

			expect(typeof stats.fps).toBe('number');
			expect(typeof stats.frameTime).toBe('number');
			expect(typeof stats.frameCount).toBe('number');
			expect(typeof stats.runningTime).toBe('number');
		});
	});
});

describe('GameConfigSchema', () => {
	it('validates valid config', () => {
		const config: GameConfig = {
			title: 'My Game',
			width: 80,
			height: 24,
			targetFPS: 60,
		};

		const result = GameConfigSchema.parse(config);

		expect(result.title).toBe('My Game');
		expect(result.width).toBe(80);
		expect(result.height).toBe(24);
		expect(result.targetFPS).toBe(60);
	});

	it('applies defaults', () => {
		const result = GameConfigSchema.parse({});

		expect(result.width).toBe(80);
		expect(result.height).toBe(24);
		expect(result.targetFPS).toBe(60);
		expect(result.mouse).toBe(true);
		expect(result.alternateScreen).toBe(true);
		expect(result.hideCursor).toBe(true);
	});

	it('validates fixed timestep config', () => {
		const result = GameConfigSchema.parse({
			fixedTimestep: {
				tickRate: 30,
			},
		});

		expect(result.fixedTimestep?.tickRate).toBe(30);
		expect(result.fixedTimestep?.maxUpdatesPerFrame).toBe(5);
		expect(result.fixedTimestep?.interpolate).toBe(true);
	});

	it('rejects invalid width', () => {
		expect(() => GameConfigSchema.parse({ width: -10 })).toThrow();
	});

	it('rejects invalid height', () => {
		expect(() => GameConfigSchema.parse({ height: 0 })).toThrow();
	});
});
