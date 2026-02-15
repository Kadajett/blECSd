/**
 * Message Widget
 *
 * A temporary message/notification widget for displaying alerts, errors,
 * success messages, and other notifications. Supports auto-dismiss,
 * click/key dismiss, and styled message types.
 *
 * @module widgets/message
 */

// Re-export types
export type {
	MessageType,
	PositionValue,
	BorderConfig,
	MessageStyleConfig,
	MessageConfig,
	MessageWidget,
} from './types';

// Re-export configuration schema and constants
export {
	MessageConfigSchema,
	DEFAULT_MESSAGE_TIMEOUT,
	DEFAULT_MESSAGE_PADDING,
	DEFAULT_MESSAGE_STYLES,
} from './config';

// Re-export state and component
export { Message } from './state';

// Re-export factory function
export { createMessage } from './factory';

// Re-export API functions
export {
	showInfo,
	showWarning,
	showError,
	showSuccess,
	isMessage,
	isDismissOnClick,
	isDismissOnKey,
	handleMessageClick,
	handleMessageKey,
	resetMessageStore,
} from './api';
