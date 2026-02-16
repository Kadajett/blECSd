/**
 * PromptWidget namespace.
 *
 * @example
 * ```typescript
 * import { promptWidget } from 'blecsd/widgets';
 * const p = promptWidget.create(world, { message: 'Enter name:' });
 * const result = await promptWidget.prompt(world, 'Enter email:');
 * promptWidget.handleKey(world, p.eid, keyEvent);
 * ```
 */
import {
	createPrompt,
	DEFAULT_PROMPT_BG,
	DEFAULT_PROMPT_FG,
	DEFAULT_PROMPT_HEIGHT,
	DEFAULT_PROMPT_WIDTH,
	handlePromptKey,
	isPrompt,
	prompt,
	resetPromptStore,
} from '../prompt';

export const promptWidget = Object.freeze({
	create: createPrompt,
	is: isPrompt,
	prompt,
	handleKey: handlePromptKey,
	resetStore: resetPromptStore,
	DEFAULT_PROMPT_BG,
	DEFAULT_PROMPT_FG,
	DEFAULT_PROMPT_HEIGHT,
	DEFAULT_PROMPT_WIDTH,
});

export type PromptWidgetModule = typeof promptWidget;
