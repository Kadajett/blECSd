/**
 * Image widget animation helpers.
 *
 * @module widgets/image/animation-helpers
 */

import { markDirty } from 'blecsd/components';
import type { World } from 'blecsd/core';
import type { Bitmap } from '../../render/ansi-types';
import { clearImageCache, renderImageContent } from './helpers';
import {
	imageAnimationDelaysStore,
	imageAnimationFramesStore,
	imageAnimationLoopCountStore,
	imageAnimationTimerStore,
	imageBitmapStore,
	imageCurrentFrameStore,
	imageCurrentLoopStore,
} from './state';

/**
 * Updates a specific frame in the animation.
 */
export function updateFrame(
	world: World,
	eid: number,
	frameIndex: number,
	frames: readonly Bitmap[],
): void {
	const frame = frames[frameIndex];
	if (frame) {
		imageBitmapStore.set(eid, frame);
		renderImageContent(world, eid);
		markDirty(world, eid);
	}
}

/**
 * Schedules the next frame in the animation.
 */
export function scheduleNextFrame(
	eid: number,
	frameIndex: number,
	delays: readonly number[],
	advance: () => void,
): void {
	const timer = imageAnimationTimerStore.get(eid);
	if (timer !== undefined) {
		clearTimeout(timer);
	}

	const delay = delays[frameIndex] ?? 100;
	const newTimer = setTimeout(advance, delay);
	imageAnimationTimerStore.set(eid, newTimer as ReturnType<typeof setTimeout>);
}

/**
 * Advances to the next frame in the animation sequence.
 */
export function advanceFrame(
	world: World,
	eid: number,
	frames: readonly Bitmap[],
	delays: readonly number[],
	stopAnimationFn: () => void,
): void {
	let frameIndex = imageCurrentFrameStore.get(eid) ?? 0;
	frameIndex = (frameIndex + 1) % frames.length;

	if (frameIndex === 0) {
		const loopCount = imageAnimationLoopCountStore.get(eid) ?? 1;
		const currentLoop = (imageCurrentLoopStore.get(eid) ?? 0) + 1;
		imageCurrentLoopStore.set(eid, currentLoop);

		if (loopCount > 0 && currentLoop >= loopCount) {
			imageCurrentFrameStore.set(eid, 0);
			updateFrame(world, eid, 0, frames);
			stopAnimationFn();
			return;
		}
	}

	imageCurrentFrameStore.set(eid, frameIndex);
	updateFrame(world, eid, frameIndex, frames);
	scheduleNextFrame(eid, frameIndex, delays, () =>
		advanceFrame(world, eid, frames, delays, stopAnimationFn),
	);
}

/**
 * Starts the animation loop for an image entity.
 */
export function startAnimationLoop(world: World, eid: number, stopAnimationFn: () => void): void {
	const frames = imageAnimationFramesStore.get(eid);
	const delays = imageAnimationDelaysStore.get(eid);

	if (!frames || frames.length === 0 || !delays || delays.length === 0) {
		return;
	}

	stopAnimationFn();

	const initialDelay = delays[imageCurrentFrameStore.get(eid) ?? 0] ?? 100;
	const timer = setTimeout(
		() => advanceFrame(world, eid, frames, delays, stopAnimationFn),
		initialDelay,
	);
	imageAnimationTimerStore.set(eid, timer as ReturnType<typeof setTimeout>);
}

/**
 * Sets a specific frame in the animation.
 */
export function setAnimationFrame(world: World, eid: number, index: number): void {
	const frames = imageAnimationFramesStore.get(eid);
	if (!frames || frames.length === 0) {
		return;
	}

	const clampedIndex = Math.max(0, Math.min(index, frames.length - 1));
	imageCurrentFrameStore.set(eid, clampedIndex);

	const frame = frames[clampedIndex];
	if (frame) {
		imageBitmapStore.set(eid, frame);
		renderImageContent(world, eid);
		markDirty(world, eid);
	}
}

/**
 * Sets up a new animated image sequence.
 */
export function setupAnimatedImage(
	world: World,
	eid: number,
	frames: readonly Bitmap[],
	delays: readonly number[],
	loopCount: number,
	stopAnimationFn: () => void,
): void {
	if (frames.length === 0) {
		throw new Error('frames array cannot be empty');
	}
	if (frames.length !== delays.length) {
		throw new Error('frames and delays arrays must have the same length');
	}
	for (const delay of delays) {
		if (delay <= 0) {
			throw new Error('all frame delays must be positive numbers');
		}
	}

	stopAnimationFn();

	imageAnimationFramesStore.set(eid, frames);
	imageAnimationDelaysStore.set(eid, delays);
	imageAnimationLoopCountStore.set(eid, loopCount);
	imageCurrentFrameStore.set(eid, 0);
	imageCurrentLoopStore.set(eid, 0);

	imageBitmapStore.set(eid, frames[0] as Bitmap);
	clearImageCache(eid);
	renderImageContent(world, eid);
	markDirty(world, eid);
}

/**
 * Cleans up all image animation state for an entity.
 */
export function cleanupImageAnimation(eid: number): void {
	const timer = imageAnimationTimerStore.get(eid);
	if (timer !== undefined) {
		clearTimeout(timer);
	}
	imageAnimationFramesStore.delete(eid);
	imageAnimationDelaysStore.delete(eid);
	imageAnimationLoopCountStore.delete(eid);
	imageCurrentFrameStore.delete(eid);
	imageCurrentLoopStore.delete(eid);
	imageAnimationTimerStore.delete(eid);
}
