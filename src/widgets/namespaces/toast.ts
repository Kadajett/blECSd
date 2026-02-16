/**
 * Toast widget namespace.
 *
 * @example
 * ```typescript
 * import { toast } from 'blecsd/widgets';
 * const t = toast.create(world, { message: 'Saved!', type: 'success' });
 * toast.showInfo(world, 'Info message');
 * toast.showWarning(world, 'Warning message');
 * toast.showError(world, 'Error message');
 * toast.showSuccess(world, 'Success message');
 * ```
 */
import {
	createToast,
	DEFAULT_TOAST_PADDING,
	DEFAULT_TOAST_STYLES,
	DEFAULT_TOAST_TIMEOUT,
	isToast,
	resetToastStore,
	showErrorToast,
	showInfoToast,
	showSuccessToast,
	showWarningToast,
	TOAST_STACK_SPACING,
} from '../toast';

export const toast = Object.freeze({
	create: createToast,
	is: isToast,
	showInfo: showInfoToast,
	showWarning: showWarningToast,
	showError: showErrorToast,
	showSuccess: showSuccessToast,
	resetStore: resetToastStore,
	DEFAULT_TOAST_PADDING,
	DEFAULT_TOAST_STYLES,
	DEFAULT_TOAST_TIMEOUT,
	TOAST_STACK_SPACING,
});

export type ToastModule = typeof toast;
