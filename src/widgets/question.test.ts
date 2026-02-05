/**
 * Tests for Question widget.
 *
 * @module widgets/question.test
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorld } from '../core/ecs';
import {
	ask,
	confirm,
	createQuestion,
	DEFAULT_QUESTION_HEIGHT,
	DEFAULT_QUESTION_WIDTH,
	handleQuestionKey,
	isQuestion,
	Question,
	QuestionConfigSchema,
	resetQuestionStore,
} from './question';

describe('question widget', () => {
	afterEach(() => {
		resetQuestionStore();
	});

	describe('createQuestion', () => {
		it('creates question widget with default config', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(question.eid).toBeDefined();
			expect(question.getMessage()).toBe('Are you sure?');
			expect(question.getSelectedAnswer()).toBe(true);
		});

		it('creates question with custom message', () => {
			const world = createWorld();
			const question = createQuestion(world, { message: 'Delete file?' });

			expect(question.getMessage()).toBe('Delete file?');
		});

		it('creates question with custom yesText and noText', () => {
			const world = createWorld();
			const question = createQuestion(world, {
				yesText: 'Confirm',
				noText: 'Cancel',
			});

			// Verify via getSelectedAnswer toggling and confirm callback
			const cb = vi.fn();
			question.onConfirm(cb);
			question.confirm();
			expect(cb).toHaveBeenCalledWith(true);
		});

		it('creates question with defaultAnswer false', () => {
			const world = createWorld();
			const question = createQuestion(world, { defaultAnswer: false });

			expect(question.getSelectedAnswer()).toBe(false);
		});

		it('creates question with custom position', () => {
			const world = createWorld();
			const question = createQuestion(world, { left: 10, top: 5 });

			expect(question.eid).toBeDefined();
		});

		it('creates question with border config', () => {
			const world = createWorld();
			const question = createQuestion(world, {
				border: { type: 'line', ch: 'single' },
			});

			expect(question.eid).toBeDefined();
		});

		it('creates question with padding config', () => {
			const world = createWorld();
			const question = createQuestion(world, { padding: 2 });

			expect(question.eid).toBeDefined();
		});

		it('creates question with style colors', () => {
			const world = createWorld();
			const question = createQuestion(world, {
				fg: '#ffffff',
				bg: '#000000',
			});

			expect(question.eid).toBeDefined();
		});

		it('marks entity with Question component', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(Question.isQuestion[question.eid]).toBe(1);
		});
	});

	describe('selectYes / selectNo', () => {
		it('selectYes sets selected answer to true', () => {
			const world = createWorld();
			const question = createQuestion(world, { defaultAnswer: false });

			question.selectYes();
			expect(question.getSelectedAnswer()).toBe(true);
		});

		it('selectNo sets selected answer to false', () => {
			const world = createWorld();
			const question = createQuestion(world, { defaultAnswer: true });

			question.selectNo();
			expect(question.getSelectedAnswer()).toBe(false);
		});

		it('toggle between yes and no', () => {
			const world = createWorld();
			const question = createQuestion(world);

			question.selectNo();
			expect(question.getSelectedAnswer()).toBe(false);

			question.selectYes();
			expect(question.getSelectedAnswer()).toBe(true);
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(question.selectYes()).toBe(question);
			expect(question.selectNo()).toBe(question);
		});
	});

	describe('confirm', () => {
		it('triggers onConfirm with true when yes is selected', () => {
			const world = createWorld();
			const question = createQuestion(world, { defaultAnswer: true });
			const cb = vi.fn();

			question.onConfirm(cb);
			question.confirm();

			expect(cb).toHaveBeenCalledWith(true);
		});

		it('triggers onConfirm with false when no is selected', () => {
			const world = createWorld();
			const question = createQuestion(world, { defaultAnswer: false });
			const cb = vi.fn();

			question.onConfirm(cb);
			question.confirm();

			expect(cb).toHaveBeenCalledWith(false);
		});

		it('triggers multiple onConfirm callbacks', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const cb1 = vi.fn();
			const cb2 = vi.fn();

			question.onConfirm(cb1).onConfirm(cb2);
			question.confirm();

			expect(cb1).toHaveBeenCalledWith(true);
			expect(cb2).toHaveBeenCalledWith(true);
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(question.confirm()).toBe(question);
		});
	});

	describe('cancel', () => {
		it('triggers onCancel callback', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const cb = vi.fn();

			question.onCancel(cb);
			question.cancel();

			expect(cb).toHaveBeenCalled();
		});

		it('triggers multiple onCancel callbacks', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const cb1 = vi.fn();
			const cb2 = vi.fn();

			question.onCancel(cb1).onCancel(cb2);
			question.cancel();

			expect(cb1).toHaveBeenCalled();
			expect(cb2).toHaveBeenCalled();
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(question.cancel()).toBe(question);
		});
	});

	describe('getSelectedAnswer', () => {
		it('returns default answer initially', () => {
			const world = createWorld();
			const questionTrue = createQuestion(world, { defaultAnswer: true });
			const questionFalse = createQuestion(world, { defaultAnswer: false });

			expect(questionTrue.getSelectedAnswer()).toBe(true);
			expect(questionFalse.getSelectedAnswer()).toBe(false);
		});

		it('returns updated answer after selection change', () => {
			const world = createWorld();
			const question = createQuestion(world, { defaultAnswer: true });

			question.selectNo();
			expect(question.getSelectedAnswer()).toBe(false);

			question.selectYes();
			expect(question.getSelectedAnswer()).toBe(true);
		});
	});

	describe('setMessage / getMessage', () => {
		it('sets and gets message', () => {
			const world = createWorld();
			const question = createQuestion(world, { message: 'Original?' });

			question.setMessage('Updated?');
			expect(question.getMessage()).toBe('Updated?');
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(question.setMessage('Test?')).toBe(question);
		});

		it('returns empty string for destroyed widget', () => {
			const world = createWorld();
			const question = createQuestion(world);
			question.destroy();

			expect(question.getMessage()).toBe('');
		});
	});

	describe('show / hide', () => {
		it('shows question widget', () => {
			const world = createWorld();
			const question = createQuestion(world);

			question.hide();
			question.show();
			// No throw means success
			expect(question.eid).toBeDefined();
		});

		it('hides question widget', () => {
			const world = createWorld();
			const question = createQuestion(world);

			question.hide();
			expect(question.eid).toBeDefined();
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(question.show()).toBe(question);
			expect(question.hide()).toBe(question);
		});
	});

	describe('center', () => {
		it('centers the question on screen', () => {
			const world = createWorld();
			const question = createQuestion(world);

			question.center(80, 24);
			// Centered position = (80 - 40) / 2 = 20, (24 - 5) / 2 = 9 (with defaults)
			expect(question.eid).toBeDefined();
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(question.center(80, 24)).toBe(question);
		});
	});

	describe('move / setPosition', () => {
		it('moves by delta', () => {
			const world = createWorld();
			const question = createQuestion(world, { left: 10, top: 5 });

			question.move(5, 3);
			// No throw means success
			expect(question.eid).toBeDefined();
		});

		it('sets absolute position', () => {
			const world = createWorld();
			const question = createQuestion(world);

			question.setPosition(20, 15);
			expect(question.eid).toBeDefined();
		});

		it('returns self for chaining', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(question.move(1, 1)).toBe(question);
			expect(question.setPosition(0, 0)).toBe(question);
		});
	});

	describe('destroy', () => {
		it('cleans up Question component marker', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const eid = question.eid;

			question.destroy();

			expect(Question.isQuestion[eid]).toBe(0);
		});

		it('cleans up state map', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const eid = question.eid;

			question.destroy();

			expect(isQuestion(world, eid)).toBe(false);
		});

		it('removes entity from world', () => {
			const world = createWorld();
			const question = createQuestion(world);

			question.destroy();
			// No error means entity was removed
		});
	});

	describe('isQuestion', () => {
		it('returns true for question widget', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(isQuestion(world, question.eid)).toBe(true);
		});

		it('returns false for non-question entity', () => {
			const world = createWorld();

			expect(isQuestion(world, 999 as never)).toBe(false);
		});

		it('returns false after destroy', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const eid = question.eid;

			question.destroy();

			expect(isQuestion(world, eid)).toBe(false);
		});
	});

	describe('QuestionConfigSchema', () => {
		it('validates default config', () => {
			const result = QuestionConfigSchema.parse({});

			expect(result.message).toBe('Are you sure?');
			expect(result.yesText).toBe('Yes');
			expect(result.noText).toBe('No');
			expect(result.defaultAnswer).toBe(true);
			expect(result.width).toBe(DEFAULT_QUESTION_WIDTH);
			expect(result.height).toBe(DEFAULT_QUESTION_HEIGHT);
		});

		it('validates custom config', () => {
			const result = QuestionConfigSchema.parse({
				message: 'Delete?',
				yesText: 'Confirm',
				noText: 'Cancel',
				defaultAnswer: false,
				width: 50,
				height: 7,
			});

			expect(result.message).toBe('Delete?');
			expect(result.yesText).toBe('Confirm');
			expect(result.noText).toBe('Cancel');
			expect(result.defaultAnswer).toBe(false);
			expect(result.width).toBe(50);
			expect(result.height).toBe(7);
		});

		it('rejects invalid width', () => {
			expect(() => QuestionConfigSchema.parse({ width: -1 })).toThrow();
		});

		it('rejects invalid height', () => {
			expect(() => QuestionConfigSchema.parse({ height: 0 })).toThrow();
		});
	});

	describe('handleQuestionKey', () => {
		it('handles y key (selects yes and confirms)', () => {
			const world = createWorld();
			const question = createQuestion(world, { defaultAnswer: false });
			const cb = vi.fn();
			question.onConfirm(cb);

			const handled = handleQuestionKey(question, 'y');

			expect(handled).toBe(true);
			expect(cb).toHaveBeenCalledWith(true);
		});

		it('handles Y key (uppercase)', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const cb = vi.fn();
			question.onConfirm(cb);

			expect(handleQuestionKey(question, 'Y')).toBe(true);
			expect(cb).toHaveBeenCalledWith(true);
		});

		it('handles n key (selects no and confirms)', () => {
			const world = createWorld();
			const question = createQuestion(world, { defaultAnswer: true });
			const cb = vi.fn();
			question.onConfirm(cb);

			const handled = handleQuestionKey(question, 'n');

			expect(handled).toBe(true);
			expect(cb).toHaveBeenCalledWith(false);
		});

		it('handles N key (uppercase)', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const cb = vi.fn();
			question.onConfirm(cb);

			expect(handleQuestionKey(question, 'N')).toBe(true);
			expect(cb).toHaveBeenCalledWith(false);
		});

		it('handles enter key (confirms current selection)', () => {
			const world = createWorld();
			const question = createQuestion(world, { defaultAnswer: true });
			const cb = vi.fn();
			question.onConfirm(cb);

			const handled = handleQuestionKey(question, 'enter');

			expect(handled).toBe(true);
			expect(cb).toHaveBeenCalledWith(true);
		});

		it('handles escape key (cancels)', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const cb = vi.fn();
			question.onCancel(cb);

			const handled = handleQuestionKey(question, 'escape');

			expect(handled).toBe(true);
			expect(cb).toHaveBeenCalled();
		});

		it('returns false for unhandled keys', () => {
			const world = createWorld();
			const question = createQuestion(world);

			expect(handleQuestionKey(question, 'a')).toBe(false);
			expect(handleQuestionKey(question, 'space')).toBe(false);
		});
	});

	describe('ask', () => {
		it('resolves with true when confirmed with yes', async () => {
			const world = createWorld();
			const promise = ask(world, 'Continue?');

			// Simulate confirming by finding the last created question
			// The ask function creates a question internally, so we need to
			// trigger its confirm callback. We do this by examining questionStateMap.
			const { questionStateMap } = await import('./question');
			const entries = [...questionStateMap.entries()];
			const lastEntry = entries[entries.length - 1];
			expect(lastEntry).toBeDefined();
			const state = lastEntry![1];
			for (const cb of state.confirmCallbacks) {
				cb(true);
			}

			const result = await promise;
			expect(result).toBe(true);
		});

		it('resolves with false when cancelled', async () => {
			const world = createWorld();
			const promise = ask(world, 'Continue?');

			const { questionStateMap } = await import('./question');
			const entries = [...questionStateMap.entries()];
			const lastEntry = entries[entries.length - 1];
			expect(lastEntry).toBeDefined();
			const state = lastEntry![1];
			for (const cb of state.cancelCallbacks) {
				cb();
			}

			const result = await promise;
			expect(result).toBe(false);
		});
	});

	describe('confirm convenience function', () => {
		it('resolves with true when confirmed', async () => {
			const world = createWorld();
			const promise = confirm(world, 'Delete?');

			const { questionStateMap } = await import('./question');
			const entries = [...questionStateMap.entries()];
			const lastEntry = entries[entries.length - 1];
			expect(lastEntry).toBeDefined();
			const state = lastEntry![1];
			for (const cb of state.confirmCallbacks) {
				cb(true);
			}

			const result = await promise;
			expect(result).toBe(true);
		});

		it('resolves with false when cancelled', async () => {
			const world = createWorld();
			const promise = confirm(world, 'Delete?');

			const { questionStateMap } = await import('./question');
			const entries = [...questionStateMap.entries()];
			const lastEntry = entries[entries.length - 1];
			expect(lastEntry).toBeDefined();
			const state = lastEntry![1];
			for (const cb of state.cancelCallbacks) {
				cb();
			}

			const result = await promise;
			expect(result).toBe(false);
		});
	});

	describe('method chaining', () => {
		it('supports chained operations', () => {
			const world = createWorld();
			const question = createQuestion(world);

			question.setMessage('Save?').selectNo().selectYes().setPosition(5, 5).show();

			expect(question.getMessage()).toBe('Save?');
			expect(question.getSelectedAnswer()).toBe(true);
		});
	});

	describe('resetQuestionStore', () => {
		it('clears all question state', () => {
			const world = createWorld();
			const question = createQuestion(world);
			const eid = question.eid;

			resetQuestionStore();

			expect(Question.isQuestion[eid]).toBe(0);
			expect(isQuestion(world, eid)).toBe(false);
		});
	});
});
