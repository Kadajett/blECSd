/**
 * Dual-pane file manager system.
 * Manages multiple file panes with drag and drop support.
 * @module systems/dualPaneSystem
 */

import type { Entity, World } from 'blecsd';
import { packColor } from 'blecsd';
import type { FileStore, FileEntry } from '../data';
import type { FileManagerConfig } from '../config';

/**
 * Configuration for a single file pane.
 */
export interface PaneConfig {
	/** Unique identifier for the pane */
	id: string;
	/** Current directory path */
	path: string;
	/** Pane width (0-1 as percentage of available space) */
	widthRatio: number;
	/** Whether this pane is active/focused */
	isActive: boolean;
}

/**
 * State of all panes.
 */
export interface DualPaneState {
	/** All panes */
	panes: PaneConfig[];
	/** Active pane index */
	activePaneIndex: number;
	/** File stores for each pane */
	fileStores: Map<string, FileStore>;
	/** Entity IDs for each pane's list */
	paneEntities: Map<string, Entity>;
	/** Preview entity */
	previewEntity: Entity | null;
	/** Maximum number of panes allowed */
	maxPanes: number;
	/** Minimum pane width ratio */
	minPaneWidth: number;
}

/**
 * Drag state for file movement.
 */
export interface FileDragState {
	/** Whether a drag is in progress */
	isDragging: boolean;
	/** Source pane ID */
	sourcePaneId: string | null;
	/** Dragged file entries */
	draggedFiles: FileEntry[];
	/** Current drag position X */
	dragX: number;
	/** Current drag position Y */
	dragY: number;
	/** Target pane ID (when hovering over a pane) */
	targetPaneId: string | null;
}

/**
 * Colors for dual-pane UI.
 */
export const DUAL_PANE_COLORS = {
	paneActiveBorder: packColor(0, 180, 180),
	paneInactiveBorder: packColor(80, 80, 80),
	paneDivider: packColor(60, 60, 60),
	dragGhost: packColor(255, 255, 100),
	dragGhostBg: packColor(60, 60, 60),
	dropTargetHighlight: packColor(0, 255, 100),
	addPaneButton: packColor(100, 200, 100),
	removePaneButton: packColor(200, 100, 100),
};

/**
 * Creates initial dual-pane state.
 */
export function createDualPaneState(initialPath: string): DualPaneState {
	const initialPane: PaneConfig = {
		id: 'pane-0',
		path: initialPath,
		widthRatio: 0.5,
		isActive: true,
	};

	return {
		panes: [initialPane],
		activePaneIndex: 0,
		fileStores: new Map(),
		paneEntities: new Map(),
		previewEntity: null,
		maxPanes: 4,
		minPaneWidth: 0.15,
	};
}

/**
 * Creates initial drag state.
 */
export function createFileDragState(): FileDragState {
	return {
		isDragging: false,
		sourcePaneId: null,
		draggedFiles: [],
		dragX: 0,
		dragY: 0,
		targetPaneId: null,
	};
}

/**
 * Generates a unique pane ID.
 */
function generatePaneId(existingPanes: PaneConfig[]): string {
	const ids = existingPanes.map((p) => {
		const match = p.id.match(/pane-(\d+)/);
		return match ? Number.parseInt(match[1] ?? '0', 10) : 0;
	});
	const maxId = Math.max(0, ...ids);
	return `pane-${maxId + 1}`;
}

/**
 * Adds a new pane to the state.
 */
export function addPane(
	state: DualPaneState,
	path: string,
	insertAfterIndex?: number,
): DualPaneState {
	if (state.panes.length >= state.maxPanes) {
		return state;
	}

	const newPane: PaneConfig = {
		id: generatePaneId(state.panes),
		path,
		widthRatio: 0,
		isActive: false,
	};

	const insertIndex = insertAfterIndex !== undefined
		? insertAfterIndex + 1
		: state.panes.length;

	const newPanes = [
		...state.panes.slice(0, insertIndex),
		newPane,
		...state.panes.slice(insertIndex),
	];

	// Redistribute widths evenly
	const redistributedPanes = redistributePaneWidths(newPanes);

	return {
		...state,
		panes: redistributedPanes,
	};
}

