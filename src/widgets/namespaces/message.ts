/**
 * Message widget namespace.
 *
 * @example
 * ```typescript
 * import { message } from 'blecsd/widgets';
 * const m = message.create(world, { text: 'Hello', type: 'info' });
 * message.showInfo(world, 'Info message');
 * message.showWarning(world, 'Warning message');
 * message.showError(world, 'Error message');
 * message.showSuccess(world, 'Success message');
 * message.handleKey(world, m.eid, keyEvent);
 * message.handleClick(world, m.eid, mouseEvent);
 * ```
 */
import {
	createMessage,
	DEFAULT_MESSAGE_PADDING,
	DEFAULT_MESSAGE_STYLES,
	DEFAULT_MESSAGE_TIMEOUT,
	handleMessageClick,
	handleMessageKey,
	isDismissOnClick,
	isDismissOnKey,
	isMessage,
	resetMessageStore,
	showError,
	showInfo,
	showSuccess,
	showWarning,
} from '../message';

export const message = Object.freeze({
	create: createMessage,
	is: isMessage,
	showInfo,
	showWarning,
	showError,
	showSuccess,
	handleKey: handleMessageKey,
	handleClick: handleMessageClick,
	isDismissOnKey,
	isDismissOnClick,
	resetStore: resetMessageStore,
	DEFAULT_MESSAGE_PADDING,
	DEFAULT_MESSAGE_STYLES,
	DEFAULT_MESSAGE_TIMEOUT,
});

export type MessageModule = typeof message;
