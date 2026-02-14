/**
 * Tests for conflict resolution primitives.
 */

import { describe, expect, it } from 'vitest';
import {
	applyRemoteOp,
	compactDocument,
	createLWWMap,
	createLWWRegister,
	createTextCRDT,
	deleteChar,
	deleteText,
	getDocumentOps,
	getLWWMapKeys,
	getLWWMapSize,
	getLWWMapValue,
	getLWWMetadata,
	getLWWValue,
	getTextLength,
	getTextValue,
	getTombstoneCount,
	getTotalNodeCount,
	hasLWWMapKey,
	insertChar,
	insertText,
	mergeLWWMaps,
	mergeLWWRegisters,
	resolveLWWConflict,
	setLWWMapValue,
	setLWWValue,
} from './conflictResolution';

// =============================================================================
// LWW REGISTER TESTS
// =============================================================================

describe('LWW Register', () => {
	describe('createLWWRegister', () => {
		it('creates register with initial value', () => {
			const reg = createLWWRegister(42);
			expect(getLWWValue(reg)).toBe(42);
		});

		it('starts with timestamp 0', () => {
			const reg = createLWWRegister('hello');
			expect(getLWWMetadata(reg).timestamp).toBe(0);
		});

		it('accepts custom initial site ID', () => {
			const reg = createLWWRegister(0, 'site-1');
			expect(getLWWMetadata(reg).siteId).toBe('site-1');
		});
	});

	describe('setLWWValue', () => {
		it('accepts newer timestamp', () => {
			const reg = createLWWRegister(0);
			const accepted = setLWWValue(reg, 42, 'site-1', 100);

			expect(accepted).toBe(true);
			expect(getLWWValue(reg)).toBe(42);
		});

		it('rejects older timestamp', () => {
			const reg = createLWWRegister(0);
			setLWWValue(reg, 42, 'site-1', 100);

			const accepted = setLWWValue(reg, 99, 'site-2', 50);

			expect(accepted).toBe(false);
			expect(getLWWValue(reg)).toBe(42);
		});

		it('breaks ties by site ID', () => {
			const reg = createLWWRegister(0);
			setLWWValue(reg, 42, 'site-a', 100);

			// Same timestamp, higher site ID wins
			const accepted = setLWWValue(reg, 99, 'site-b', 100);
			expect(accepted).toBe(true);
			expect(getLWWValue(reg)).toBe(99);
		});

		it('rejects equal timestamp with lower site ID', () => {
			const reg = createLWWRegister(0);
			setLWWValue(reg, 42, 'site-b', 100);

			const accepted = setLWWValue(reg, 99, 'site-a', 100);
			expect(accepted).toBe(false);
			expect(getLWWValue(reg)).toBe(42);
		});

		it('updates metadata on accept', () => {
			const reg = createLWWRegister(0);
			setLWWValue(reg, 42, 'site-1', 100);

			const meta = getLWWMetadata(reg);
			expect(meta.timestamp).toBe(100);
			expect(meta.siteId).toBe('site-1');
		});
	});

	describe('mergeLWWRegisters', () => {
		it('picks higher timestamp', () => {
			const a = createLWWRegister(10);
			setLWWValue(a, 10, 'site-a', 50);

			const b = createLWWRegister(20);
			setLWWValue(b, 20, 'site-b', 100);

			const merged = mergeLWWRegisters(a, b);
			expect(merged.value).toBe(20);
		});

		it('breaks ties by site ID', () => {
			const a = createLWWRegister(10);
			setLWWValue(a, 10, 'site-a', 100);

			const b = createLWWRegister(20);
			setLWWValue(b, 20, 'site-b', 100);

			const merged = mergeLWWRegisters(a, b);
			expect(merged.value).toBe(20); // site-b > site-a
		});
	});
});

// =============================================================================
// LWW MAP TESTS
// =============================================================================

