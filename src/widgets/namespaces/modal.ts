/**
 * Modal widget namespace.
 *
 * @example
 * ```typescript
 * import { modal } from 'blecsd/widgets';
 * const m = modal.create(world, { title: 'Confirm', content: 'Are you sure?' });
 * modal.open(world, m.eid);
 * const isOpen = modal.isOpen(world, m.eid);
 * const stack = modal.getStack(world);
 * modal.handleEscape(world, keyEvent);
 * modal.handleBackdropClick(world, m.eid, mouseEvent);
 * modal.close(world, m.eid);
 * modal.closeAll(world);
 * ```
 */
import {
	closeAllModals,
	closeModal,
	createModal,
	getModalStack,
	handleModalBackdropClick,
	handleModalEscape,
	isModal,
	isModalOpen,
	openModal,
	resetModalStore,
} from '../modal';

export const modal = Object.freeze({
	create: createModal,
	is: isModal,
	open: openModal,
	close: closeModal,
	closeAll: closeAllModals,
	isOpen: isModalOpen,
	getStack: getModalStack,
	handleEscape: handleModalEscape,
	handleBackdropClick: handleModalBackdropClick,
	resetStore: resetModalStore,
});

export type ModalModule = typeof modal;