/**
 * Removes a pane from the state.
 */
export function removePane(state: DualPaneState, paneId: string): DualPaneState {
	if (state.panes.length <= 1) {
		return state;
	}

	const paneIndex = state.panes.findIndex((p) => p.id === paneId);
	if (paneIndex === -1) {
		return state;
	}

	const newPanes = state.panes.filter((p) => p.id !== paneId);
	const redistributedPanes = redistributePaneWidths(newPanes);

	// Adjust active pane index if needed
	let newActiveIndex = state.activePaneIndex;
	if (paneIndex === state.activePaneIndex) {
		newActiveIndex = Math.min(paneIndex, newPanes.length - 1);
	} else if (paneIndex < state.activePaneIndex) {
		newActiveIndex = state.activePaneIndex - 1;
	}

	// Mark new active pane
	const finalPanes = redistributedPanes.map((p, i) => ({
		...p,
		isActive: i === newActiveIndex,
	}));

	return {
		...state,
		panes: finalPanes,
		activePaneIndex: newActiveIndex,
	};
}

/**
 * Redistributes pane widths evenly.
 */
function redistributePaneWidths(panes: PaneConfig[]): PaneConfig[] {
	if (panes.length === 0) return panes;

	const equalWidth = 1 / panes.length;
	return panes.map((p) => ({
		...p,
		widthRatio: equalWidth,
	}));
}

/**
 * Sets the active pane.
 */
export function setActivePane(state: DualPaneState, paneIndex: number): DualPaneState {
	if (paneIndex < 0 || paneIndex >= state.panes.length) {
		return state;
	}

	const newPanes = state.panes.map((p, i) => ({
		...p,
		isActive: i === paneIndex,
	}));

	return {
		...state,
		panes: newPanes,
		activePaneIndex: paneIndex,
	};
}

/**
 * Sets the active pane by ID.
 */
export function setActivePaneById(state: DualPaneState, paneId: string): DualPaneState {
	const paneIndex = state.panes.findIndex((p) => p.id === paneId);
	if (paneIndex === -1) {
		return state;
	}
	return setActivePane(state, paneIndex);
}

/**
 * Gets the active pane.
 */
export function getActivePane(state: DualPaneState): PaneConfig | undefined {
	return state.panes[state.activePaneIndex];
}

/**
 * Cycles to the next pane.
 */
export function cyclePane(state: DualPaneState, direction: 1 | -1): DualPaneState {
	const newIndex = (state.activePaneIndex + direction + state.panes.length) % state.panes.length;
	return setActivePane(state, newIndex);
}

/**
 * Updates a pane's path.
 */
export function updatePanePath(state: DualPaneState, paneId: string, newPath: string): DualPaneState {
	const newPanes = state.panes.map((p) =>
		p.id === paneId ? { ...p, path: newPath } : p
	);

	return {
		...state,
		panes: newPanes,
	};
}

/**
 * Starts a file drag operation.
 */
export function startFileDrag(
	dragState: FileDragState,
	paneId: string,
	files: FileEntry[],
	x: number,
	y: number,
): FileDragState {
	return {
		isDragging: true,
		sourcePaneId: paneId,
		draggedFiles: files,
		dragX: x,
		dragY: y,
		targetPaneId: null,
	};
}

/**
 * Updates drag position.
 */
export function updateFileDrag(
	dragState: FileDragState,
	x: number,
	y: number,
	targetPaneId: string | null,
): FileDragState {
	if (!dragState.isDragging) {
		return dragState;
	}

	return {
		...dragState,
		dragX: x,
		dragY: y,
		targetPaneId,
	};
}

/**
 * Ends a file drag operation.
 */
export function endFileDrag(dragState: FileDragState): FileDragState {
	return createFileDragState();
}

/**
 * Determines which pane is under a screen position.
 */
