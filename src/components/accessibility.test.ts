/**
 * Tests for accessibility component.
 */

import { describe, expect, it } from 'vitest';
import { addEntity } from '../core/ecs';
import { createWorld } from '../core/world';
import {
	type AccessibleRole,
	announce,
	clearAccessibilityLabels,
	getAccessibleLabel,
	getAccessibleRole,
	setAccessibleLabel,
	setAccessibleRole,
} from './accessibility';

describe('accessibility', () => {
	describe('AccessibleRole', () => {
		const roles: AccessibleRole[] = [
			'button',
			'checkbox',
			'list',
			'listitem',
			'textbox',
			'dialog',
			'menu',
			'menuitem',
			'tree',
			'treeitem',
		];

		for (const role of roles) {
			it(`supports ${role} role`, () => {
				const world = createWorld();
				const eid = addEntity(world);

				setAccessibleRole(world, eid, role);

				expect(getAccessibleRole(world, eid)).toBe(role);
			});
		}
	});

	describe('setAccessibleRole', () => {
		it('sets role on entity', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleRole(world, eid, 'button');

			expect(getAccessibleRole(world, eid)).toBe('button');
		});

		it('overwrites existing role', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleRole(world, eid, 'button');
			setAccessibleRole(world, eid, 'checkbox');

			expect(getAccessibleRole(world, eid)).toBe('checkbox');
		});

		it('adds component if not present', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleRole(world, eid, 'menu');

			expect(getAccessibleRole(world, eid)).toBe('menu');
		});
	});

	describe('getAccessibleRole', () => {
		it('returns undefined for entity without component', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(getAccessibleRole(world, eid)).toBeUndefined();
		});

		it('returns correct role', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleRole(world, eid, 'dialog');

			expect(getAccessibleRole(world, eid)).toBe('dialog');
		});
	});

	describe('setAccessibleLabel', () => {
		it('sets label on entity', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleLabel(world, eid, 'Submit form');

			expect(getAccessibleLabel(world, eid)).toBe('Submit form');
		});

		it('updates existing label', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleLabel(world, eid, 'Old label');
			setAccessibleLabel(world, eid, 'New label');

			expect(getAccessibleLabel(world, eid)).toBe('New label');
		});

		it('adds component if not present', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleLabel(world, eid, 'Test label');

			expect(getAccessibleLabel(world, eid)).toBe('Test label');
		});

		it('works with empty string', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleLabel(world, eid, '');

			expect(getAccessibleLabel(world, eid)).toBe('');
		});
	});

	describe('getAccessibleLabel', () => {
		it('returns undefined for entity without component', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(getAccessibleLabel(world, eid)).toBeUndefined();
		});

		it('returns correct label', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleLabel(world, eid, 'Click me');

			expect(getAccessibleLabel(world, eid)).toBe('Click me');
		});
	});

	describe('combined role and label', () => {
		it('sets both role and label', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleRole(world, eid, 'button');
			setAccessibleLabel(world, eid, 'Submit');

			expect(getAccessibleRole(world, eid)).toBe('button');
			expect(getAccessibleLabel(world, eid)).toBe('Submit');
		});

		it('preserves label when changing role', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleLabel(world, eid, 'Test label');
			setAccessibleRole(world, eid, 'button');
			setAccessibleRole(world, eid, 'checkbox');

			expect(getAccessibleLabel(world, eid)).toBe('Test label');
		});

		it('preserves role when changing label', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleRole(world, eid, 'textbox');
			setAccessibleLabel(world, eid, 'Label 1');
			setAccessibleLabel(world, eid, 'Label 2');

			expect(getAccessibleRole(world, eid)).toBe('textbox');
		});
	});

	describe('multiple entities', () => {
		it('handles multiple entities independently', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);
			const eid3 = addEntity(world);

			setAccessibleRole(world, eid1, 'button');
			setAccessibleLabel(world, eid1, 'Button 1');

			setAccessibleRole(world, eid2, 'checkbox');
			setAccessibleLabel(world, eid2, 'Checkbox 1');

			setAccessibleRole(world, eid3, 'textbox');
			setAccessibleLabel(world, eid3, 'Input 1');

			expect(getAccessibleRole(world, eid1)).toBe('button');
			expect(getAccessibleLabel(world, eid1)).toBe('Button 1');

			expect(getAccessibleRole(world, eid2)).toBe('checkbox');
			expect(getAccessibleLabel(world, eid2)).toBe('Checkbox 1');

			expect(getAccessibleRole(world, eid3)).toBe('textbox');
			expect(getAccessibleLabel(world, eid3)).toBe('Input 1');
		});
	});

	describe('announce', () => {
		it('can be called with a message', () => {
			// Just verify it doesn't throw
			expect(() => announce('Test announcement')).not.toThrow();
		});

		it('handles empty strings', () => {
			expect(() => announce('')).not.toThrow();
		});

		it('handles special characters', () => {
			expect(() => announce('Test: 123 <>&')).not.toThrow();
		});
	});

	describe('clearAccessibilityLabels', () => {
		it('clears all labels', () => {
			const world = createWorld();
			const eid1 = addEntity(world);
			const eid2 = addEntity(world);

			setAccessibleLabel(world, eid1, 'Label 1');
			setAccessibleLabel(world, eid2, 'Label 2');

			clearAccessibilityLabels();

			// Labels should be cleared from storage
			// But component data still exists, just refers to non-existent IDs
			expect(getAccessibleLabel(world, eid1)).toBeUndefined();
			expect(getAccessibleLabel(world, eid2)).toBeUndefined();
		});

		it('allows setting new labels after clear', () => {
			const world = createWorld();
			const eid = addEntity(world);

			setAccessibleLabel(world, eid, 'Old label');
			clearAccessibilityLabels();

			const eid2 = addEntity(world);
			setAccessibleLabel(world, eid2, 'New label');

			expect(getAccessibleLabel(world, eid2)).toBe('New label');
		});
	});
});
