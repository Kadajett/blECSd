import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import { createScheduler, getDeltaTime, type Scheduler } from './scheduler';
import type { System } from './types';
import { LoopPhase } from './types';

describe('Scheduler', () => {
	let scheduler: Scheduler;

	beforeEach(() => {
		scheduler = createScheduler();
	});

	describe('createScheduler', () => {
		it('creates a new scheduler instance', () => {
			const s = createScheduler();
			expect(s.registerSystem).toBeTypeOf('function');
		});
	});

	describe('registerSystem', () => {
		it('registers a system to a phase', () => {
			const system: System = (world) => world;

			scheduler.registerSystem(LoopPhase.UPDATE, system);

			expect(scheduler.getSystemsForPhase(LoopPhase.UPDATE)).toContain(system);
		});

		it('throws when registering to INPUT phase', () => {
			const system: System = (world) => world;

			expect(() => {
				scheduler.registerSystem(LoopPhase.INPUT, system);
			}).toThrow('Cannot register systems to INPUT phase');
		});

		it('registers multiple systems to same phase', () => {
			const system1: System = (world) => world;
			const system2: System = (world) => world;

			scheduler.registerSystem(LoopPhase.UPDATE, system1);
			scheduler.registerSystem(LoopPhase.UPDATE, system2);

			const systems = scheduler.getSystemsForPhase(LoopPhase.UPDATE);
			expect(systems).toContain(system1);
			expect(systems).toContain(system2);
		});

		it('registers systems to different phases', () => {
			const updateSystem: System = (world) => world;
			const renderSystem: System = (world) => world;

			scheduler.registerSystem(LoopPhase.UPDATE, updateSystem);
			scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

			expect(scheduler.getSystemsForPhase(LoopPhase.UPDATE)).toContain(updateSystem);
			expect(scheduler.getSystemsForPhase(LoopPhase.RENDER)).toContain(renderSystem);
		});
	});

	describe('unregisterSystem', () => {
		it('removes a system from its phase', () => {
			const system: System = (world) => world;

			scheduler.registerSystem(LoopPhase.UPDATE, system);
			scheduler.unregisterSystem(system);

			expect(scheduler.getSystemsForPhase(LoopPhase.UPDATE)).not.toContain(system);
		});

		it('handles unregistering non-existent system', () => {
			const system: System = (world) => world;

			// Should not throw
			scheduler.unregisterSystem(system);
		});

		it('does not affect INPUT phase systems', () => {
			const inputSystem: System = (world) => world;

			scheduler.registerInputSystem(inputSystem);
			scheduler.unregisterSystem(inputSystem);

			// Input system should still be there
			expect(scheduler.getSystemsForPhase(LoopPhase.INPUT)).toContain(inputSystem);
		});
	});

	describe('registerInputSystem', () => {
		it('registers an internal input system', () => {
			const inputSystem: System = (world) => world;

			scheduler.registerInputSystem(inputSystem);

			expect(scheduler.getSystemsForPhase(LoopPhase.INPUT)).toContain(inputSystem);
		});

		it('can be unregistered with unregisterInputSystem', () => {
			const inputSystem: System = (world) => world;

			scheduler.registerInputSystem(inputSystem);
			scheduler.unregisterInputSystem(inputSystem);

			expect(scheduler.getSystemsForPhase(LoopPhase.INPUT)).not.toContain(inputSystem);
		});
	});

	describe('run', () => {
		it('runs systems in phase order', () => {
			const world = createWorld();
			const order: string[] = [];

			const earlySystem: System = (w) => {
				order.push('early');
				return w;
			};
			const updateSystem: System = (w) => {
				order.push('update');
				return w;
			};
			const lateSystem: System = (w) => {
				order.push('late');
				return w;
			};
			const renderSystem: System = (w) => {
				order.push('render');
				return w;
			};

			scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
			scheduler.registerSystem(LoopPhase.EARLY_UPDATE, earlySystem);
			scheduler.registerSystem(LoopPhase.LATE_UPDATE, lateSystem);
			scheduler.registerSystem(LoopPhase.UPDATE, updateSystem);

			scheduler.run(world, 0.016);

			expect(order).toEqual(['early', 'update', 'late', 'render']);
		});

		it('runs INPUT systems before all other phases', () => {
			const world = createWorld();
			const order: string[] = [];

			const inputSystem: System = (w) => {
				order.push('input');
				return w;
			};
			const updateSystem: System = (w) => {
				order.push('update');
				return w;
			};

			scheduler.registerSystem(LoopPhase.UPDATE, updateSystem);
			scheduler.registerInputSystem(inputSystem);

			scheduler.run(world, 0.016);

			expect(order[0]).toBe('input');
		});

		it('runs systems by priority within phase', () => {
			const world = createWorld();
			const order: string[] = [];

			const systemA: System = (w) => {
				order.push('A');
				return w;
			};
			const systemB: System = (w) => {
				order.push('B');
				return w;
			};
			const systemC: System = (w) => {
				order.push('C');
				return w;
			};

			scheduler.registerSystem(LoopPhase.UPDATE, systemC, 20);
			scheduler.registerSystem(LoopPhase.UPDATE, systemA, 0);
			scheduler.registerSystem(LoopPhase.UPDATE, systemB, 10);

			scheduler.run(world, 0.016);

			expect(order).toEqual(['A', 'B', 'C']);
		});

		it('passes world through all systems', () => {
			const world = createWorld();

			const system1: System = vi.fn((w) => w);
			const system2: System = vi.fn((w) => w);

			scheduler.registerSystem(LoopPhase.UPDATE, system1);
			scheduler.registerSystem(LoopPhase.UPDATE, system2);

			scheduler.run(world, 0.016);

			expect(system1).toHaveBeenCalledWith(world);
			expect(system2).toHaveBeenCalledWith(world);
		});

		it('sets delta time accessible via getDeltaTime', () => {
			const world = createWorld();
			let capturedDt = 0;

			const system: System = (w) => {
				capturedDt = getDeltaTime();
				return w;
			};

			scheduler.registerSystem(LoopPhase.UPDATE, system);
			scheduler.run(world, 0.033);

			expect(capturedDt).toBe(0.033);
		});

		it('returns the world', () => {
			const world = createWorld();

			const result = scheduler.run(world, 0.016);

			expect(result).toBe(world);
		});
	});

	describe('getSystemsForPhase', () => {
		it('returns empty array for empty phase', () => {
			const systems = scheduler.getSystemsForPhase(LoopPhase.UPDATE);

			expect(systems).toEqual([]);
		});

		it('returns systems in priority order', () => {
			const systemA: System = (w) => w;
			const systemB: System = (w) => w;

			scheduler.registerSystem(LoopPhase.UPDATE, systemB, 10);
			scheduler.registerSystem(LoopPhase.UPDATE, systemA, 0);

			const systems = scheduler.getSystemsForPhase(LoopPhase.UPDATE);

			expect(systems[0]).toBe(systemA);
			expect(systems[1]).toBe(systemB);
		});

		it('returns a copy of the systems array', () => {
			const system: System = (w) => w;
			scheduler.registerSystem(LoopPhase.UPDATE, system);

			const systems = scheduler.getSystemsForPhase(LoopPhase.UPDATE);
			systems.pop();

			expect(scheduler.getSystemsForPhase(LoopPhase.UPDATE)).toContain(system);
		});
	});

	describe('getSystemCount', () => {
		it('returns 0 for empty phase', () => {
			expect(scheduler.getSystemCount(LoopPhase.UPDATE)).toBe(0);
		});

		it('returns correct count', () => {
			const system1: System = (w) => w;
			const system2: System = (w) => w;

			scheduler.registerSystem(LoopPhase.UPDATE, system1);
			scheduler.registerSystem(LoopPhase.UPDATE, system2);

			expect(scheduler.getSystemCount(LoopPhase.UPDATE)).toBe(2);
		});

		it('returns count for INPUT phase', () => {
			const inputSystem: System = (w) => w;
			scheduler.registerInputSystem(inputSystem);

			expect(scheduler.getSystemCount(LoopPhase.INPUT)).toBe(1);
		});
	});

	describe('getTotalSystemCount', () => {
		it('returns 0 when empty', () => {
			expect(scheduler.getTotalSystemCount()).toBe(0);
		});

		it('returns total across all phases', () => {
			const s1: System = (w) => w;
			const s2: System = (w) => w;
			const s3: System = (w) => w;

			scheduler.registerSystem(LoopPhase.UPDATE, s1);
			scheduler.registerSystem(LoopPhase.RENDER, s2);
			scheduler.registerInputSystem(s3);

			expect(scheduler.getTotalSystemCount()).toBe(3);
		});
	});

	describe('hasSystem', () => {
		it('returns false when system not registered', () => {
			const system: System = (w) => w;

			expect(scheduler.hasSystem(system)).toBe(false);
		});

		it('returns true when system is registered', () => {
			const system: System = (w) => w;
			scheduler.registerSystem(LoopPhase.UPDATE, system);

			expect(scheduler.hasSystem(system)).toBe(true);
		});

		it('returns true for input systems', () => {
			const inputSystem: System = (w) => w;
			scheduler.registerInputSystem(inputSystem);

			expect(scheduler.hasSystem(inputSystem)).toBe(true);
		});
	});

	describe('clearPhase', () => {
		it('clears all systems from a phase', () => {
			const s1: System = (w) => w;
			const s2: System = (w) => w;

			scheduler.registerSystem(LoopPhase.UPDATE, s1);
			scheduler.registerSystem(LoopPhase.UPDATE, s2);

			scheduler.clearPhase(LoopPhase.UPDATE);

			expect(scheduler.getSystemCount(LoopPhase.UPDATE)).toBe(0);
		});

		it('throws when clearing INPUT phase', () => {
			expect(() => {
				scheduler.clearPhase(LoopPhase.INPUT);
			}).toThrow('Cannot clear INPUT phase');
		});

		it('does not affect other phases', () => {
			const updateSystem: System = (w) => w;
			const renderSystem: System = (w) => w;

			scheduler.registerSystem(LoopPhase.UPDATE, updateSystem);
			scheduler.registerSystem(LoopPhase.RENDER, renderSystem);

			scheduler.clearPhase(LoopPhase.UPDATE);

			expect(scheduler.getSystemCount(LoopPhase.UPDATE)).toBe(0);
			expect(scheduler.getSystemCount(LoopPhase.RENDER)).toBe(1);
		});
	});

	describe('clearAllSystems', () => {
		it('clears all systems except INPUT', () => {
			const s1: System = (w) => w;
			const s2: System = (w) => w;
			const inputSystem: System = (w) => w;

			scheduler.registerSystem(LoopPhase.UPDATE, s1);
			scheduler.registerSystem(LoopPhase.RENDER, s2);
			scheduler.registerInputSystem(inputSystem);

			scheduler.clearAllSystems();

			expect(scheduler.getSystemCount(LoopPhase.UPDATE)).toBe(0);
			expect(scheduler.getSystemCount(LoopPhase.RENDER)).toBe(0);
			expect(scheduler.getSystemCount(LoopPhase.INPUT)).toBe(1);
		});
	});

	describe('getDeltaTime', () => {
		it('returns the delta time from most recent run', () => {
			const world = createWorld();

			scheduler.run(world, 0.05);

			expect(getDeltaTime()).toBe(0.05);
		});

		it('updates delta time on each run', () => {
			const world = createWorld();

			scheduler.run(world, 0.016);
			expect(getDeltaTime()).toBe(0.016);

			scheduler.run(world, 0.033);
			expect(getDeltaTime()).toBe(0.033);
		});
	});

	describe('telemetry', () => {
		describe('enableTelemetry', () => {
			it('enables telemetry collection', () => {
				expect(scheduler.isTelemetryEnabled()).toBe(false);

				scheduler.enableTelemetry();

				expect(scheduler.isTelemetryEnabled()).toBe(true);
			});

			it('enables telemetry with history', () => {
				scheduler.enableTelemetry({ enabled: true, historySize: 10 });

				expect(scheduler.isTelemetryEnabled()).toBe(true);
			});

			it('clears history when disabled via config', () => {
				scheduler.enableTelemetry({ enabled: true, historySize: 10 });
				const world = createWorld();
				scheduler.run(world, 0.016);

				scheduler.enableTelemetry({ enabled: false });

				expect(scheduler.isTelemetryEnabled()).toBe(false);
				expect(scheduler.getTelemetry()).toBeNull();
			});
		});

		describe('disableTelemetry', () => {
			it('disables telemetry collection', () => {
				scheduler.enableTelemetry();
				expect(scheduler.isTelemetryEnabled()).toBe(true);

				scheduler.disableTelemetry();

				expect(scheduler.isTelemetryEnabled()).toBe(false);
			});

			it('clears current telemetry when disabled', () => {
				scheduler.enableTelemetry();
				const world = createWorld();
				scheduler.run(world, 0.016);
				expect(scheduler.getTelemetry()).not.toBeNull();

				scheduler.disableTelemetry();

				expect(scheduler.getTelemetry()).toBeNull();
			});

			it('clears telemetry history when disabled', () => {
				scheduler.enableTelemetry({ enabled: true, historySize: 10 });
				const world = createWorld();
				scheduler.run(world, 0.016);
				scheduler.run(world, 0.016);
				expect(scheduler.getTelemetryHistory().length).toBe(2);

				scheduler.disableTelemetry();

				expect(scheduler.getTelemetryHistory().length).toBe(0);
			});
		});

		describe('getTelemetry', () => {
			it('returns null when telemetry is disabled', () => {
				expect(scheduler.getTelemetry()).toBeNull();
			});

			it('returns null when telemetry is enabled but no frames run', () => {
				scheduler.enableTelemetry();

				expect(scheduler.getTelemetry()).toBeNull();
			});

			it('returns telemetry data after running a frame', () => {
				scheduler.enableTelemetry();
				const world = createWorld();

				scheduler.run(world, 0.016);

				const telemetry = scheduler.getTelemetry();
				expect(telemetry).not.toBeNull();
				expect(telemetry?.totalFrameTime).toBeGreaterThanOrEqual(0);
				expect(telemetry?.phases).toHaveLength(8); // All phases
			});

			it('includes phase-specific timing data', () => {
				scheduler.enableTelemetry();
				const world = createWorld();

				// Register a system in UPDATE phase
				const system: System = (world) => {
					// Simulate some work
					const start = performance.now();
					while (performance.now() - start < 1) {
						// Busy wait
					}
					return world;
				};
				scheduler.registerSystem(LoopPhase.UPDATE, system);

				scheduler.run(world, 0.016);

				const telemetry = scheduler.getTelemetry();
				expect(telemetry).not.toBeNull();

				// Find UPDATE phase data
				const updatePhase = telemetry?.phases.find((p) => p.phase === LoopPhase.UPDATE);
				expect(updatePhase).toBeDefined();
				expect(updatePhase?.duration).toBeGreaterThan(0);
				expect(updatePhase?.systemCount).toBe(1);
			});

			it('tracks frame number', () => {
				scheduler.enableTelemetry();
				const world = createWorld();

				scheduler.run(world, 0.016);
				const telemetry1 = scheduler.getTelemetry();
				expect(telemetry1?.frameNumber).toBe(0);

				scheduler.run(world, 0.016);
				const telemetry2 = scheduler.getTelemetry();
				expect(telemetry2?.frameNumber).toBe(1);

				scheduler.run(world, 0.016);
				const telemetry3 = scheduler.getTelemetry();
				expect(telemetry3?.frameNumber).toBe(2);
			});
		});

		describe('getTelemetryHistory', () => {
			it('returns empty array when history is disabled', () => {
				scheduler.enableTelemetry({ enabled: true, historySize: 0 });
				const world = createWorld();
				scheduler.run(world, 0.016);

				expect(scheduler.getTelemetryHistory()).toEqual([]);
			});

			it('returns empty array when telemetry is disabled', () => {
				expect(scheduler.getTelemetryHistory()).toEqual([]);
			});

			it('stores history when historySize is set', () => {
				scheduler.enableTelemetry({ enabled: true, historySize: 5 });
				const world = createWorld();

				scheduler.run(world, 0.016);
				scheduler.run(world, 0.016);
				scheduler.run(world, 0.016);

				const history = scheduler.getTelemetryHistory();
				expect(history).toHaveLength(3);
				expect(history[0]?.frameNumber).toBe(0);
				expect(history[1]?.frameNumber).toBe(1);
				expect(history[2]?.frameNumber).toBe(2);
			});

			it('limits history to configured size', () => {
				scheduler.enableTelemetry({ enabled: true, historySize: 3 });
				const world = createWorld();

				// Run more frames than history size
				for (let i = 0; i < 10; i++) {
					scheduler.run(world, 0.016);
				}

				const history = scheduler.getTelemetryHistory();
				expect(history).toHaveLength(3);
				// Should keep the most recent frames
				expect(history[0]?.frameNumber).toBe(7);
				expect(history[1]?.frameNumber).toBe(8);
				expect(history[2]?.frameNumber).toBe(9);
			});
		});

		describe('isTelemetryEnabled', () => {
			it('returns false by default', () => {
				expect(scheduler.isTelemetryEnabled()).toBe(false);
			});

			it('returns true after enabling', () => {
				scheduler.enableTelemetry();

				expect(scheduler.isTelemetryEnabled()).toBe(true);
			});

			it('returns false after disabling', () => {
				scheduler.enableTelemetry();
				scheduler.disableTelemetry();

				expect(scheduler.isTelemetryEnabled()).toBe(false);
			});
		});

		describe('telemetry with multiple systems', () => {
			it('counts all systems in a phase', () => {
				scheduler.enableTelemetry();
				const world = createWorld();

				const system1: System = (world) => world;
				const system2: System = (world) => world;
				const system3: System = (world) => world;

				scheduler.registerSystem(LoopPhase.UPDATE, system1);
				scheduler.registerSystem(LoopPhase.UPDATE, system2);
				scheduler.registerSystem(LoopPhase.RENDER, system3);

				scheduler.run(world, 0.016);

				const telemetry = scheduler.getTelemetry();
				const updatePhase = telemetry?.phases.find((p) => p.phase === LoopPhase.UPDATE);
				const renderPhase = telemetry?.phases.find((p) => p.phase === LoopPhase.RENDER);

				expect(updatePhase?.systemCount).toBe(2);
				expect(renderPhase?.systemCount).toBe(1);
			});

			it('measures total frame time across all phases', () => {
				scheduler.enableTelemetry();
				const world = createWorld();

				// Add systems to multiple phases
				const system1: System = (world) => world;
				const system2: System = (world) => world;

				scheduler.registerSystem(LoopPhase.UPDATE, system1);
				scheduler.registerSystem(LoopPhase.RENDER, system2);

				scheduler.run(world, 0.016);

				const telemetry = scheduler.getTelemetry();
				expect(telemetry?.totalFrameTime).toBeGreaterThanOrEqual(0);

				// Total should be sum of all phases
				let sum = 0;
				for (const phase of telemetry?.phases ?? []) {
					sum += phase.duration;
				}
				expect(telemetry?.totalFrameTime).toBeCloseTo(sum, 2);
			});
		});
	});
});
