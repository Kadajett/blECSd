import { beforeEach, describe, expect, it } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { Entity, World } from '../core/types';

import {
	getLabel,
	getLabelPosition,
	getLabelText,
	hasLabel,
	hasLabelText,
	Label,
	LabelPosition,
	removeLabel,
	resetLabelStore,
	setLabel,
	setLabelOffset,
	setLabelPosition,
} from './label';

describe('Label Component', () => {
	let world: World;
	let eid: Entity;

	beforeEach(() => {
		world = createWorld() as World;
		eid = addEntity(world) as Entity;
		resetLabelStore();
	});

	describe('hasLabel', () => {
		it('returns false for entity without label', () => {
			expect(hasLabel(world, eid)).toBe(false);
		});

		it('returns true for entity with label', () => {
			setLabel(world, eid, 'Test');
			expect(hasLabel(world, eid)).toBe(true);
		});
	});

	describe('setLabel', () => {
		it('creates label with text', () => {
			setLabel(world, eid, 'Username');

			expect(hasLabel(world, eid)).toBe(true);
			expect(getLabelText(world, eid)).toBe('Username');
		});

		it('sets default position to TopLeft', () => {
			setLabel(world, eid, 'Test');

			expect(Label.position[eid]).toBe(LabelPosition.TopLeft);
		});

		it('sets default offsets to 0', () => {
			setLabel(world, eid, 'Test');

			expect(Label.offsetX[eid]).toBe(0);
			expect(Label.offsetY[eid]).toBe(0);
		});

		it('accepts position option', () => {
			setLabel(world, eid, 'Test', { position: LabelPosition.TopCenter });

			expect(Label.position[eid]).toBe(LabelPosition.TopCenter);
		});

		it('accepts offset options', () => {
			setLabel(world, eid, 'Test', { offsetX: 2, offsetY: -1 });

			expect(Label.offsetX[eid]).toBe(2);
			expect(Label.offsetY[eid]).toBe(-1);
		});

		it('updates existing label text', () => {
			setLabel(world, eid, 'First');
			setLabel(world, eid, 'Second');

			expect(getLabelText(world, eid)).toBe('Second');
		});

		it('preserves existing options when updating text only', () => {
			setLabel(world, eid, 'First', {
				position: LabelPosition.BottomRight,
				offsetX: 5,
				offsetY: 3,
			});
			setLabel(world, eid, 'Second');

			expect(Label.position[eid]).toBe(LabelPosition.BottomRight);
			expect(Label.offsetX[eid]).toBe(5);
			expect(Label.offsetY[eid]).toBe(3);
		});

		it('returns entity for chaining', () => {
			const result = setLabel(world, eid, 'Test');
			expect(result).toBe(eid);
		});
	});

	describe('getLabelText', () => {
		it('returns empty string for entity without label', () => {
			expect(getLabelText(world, eid)).toBe('');
		});

		it('returns label text', () => {
			setLabel(world, eid, 'Hello World');
			expect(getLabelText(world, eid)).toBe('Hello World');
		});
	});

	describe('getLabel', () => {
		it('returns null for entity without label', () => {
			expect(getLabel(world, eid)).toBeNull();
		});

		it('returns full label data', () => {
			setLabel(world, eid, 'Password', {
				position: LabelPosition.TopRight,
				offsetX: 1,
				offsetY: -2,
			});

			const label = getLabel(world, eid);

			expect(label).not.toBeNull();
			expect(label?.text).toBe('Password');
			expect(label?.position).toBe(LabelPosition.TopRight);
			expect(label?.offsetX).toBe(1);
			expect(label?.offsetY).toBe(-2);
		});
	});

	describe('getLabelPosition', () => {
		it('returns TopLeft for entity without label', () => {
			expect(getLabelPosition(world, eid)).toBe(LabelPosition.TopLeft);
		});

		it('returns label position', () => {
			setLabel(world, eid, 'Test', { position: LabelPosition.BottomCenter });
			expect(getLabelPosition(world, eid)).toBe(LabelPosition.BottomCenter);
		});
	});

	describe('setLabelPosition', () => {
		it('does nothing for entity without label', () => {
			setLabelPosition(world, eid, LabelPosition.Right);
			expect(hasLabel(world, eid)).toBe(false);
		});

		it('updates label position', () => {
			setLabel(world, eid, 'Test');
			setLabelPosition(world, eid, LabelPosition.Left);

			expect(Label.position[eid]).toBe(LabelPosition.Left);
		});

		it('returns entity for chaining', () => {
			setLabel(world, eid, 'Test');
			const result = setLabelPosition(world, eid, LabelPosition.Right);
			expect(result).toBe(eid);
		});
	});

	describe('setLabelOffset', () => {
		it('does nothing for entity without label', () => {
			setLabelOffset(world, eid, 5, 10);
			expect(hasLabel(world, eid)).toBe(false);
		});

		it('updates label offsets', () => {
			setLabel(world, eid, 'Test');
			setLabelOffset(world, eid, 3, -4);

			expect(Label.offsetX[eid]).toBe(3);
			expect(Label.offsetY[eid]).toBe(-4);
		});

		it('returns entity for chaining', () => {
			setLabel(world, eid, 'Test');
			const result = setLabelOffset(world, eid, 1, 1);
			expect(result).toBe(eid);
		});
	});

	describe('removeLabel', () => {
		it('removes label from entity', () => {
			setLabel(world, eid, 'Test');
			removeLabel(world, eid);

			expect(hasLabel(world, eid)).toBe(false);
		});

		it('cleans up label text from store', () => {
			setLabel(world, eid, 'Test');

			removeLabel(world, eid);

			// Text should be removed from store
			expect(getLabelText(world, eid)).toBe('');
		});

		it('does nothing for entity without label', () => {
			removeLabel(world, eid);
			expect(hasLabel(world, eid)).toBe(false);
		});

		it('returns entity for chaining', () => {
			setLabel(world, eid, 'Test');
			const result = removeLabel(world, eid);
			expect(result).toBe(eid);
		});
	});

	describe('hasLabelText', () => {
		it('returns false for entity without label', () => {
			expect(hasLabelText(world, eid)).toBe(false);
		});

		it('returns true for entity with non-empty label', () => {
			setLabel(world, eid, 'Hello');
			expect(hasLabelText(world, eid)).toBe(true);
		});

		it('returns false for entity with empty label', () => {
			setLabel(world, eid, '');
			expect(hasLabelText(world, eid)).toBe(false);
		});
	});

	describe('LabelPosition enum', () => {
		it('has all expected positions', () => {
			expect(LabelPosition.TopLeft).toBe(0);
			expect(LabelPosition.TopCenter).toBe(1);
			expect(LabelPosition.TopRight).toBe(2);
			expect(LabelPosition.BottomLeft).toBe(3);
			expect(LabelPosition.BottomCenter).toBe(4);
			expect(LabelPosition.BottomRight).toBe(5);
			expect(LabelPosition.Left).toBe(6);
			expect(LabelPosition.Right).toBe(7);
		});
	});

	describe('Multiple entities', () => {
		it('handles labels on multiple entities', () => {
			const eid2 = addEntity(world) as Entity;
			const eid3 = addEntity(world) as Entity;

			setLabel(world, eid, 'First');
			setLabel(world, eid2, 'Second');
			setLabel(world, eid3, 'Third');

			expect(getLabelText(world, eid)).toBe('First');
			expect(getLabelText(world, eid2)).toBe('Second');
			expect(getLabelText(world, eid3)).toBe('Third');
		});

		it('maintains separate positions for each entity', () => {
			const eid2 = addEntity(world) as Entity;

			setLabel(world, eid, 'One', { position: LabelPosition.TopLeft });
			setLabel(world, eid2, 'Two', { position: LabelPosition.BottomRight });

			expect(getLabelPosition(world, eid)).toBe(LabelPosition.TopLeft);
			expect(getLabelPosition(world, eid2)).toBe(LabelPosition.BottomRight);
		});
	});

	describe('resetLabelStore', () => {
		it('clears all labels from store', () => {
			setLabel(world, eid, 'Test');
			const eid2 = addEntity(world) as Entity;
			setLabel(world, eid2, 'Test2');

			resetLabelStore();

			// Labels still exist on entities but text is gone from store
			expect(getLabelText(world, eid)).toBe('');
			expect(getLabelText(world, eid2)).toBe('');
		});
	});
});
