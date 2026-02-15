/**
 * Internal utility functions for Split Pane Widget.
 *
 * @module widgets/splitPane/utils
 */

import { hexToColor } from '../../components/renderable';
import type { DirtyRect, PaneScrollState, PaneViewport, SplitDirection } from './types';

/**
 * Parses a color value to a number.
 */
export function parseColor(color: string | number): number {
	if (typeof color === 'string') {
		return hexToColor(color);
	}
	return color;
}

/**
 * Parses position values to numbers.
 */
export function parsePositionToNumber(value: string | number | undefined): number {
	if (value === undefined) return 0;
	if (typeof value === 'number') return value;

	// Handle keyword positions
	if (value === 'left' || value === 'top') return 0;
	if (value === 'center') return 50;
	if (value === 'right' || value === 'bottom') return 100;

	// Handle percentage strings like "50%"
	if (typeof value === 'string' && value.endsWith('%')) {
		const numericPortion = Number.parseFloat(value.slice(0, -1));
		if (!Number.isNaN(numericPortion)) {
			return numericPortion;
		}
	}

	return 0;
}

/**
 * Parses dimension values.
 */
export function parseDimension(value: string | number | undefined): number | `${number}%` | 'auto' {
	if (value === undefined) return 'auto';
	if (typeof value === 'string') {
		if (value === 'auto') return 'auto';
		return value as `${number}%`;
	}
	return value;
}

/**
 * Normalizes ratios so they sum to 1.0.
 */
export function normalizeRatios(ratios: readonly number[]): number[] {
	const sum = ratios.reduce((a, b) => a + b, 0);
	if (sum === 0) return ratios.map(() => 1 / ratios.length);
	return ratios.map((r) => r / sum);
}

/**
 * Creates default equal ratios for N panes.
 */
export function defaultRatios(count: number): number[] {
	if (count <= 0) return [];
	return new Array(count).fill(1 / count) as number[];
}

/**
 * Computes pane viewports from ratios, container bounds, and direction.
 */
export function computeViewports(
	containerX: number,
	containerY: number,
	containerWidth: number,
	containerHeight: number,
	direction: SplitDirection,
	ratios: readonly number[],
	dividerSize: number,
): PaneViewport[] {
	const paneCount = ratios.length;
	if (paneCount === 0) return [];

	const totalDividerSpace = dividerSize * (paneCount - 1);
	const availableSpace =
		direction === 'horizontal'
			? containerWidth - totalDividerSpace
			: containerHeight - totalDividerSpace;

	const clampedSpace = Math.max(0, availableSpace);
	const viewports: PaneViewport[] = [];
	let offset = 0;
	let usedPaneSpace = 0;

	for (let i = 0; i < paneCount; i++) {
		const isLastPane = i === paneCount - 1;
		// Last pane fills remaining pane space to avoid rounding gaps
		const paneSize = isLastPane
			? Math.max(1, clampedSpace - usedPaneSpace)
			: Math.max(1, Math.round(clampedSpace * (ratios[i] ?? 0)));

		if (direction === 'horizontal') {
			viewports.push({
				x: containerX + offset,
				y: containerY,
				width: paneSize,
				height: containerHeight,
			});
		} else {
			viewports.push({
				x: containerX,
				y: containerY + offset,
				width: containerWidth,
				height: paneSize,
			});
		}

		offset += paneSize;
		usedPaneSpace += paneSize;
		if (!isLastPane) {
			offset += dividerSize;
		}
	}

	return viewports;
}

/**
 * Clamps a ratio change to respect minimum pane sizes.
 */
export function clampRatioChange(
	ratios: readonly number[],
	dividerIndex: number,
	delta: number,
	minPaneSize: number,
	totalSpace: number,
): number[] {
	const newRatios = [...ratios];
	const minRatio = totalSpace > 0 ? minPaneSize / totalSpace : 0;

	const leftRatio = (newRatios[dividerIndex] ?? 0) + delta;
	const rightRatio = (newRatios[dividerIndex + 1] ?? 0) - delta;

	if (leftRatio < minRatio) {
		const correctedDelta = minRatio - (newRatios[dividerIndex] ?? 0);
		newRatios[dividerIndex] = minRatio;
		newRatios[dividerIndex + 1] = (newRatios[dividerIndex + 1] ?? 0) - correctedDelta;
	} else if (rightRatio < minRatio) {
		const correctedDelta = (newRatios[dividerIndex + 1] ?? 0) - minRatio;
		newRatios[dividerIndex] = (newRatios[dividerIndex] ?? 0) + correctedDelta;
		newRatios[dividerIndex + 1] = minRatio;
	} else {
		newRatios[dividerIndex] = leftRatio;
		newRatios[dividerIndex + 1] = rightRatio;
	}

	return newRatios;
}

/**
 * Computes dirty rects from a viewport change.
 */
export function computeResizeDirtyRects(
	oldViewports: readonly PaneViewport[],
	newViewports: readonly PaneViewport[],
	containerX: number,
	containerY: number,
	containerWidth: number,
	containerHeight: number,
): DirtyRect[] {
	const rects: DirtyRect[] = [];

	for (let i = 0; i < Math.max(oldViewports.length, newViewports.length); i++) {
		const oldVp = oldViewports[i];
		const newVp = newViewports[i];

		if (!oldVp || !newVp) {
			// Pane added or removed - dirty the entire area
			const vp = newVp ?? oldVp;
			if (vp) rects.push(vp);
			continue;
		}

		if (
			oldVp.x !== newVp.x ||
			oldVp.y !== newVp.y ||
			oldVp.width !== newVp.width ||
			oldVp.height !== newVp.height
		) {
			// Union the old and new bounds
			const minX = Math.min(oldVp.x, newVp.x);
			const minY = Math.min(oldVp.y, newVp.y);
			const maxX = Math.max(oldVp.x + oldVp.width, newVp.x + newVp.width);
			const maxY = Math.max(oldVp.y + oldVp.height, newVp.y + newVp.height);
			rects.push({
				x: Math.max(containerX, minX),
				y: Math.max(containerY, minY),
				width: Math.min(containerX + containerWidth, maxX) - Math.max(containerX, minX),
				height: Math.min(containerY + containerHeight, maxY) - Math.max(containerY, minY),
			});
		}
	}

	return rects;
}

/**
 * Creates a new pane scroll state.
 */
export function createPaneScrollState(): PaneScrollState {
	return { scrollX: 0, scrollY: 0, contentWidth: 0, contentHeight: 0 };
}

/**
 * Clamps scroll values to valid bounds.
 */
export function clampScroll(scroll: PaneScrollState, viewport: PaneViewport): void {
	const maxX = Math.max(0, scroll.contentWidth - viewport.width);
	const maxY = Math.max(0, scroll.contentHeight - viewport.height);
	scroll.scrollX = Math.max(0, Math.min(scroll.scrollX, maxX));
	scroll.scrollY = Math.max(0, Math.min(scroll.scrollY, maxY));
}
