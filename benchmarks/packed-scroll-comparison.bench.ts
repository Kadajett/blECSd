/**
 * Benchmark: Map vs PackedStore for scroll state
 *
 * Compares memory layout and performance characteristics:
 * - Map: Pointer-chasing through hash table buckets
 * - PackedStore: Dense array iteration with stable handles
 *
 * Operations benchmarked:
 * 1. Add/remove entities (1000 entities)
 * 2. Random access lookup (10000 lookups)
 * 3. Iteration (forEach over all entities)
 *
 * @module benchmarks/packed-scroll-comparison
 */

import { bench, describe } from 'vitest';
import {
	type ScrollStore,
	createScrollStore,
	forEachScrollEntity,
	getScrollPosition,
	removeScrollEntity,
	setScrollPosition,
} from '../src/core/storage/scrollPackedStore';

// =============================================================================
// MAP-BASED IMPLEMENTATION (current approach)
// =============================================================================

interface ScrollData {
	entityId: number;
	scrollX: number;
	scrollY: number;
}

type MapScrollStore = Map<number, ScrollData>;

function createMapScrollStore(): MapScrollStore {
	return new Map();
}

function setMapScrollPosition(
	store: MapScrollStore,
	entityId: number,
	scrollX: number,
	scrollY: number,
): void {
	store.set(entityId, { entityId, scrollX, scrollY });
}

function getMapScrollPosition(store: MapScrollStore, entityId: number): ScrollData | undefined {
	return store.get(entityId);
}

function removeMapScrollEntity(store: MapScrollStore, entityId: number): boolean {
	return store.delete(entityId);
}

function forEachMapScrollEntity(store: MapScrollStore, callback: (data: ScrollData) => void): void {
	for (const data of store.values()) {
		callback(data);
	}
}

// =============================================================================
// BENCHMARK SETUP
// =============================================================================

const ENTITY_COUNT = 1000;
const LOOKUP_COUNT = 10000;

function setupMapStore(): MapScrollStore {
	const store = createMapScrollStore();
	for (let i = 0; i < ENTITY_COUNT; i++) {
		setMapScrollPosition(store, i, i * 10, i * 20);
	}
	return store;
}

function setupPackedStore(): ScrollStore {
	const store = createScrollStore();
	for (let i = 0; i < ENTITY_COUNT; i++) {
		setScrollPosition(store, i, i * 10, i * 20);
	}
	return store;
}

// =============================================================================
// BENCHMARKS
// =============================================================================

describe('Add/Remove Operations (1000 entities)', () => {
	bench('Map: add 1000 entities', () => {
		const store = createMapScrollStore();
		for (let i = 0; i < ENTITY_COUNT; i++) {
			setMapScrollPosition(store, i, i * 10, i * 20);
		}
	});

	bench('PackedStore: add 1000 entities', () => {
		const store = createScrollStore();
		for (let i = 0; i < ENTITY_COUNT; i++) {
			setScrollPosition(store, i, i * 10, i * 20);
		}
	});

	bench('Map: remove 500 entities (every other)', () => {
		const store = setupMapStore();
		return () => {
			for (let i = 0; i < ENTITY_COUNT; i += 2) {
				removeMapScrollEntity(store, i);
			}
		};
	});

	bench('PackedStore: remove 500 entities (every other)', () => {
		const store = setupPackedStore();
		return () => {
			for (let i = 0; i < ENTITY_COUNT; i += 2) {
				removeScrollEntity(store, i);
			}
		};
	});

	bench('Map: add then remove 1000 entities', () => {
		const store = createMapScrollStore();
		for (let i = 0; i < ENTITY_COUNT; i++) {
			setMapScrollPosition(store, i, i * 10, i * 20);
		}
		for (let i = 0; i < ENTITY_COUNT; i++) {
			removeMapScrollEntity(store, i);
		}
	});

	bench('PackedStore: add then remove 1000 entities', () => {
		const store = createScrollStore();
		for (let i = 0; i < ENTITY_COUNT; i++) {
			setScrollPosition(store, i, i * 10, i * 20);
		}
		for (let i = 0; i < ENTITY_COUNT; i++) {
			removeScrollEntity(store, i);
		}
	});
});

describe('Random Access Lookups (10000 lookups)', () => {
	// Pre-generate random entity IDs to ensure fair comparison
	const randomEntityIds: number[] = [];
	for (let i = 0; i < LOOKUP_COUNT; i++) {
		randomEntityIds.push(Math.floor(Math.random() * ENTITY_COUNT));
	}

	bench('Map: 10000 random lookups', () => {
		const store = setupMapStore();
		return () => {
			let sum = 0;
			for (let i = 0; i < LOOKUP_COUNT; i++) {
				const data = getMapScrollPosition(store, randomEntityIds[i] as number);
				if (data) {
					sum += data.scrollX + data.scrollY;
				}
			}
			return sum;
		};
	});

	bench('PackedStore: 10000 random lookups', () => {
		const store = setupPackedStore();
		return () => {
			let sum = 0;
			for (let i = 0; i < LOOKUP_COUNT; i++) {
				const data = getScrollPosition(store, randomEntityIds[i] as number);
				if (data) {
					sum += data.scrollX + data.scrollY;
				}
			}
			return sum;
		};
	});

	bench('Map: sequential lookups (best case)', () => {
		const store = setupMapStore();
		return () => {
			let sum = 0;
			for (let i = 0; i < ENTITY_COUNT; i++) {
				const data = getMapScrollPosition(store, i);
				if (data) {
					sum += data.scrollX + data.scrollY;
				}
			}
			return sum;
		};
	});

	bench('PackedStore: sequential lookups (best case)', () => {
		const store = setupPackedStore();
		return () => {
			let sum = 0;
			for (let i = 0; i < ENTITY_COUNT; i++) {
				const data = getScrollPosition(store, i);
				if (data) {
					sum += data.scrollX + data.scrollY;
				}
			}
			return sum;
		};
	});
});