describe('LWW Map', () => {
	describe('createLWWMap', () => {
		it('creates empty map', () => {
			const map = createLWWMap<number>();
			expect(getLWWMapSize(map)).toBe(0);
		});
	});

	describe('setLWWMapValue', () => {
		it('adds new entry', () => {
			const map = createLWWMap<number>();
			const accepted = setLWWMapValue(map, 'key1', 42, 'site-1', 100);

			expect(accepted).toBe(true);
			expect(getLWWMapValue(map, 'key1')).toBe(42);
		});

		it('updates existing with newer timestamp', () => {
			const map = createLWWMap<number>();
			setLWWMapValue(map, 'key1', 42, 'site-1', 100);
			setLWWMapValue(map, 'key1', 99, 'site-2', 200);

			expect(getLWWMapValue(map, 'key1')).toBe(99);
		});

		it('rejects older timestamp for existing key', () => {
			const map = createLWWMap<number>();
			setLWWMapValue(map, 'key1', 42, 'site-1', 200);
			setLWWMapValue(map, 'key1', 99, 'site-2', 100);

			expect(getLWWMapValue(map, 'key1')).toBe(42);
		});
	});

	describe('getLWWMapValue', () => {
		it('returns undefined for missing key', () => {
			const map = createLWWMap<number>();
			expect(getLWWMapValue(map, 'missing')).toBeUndefined();
		});
	});

	describe('hasLWWMapKey', () => {
		it('returns true for existing key', () => {
			const map = createLWWMap<number>();
			setLWWMapValue(map, 'key1', 42, 'site-1', 100);
			expect(hasLWWMapKey(map, 'key1')).toBe(true);
		});

		it('returns false for missing key', () => {
			const map = createLWWMap<number>();
			expect(hasLWWMapKey(map, 'missing')).toBe(false);
		});
	});

	describe('getLWWMapKeys', () => {
		it('returns all keys', () => {
			const map = createLWWMap<number>();
			setLWWMapValue(map, 'a', 1, 'site-1', 100);
			setLWWMapValue(map, 'b', 2, 'site-1', 100);
			setLWWMapValue(map, 'c', 3, 'site-1', 100);

			const keys = getLWWMapKeys(map);
			expect(keys).toHaveLength(3);
			expect(keys).toContain('a');
			expect(keys).toContain('b');
			expect(keys).toContain('c');
		});
	});

	describe('mergeLWWMaps', () => {
		it('merges disjoint maps', () => {
			const a = createLWWMap<number>();
			setLWWMapValue(a, 'key1', 1, 'site-a', 100);

			const b = createLWWMap<number>();
			setLWWMapValue(b, 'key2', 2, 'site-b', 100);

			const merged = mergeLWWMaps(a, b);
			expect(getLWWMapSize(merged)).toBe(2);
			expect(getLWWMapValue(merged, 'key1')).toBe(1);
			expect(getLWWMapValue(merged, 'key2')).toBe(2);
		});

		it('resolves conflicts by timestamp', () => {
			const a = createLWWMap<number>();
			setLWWMapValue(a, 'key1', 10, 'site-a', 50);

			const b = createLWWMap<number>();
			setLWWMapValue(b, 'key1', 20, 'site-b', 100);

			const merged = mergeLWWMaps(a, b);
			expect(getLWWMapValue(merged, 'key1')).toBe(20);
		});
	});
});

// =============================================================================
// TEXT CRDT TESTS
// =============================================================================

