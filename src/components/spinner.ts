/**
 * Spinner component for animated loading indicators.
 *
 * @module components/spinner
 */

import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Default spinner characters for animation.
 */
export const DEFAULT_SPINNER_CHARS = ['|', '/', '-', '\\'];

/**
 * Alternative spinner style using dots.
 */
export const DOTS_SPINNER_CHARS = ['.  ', '.. ', '...', ' ..', '  .', '   '];

/**
 * Braille spinner for unicode terminals.
 */
export const BRAILLE_SPINNER_CHARS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

/**
 * Block spinner using unicode blocks.
 */
export const BLOCK_SPINNER_CHARS = ['▖', '▘', '▝', '▗'];

/**
 * Default animation interval in milliseconds.
 */
export const DEFAULT_SPINNER_INTERVAL = 100;

/**
 * Spinner component store using SoA (Structure of Arrays).
 *
 * - `frame`: current animation frame index
 * - `frameCount`: total number of frames
 * - `interval`: time between frames in ms
 * - `elapsed`: accumulated time since last frame
 */
export const Spinner = {
	frame: new Uint8Array(DEFAULT_CAPACITY),
	frameCount: new Uint8Array(DEFAULT_CAPACITY),
	interval: new Uint16Array(DEFAULT_CAPACITY),
	elapsed: new Float32Array(DEFAULT_CAPACITY),
};

/**
 * Storage for spinner frame data (character arrays).
 * Maps entity ID to array of characters.
 */
const spinnerFrameStore = new Map<Entity, readonly string[]>();

/**
 * Set of entities that have spinner components.
 */
const spinnerEntities = new Set<Entity>();

/**
 * Spinner configuration options.
 */
export interface SpinnerOptions {
	/** Characters for each frame */
	frames?: readonly string[];
	/** Animation interval in ms (default: 100) */
	interval?: number;
}

/**
 * Spinner data for an entity.
 */
export interface SpinnerData {
	/** Current frame index */
	frame: number;
	/** Total frame count */
	frameCount: number;
	/** Animation interval (ms) */
	interval: number;
	/** Elapsed time since last frame */
	elapsed: number;
	/** Frame characters */
	frames: readonly string[];
}

/**
 * Adds a Spinner component to an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @param options - Spinner configuration
 */
export function addSpinner(_world: World, eid: Entity, options: SpinnerOptions = {}): void {
	const frames = options.frames ?? DEFAULT_SPINNER_CHARS;
	const interval = options.interval ?? DEFAULT_SPINNER_INTERVAL;

	Spinner.frame[eid] = 0;
	Spinner.frameCount[eid] = frames.length;
	Spinner.interval[eid] = interval;
	Spinner.elapsed[eid] = 0;

	spinnerFrameStore.set(eid, frames);
	spinnerEntities.add(eid);
}

/**
 * Removes a Spinner component from an entity.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 */
export function removeSpinner(_world: World, eid: Entity): void {
	if (spinnerEntities.has(eid)) {
		Spinner.frame[eid] = 0;
		Spinner.frameCount[eid] = 0;
		Spinner.interval[eid] = 0;
		Spinner.elapsed[eid] = 0;
		spinnerFrameStore.delete(eid);
		spinnerEntities.delete(eid);
	}
}

/**
 * Checks if an entity has a Spinner component.
 *
 * @param world - The ECS world
 * @param eid - Entity ID
 * @returns true if entity has Spinner
 */
export function hasSpinner(_world: World, eid: Entity): boolean {
	return spinnerEntities.has(eid);
}

/**
 * Gets the current spinner character for an entity.
 *
 * @param eid - Entity ID
 * @returns Current frame character, or empty string if not found
 */
export function getSpinnerChar(eid: Entity): string {
	const frames = spinnerFrameStore.get(eid);
	if (!frames) return '';

	const frame = Spinner.frame[eid] ?? 0;
	return frames[frame % frames.length] ?? '';
}

/**
 * Gets all spinner data for an entity.
 *
 * @param eid - Entity ID
 * @returns Spinner data, or null if not found
 */
export function getSpinnerData(eid: Entity): SpinnerData | null {
	const frames = spinnerFrameStore.get(eid);
	if (!frames) return null;

	return {
		frame: Spinner.frame[eid] ?? 0,
		frameCount: Spinner.frameCount[eid] ?? 0,
		interval: Spinner.interval[eid] ?? DEFAULT_SPINNER_INTERVAL,
		elapsed: Spinner.elapsed[eid] ?? 0,
		frames,
	};
}

/**
 * Sets the spinner animation interval.
 *
 * @param eid - Entity ID
 * @param interval - New interval in ms
 */
export function setSpinnerInterval(eid: Entity, interval: number): void {
	Spinner.interval[eid] = interval;
}

/**
 * Sets the spinner frame characters.
 *
 * @param eid - Entity ID
 * @param frames - New frame characters
 */
export function setSpinnerFrames(eid: Entity, frames: readonly string[]): void {
	spinnerFrameStore.set(eid, frames);
	Spinner.frameCount[eid] = frames.length;

	// Reset frame if out of bounds
	const currentFrame = Spinner.frame[eid] ?? 0;
	if (currentFrame >= frames.length) {
		Spinner.frame[eid] = 0;
	}
}

/**
 * Advances the spinner animation by one frame.
 *
 * @param eid - Entity ID
 * @returns The new frame index
 */
export function advanceSpinnerFrame(eid: Entity): number {
	const frameCount = Spinner.frameCount[eid] ?? 1;
	const nextFrame = ((Spinner.frame[eid] ?? 0) + 1) % frameCount;
	Spinner.frame[eid] = nextFrame;
	return nextFrame;
}

/**
 * Updates a spinner's elapsed time and potentially advances the frame.
 *
 * @param eid - Entity ID
 * @param deltaMs - Time elapsed since last update (ms)
 * @returns true if frame changed
 */
export function updateSpinner(eid: Entity, deltaMs: number): boolean {
	const elapsed = (Spinner.elapsed[eid] ?? 0) + deltaMs;
	const interval = Spinner.interval[eid] ?? DEFAULT_SPINNER_INTERVAL;

	if (elapsed >= interval) {
		advanceSpinnerFrame(eid);
		Spinner.elapsed[eid] = elapsed % interval;
		return true;
	}

	Spinner.elapsed[eid] = elapsed;
	return false;
}

/**
 * Resets a spinner to its initial state.
 *
 * @param eid - Entity ID
 */
export function resetSpinner(eid: Entity): void {
	Spinner.frame[eid] = 0;
	Spinner.elapsed[eid] = 0;
}

/**
 * Clears the spinner frame store (for testing).
 *
 * @internal
 */
export function resetSpinnerStore(): void {
	spinnerFrameStore.clear();
	spinnerEntities.clear();
}
