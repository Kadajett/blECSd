/**
 * High-level Game API for blECSd
 *
 * This module provides a simplified interface for creating terminal games.
 * It wraps the ECS implementation with a more intuitive API.
 *
 * @module game
 *
 * @example
 * ```typescript
 * import { createGame } from 'blecsd';
 *
 * const game = createGame({
 *   title: 'My Game',
 *   width: 80,
 *   height: 24,
 * });
 *
 * // Create UI elements
 * const box = game.createBox({ x: 5, y: 2, width: 20, height: 10 });
 * const text = game.createText({ x: 6, y: 3, text: 'Hello World!' });
 *
 * // Handle input
 * game.onKey('q', () => game.quit());
 * game.onKey('space', () => console.log('Space pressed!'));
 *
 * // Game loop hooks
 * game.onUpdate((dt) => {
 *   // Game logic here
 * });
 *
 * // Start the game
 * game.start();
 * ```
 */

export { createGame } from './createGame';
export type { GameConfig, ResolvedGameConfig } from './schema';
export { GameConfigSchema } from './schema';
export type {
	FixedUpdateCallback,
	Game,
	KeyHandler,
	MouseHandler,
	RenderCallback,
	UpdateCallback,
} from './types';
