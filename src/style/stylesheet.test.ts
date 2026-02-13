/**
 * Tests for the CSS-like Stylesheet System.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { Renderable } from '../components/renderable';
import { clearAllUserData, setUserData } from '../components/userData';
import { addComponent, addEntity, createWorld } from '../core/ecs';
import { clearAllEntityData, setEntityData } from '../core/entityData';
import { packColor } from '../utils/color';
import {
	addRule,
	applyStylesheet,
	applyStylesheetToEntity,
	calculateSpecificity,
	clearRules,
	createStylesheet,
	getMatchingRules,
	matchesSelector,
	removeRules,
	StyleRuleSchema,
	StyleSelectorSchema,
	StylesheetSchema,
} from './stylesheet';

function createEntityWithRenderable(
	world: ReturnType<typeof createWorld>,
): ReturnType<typeof addEntity> {
	const eid = addEntity(world);
	addComponent(world, eid, Renderable);
	Renderable.visible[eid] = 1;
	Renderable.dirty[eid] = 0;
	Renderable.fg[eid] = packColor(255, 255, 255);
	Renderable.bg[eid] = packColor(0, 0, 0);
	Renderable.bold[eid] = 0;
	Renderable.underline[eid] = 0;
	Renderable.opacity[eid] = 255;
	return eid;
}

describe('Stylesheet System', () => {
	beforeEach(() => {
		clearAllEntityData();
		clearAllUserData();
	});

	describe('calculateSpecificity', () => {
		it('returns 1 for tag-only selector', () => {
			expect(calculateSpecificity({ tag: 'box' })).toBe(1);
		});

		it('returns 10 for class-only selector', () => {
			expect(calculateSpecificity({ className: 'primary' })).toBe(10);
		});

		it('returns 100 for id-only selector', () => {
			expect(calculateSpecificity({ entityId: 42 })).toBe(100);
		});

		it('sums specificity for combined selectors', () => {
			expect(calculateSpecificity({ tag: 'box', className: 'primary' })).toBe(11);
			expect(calculateSpecificity({ tag: 'box', entityId: 42 })).toBe(101);
			expect(calculateSpecificity({ className: 'primary', entityId: 42 })).toBe(110);
			expect(calculateSpecificity({ tag: 'box', className: 'primary', entityId: 42 })).toBe(111);
		});
	});

	describe('matchesSelector', () => {
		it('matches by entityId', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(matchesSelector(world, eid, { entityId: eid as number })).toBe(true);
			expect(matchesSelector(world, eid, { entityId: 9999 })).toBe(false);
		});

		it('matches by tag via entityData', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setEntityData(eid, 'widgetTag', 'button');

			expect(matchesSelector(world, eid, { tag: 'button' })).toBe(true);
			expect(matchesSelector(world, eid, { tag: 'box' })).toBe(false);
		});

		it('matches by tag via userData fallback', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setUserData(world, eid, { tag: 'panel' });

			expect(matchesSelector(world, eid, { tag: 'panel' })).toBe(true);
			expect(matchesSelector(world, eid, { tag: 'box' })).toBe(false);
		});

		it('matches by className via entityData', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setEntityData(eid, 'styleClasses', ['primary', 'large']);

			expect(matchesSelector(world, eid, { className: 'primary' })).toBe(true);
			expect(matchesSelector(world, eid, { className: 'large' })).toBe(true);
			expect(matchesSelector(world, eid, { className: 'secondary' })).toBe(false);
		});

		it('matches by className via userData fallback', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setUserData(world, eid, { classes: ['danger', 'small'] });

			expect(matchesSelector(world, eid, { className: 'danger' })).toBe(true);
			expect(matchesSelector(world, eid, { className: 'small' })).toBe(true);
			expect(matchesSelector(world, eid, { className: 'safe' })).toBe(false);
		});

		it('requires all selector criteria to match (AND logic)', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setEntityData(eid, 'widgetTag', 'button');
			setEntityData(eid, 'styleClasses', ['primary']);

			// Both match
			expect(matchesSelector(world, eid, { tag: 'button', className: 'primary' })).toBe(true);
			// Tag matches, class doesn't
			expect(matchesSelector(world, eid, { tag: 'button', className: 'secondary' })).toBe(false);
			// Class matches, tag doesn't
			expect(matchesSelector(world, eid, { tag: 'box', className: 'primary' })).toBe(false);
		});

		it('returns false for empty entity with no data', () => {
			const world = createWorld();
			const eid = addEntity(world);

			expect(matchesSelector(world, eid, { tag: 'box' })).toBe(false);
			expect(matchesSelector(world, eid, { className: 'primary' })).toBe(false);
		});
	});

	describe('createStylesheet', () => {
		it('creates an empty stylesheet', () => {
			const sheet = createStylesheet('test');
			expect(sheet.name).toBe('test');
			expect(sheet.rules).toEqual([]);
		});
	});

	describe('addRule', () => {
		it('adds a rule to the stylesheet', () => {
			let sheet = createStylesheet('test');
			sheet = addRule(sheet, {
				selector: { tag: 'box' },
				style: { fg: '#ff0000' },
			});

			expect(sheet.rules).toHaveLength(1);
			expect(sheet.rules[0]?.selector.tag).toBe('box');
		});

		it('preserves existing rules', () => {
			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'box' }, style: { fg: '#ff0000' } });
			sheet = addRule(sheet, { selector: { tag: 'button' }, style: { fg: '#00ff00' } });

			expect(sheet.rules).toHaveLength(2);
		});

		it('validates rules with Zod', () => {
			const sheet = createStylesheet('test');

			// Empty selector should fail
			expect(() => {
				addRule(sheet, { selector: {}, style: { fg: '#ff0000' } });
			}).toThrow();
		});

		it('returns a new stylesheet (immutable)', () => {
			const sheet1 = createStylesheet('test');
			const sheet2 = addRule(sheet1, { selector: { tag: 'box' }, style: {} });

			expect(sheet1.rules).toHaveLength(0);
			expect(sheet2.rules).toHaveLength(1);
		});
	});

	describe('removeRules', () => {
		it('removes rules matching predicate', () => {
			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'box' }, style: { fg: '#ff0000' } });
			sheet = addRule(sheet, { selector: { tag: 'button' }, style: { fg: '#00ff00' } });
			sheet = addRule(sheet, { selector: { tag: 'box' }, style: { bg: '#000000' } });

			sheet = removeRules(sheet, (rule) => rule.selector.tag === 'box');
			expect(sheet.rules).toHaveLength(1);
			expect(sheet.rules[0]?.selector.tag).toBe('button');
		});
	});

	describe('clearRules', () => {
		it('removes all rules', () => {
			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'box' }, style: {} });
			sheet = addRule(sheet, { selector: { tag: 'button' }, style: {} });

			sheet = clearRules(sheet);
			expect(sheet.rules).toHaveLength(0);
			expect(sheet.name).toBe('test');
		});
	});

	describe('applyStylesheet', () => {
		it('applies tag-based rules to matching entities', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);
			setEntityData(eid, 'widgetTag', 'box');

			const red = packColor(255, 0, 0);
			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'box' }, style: { fg: red } });

			const result = applyStylesheet(world, sheet);

			expect(result.entitiesStyled).toBe(1);
			expect(result.rulesMatched).toBe(1);
			expect(Renderable.fg[eid]).toBe(red);
		});

		it('applies class-based rules to matching entities', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);
			setEntityData(eid, 'styleClasses', ['highlight']);

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, {
				selector: { className: 'highlight' },
				style: { bold: true },
			});

			applyStylesheet(world, sheet);

			expect(Renderable.bold[eid]).toBe(1);
		});

		it('applies id-based rules to specific entities', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);
			const green = packColor(0, 255, 0);

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, {
				selector: { entityId: eid as number },
				style: { bg: green },
			});

			applyStylesheet(world, sheet);

			expect(Renderable.bg[eid]).toBe(green);
		});

		it('cascades by specificity: id overrides class overrides tag', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);
			setEntityData(eid, 'widgetTag', 'button');
			setEntityData(eid, 'styleClasses', ['primary']);

			const red = packColor(255, 0, 0);
			const green = packColor(0, 255, 0);
			const blue = packColor(0, 0, 255);

			let sheet = createStylesheet('test');
			// Tag rule (specificity 1)
			sheet = addRule(sheet, { selector: { tag: 'button' }, style: { fg: red } });
			// Class rule (specificity 10) overrides tag
			sheet = addRule(sheet, { selector: { className: 'primary' }, style: { fg: green } });
			// ID rule (specificity 100) overrides class
			sheet = addRule(sheet, { selector: { entityId: eid as number }, style: { fg: blue } });

			applyStylesheet(world, sheet);

			// ID wins
			expect(Renderable.fg[eid]).toBe(blue);
		});

		it('merges non-overlapping properties from different specificity levels', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);
			setEntityData(eid, 'widgetTag', 'box');
			setEntityData(eid, 'styleClasses', ['fancy']);

			const red = packColor(255, 0, 0);
			const blue = packColor(0, 0, 255);

			let sheet = createStylesheet('test');
			// Tag sets fg
			sheet = addRule(sheet, { selector: { tag: 'box' }, style: { fg: red } });
			// Class sets bg + bold (doesn't override fg since it doesn't set fg)
			sheet = addRule(sheet, { selector: { className: 'fancy' }, style: { bg: blue, bold: true } });

			applyStylesheet(world, sheet);

			expect(Renderable.fg[eid]).toBe(red);
			expect(Renderable.bg[eid]).toBe(blue);
			expect(Renderable.bold[eid]).toBe(1);
		});

		it('skips entities without Renderable component', () => {
			const world = createWorld();
			const eid = addEntity(world); // No Renderable
			setEntityData(eid, 'widgetTag', 'box');

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'box' }, style: { bold: true } });

			const result = applyStylesheet(world, sheet);
			expect(result.entitiesStyled).toBe(0);
		});

		it('skips entities that match no rules', () => {
			const world = createWorld();
			createEntityWithRenderable(world); // No tag or class set

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'button' }, style: { bold: true } });

			const result = applyStylesheet(world, sheet);
			expect(result.entitiesStyled).toBe(0);
		});

		it('handles priority tie-breaking', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);
			setEntityData(eid, 'styleClasses', ['a', 'b']);

			const red = packColor(255, 0, 0);
			const green = packColor(0, 255, 0);

			let sheet = createStylesheet('test');
			// Same specificity (10), same priority (0), order decides: later wins
			sheet = addRule(sheet, { selector: { className: 'a' }, style: { fg: red } });
			sheet = addRule(sheet, { selector: { className: 'b' }, style: { fg: green } });

			applyStylesheet(world, sheet);

			expect(Renderable.fg[eid]).toBe(green);
		});

		it('respects priority override on equal specificity', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);
			setEntityData(eid, 'styleClasses', ['a', 'b']);

			const red = packColor(255, 0, 0);
			const green = packColor(0, 255, 0);

			let sheet = createStylesheet('test');
			// Higher priority wins even if declared first
			sheet = addRule(sheet, {
				selector: { className: 'a' },
				style: { fg: red },
				priority: 10,
			});
			sheet = addRule(sheet, {
				selector: { className: 'b' },
				style: { fg: green },
				priority: 0,
			});

			applyStylesheet(world, sheet);

			expect(Renderable.fg[eid]).toBe(red);
		});

		it('marks styled entities as dirty', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);
			Renderable.dirty[eid] = 0;
			setEntityData(eid, 'widgetTag', 'box');

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'box' }, style: { bold: true } });

			applyStylesheet(world, sheet);

			expect(Renderable.dirty[eid]).toBe(1);
		});
	});

	describe('applyStylesheetToEntity', () => {
		it('applies matching rules to a single entity', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);
			setEntityData(eid, 'widgetTag', 'button');

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'button' }, style: { underline: true } });

			const result = applyStylesheetToEntity(world, eid, sheet);

			expect(result).toBe(true);
			expect(Renderable.underline[eid]).toBe(1);
		});

		it('returns false when no rules match', () => {
			const world = createWorld();
			const eid = createEntityWithRenderable(world);

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'button' }, style: { bold: true } });

			const result = applyStylesheetToEntity(world, eid, sheet);
			expect(result).toBe(false);
		});

		it('returns false for entity without Renderable', () => {
			const world = createWorld();
			const eid = addEntity(world);

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { entityId: eid as number }, style: { bold: true } });

			const result = applyStylesheetToEntity(world, eid, sheet);
			expect(result).toBe(false);
		});
	});

	describe('getMatchingRules', () => {
		it('returns all matching rules with specificity', () => {
			const world = createWorld();
			const eid = addEntity(world);
			setEntityData(eid, 'widgetTag', 'button');
			setEntityData(eid, 'styleClasses', ['primary']);

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'button' }, style: { bold: true } });
			sheet = addRule(sheet, { selector: { className: 'primary' }, style: { underline: true } });
			sheet = addRule(sheet, { selector: { tag: 'box' }, style: { blink: true } }); // no match

			const matches = getMatchingRules(world, eid, sheet);

			expect(matches).toHaveLength(2);
			expect(matches[0]?.specificity).toBe(1); // tag
			expect(matches[1]?.specificity).toBe(10); // class
		});

		it('returns empty array when no rules match', () => {
			const world = createWorld();
			const eid = addEntity(world);

			let sheet = createStylesheet('test');
			sheet = addRule(sheet, { selector: { tag: 'button' }, style: { bold: true } });

			const matches = getMatchingRules(world, eid, sheet);
			expect(matches).toHaveLength(0);
		});
	});

	describe('Zod schemas', () => {
		it('validates StyleSelectorSchema', () => {
			expect(() => StyleSelectorSchema.parse({ tag: 'box' })).not.toThrow();
			expect(() => StyleSelectorSchema.parse({ className: 'primary' })).not.toThrow();
			expect(() => StyleSelectorSchema.parse({ entityId: 42 })).not.toThrow();
			expect(() => StyleSelectorSchema.parse({})).toThrow();
		});

		it('validates StyleRuleSchema', () => {
			expect(() =>
				StyleRuleSchema.parse({
					selector: { tag: 'box' },
					style: { fg: '#ff0000', bold: true },
				}),
			).not.toThrow();
		});

		it('validates StylesheetSchema', () => {
			expect(() =>
				StylesheetSchema.parse({
					name: 'main',
					rules: [{ selector: { tag: 'box' }, style: { fg: '#ff0000' } }],
				}),
			).not.toThrow();

			// Empty name should fail
			expect(() =>
				StylesheetSchema.parse({
					name: '',
					rules: [],
				}),
			).toThrow();
		});

		it('rejects invalid opacity values', () => {
			expect(() =>
				StyleRuleSchema.parse({
					selector: { tag: 'box' },
					style: { opacity: 2 },
				}),
			).toThrow();

			expect(() =>
				StyleRuleSchema.parse({
					selector: { tag: 'box' },
					style: { opacity: -1 },
				}),
			).toThrow();
		});
	});
});
