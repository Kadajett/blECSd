/**
 * Image Widget State
 *
 * State management for image widgets including component definition
 * and state stores.
 *
 * @module widgets/image/state
 */

import type { Entity } from 'blecsd/core';
import type { GraphicsManagerState } from 'blecsd/terminal';
import type { Bitmap, CellMap, RenderMode } from '../../render/ansi';
import type { ImageType } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

// =============================================================================
// COMPONENT TAG
// =============================================================================

/**
 * Image component marker for identifying image entities.
 */
export const Image = {
	/** Tag indicating this is an image widget (1 = yes) */
	isImage: new Uint8Array(DEFAULT_CAPACITY),
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

/** Maps entity IDs to their bitmap data */
export const imageBitmapStore = new Map<Entity, Bitmap>();

/** Maps entity IDs to their image type */
export const imageTypeStore = new Map<Entity, ImageType>();

/** Maps entity IDs to their render mode */
export const imageRenderModeStore = new Map<Entity, RenderMode>();

/** Maps entity IDs to their dither setting */
export const imageDitherStore = new Map<Entity, boolean>();

/** Maps entity IDs to their last rendered CellMap */
export const imageCellMapStore = new Map<Entity, CellMap>();

/** Maps entity IDs to their visibility state */
export const imageVisibleStore = new Map<Entity, boolean>();

/** Maps entity IDs to their aspect ratio preservation flag */
export const imagePreserveAspectRatioStore = new Map<Entity, boolean>();

/** Maps entity IDs to their animation frames */
export const imageAnimationFramesStore = new Map<Entity, readonly Bitmap[]>();

/** Maps entity IDs to their frame delays (in milliseconds) */
export const imageAnimationDelaysStore = new Map<Entity, readonly number[]>();

/** Maps entity IDs to their loop count (0 = infinite) */
export const imageAnimationLoopCountStore = new Map<Entity, number>();

/** Maps entity IDs to their current frame index */
export const imageCurrentFrameStore = new Map<Entity, number>();

/** Maps entity IDs to their animation timer handle */
export const imageAnimationTimerStore = new Map<
	Entity,
	ReturnType<typeof setTimeout> | undefined
>();

/** Maps entity IDs to their current loop iteration */
export const imageCurrentLoopStore = new Map<Entity, number>();

/** Maps entity IDs to their rendered CellMap cache (keyed by render parameters) */
export const imageCellMapCacheStore = new Map<Entity, Map<string, CellMap>>();

/** Maps entity IDs to their render version (incremented on bitmap/mode changes for cache invalidation) */
export const imageRenderVersionStore = new Map<Entity, number>();

/** Maps entity IDs to their graphics manager (for overlay mode) */
export const imageGraphicsManagerStore = new Map<Entity, GraphicsManagerState>();
