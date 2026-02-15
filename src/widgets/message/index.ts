/**
 * Message Widget
 *
 * A temporary message/notification widget for displaying alerts, errors,
 * success messages, and other notifications. Supports auto-dismiss,
 * click/key dismiss, and styled message types.
 *
 * @module widgets/message
 */

// Re-export API functions
export {
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
} from './api';

// Re-export configuration schema and constants
export {
	DEFAULT_MESSAGE_PADDING,
	DEFAULT_MESSAGE_STYLES,
	DEFAULT_MESSAGE_TIMEOUT,
	MessageConfigSchema,
} from './config';
// Re-export factory function
export { createMessage } from './factory';
// Re-export state and component
export { Message } from './state';
// Re-export types
export type {
	BorderConfig,
	MessageConfig,
	MessageStyleConfig,
	MessageType,
	MessageWidget,
	PositionValue,
} from './types';
