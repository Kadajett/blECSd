/**
 * Phase management for configurable game loop execution order.
 *
 * Allows users to add custom phases between the default phases while
 * ensuring INPUT always runs first.
 *
 * @module core/phaseManager
 */

import { LoopPhase } from './types';

/**
 * A phase identifier - either a built-in LoopPhase or a custom string.
 */
export type PhaseId = LoopPhase | string;

/**
 * Phase entry with metadata.
 */
interface PhaseEntry {
	readonly id: PhaseId;
	readonly name: string;
	readonly order: number;
	readonly isBuiltin: boolean;
}

/**
 * Built-in phase names for reference.
 */
export const BUILTIN_PHASE_NAMES: Record<LoopPhase, string> = {
	[LoopPhase.INPUT]: 'INPUT',
	[LoopPhase.EARLY_UPDATE]: 'EARLY_UPDATE',
	[LoopPhase.UPDATE]: 'UPDATE',
	[LoopPhase.LATE_UPDATE]: 'LATE_UPDATE',
	[LoopPhase.ANIMATION]: 'PHYSICS',
	[LoopPhase.LAYOUT]: 'LAYOUT',
	[LoopPhase.RENDER]: 'RENDER',
	[LoopPhase.POST_RENDER]: 'POST_RENDER',
};

/**
 * Checks if a phase ID is a built-in LoopPhase.
 *
 * @param id - Phase identifier to check
 * @returns true if the phase is a built-in LoopPhase
 */
export function isBuiltinPhase(id: PhaseId): id is LoopPhase {
	return typeof id === 'number' && id >= LoopPhase.INPUT && id <= LoopPhase.POST_RENDER;
}

/**
 * PhaseManager interface for type-safe access.
 *
 * Allows customizing the game loop execution order.
 * Users can register custom phases that run between the default phases.
 * The INPUT phase is protected and always runs first.
 */
export interface PhaseManager {
	registerPhase(name: string, afterPhase: PhaseId): string;
	unregisterPhase(phaseId: PhaseId): boolean;
	getPhaseOrder(): readonly PhaseId[];
	getPhaseName(phaseId: PhaseId): string | undefined;
	hasPhase(phaseId: PhaseId): boolean;
	isBuiltin(phaseId: PhaseId): boolean;
	getPhaseCount(): number;
	getCustomPhaseCount(): number;
	getCustomPhases(): string[];
	clearCustomPhases(): void;
	reset(): void;
}

function initializeBuiltinPhases(phases: Map<PhaseId, PhaseEntry>): void {
	for (let phase = LoopPhase.INPUT; phase <= LoopPhase.POST_RENDER; phase++) {
		phases.set(phase, {
			id: phase,
			name: BUILTIN_PHASE_NAMES[phase] ?? `PHASE_${phase}`,
			order: phase * 1000, // Leave room for custom phases
			isBuiltin: true,
		});
	}
}

/**
 * Creates a new PhaseManager instance.
 *
 * @returns A new PhaseManager
 *
 * @example
 * ```typescript
 * import { createPhaseManager, LoopPhase } from 'blecsd';
 *
 * const manager = createPhaseManager();
 *
 * // Add custom phases
 * const preRender = manager.registerPhase('PRE_RENDER', LoopPhase.LAYOUT);
 * const postPhysics = manager.registerPhase('POST_PHYSICS', LoopPhase.ANIMATION);
 *
 * // Get execution order
 * console.log(manager.getPhaseOrder());
 * ```
 */