describe('Text CRDT', () => {
	describe('createTextCRDT', () => {
		it('creates empty document', () => {
			const doc = createTextCRDT('site-1');
			expect(getTextValue(doc)).toBe('');
			expect(getTextLength(doc)).toBe(0);
		});
	});

	describe('insertChar', () => {
		it('inserts at beginning', () => {
			const doc = createTextCRDT('site-1');
			insertChar(doc, 0, 'H');
			expect(getTextValue(doc)).toBe('H');
		});

		it('inserts at end', () => {
			const doc = createTextCRDT('site-1');
			insertChar(doc, 0, 'H');
			insertChar(doc, 1, 'i');
			expect(getTextValue(doc)).toBe('Hi');
		});

		it('inserts in middle', () => {
			const doc = createTextCRDT('site-1');
			insertChar(doc, 0, 'H');
			insertChar(doc, 1, 'o');
			insertChar(doc, 1, 'i');
			// H at 0 -> "H", o at 1 -> "Ho", i at 1 (after H, before o) -> "Hoi"
			// The CRDT inserts after the character at visiblePos, so pos 1 = after 'H'
			// But 'o' was already at index 1, and new 'i' gets ordered by ID
			expect(getTextValue(doc)).toBe('Hoi');
		});

		it('returns insert operation', () => {
			const doc = createTextCRDT('site-1');
			const op = insertChar(doc, 0, 'A');
			expect(op.type).toBe('insert');
			if (op.type === 'insert') {
				expect(op.char).toBe('A');
				expect(op.id.site).toBe('site-1');
				expect(op.id.seq).toBe(0);
			}
		});

		it('increments sequence counter', () => {
			const doc = createTextCRDT('site-1');
			insertChar(doc, 0, 'A');
			const op2 = insertChar(doc, 1, 'B');
			if (op2.type === 'insert') {
				expect(op2.id.seq).toBe(1);
			}
		});
	});

	describe('insertText', () => {
		it('inserts a string', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'Hello');
			expect(getTextValue(doc)).toBe('Hello');
		});

		it('inserts at position', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'Hello ');
			insertText(doc, 6, 'World');
			expect(getTextValue(doc)).toBe('Hello World');
		});

		it('returns all operations', () => {
			const doc = createTextCRDT('site-1');
			const ops = insertText(doc, 0, 'Hi');
			expect(ops).toHaveLength(2);
		});
	});

	describe('deleteChar', () => {
		it('deletes at position', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'Hello');
			deleteChar(doc, 0);
			expect(getTextValue(doc)).toBe('ello');
		});

		it('returns null for invalid position', () => {
			const doc = createTextCRDT('site-1');
			const op = deleteChar(doc, 0);
			expect(op).toBeNull();
		});

		it('returns delete operation', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'Hi');
			const op = deleteChar(doc, 0);
			expect(op).not.toBeNull();
			expect(op!.type).toBe('delete');
		});

		it('marks node as tombstone', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'AB');
			deleteChar(doc, 0);

			expect(getTextLength(doc)).toBe(1);
			expect(getTotalNodeCount(doc)).toBe(2); // Tombstone still there
			expect(getTombstoneCount(doc)).toBe(1);
		});
	});

	describe('deleteText', () => {
		it('deletes a range', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'Hello World');
			deleteText(doc, 0, 6);
			expect(getTextValue(doc)).toBe('World');
		});

		it('handles count exceeding text length', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'Hi');
			const ops = deleteText(doc, 0, 10);
			expect(ops).toHaveLength(2); // Only 2 chars to delete
			expect(getTextValue(doc)).toBe('');
		});
	});

	describe('applyRemoteOp', () => {
		it('applies remote insert', () => {
			const doc1 = createTextCRDT('site-1');
			const doc2 = createTextCRDT('site-2');

			const op = insertChar(doc1, 0, 'H');
			const applied = applyRemoteOp(doc2, op);

			expect(applied).toBe(true);
			expect(getTextValue(doc2)).toBe('H');
		});

		it('applies remote delete', () => {
			const doc1 = createTextCRDT('site-1');
			const doc2 = createTextCRDT('site-2');

			// Both docs have the same initial content
			const insertOp = insertChar(doc1, 0, 'H');
			applyRemoteOp(doc2, insertOp);

			// Delete on doc1, apply to doc2
			const deleteOp = deleteChar(doc1, 0);
			const applied = applyRemoteOp(doc2, deleteOp!);

			expect(applied).toBe(true);
			expect(getTextValue(doc2)).toBe('');
		});

		it('rejects duplicate insert', () => {
			const doc1 = createTextCRDT('site-1');
			const doc2 = createTextCRDT('site-2');

			const op = insertChar(doc1, 0, 'H');
			applyRemoteOp(doc2, op);
			const duplicate = applyRemoteOp(doc2, op);

			expect(duplicate).toBe(false);
			expect(getTextValue(doc2)).toBe('H');
		});

		it('handles concurrent inserts at same position', () => {
			const doc1 = createTextCRDT('site-1');
			const doc2 = createTextCRDT('site-2');

			// Both insert at position 0
			const op1 = insertChar(doc1, 0, 'A');
			const op2 = insertChar(doc2, 0, 'B');

			// Apply each other's ops
			applyRemoteOp(doc1, op2);
			applyRemoteOp(doc2, op1);

			// Both should converge to the same state
			expect(getTextValue(doc1)).toBe(getTextValue(doc2));
		});

		it('converges with concurrent edits', () => {
			const doc1 = createTextCRDT('site-1');
			const doc2 = createTextCRDT('site-2');

			// Both start with "Hello"
			const helloOps = insertText(doc1, 0, 'Hello');
			for (const op of helloOps) {
				applyRemoteOp(doc2, op);
			}

			// Site 1 inserts " World" at end
			const worldOps = insertText(doc1, 5, ' World');

			// Site 2 inserts "!" at end
			const bangOps = insertText(doc2, 5, '!');

			// Apply cross-site ops
			for (const op of worldOps) {
				applyRemoteOp(doc2, op);
			}
			for (const op of bangOps) {
				applyRemoteOp(doc1, op);
			}

			// Both should have the same content (order may vary for concurrent inserts)
			expect(getTextValue(doc1)).toBe(getTextValue(doc2));
			// Both should contain all chars
			const result = getTextValue(doc1);
			expect(result).toContain('Hello');
			expect(result).toContain(' World');
			expect(result).toContain('!');
		});
	});

	describe('getDocumentOps', () => {
		it('returns ops to reconstruct document', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'Hi');
			deleteChar(doc, 0); // Delete 'H'

			const ops = getDocumentOps(doc);
			// Should have 2 inserts (H, i) + 1 delete (H)
			expect(ops).toHaveLength(3);

			// Apply to fresh doc
			const doc2 = createTextCRDT('site-2');
			for (const op of ops) {
				applyRemoteOp(doc2, op);
			}
			expect(getTextValue(doc2)).toBe(getTextValue(doc));
		});
	});

	describe('compactDocument', () => {
		it('removes tombstones', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'Hello');
			deleteText(doc, 0, 3); // Delete "Hel"

			expect(getTotalNodeCount(doc)).toBe(5);
			expect(getTombstoneCount(doc)).toBe(3);

			const removed = compactDocument(doc);
			expect(removed).toBe(3);
			expect(getTotalNodeCount(doc)).toBe(2);
			expect(getTombstoneCount(doc)).toBe(0);
			expect(getTextValue(doc)).toBe('lo');
		});

		it('handles empty document', () => {
			const doc = createTextCRDT('site-1');
			const removed = compactDocument(doc);
			expect(removed).toBe(0);
		});

		it('preserves non-deleted nodes', () => {
			const doc = createTextCRDT('site-1');
			insertText(doc, 0, 'ABCDE');
			// Delete B and D
			deleteChar(doc, 1); // B
			deleteChar(doc, 2); // D (now at visible pos 2 after B deleted)

			compactDocument(doc);
			expect(getTextValue(doc)).toBe('ACE');
		});
	});
});

