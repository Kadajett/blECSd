import { beforeEach, describe, expect, it } from 'vitest';
import {
	BUILTIN_PHASE_NAMES,
	createPhaseManager,
	defaultPhaseManager,
	isBuiltinPhase,
	type PhaseManager,
} from './phaseManager';
import { LoopPhase } from './types';

describe('PhaseManager', () => {
	let manager: PhaseManager;

	beforeEach(() => {
		manager = createPhaseManager();
	});

	describe('createPhaseManager', () => {
		it('should create a new PhaseManager', () => {
			const pm = createPhaseManager();
			expect(pm.hasPhase).toBeTypeOf('function');
			expect(pm.getPhaseOrder).toBeTypeOf('function');
		});
	});

	describe('defaultPhaseManager', () => {
		beforeEach(() => {
			defaultPhaseManager.reset();
		});

		it('should be a PhaseManager instance', () => {
			expect(defaultPhaseManager.hasPhase).toBeTypeOf('function');
			expect(defaultPhaseManager.getPhaseOrder).toBeTypeOf('function');
		});
	});

	describe('isBuiltinPhase', () => {
		it('should return true for built-in phases', () => {
			expect(isBuiltinPhase(LoopPhase.INPUT)).toBe(true);
			expect(isBuiltinPhase(LoopPhase.UPDATE)).toBe(true);
			expect(isBuiltinPhase(LoopPhase.RENDER)).toBe(true);
			expect(isBuiltinPhase(LoopPhase.POST_RENDER)).toBe(true);
		});

		it('should return false for custom phases', () => {
			expect(isBuiltinPhase('custom_AI_1')).toBe(false);
			expect(isBuiltinPhase('anything')).toBe(false);
		});

		it('should return false for out-of-range numbers', () => {
			expect(isBuiltinPhase(-1 as LoopPhase)).toBe(false);
			expect(isBuiltinPhase(100 as LoopPhase)).toBe(false);
		});
	});

	describe('BUILTIN_PHASE_NAMES', () => {
		it('should have names for all built-in phases', () => {
			expect(BUILTIN_PHASE_NAMES[LoopPhase.INPUT]).toBe('INPUT');
			expect(BUILTIN_PHASE_NAMES[LoopPhase.EARLY_UPDATE]).toBe('EARLY_UPDATE');
			expect(BUILTIN_PHASE_NAMES[LoopPhase.UPDATE]).toBe('UPDATE');
			expect(BUILTIN_PHASE_NAMES[LoopPhase.LATE_UPDATE]).toBe('LATE_UPDATE');
			expect(BUILTIN_PHASE_NAMES[LoopPhase.PHYSICS]).toBe('PHYSICS');
			expect(BUILTIN_PHASE_NAMES[LoopPhase.LAYOUT]).toBe('LAYOUT');
			expect(BUILTIN_PHASE_NAMES[LoopPhase.RENDER]).toBe('RENDER');
			expect(BUILTIN_PHASE_NAMES[LoopPhase.POST_RENDER]).toBe('POST_RENDER');
		});
	});

	describe('initial state', () => {
		it('should have all built-in phases', () => {
			expect(manager.hasPhase(LoopPhase.INPUT)).toBe(true);
			expect(manager.hasPhase(LoopPhase.EARLY_UPDATE)).toBe(true);
			expect(manager.hasPhase(LoopPhase.UPDATE)).toBe(true);
			expect(manager.hasPhase(LoopPhase.LATE_UPDATE)).toBe(true);
			expect(manager.hasPhase(LoopPhase.PHYSICS)).toBe(true);
			expect(manager.hasPhase(LoopPhase.LAYOUT)).toBe(true);
			expect(manager.hasPhase(LoopPhase.RENDER)).toBe(true);
			expect(manager.hasPhase(LoopPhase.POST_RENDER)).toBe(true);
		});

		it('should have 8 built-in phases', () => {
			expect(manager.getPhaseCount()).toBe(8);
		});

		it('should have no custom phases', () => {
			expect(manager.getCustomPhaseCount()).toBe(0);
		});
	});

	describe('getPhaseOrder', () => {
		it('should return phases in correct order', () => {
			const order = manager.getPhaseOrder();

			expect(order[0]).toBe(LoopPhase.INPUT);
			expect(order[1]).toBe(LoopPhase.EARLY_UPDATE);
			expect(order[2]).toBe(LoopPhase.UPDATE);
			expect(order[3]).toBe(LoopPhase.LATE_UPDATE);
			expect(order[4]).toBe(LoopPhase.PHYSICS);
			expect(order[5]).toBe(LoopPhase.LAYOUT);
			expect(order[6]).toBe(LoopPhase.RENDER);
			expect(order[7]).toBe(LoopPhase.POST_RENDER);
		});

		it('should always have INPUT first', () => {
			const order = manager.getPhaseOrder();
			expect(order[0]).toBe(LoopPhase.INPUT);
		});

		it('should return readonly array', () => {
			const order = manager.getPhaseOrder();
			expect(order).toHaveLength(8);
		});
	});

	describe('registerPhase', () => {
		it('should add a custom phase after specified phase', () => {
			const aiPhase = manager.registerPhase('AI', LoopPhase.UPDATE);

			const order = manager.getPhaseOrder();
			const updateIndex = order.indexOf(LoopPhase.UPDATE);
			const aiIndex = order.indexOf(aiPhase);
			const lateUpdateIndex = order.indexOf(LoopPhase.LATE_UPDATE);

			expect(aiIndex).toBe(updateIndex + 1);
			expect(aiIndex).toBeLessThan(lateUpdateIndex);
		});

		it('should return a unique phase ID', () => {
			const phase1 = manager.registerPhase('AI', LoopPhase.UPDATE);
			const phase2 = manager.registerPhase('AI', LoopPhase.UPDATE);

			expect(phase1).not.toBe(phase2);
		});

		it('should support multiple custom phases after same phase', () => {
			const ai1 = manager.registerPhase('AI1', LoopPhase.UPDATE);
			const ai2 = manager.registerPhase('AI2', LoopPhase.UPDATE);

			const order = manager.getPhaseOrder();
			const updateIndex = order.indexOf(LoopPhase.UPDATE);
			const ai1Index = order.indexOf(ai1);
			const ai2Index = order.indexOf(ai2);
			const lateUpdateIndex = order.indexOf(LoopPhase.LATE_UPDATE);

			// Both should be after UPDATE and before LATE_UPDATE
			expect(ai1Index).toBeGreaterThan(updateIndex);
			expect(ai2Index).toBeGreaterThan(updateIndex);
			expect(ai1Index).toBeLessThan(lateUpdateIndex);
			expect(ai2Index).toBeLessThan(lateUpdateIndex);

			// When inserting after same phase, later insertions go closer to the reference
			// ai2 was inserted "after UPDATE", so it's between UPDATE and ai1
			expect(ai2Index).toBeLessThan(ai1Index);
		});

		it('should support custom phases after other custom phases', () => {
			const parent = manager.registerPhase('PARENT', LoopPhase.UPDATE);
			const child = manager.registerPhase('CHILD', parent);

			const order = manager.getPhaseOrder();
			const parentIndex = order.indexOf(parent);
			const childIndex = order.indexOf(child);

			expect(childIndex).toBe(parentIndex + 1);
		});

		it('should throw for unknown afterPhase', () => {
			expect(() => manager.registerPhase('TEST', 'unknown_phase')).toThrow(
				'Cannot register phase after unknown phase',
			);
		});

		it('should increment phase count', () => {
			const before = manager.getPhaseCount();
			manager.registerPhase('AI', LoopPhase.UPDATE);
			expect(manager.getPhaseCount()).toBe(before + 1);
		});

		it('should increment custom phase count', () => {
			expect(manager.getCustomPhaseCount()).toBe(0);
			manager.registerPhase('AI', LoopPhase.UPDATE);
			expect(manager.getCustomPhaseCount()).toBe(1);
		});
	});

	describe('unregisterPhase', () => {
		it('should remove custom phases', () => {
			const aiPhase = manager.registerPhase('AI', LoopPhase.UPDATE);

			const result = manager.unregisterPhase(aiPhase);

			expect(result).toBe(true);
			expect(manager.hasPhase(aiPhase)).toBe(false);
		});

		it('should throw when removing built-in phases', () => {
			expect(() => manager.unregisterPhase(LoopPhase.UPDATE)).toThrow(
				'Cannot remove built-in phase',
			);
		});

		it('should return false for unknown phases', () => {
			const result = manager.unregisterPhase('unknown');
			expect(result).toBe(false);
		});

		it('should decrement phase count', () => {
			const aiPhase = manager.registerPhase('AI', LoopPhase.UPDATE);
			const before = manager.getPhaseCount();

			manager.unregisterPhase(aiPhase);

			expect(manager.getPhaseCount()).toBe(before - 1);
		});
	});

	describe('getPhaseName', () => {
		it('should return names for built-in phases', () => {
			expect(manager.getPhaseName(LoopPhase.INPUT)).toBe('INPUT');
			expect(manager.getPhaseName(LoopPhase.UPDATE)).toBe('UPDATE');
			expect(manager.getPhaseName(LoopPhase.RENDER)).toBe('RENDER');
		});

		it('should return names for custom phases', () => {
			const aiPhase = manager.registerPhase('AI', LoopPhase.UPDATE);
			expect(manager.getPhaseName(aiPhase)).toBe('AI');
		});

		it('should return undefined for unknown phases', () => {
			expect(manager.getPhaseName('unknown')).toBeUndefined();
		});
	});

	describe('hasPhase', () => {
		it('should return true for existing phases', () => {
			const aiPhase = manager.registerPhase('AI', LoopPhase.UPDATE);

			expect(manager.hasPhase(LoopPhase.UPDATE)).toBe(true);
			expect(manager.hasPhase(aiPhase)).toBe(true);
		});

		it('should return false for non-existent phases', () => {
			expect(manager.hasPhase('unknown')).toBe(false);
		});
	});

	describe('isBuiltin', () => {
		it('should return true for built-in phases', () => {
			expect(manager.isBuiltin(LoopPhase.INPUT)).toBe(true);
			expect(manager.isBuiltin(LoopPhase.UPDATE)).toBe(true);
		});

		it('should return false for custom phases', () => {
			const aiPhase = manager.registerPhase('AI', LoopPhase.UPDATE);
			expect(manager.isBuiltin(aiPhase)).toBe(false);
		});

		it('should return false for unknown phases', () => {
			expect(manager.isBuiltin('unknown')).toBe(false);
		});
	});

	describe('getCustomPhases', () => {
		it('should return empty array when no custom phases', () => {
			expect(manager.getCustomPhases()).toEqual([]);
		});

		it('should return all custom phase IDs', () => {
			const ai1 = manager.registerPhase('AI1', LoopPhase.UPDATE);
			const ai2 = manager.registerPhase('AI2', LoopPhase.PHYSICS);

			const custom = manager.getCustomPhases();

			expect(custom).toContain(ai1);
			expect(custom).toContain(ai2);
			expect(custom).toHaveLength(2);
		});
	});

	describe('clearCustomPhases', () => {
		it('should remove all custom phases', () => {
			manager.registerPhase('AI1', LoopPhase.UPDATE);
			manager.registerPhase('AI2', LoopPhase.PHYSICS);

			manager.clearCustomPhases();

			expect(manager.getCustomPhaseCount()).toBe(0);
			expect(manager.getPhaseCount()).toBe(8);
		});

		it('should keep built-in phases', () => {
			manager.registerPhase('AI', LoopPhase.UPDATE);
			manager.clearCustomPhases();

			expect(manager.hasPhase(LoopPhase.UPDATE)).toBe(true);
			expect(manager.hasPhase(LoopPhase.RENDER)).toBe(true);
		});
	});

	describe('reset', () => {
		it('should restore to initial state', () => {
			manager.registerPhase('AI1', LoopPhase.UPDATE);
			manager.registerPhase('AI2', LoopPhase.PHYSICS);

			manager.reset();

			expect(manager.getPhaseCount()).toBe(8);
			expect(manager.getCustomPhaseCount()).toBe(0);
		});

		it('should reset phase counter', () => {
			manager.registerPhase('AI', LoopPhase.UPDATE);
			manager.reset();

			const newPhase = manager.registerPhase('AI', LoopPhase.UPDATE);
			expect(newPhase).toContain('_1'); // Counter reset
		});
	});

	describe('phase ordering', () => {
		it('should maintain INPUT as first phase with custom phases', () => {
			manager.registerPhase('EARLY', LoopPhase.INPUT);

			const order = manager.getPhaseOrder();

			expect(order[0]).toBe(LoopPhase.INPUT);
		});

		it('should correctly order many custom phases', () => {
			const a = manager.registerPhase('A', LoopPhase.UPDATE);
			const b = manager.registerPhase('B', a);
			const c = manager.registerPhase('C', b);

			const order = manager.getPhaseOrder();
			const updateIdx = order.indexOf(LoopPhase.UPDATE);
			const aIdx = order.indexOf(a);
			const bIdx = order.indexOf(b);
			const cIdx = order.indexOf(c);
			const lateUpdateIdx = order.indexOf(LoopPhase.LATE_UPDATE);

			expect(updateIdx).toBeLessThan(aIdx);
			expect(aIdx).toBeLessThan(bIdx);
			expect(bIdx).toBeLessThan(cIdx);
			expect(cIdx).toBeLessThan(lateUpdateIdx);
		});

		it('should handle phases at the end', () => {
			const after = manager.registerPhase('AFTER_POST_RENDER', LoopPhase.POST_RENDER);

			const order = manager.getPhaseOrder();
			const lastIdx = order.length - 1;

			expect(order[lastIdx]).toBe(after);
		});
	});
});
