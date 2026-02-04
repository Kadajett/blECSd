/**
 * Viewport output system: encodes PixelFramebuffer via the selected backend
 * and stores the encoded result for consumption by the rendering pipeline.
 *
 * For cell-based backends (braille, halfblock, sextant): produces cell arrays
 * that can be written to a ScreenBuffer via setCell().
 *
 * For escape-based backends (sixel, kitty): produces raw escape sequences
 * that can be written directly to the terminal output stream.
 *
 * @module 3d/systems/viewportOutputSystem
 */

import { query } from 'bitecs';
import type { Entity, System, World } from '../../core/types';
import { createBackendByType } from '../backends/detection';
import type { RendererBackend } from '../backends/types';
import { Viewport3D } from '../components/viewport3d';
import type { EncodedOutput } from '../schemas/backends';
import { framebufferStore } from './rasterSystem';

/** Backend type name lookup from Viewport3D.backendType numeric values. */
const BACKEND_TYPE_NAMES: ReadonlyArray<'braille' | 'halfblock' | 'sextant' | 'sixel' | 'kitty'> = [
	'braille', // 0 = auto -> default to braille
	'braille', // 1
	'halfblock', // 2
	'sextant', // 3
	'sixel', // 4
	'kitty', // 5
];

/**
 * Per-viewport cached backend instances. Created on first use and reused
 * until the viewport's backend type changes.
 */
export const backendStore = new Map<number, RendererBackend>();

/**
 * Per-viewport encoded output from the last frame.
 * Consumers read this to write cells to ScreenBuffer or escape sequences to terminal.
 */
export const outputStore = new Map<number, ViewportOutput>();

/**
 * Encoded output for a viewport, including positioning information.
 */
export interface ViewportOutput {
	/** The viewport entity this output belongs to. */
	readonly viewportEid: Entity;
	/** Screen column position (viewport left). */
	readonly screenX: number;
	/** Screen row position (viewport top). */
	readonly screenY: number;
	/** The backend that produced this output. */
	readonly backendType: string;
	/** The encoded output (cells and/or escape sequences). */
	readonly encoded: EncodedOutput;
}

/**
 * Clear the backend store. Useful for testing.
 */
export function clearBackendStore(): void {
	backendStore.clear();
}

/**
 * Clear the output store. Useful for testing.
 */
export function clearOutputStore(): void {
	outputStore.clear();
}

/**
 * Get or create the renderer backend for a viewport entity.
 * Caches the backend and recreates it if the backend type changes.
 */
function resolveBackend(vpEid: Entity): RendererBackend {
	const typeIdx = Viewport3D.backendType[vpEid] as number;
	const typeName = BACKEND_TYPE_NAMES[typeIdx] ?? 'braille';

	const existing = backendStore.get(vpEid);
	if (existing && existing.type === typeName) {
		return existing;
	}

	const backend = createBackendByType(typeName);
	backendStore.set(vpEid, backend);
	return backend;
}

/**
 * Viewport output system. Encodes per-viewport framebuffers via their
 * selected backend and stores the result in outputStore.
 *
 * Runs after rasterSystem in the RENDER phase.
 *
 * @param world - ECS world
 * @returns The world (unmodified reference)
 *
 * @example
 * ```typescript
 * import { viewportOutputSystem, outputStore } from 'blecsd/3d/systems';
 *
 * viewportOutputSystem(world);
 *
 * for (const [vpEid, output] of outputStore) {
 *   if (output.encoded.cells) {
 *     for (const cell of output.encoded.cells) {
 *       setCell(buffer, cell.x, cell.y, createCell(cell.char, cell.fg, cell.bg));
 *     }
 *   }
 *   if (output.encoded.escape) {
 *     process.stdout.write(output.encoded.escape);
 *   }
 * }
 * ```
 */
export const viewportOutputSystem: System = (world: World): World => {
	outputStore.clear();

	const viewports = query(world, [Viewport3D]) as Entity[];

	for (const vpEid of viewports) {
		const fb = framebufferStore.get(vpEid);
		if (!fb) continue;

		const backend = resolveBackend(vpEid);
		const screenX = Viewport3D.left[vpEid] as number;
		const screenY = Viewport3D.top[vpEid] as number;

		const encoded = backend.encode(fb, screenX, screenY);

		outputStore.set(vpEid, {
			viewportEid: vpEid,
			screenX,
			screenY,
			backendType: backend.type,
			encoded,
		});
	}

	return world;
};
