/**
 * Reactive Signal System Benchmarks
 *
 * Compares reactive signal updates vs manual imperative updates
 * to verify that signals add minimal overhead.
 *
 * Quality gate: reactive updates must be faster than or comparable to
 * manual imperative equivalents.
 */

import { bench, describe } from 'vitest';

describe('Signals: Basic Read/Write', () => {
	bench('signal read (1000 reads)', () => {
		const { createSignal } = require('../src/core/signals');
		const [value] = createSignal(42);
		let sum = 0;
		for (let i = 0; i < 1000; i++) {
			sum += value();
		}
		return sum;
	});

	bench('plain variable read (1000 reads)', () => {
		const value = 42;
		let sum = 0;
		for (let i = 0; i < 1000; i++) {
			sum += value;
		}
		return sum;
	});

	bench('signal write (1000 writes)', () => {
		const { createSignal } = require('../src/core/signals');
		const [, setValue] = createSignal(0);
		for (let i = 0; i < 1000; i++) {
			setValue(i);
		}
	});

	bench('plain variable write (1000 writes)', () => {
		let value = 0;
		for (let i = 0; i < 1000; i++) {
			value = i;
		}
		return value;
	});
});

describe('Signals: Computed Properties', () => {
	bench('computed with 1 dependency (1000 updates)', () => {
		const { createSignal, createComputed } = require('../src/core/signals');
		const [a, setA] = createSignal(0);
		const double = createComputed(() => a() * 2);

		for (let i = 0; i < 1000; i++) {
			setA(i);
			double();
		}
	});

	bench('manual computation (1000 updates)', () => {
		let a = 0;
		let double = 0;
		for (let i = 0; i < 1000; i++) {
			a = i;
			double = a * 2;
		}
		return double;
	});

	bench('computed with 3 dependencies (1000 updates)', () => {
		const { createSignal, createComputed } = require('../src/core/signals');
		const [a, setA] = createSignal(0);
		const [b, setB] = createSignal(10);
		const [c, setC] = createSignal(100);
		const sum = createComputed(() => a() + b() + c());

		for (let i = 0; i < 1000; i++) {
			setA(i);
			sum();
			setB(i + 10);
			sum();
			setC(i + 100);
			sum();
		}
	});

	bench('manual 3-var computation (1000 updates)', () => {
		let a = 0;
		let b = 10;
		let c = 100;
		let total = 0;
		for (let i = 0; i < 1000; i++) {
			a = i;
			total = a + b + c;
			b = i + 10;
			total = a + b + c;
			c = i + 100;
			total = a + b + c;
		}
		return total;
	});
});

describe('Signals: Diamond Dependency', () => {
	bench('diamond graph (1000 root updates)', () => {
		const { createSignal, createComputed } = require('../src/core/signals');
		// A -> B, C -> D (diamond: D depends on both B and C)
		const [root, setRoot] = createSignal(0);
		const left = createComputed(() => root() * 2);
		const right = createComputed(() => root() + 10);
		const bottom = createComputed(() => left() + right());

		for (let i = 0; i < 1000; i++) {
			setRoot(i);
			bottom();
		}
	});

	bench('manual diamond computation (1000 updates)', () => {
		let root = 0;
		let left = 0;
		let right = 0;
		let bottom = 0;
		for (let i = 0; i < 1000; i++) {
			root = i;
			left = root * 2;
			right = root + 10;
			bottom = left + right;
		}
		return bottom;
	});
});

describe('Signals: Batch Updates', () => {
	bench('batched 10 signal writes (1000 batches)', () => {
		const { createSignal, createComputed, createBatch } = require('../src/core/signals');
		const signals = Array.from({ length: 10 }, () => createSignal(0));
		const total = createComputed(() => {
			let sum = 0;
			for (const [getter] of signals) {
				sum += getter();
			}
			return sum;
		});

		for (let i = 0; i < 1000; i++) {
			createBatch(() => {
				for (const [, setter] of signals) {
					setter(i);
				}
			});
			total();
		}
	});

	bench('manual 10 var sum (1000 updates)', () => {
		const values = new Array(10).fill(0);
		let total = 0;
		for (let i = 0; i < 1000; i++) {
			for (let j = 0; j < 10; j++) {
				values[j] = i;
			}
			total = 0;
			for (let j = 0; j < 10; j++) {
				total += values[j]!;
			}
		}
		return total;
	});
});

describe('Signals: Entity Signal Integration', () => {
	bench('entity signal updates (100 entities, 10 updates each)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { addComponent } = require('../src/core/ecs');
		const { Renderable } = require('../src/components/renderable');
		const { createEntitySignal } = require('../src/core/signals');

		const world = createWorld();
		const signals = [];

		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			addComponent(world, eid, Renderable);
			signals.push(createEntitySignal(world, eid, 0));
		}

		for (let i = 0; i < 10; i++) {
			for (const [, setter] of signals) {
				setter(i);
			}
		}
	});

	bench('manual entity markDirty (100 entities, 10 updates each)', () => {
		const { createWorld } = require('../src/core/world');
		const { addEntity } = require('../src/core/ecs');
		const { addComponent } = require('../src/core/ecs');
		const { Renderable, markDirty } = require('../src/components/renderable');

		const world = createWorld();
		const entities = [];
		const values: number[] = [];

		for (let i = 0; i < 100; i++) {
			const eid = addEntity(world);
			addComponent(world, eid, Renderable);
			entities.push(eid);
			values.push(0);
		}

		for (let i = 0; i < 10; i++) {
			for (let j = 0; j < entities.length; j++) {
				values[j] = i;
				markDirty(world, entities[j]!);
			}
		}
	});
});
