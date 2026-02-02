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
	[LoopPhase.PHYSICS]: 'PHYSICS',
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
 * PhaseManager allows customizing the game loop execution order.
 *
 * Users can register custom phases that run between the default phases.
 * The INPUT phase is protected and always runs first.
 *
 * @example
 * ```typescript
 * import { PhaseManager, LoopPhase } from 'blecsd';
 *
 * const manager = new PhaseManager();
 *
 * // Add a custom phase after UPDATE
 * const aiPhase = manager.registerPhase('AI', LoopPhase.UPDATE);
 *
 * // Get all phases in order
 * const phases = manager.getPhaseOrder();
 * // [INPUT, EARLY_UPDATE, UPDATE, 'AI', LATE_UPDATE, ...]
 *
 * // Use with scheduler
 * for (const phase of phases) {
 *   scheduler.runPhase(world, phase);
 * }
 * ```
 */
export class PhaseManager {
	private phases: Map<PhaseId, PhaseEntry> = new Map();
	private customPhaseCounter = 0;
	private orderDirty = true;
	private cachedOrder: PhaseId[] = [];

	constructor() {
		this.initializeBuiltinPhases();
	}

	/**
	 * Initializes the built-in phases.
	 */
	private initializeBuiltinPhases(): void {
		for (let phase = LoopPhase.INPUT; phase <= LoopPhase.POST_RENDER; phase++) {
			this.phases.set(phase, {
				id: phase,
				name: BUILTIN_PHASE_NAMES[phase] ?? `PHASE_${phase}`,
				order: phase * 1000, // Leave room for custom phases
				isBuiltin: true,
			});
		}
		this.orderDirty = true;
	}

	/**
	 * Registers a custom phase to run after a specific phase.
	 *
	 * Custom phases cannot be inserted before INPUT (INPUT always runs first).
	 *
	 * @param name - Name for the custom phase (for debugging)
	 * @param afterPhase - The phase after which this custom phase should run
	 * @returns The ID for the new custom phase
	 * @throws Error if trying to insert before INPUT
	 *
	 * @example
	 * ```typescript
	 * // Add AI phase between UPDATE and LATE_UPDATE
	 * const aiPhase = manager.registerPhase('AI', LoopPhase.UPDATE);
	 *
	 * // Register a system to the custom phase
	 * scheduler.registerSystemToPhase(aiPhase, aiSystem);
	 * ```
	 */
	registerPhase(name: string, afterPhase: PhaseId): string {
		// Validate afterPhase exists
		const afterEntry = this.phases.get(afterPhase);
		if (!afterEntry) {
			throw new Error(`Cannot register phase after unknown phase: ${String(afterPhase)}`);
		}

		// Generate unique ID
		const phaseId = `custom_${name}_${++this.customPhaseCounter}`;

		// Find the order value between afterPhase and the next phase
		const afterOrder = afterEntry.order;
		const nextOrder = this.findNextPhaseOrder(afterOrder);
		const newOrder = afterOrder + (nextOrder - afterOrder) / 2;

		this.phases.set(phaseId, {
			id: phaseId,
			name,
			order: newOrder,
			isBuiltin: false,
		});

		this.orderDirty = true;

		return phaseId;
	}

	/**
	 * Finds the order value of the phase after the given order.
	 */
	private findNextPhaseOrder(afterOrder: number): number {
		let minNextOrder = Number.MAX_SAFE_INTEGER;

		for (const entry of this.phases.values()) {
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

	/**
	 * Unregisters a custom phase.
	 *
	 * Built-in phases cannot be removed.
	 *
	 * @param phaseId - The custom phase ID to remove
	 * @returns true if the phase was removed
	 * @throws Error if attempting to remove a built-in phase
	 */
	unregisterPhase(phaseId: PhaseId): boolean {
		const entry = this.phases.get(phaseId);

		if (!entry) {
			return false;
		}

		if (entry.isBuiltin) {
			throw new Error(`Cannot remove built-in phase: ${entry.name}`);
		}

		this.phases.delete(phaseId);
		this.orderDirty = true;

		return true;
	}

	/**
	 * Gets all phases in execution order.
	 *
	 * INPUT is always first, followed by other phases in their registered order.
	 *
	 * @returns Array of phase IDs in execution order
	 *
	 * @example
	 * ```typescript
	 * const phases = manager.getPhaseOrder();
	 * for (const phase of phases) {
	 *   console.log(manager.getPhaseName(phase));
	 * }
	 * ```
	 */
	getPhaseOrder(): readonly PhaseId[] {
		if (this.orderDirty) {
			this.rebuildOrder();
		}
		return this.cachedOrder;
	}

	/**
	 * Rebuilds the cached phase order.
	 */
	private rebuildOrder(): void {
		const entries = Array.from(this.phases.values());
		entries.sort((a, b) => a.order - b.order);
		this.cachedOrder = entries.map((e) => e.id);
		this.orderDirty = false;
	}

	/**
	 * Gets the name of a phase.
	 *
	 * @param phaseId - The phase ID
	 * @returns The phase name or undefined if not found
	 */
	getPhaseName(phaseId: PhaseId): string | undefined {
		return this.phases.get(phaseId)?.name;
	}

	/**
	 * Checks if a phase exists.
	 *
	 * @param phaseId - The phase ID to check
	 * @returns true if the phase exists
	 */
	hasPhase(phaseId: PhaseId): boolean {
		return this.phases.has(phaseId);
	}

	/**
	 * Checks if a phase is a built-in phase.
	 *
	 * @param phaseId - The phase ID to check
	 * @returns true if it's a built-in phase
	 */
	isBuiltin(phaseId: PhaseId): boolean {
		return this.phases.get(phaseId)?.isBuiltin ?? false;
	}

	/**
	 * Gets the count of all phases (built-in + custom).
	 */
	getPhaseCount(): number {
		return this.phases.size;
	}

	/**
	 * Gets the count of custom phases.
	 */
	getCustomPhaseCount(): number {
		let count = 0;
		for (const entry of this.phases.values()) {
			if (!entry.isBuiltin) {
				count++;
			}
		}
		return count;
	}

	/**
	 * Gets all custom phase IDs.
	 *
	 * @returns Array of custom phase IDs
	 */
	getCustomPhases(): string[] {
		const custom: string[] = [];
		for (const entry of this.phases.values()) {
			if (!entry.isBuiltin && typeof entry.id === 'string') {
				custom.push(entry.id);
			}
		}
		return custom;
	}

	/**
	 * Clears all custom phases, keeping only built-in phases.
	 */
	clearCustomPhases(): void {
		for (const [id, entry] of this.phases) {
			if (!entry.isBuiltin) {
				this.phases.delete(id);
			}
		}
		this.customPhaseCounter = 0;
		this.orderDirty = true;
	}

	/**
	 * Resets the manager to its initial state with only built-in phases.
	 */
	reset(): void {
		this.phases.clear();
		this.customPhaseCounter = 0;
		this.initializeBuiltinPhases();
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
 * const postPhysics = manager.registerPhase('POST_PHYSICS', LoopPhase.PHYSICS);
 *
 * // Get execution order
 * console.log(manager.getPhaseOrder());
 * ```
 */
export function createPhaseManager(): PhaseManager {
	return new PhaseManager();
}

/**
 * Default global phase manager.
 *
 * For simple use cases, you can use this shared instance.
 * For multiple game loops or isolation, create your own PhaseManager.
 */
export const defaultPhaseManager = new PhaseManager();