export function getPaneAtPosition(
	state: DualPaneState,
	x: number,
	totalWidth: number,
	startX = 0,
): PaneConfig | undefined {
	let currentX = startX;

	for (const pane of state.panes) {
		const paneWidth = Math.floor(totalWidth * pane.widthRatio);
		if (x >= currentX && x < currentX + paneWidth) {
			return pane;
		}
		currentX += paneWidth + 1; // +1 for divider
	}

	return undefined;
}

/**
 * Calculates pane layout bounds.
 */
export interface PaneBounds {
	paneId: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Calculates the layout bounds for all panes.
 */
export function calculatePaneBounds(
	state: DualPaneState,
	totalWidth: number,
	totalHeight: number,
	startX = 0,
	startY = 0,
	headerHeight = 2,
	footerHeight = 2,
): PaneBounds[] {
	const bounds: PaneBounds[] = [];
	let currentX = startX;
	const contentHeight = totalHeight - headerHeight - footerHeight;
	const dividerCount = state.panes.length - 1;
	const availableWidth = totalWidth - dividerCount;

	for (const pane of state.panes) {
		const paneWidth = Math.floor(availableWidth * pane.widthRatio);

		bounds.push({
			paneId: pane.id,
			x: currentX,
			y: startY + headerHeight,
			width: paneWidth,
			height: contentHeight,
		});

		currentX += paneWidth + 1; // +1 for divider
	}

	return bounds;
}

/**
 * Result of a file move operation.
 */
export interface FileMoveResult {
	success: boolean;
	movedFiles: string[];
	errors: string[];
}

/**
 * Checks if a file move is valid.
 */
export function canMoveFiles(
	state: DualPaneState,
	sourcePaneId: string,
	targetPaneId: string,
): boolean {
	// Can't move to same pane
	if (sourcePaneId === targetPaneId) {
		return false;
	}

	// Both panes must exist
	const sourcePane = state.panes.find((p) => p.id === sourcePaneId);
	const targetPane = state.panes.find((p) => p.id === targetPaneId);

	if (!sourcePane || !targetPane) {
		return false;
	}

	// Can't move to same directory
	if (sourcePane.path === targetPane.path) {
		return false;
	}

	return true;
}

/**
 * Action types for dual-pane operations.
 */
export type DualPaneAction =
	| { type: 'addPane'; path?: string }
	| { type: 'removePane'; paneId: string }
	| { type: 'setActivePane'; paneIndex: number }
	| { type: 'cyclePane'; direction: 1 | -1 }
	| { type: 'updatePath'; paneId: string; path: string }
	| { type: 'startDrag'; paneId: string; files: FileEntry[]; x: number; y: number }
	| { type: 'updateDrag'; x: number; y: number; targetPaneId: string | null }
	| { type: 'endDrag' }
	| { type: 'moveFiles'; sourcePaneId: string; targetPaneId: string; files: FileEntry[] };

/**
 * Processes a dual-pane action.
 */
export function processDualPaneAction(
	state: DualPaneState,
	dragState: FileDragState,
	action: DualPaneAction,
): { state: DualPaneState; dragState: FileDragState } {
	switch (action.type) {
		case 'addPane':
			return {
				state: addPane(state, action.path ?? state.panes[state.activePaneIndex]?.path ?? '/'),
				dragState,
			};

		case 'removePane':
			return {
				state: removePane(state, action.paneId),
				dragState,
			};

		case 'setActivePane':
			return {
				state: setActivePane(state, action.paneIndex),
				dragState,
			};

		case 'cyclePane':
			return {
				state: cyclePane(state, action.direction),
				dragState,
			};

		case 'updatePath':
			return {
				state: updatePanePath(state, action.paneId, action.path),
				dragState,
			};

		case 'startDrag':
			return {
				state,
				dragState: startFileDrag(dragState, action.paneId, action.files, action.x, action.y),
			};

		case 'updateDrag':
			return {
				state,
				dragState: updateFileDrag(dragState, action.x, action.y, action.targetPaneId),
			};

		case 'endDrag':
			return {
				state,
				dragState: endFileDrag(dragState),
			};

		case 'moveFiles':
			// File move is handled externally
			return { state, dragState };

		default:
			return { state, dragState };
	}
}