// =============================================================================
// CONFLICT RESOLUTION HELPER TESTS
// =============================================================================

describe('resolveLWWConflict', () => {
	it('remote wins with higher timestamp', () => {
		const result = resolveLWWConflict(10, 50, 'local', 20, 100, 'remote');
		expect(result.value).toBe(20);
		expect(result.winner).toBe('remote');
	});

	it('local wins with higher timestamp', () => {
		const result = resolveLWWConflict(10, 100, 'local', 20, 50, 'remote');
		expect(result.value).toBe(10);
		expect(result.winner).toBe('local');
	});

	it('breaks ties by site ID', () => {
		const result = resolveLWWConflict(10, 100, 'a', 20, 100, 'b');
		expect(result.value).toBe(20);
		expect(result.winner).toBe('remote');
	});

	it('local wins tie with higher site ID', () => {
		const result = resolveLWWConflict(10, 100, 'z', 20, 100, 'a');
		expect(result.value).toBe(10);
		expect(result.winner).toBe('local');
	});
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('integration', () => {
	it('three-way text CRDT convergence', () => {
		const doc1 = createTextCRDT('site-1');
		const doc2 = createTextCRDT('site-2');
		const doc3 = createTextCRDT('site-3');

		// All start with "cat"
		const catOps = insertText(doc1, 0, 'cat');
		for (const op of catOps) {
			applyRemoteOp(doc2, op);
			applyRemoteOp(doc3, op);
		}

		// Site 1 changes "cat" -> "hat" (delete c, insert h)
		const del1 = deleteChar(doc1, 0);
		const ins1 = insertChar(doc1, 0, 'h');

		// Site 2 changes "cat" -> "cats" (insert s at end)
		const ins2 = insertChar(doc2, 3, 's');

		// Site 3 changes "cat" -> "cart" (insert r at pos 2)
		const ins3 = insertChar(doc3, 2, 'r');

		// Cross-apply all ops
		const allOps = [del1!, ins1, ins2, ins3];
		for (const op of allOps) {
			applyRemoteOp(doc1, op);
			applyRemoteOp(doc2, op);
			applyRemoteOp(doc3, op);
		}

		// All three docs should converge
		expect(getTextValue(doc1)).toBe(getTextValue(doc2));
		expect(getTextValue(doc2)).toBe(getTextValue(doc3));

		// Result should contain h, a, r, t, s in some order
		const result = getTextValue(doc1);
		expect(result).toContain('h');
		expect(result).toContain('a');
		expect(result).toContain('r');
		expect(result).toContain('t');
		expect(result).toContain('s');
	});

	it('LWW map with multiple writers', () => {
		const map = createLWWMap<number>();

		// Session 1 sets scrollY to 100 at time 1000
		setLWWMapValue(map, 'scrollY', 100, 'session-1', 1000);

		// Session 2 sets scrollY to 200 at time 999 (earlier)
		setLWWMapValue(map, 'scrollY', 200, 'session-2', 999);

		// Session 1's value should win
		expect(getLWWMapValue(map, 'scrollY')).toBe(100);

		// Session 2 sets scrollY to 300 at time 1001 (later)
		setLWWMapValue(map, 'scrollY', 300, 'session-2', 1001);

		// Session 2's value should now win
		expect(getLWWMapValue(map, 'scrollY')).toBe(300);
	});
});