describe('Iteration (forEach over all entities)', () => {
	bench('Map: iterate 1000 entities', () => {
		const store = setupMapStore();
		return () => {
			let sum = 0;
			forEachMapScrollEntity(store, (data) => {
				sum += data.scrollX + data.scrollY;
			});
			return sum;
		};
	});

	bench('PackedStore: iterate 1000 entities', () => {
		const store = setupPackedStore();
		return () => {
			let sum = 0;
			forEachScrollEntity(store, (data) => {
				sum += data.scrollX + data.scrollY;
			});
			return sum;
		};
	});

	bench('Map: iterate after fragmentation (500 entities removed)', () => {
		const store = setupMapStore();
		// Remove every other entity to simulate fragmentation
		for (let i = 0; i < ENTITY_COUNT; i += 2) {
			removeMapScrollEntity(store, i);
		}
		return () => {
			let sum = 0;
			forEachMapScrollEntity(store, (data) => {
				sum += data.scrollX + data.scrollY;
			});
			return sum;
		};
	});

	bench('PackedStore: iterate after fragmentation (500 entities removed)', () => {
		const store = setupPackedStore();
		// Remove every other entity - PackedStore stays dense
		for (let i = 0; i < ENTITY_COUNT; i += 2) {
			removeScrollEntity(store, i);
		}
		return () => {
			let sum = 0;
			forEachScrollEntity(store, (data) => {
				sum += data.scrollX + data.scrollY;
			});
			return sum;
		};
	});
});

describe('Mixed Workload (realistic usage)', () => {
	bench('Map: mixed add/remove/lookup/iterate', () => {
		const store = createMapScrollStore();

		// Add initial set
		for (let i = 0; i < ENTITY_COUNT; i++) {
			setMapScrollPosition(store, i, i * 10, i * 20);
		}

		// Simulate frame-by-frame updates
		for (let frame = 0; frame < 10; frame++) {
			// Update some entities
			for (let i = 0; i < 100; i++) {
				const entityId = Math.floor(Math.random() * ENTITY_COUNT);
				setMapScrollPosition(store, entityId, frame * 10, frame * 20);
			}

			// Random lookups
			let sum = 0;
			for (let i = 0; i < 100; i++) {
				const entityId = Math.floor(Math.random() * ENTITY_COUNT);
				const data = getMapScrollPosition(store, entityId);
				if (data) {
					sum += data.scrollX;
				}
			}

			// Iterate all (e.g., for rendering)
			forEachMapScrollEntity(store, (data) => {
				sum += data.scrollY;
			});
		}
	});

	bench('PackedStore: mixed add/remove/lookup/iterate', () => {
		const store = createScrollStore();

		// Add initial set
		for (let i = 0; i < ENTITY_COUNT; i++) {
			setScrollPosition(store, i, i * 10, i * 20);
		}

		// Simulate frame-by-frame updates
		for (let frame = 0; frame < 10; frame++) {
			// Update some entities
			for (let i = 0; i < 100; i++) {
				const entityId = Math.floor(Math.random() * ENTITY_COUNT);
				setScrollPosition(store, entityId, frame * 10, frame * 20);
			}

			// Random lookups
			let sum = 0;
			for (let i = 0; i < 100; i++) {
				const entityId = Math.floor(Math.random() * ENTITY_COUNT);
				const data = getScrollPosition(store, entityId);
				if (data) {
					sum += data.scrollX;
				}
			}

			// Iterate all (e.g., for rendering)
			forEachScrollEntity(store, (data) => {
				sum += data.scrollY;
			});
		}
	});
});

describe('Worst Case: Sparse Access Patterns', () => {
	bench('Map: access sparse entity IDs (high hash collisions)', () => {
		const store = createMapScrollStore();

		// Use entity IDs that might cause hash collisions
		for (let i = 0; i < ENTITY_COUNT; i++) {
			const sparseId = i * 1000;
			setMapScrollPosition(store, sparseId, i * 10, i * 20);
		}

		return () => {
			let sum = 0;
			for (let i = 0; i < ENTITY_COUNT; i++) {
				const sparseId = i * 1000;
				const data = getMapScrollPosition(store, sparseId);
				if (data) {
					sum += data.scrollX;
				}
			}
			return sum;
		};
	});

	bench('PackedStore: access sparse entity IDs (stable handles)', () => {
		const store = createScrollStore();

		// Same sparse entity IDs
		for (let i = 0; i < ENTITY_COUNT; i++) {
			const sparseId = i * 1000;
			setScrollPosition(store, sparseId, i * 10, i * 20);
		}

		return () => {
			let sum = 0;
			for (let i = 0; i < ENTITY_COUNT; i++) {
				const sparseId = i * 1000;
				const data = getScrollPosition(store, sparseId);
				if (data) {
					sum += data.scrollX;
				}
			}
			return sum;
		};
	});
});
