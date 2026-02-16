/**
 * Question widget namespace.
 *
 * @example
 * ```typescript
 * import { question } from 'blecsd/widgets';
 * const q = question.create(world, { message: 'Are you sure?' });
 * const answer = await question.ask(world, 'Proceed?');
 * const confirmed = await question.confirm(world, 'Delete file?');
 * question.handleKey(world, q.eid, keyEvent);
 * ```
 */
import {
	ask,
	confirm,
	createQuestion,
	DEFAULT_QUESTION_BG,
	DEFAULT_QUESTION_FG,
	DEFAULT_QUESTION_HEIGHT,
	DEFAULT_QUESTION_WIDTH,
	handleQuestionKey,
	isQuestion,
	resetQuestionStore,
} from '../question';

export const question = Object.freeze({
	create: createQuestion,
	is: isQuestion,
	ask,
	confirm,
	handleKey: handleQuestionKey,
	resetStore: resetQuestionStore,
	DEFAULT_QUESTION_BG,
	DEFAULT_QUESTION_FG,
	DEFAULT_QUESTION_HEIGHT,
	DEFAULT_QUESTION_WIDTH,
});

export type QuestionModule = typeof question;