export function createPhaseManager(): PhaseManager {
	const phases = new Map<PhaseId, PhaseEntry>();
	let customPhaseCounter = 0;
	let orderDirty = true;
	let cachedOrder: PhaseId[] = [];

	initializeBuiltinPhases(phases);

	function findNextPhaseOrder(afterOrder: number): number {
		let minNextOrder = Number.MAX_SAFE_INTEGER;

		for (const entry of phases.values()) {
			if (entry.order > afterOrder && entry.order < minNextOrder) {
				minNextOrder = entry.order;
			}
		}

		// If no phase after, use a large value
		if (minNextOrder === Number.MAX_SAFE_INTEGER) {
			minNextOrder = afterOrder + 1000;
		}

		return minNextOrder;
	}

	function rebuildOrder(): void {
		const entries = Array.from(phases.values());
		entries.sort((a, b) => a.order - b.order);
		cachedOrder = entries.map((e) => e.id);
		orderDirty = false;
	}

	return {
		/**
		 * Registers a custom phase to run after a specific phase.
		 *
		 * @param name - Name for the custom phase (for debugging)
		 * @param afterPhase - The phase after which this custom phase should run
		 * @returns The ID for the new custom phase
		 * @throws Error if trying to insert before INPUT or after unknown phase
		 */
		registerPhase(name: string, afterPhase: PhaseId): string {
			// Validate afterPhase exists
			const afterEntry = phases.get(afterPhase);
			if (!afterEntry) {
				throw new Error(`Cannot register phase after unknown phase: ${String(afterPhase)}`);
			}

			// Generate unique ID
			const phaseId = `custom_${name}_${++customPhaseCounter}`;

			// Find the order value between afterPhase and the next phase
			const afterOrder = afterEntry.order;
			const nextOrder = findNextPhaseOrder(afterOrder);
			const newOrder = afterOrder + (nextOrder - afterOrder) / 2;

			phases.set(phaseId, {
				id: phaseId,
				name,
				order: newOrder,
				isBuiltin: false,
			});

			orderDirty = true;

			return phaseId;
		},

		/**
		 * Unregisters a custom phase.
		 * Built-in phases cannot be removed.
		 *
		 * @param phaseId - The custom phase ID to remove
		 * @returns true if the phase was removed
		 * @throws Error if attempting to remove a built-in phase
		 */
		unregisterPhase(phaseId: PhaseId): boolean {
			const entry = phases.get(phaseId);

			if (!entry) {
				return false;
			}

			if (entry.isBuiltin) {
				throw new Error(`Cannot remove built-in phase: ${entry.name}`);
			}

			phases.delete(phaseId);
			orderDirty = true;

			return true;
		},

		/**
		 * Gets all phases in execution order.
		 *
		 * @returns Array of phase IDs in execution order
		 */
		getPhaseOrder(): readonly PhaseId[] {
			if (orderDirty) {
				rebuildOrder();
			}
			return cachedOrder;
		},

		getPhaseName(phaseId: PhaseId): string | undefined {
			return phases.get(phaseId)?.name;
		},

		hasPhase(phaseId: PhaseId): boolean {
			return phases.has(phaseId);
		},

		isBuiltin(phaseId: PhaseId): boolean {
			return phases.get(phaseId)?.isBuiltin ?? false;
		},

		getPhaseCount(): number {
			return phases.size;
		},

		getCustomPhaseCount(): number {
			let count = 0;
			for (const entry of phases.values()) {
				if (!entry.isBuiltin) {
					count++;
				}
			}
			return count;
		},

		getCustomPhases(): string[] {
			const custom: string[] = [];
			for (const entry of phases.values()) {
				if (!entry.isBuiltin && typeof entry.id === 'string') {
					custom.push(entry.id);
				}
			}
			return custom;
		},

		clearCustomPhases(): void {
			for (const [id, entry] of phases) {
				if (!entry.isBuiltin) {
					phases.delete(id);
				}
			}
			customPhaseCounter = 0;
			orderDirty = true;
		},

		reset(): void {
			phases.clear();
			customPhaseCounter = 0;
			initializeBuiltinPhases(phases);
			orderDirty = true;
		},
	};
}

/**
 * Default global phase manager.
 *
 * For simple use cases, you can use this shared instance.
 * For multiple game loops or isolation, create your own PhaseManager.
 */
export const defaultPhaseManager = createPhaseManager();
