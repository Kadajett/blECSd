/**
 * Tests for the Modal widget.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPosition } from '../components/position';
import { getRenderable } from '../components/renderable';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	closeAllModals,
	closeModal,
	createModal,
	getModalStack,
	handleModalBackdropClick,
	handleModalEscape,
	isModal,
	isModalOpen,
	Modal,
	ModalConfigSchema,
	openModal,
	resetModalStore,
} from './modal';

describe('Modal widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetModalStore();
	});

	afterEach(() => {
		resetModalStore();
	});

	// =========================================================================
	// Schema validation
	// =========================================================================

	describe('ModalConfigSchema', () => {
		it('validates empty config with defaults', () => {
			const result = ModalConfigSchema.safeParse({});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.backdrop).toBe(true);
				expect(result.data.backdropOpacity).toBe(0.5);
				expect(result.data.closeOnBackdropClick).toBe(true);
				expect(result.data.closeOnEscape).toBe(true);
			}
		});

		it('validates all config options', () => {
			const result = ModalConfigSchema.safeParse({
				backdrop: false,
				backdropColor: '#ff0000',
				backdropOpacity: 0.8,
				closeOnBackdropClick: false,
				closeOnEscape: false,
				width: 50,
				height: 20,
				left: 10,
				top: 5,
				fg: '#ffffff',
				bg: '#333333',
				border: { type: 'line', fg: '#888888' },
				padding: 2,
				content: 'Hello Modal',
			});
			expect(result.success).toBe(true);
		});

		it('validates numeric colors', () => {
			const result = ModalConfigSchema.safeParse({
				backdropColor: 0x000000ff,
				fg: 0xffffffff,
				bg: 0x333333ff,
			});
			expect(result.success).toBe(true);
		});

		it('validates padding as object', () => {
			const result = ModalConfigSchema.safeParse({
				padding: { left: 1, top: 2, right: 1, bottom: 0 },
			});
			expect(result.success).toBe(true);
		});

		it('rejects invalid backdropOpacity (too high)', () => {
			const result = ModalConfigSchema.safeParse({
				backdropOpacity: 1.5,
			});
			expect(result.success).toBe(false);
		});

		it('rejects invalid backdropOpacity (negative)', () => {
			const result = ModalConfigSchema.safeParse({
				backdropOpacity: -0.1,
			});
			expect(result.success).toBe(false);
		});

		it('rejects negative padding', () => {
			const result = ModalConfigSchema.safeParse({
				padding: -5,
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-positive width', () => {
			const result = ModalConfigSchema.safeParse({
				width: 0,
			});
			expect(result.success).toBe(false);
		});

		it('rejects non-positive height', () => {
			const result = ModalConfigSchema.safeParse({
				height: -1,
			});
			expect(result.success).toBe(false);
		});
	});

	// =========================================================================
	// Border charset types
	// =========================================================================

	describe('border charset types', () => {
		it('creates a modal with double border charset', () => {
			const modal = createModal(world, { border: { ch: 'double' } });
			expect(modal.eid).toBeDefined();
			expect(isModal(world, modal.eid)).toBe(true);
		});

		it('creates a modal with rounded border charset', () => {
			const modal = createModal(world, { border: { ch: 'rounded' } });
			expect(modal.eid).toBeDefined();
			expect(isModal(world, modal.eid)).toBe(true);
		});

		it('creates a modal with bold border charset', () => {
			const modal = createModal(world, { border: { ch: 'bold' } });
			expect(modal.eid).toBeDefined();
			expect(isModal(world, modal.eid)).toBe(true);
		});

		it('creates a modal with ascii border charset', () => {
			const modal = createModal(world, { border: { ch: 'ascii' } });
			expect(modal.eid).toBeDefined();
			expect(isModal(world, modal.eid)).toBe(true);
		});

		it('creates a modal with single border charset (default)', () => {
			const modal = createModal(world, { border: { ch: 'single' } });
			expect(modal.eid).toBeDefined();
			expect(isModal(world, modal.eid)).toBe(true);
		});

		it('creates a modal with border type none (no border applied)', () => {
			const modal = createModal(world, { border: { type: 'none' } });
			expect(modal.eid).toBeDefined();
			expect(isModal(world, modal.eid)).toBe(true);
		});
	});

	// =========================================================================
	// Creation
	// =========================================================================

	describe('createModal', () => {
		it('creates a modal with default config', () => {
			const modal = createModal(world);

			expect(modal.eid).toBeDefined();
			expect(isModal(world, modal.eid)).toBe(true);
			expect(modal.isOpen()).toBe(false);
		});

		it('creates a modal with custom config', () => {
			const modal = createModal(world, {
				width: 60,
				height: 25,
				left: 10,
				top: 5,
				content: 'Custom Content',
			});

			expect(modal.getContent()).toBe('Custom Content');
			const pos = getPosition(world, modal.eid);
			expect(pos?.x).toBe(10);
			expect(pos?.y).toBe(5);
		});

		it('starts hidden by default', () => {
			const modal = createModal(world);

			const renderable = getRenderable(world, modal.eid);
			expect(renderable?.visible).toBe(false);
			expect(modal.isOpen()).toBe(false);
		});

		it('sets backdrop enabled flag from config', () => {
			const withBackdrop = createModal(world, { backdrop: true });
			const withoutBackdrop = createModal(world, { backdrop: false });

			expect(Modal.backdropEnabled[withBackdrop.eid]).toBe(1);
			expect(Modal.backdropEnabled[withoutBackdrop.eid]).toBe(0);
		});

		it('sets content from config', () => {
			const modal = createModal(world, { content: 'Hello World' });
			expect(modal.getContent()).toBe('Hello World');
		});
	});

	// =========================================================================
	// Show / Hide / Close
	// =========================================================================

	describe('show/hide/close', () => {
		it('show() makes the modal visible and marks it open', () => {
			const modal = createModal(world);

			modal.show();

			expect(modal.isOpen()).toBe(true);
			const renderable = getRenderable(world, modal.eid);
			expect(renderable?.visible).toBe(true);
		});

		it('hide() makes the modal invisible and marks it closed', () => {
			const modal = createModal(world);
			modal.show();

			modal.hide();

			expect(modal.isOpen()).toBe(false);
			const renderable = getRenderable(world, modal.eid);
			expect(renderable?.visible).toBe(false);
		});

		it('close() hides the modal and fires onClose callbacks', () => {
			const modal = createModal(world);
			const closeCb = vi.fn();
			modal.onClose(closeCb);
			modal.show();

			modal.close();

			expect(modal.isOpen()).toBe(false);
			expect(closeCb).toHaveBeenCalledOnce();
		});

		it('close() does nothing if already closed', () => {
			const modal = createModal(world);
			const closeCb = vi.fn();
			modal.onClose(closeCb);

			modal.close();

			expect(closeCb).not.toHaveBeenCalled();
		});

		it('show() fires onOpen callbacks', () => {
			const modal = createModal(world);
			const openCb = vi.fn();
			modal.onOpen(openCb);

			modal.show();

			expect(openCb).toHaveBeenCalledOnce();
		});

		it('show() returns widget for chaining', () => {
			const modal = createModal(world);
			const result = modal.show();
			expect(result).toBe(modal);
		});

		it('hide() returns widget for chaining', () => {
			const modal = createModal(world);
			modal.show();
			const result = modal.hide();
			expect(result).toBe(modal);
		});
	});

	// =========================================================================
	// Position
	// =========================================================================

	describe('position', () => {
		it('move() changes position by delta', () => {
			const modal = createModal(world, { left: 10, top: 20 });

			modal.move(5, -3);

			const pos = getPosition(world, modal.eid);
			expect(pos?.x).toBe(15);
			expect(pos?.y).toBe(17);
		});

		it('setPosition() sets absolute position', () => {
			const modal = createModal(world);

			modal.setPosition(50, 30);

			const pos = getPosition(world, modal.eid);
			expect(pos?.x).toBe(50);
			expect(pos?.y).toBe(30);
		});

		it('center() centers the modal in the terminal', () => {
			const modal = createModal(world, { width: 40, height: 10 });

			modal.center(80, 24);

			const pos = getPosition(world, modal.eid);
			expect(pos?.x).toBe(20); // (80 - 40) / 2
			expect(pos?.y).toBe(7); // (24 - 10) / 2
		});

		it('center() clamps to 0,0 if terminal is smaller than modal', () => {
			const modal = createModal(world, { width: 100, height: 50 });

			modal.center(80, 24);

			const pos = getPosition(world, modal.eid);
			expect(pos?.x).toBe(0);
			expect(pos?.y).toBe(0);
		});

		it('move() returns widget for chaining', () => {
			const modal = createModal(world);
			const result = modal.move(1, 1);
			expect(result).toBe(modal);
		});

		it('setPosition() returns widget for chaining', () => {
			const modal = createModal(world);
			const result = modal.setPosition(1, 1);
			expect(result).toBe(modal);
		});

		it('center() returns widget for chaining', () => {
			const modal = createModal(world, { width: 40, height: 10 });
			const result = modal.center(80, 24);
			expect(result).toBe(modal);
		});
	});

	// =========================================================================
	// Content
	// =========================================================================

	describe('content', () => {
		it('setContent() updates the content', () => {
			const modal = createModal(world);

			modal.setContent('Updated content');

			expect(modal.getContent()).toBe('Updated content');
		});

		it('getContent() returns empty string for default', () => {
			const modal = createModal(world);
			expect(modal.getContent()).toBe('');
		});

		it('setContent() returns widget for chaining', () => {
			const modal = createModal(world);
			const result = modal.setContent('Test');
			expect(result).toBe(modal);
		});
	});

	// =========================================================================
	// Backdrop
	// =========================================================================

	describe('backdrop settings', () => {
		it('defaults to backdrop enabled', () => {
			const modal = createModal(world);
			expect(Modal.backdropEnabled[modal.eid]).toBe(1);
		});

		it('respects backdrop: false', () => {
			const modal = createModal(world, { backdrop: false });
			expect(Modal.backdropEnabled[modal.eid]).toBe(0);
		});
	});

	// =========================================================================
	// closeOnEscape
	// =========================================================================

	describe('closeOnEscape', () => {
		it('handleModalEscape closes modal when closeOnEscape is true', () => {
			const modal = createModal(world, { closeOnEscape: true });
			modal.show();

			const result = handleModalEscape(world, modal.eid);

			expect(result).toBe(true);
			expect(modal.isOpen()).toBe(false);
		});

		it('handleModalEscape does not close modal when closeOnEscape is false', () => {
			const modal = createModal(world, { closeOnEscape: false });
			modal.show();

			const result = handleModalEscape(world, modal.eid);

			expect(result).toBe(false);
			expect(modal.isOpen()).toBe(true);
		});

		it('handleModalEscape returns false for non-modal entities', () => {
			const eid = addEntity(world);
			const result = handleModalEscape(world, eid);
			expect(result).toBe(false);
		});

		it('handleModalEscape returns false for closed modals', () => {
			const modal = createModal(world, { closeOnEscape: true });
			// Don't show it

			const result = handleModalEscape(world, modal.eid);
			expect(result).toBe(false);
		});
	});

	// =========================================================================
	// closeOnBackdropClick
	// =========================================================================

	describe('closeOnBackdropClick', () => {
		it('handleModalBackdropClick closes modal when enabled', () => {
			const modal = createModal(world, { closeOnBackdropClick: true });
			modal.show();

			const result = handleModalBackdropClick(world, modal.eid);

			expect(result).toBe(true);
			expect(modal.isOpen()).toBe(false);
		});

		it('handleModalBackdropClick does not close modal when disabled', () => {
			const modal = createModal(world, { closeOnBackdropClick: false });
			modal.show();

			const result = handleModalBackdropClick(world, modal.eid);

			expect(result).toBe(false);
			expect(modal.isOpen()).toBe(true);
		});

		it('handleModalBackdropClick returns false for non-modal entities', () => {
			const eid = addEntity(world);
			const result = handleModalBackdropClick(world, eid);
			expect(result).toBe(false);
		});
	});

	// =========================================================================
	// Modal stacking
	// =========================================================================

	describe('modal stacking', () => {
		it('tracks open modals in a stack', () => {
			const modal1 = createModal(world, { content: 'Modal 1' });
			const modal2 = createModal(world, { content: 'Modal 2' });
			const modal3 = createModal(world, { content: 'Modal 3' });

			modal1.show();
			modal2.show();
			modal3.show();

			const stack = getModalStack(world);
			expect(stack).toHaveLength(3);
			expect(stack[0]).toBe(modal1.eid);
			expect(stack[1]).toBe(modal2.eid);
			expect(stack[2]).toBe(modal3.eid);
		});

		it('removes modals from stack when closed', () => {
			const modal1 = createModal(world);
			const modal2 = createModal(world);

			modal1.show();
			modal2.show();

			modal2.close();

			const stack = getModalStack(world);
			expect(stack).toHaveLength(1);
			expect(stack[0]).toBe(modal1.eid);
		});

		it('removes modals from stack when hidden', () => {
			const modal1 = createModal(world);
			modal1.show();

			modal1.hide();

			const stack = getModalStack(world);
			expect(stack).toHaveLength(0);
		});

		it('does not duplicate modals in stack on re-show', () => {
			const modal = createModal(world);
			modal.show();
			modal.hide();
			modal.show();

			const stack = getModalStack(world);
			expect(stack).toHaveLength(1);
		});
	});

	// =========================================================================
	// closeAllModals
	// =========================================================================

	describe('closeAllModals', () => {
		it('closes all open modals', () => {
			const modal1 = createModal(world);
			const modal2 = createModal(world);
			const modal3 = createModal(world);

			modal1.show();
			modal2.show();
			modal3.show();

			closeAllModals(world);

			expect(modal1.isOpen()).toBe(false);
			expect(modal2.isOpen()).toBe(false);
			expect(modal3.isOpen()).toBe(false);
			expect(getModalStack(world)).toHaveLength(0);
		});

		it('fires onClose callbacks for all modals', () => {
			const cb1 = vi.fn();
			const cb2 = vi.fn();

			const modal1 = createModal(world);
			const modal2 = createModal(world);
			modal1.onClose(cb1);
			modal2.onClose(cb2);

			modal1.show();
			modal2.show();

			closeAllModals(world);

			expect(cb1).toHaveBeenCalledOnce();
			expect(cb2).toHaveBeenCalledOnce();
		});

		it('handles empty stack gracefully', () => {
			expect(() => closeAllModals(world)).not.toThrow();
		});
	});

	// =========================================================================
	// isModalOpen
	// =========================================================================

	describe('isModalOpen', () => {
		it('returns false when no modals are open', () => {
			expect(isModalOpen(world)).toBe(false);
		});

		it('returns true when a modal is open', () => {
			const modal = createModal(world);
			modal.show();

			expect(isModalOpen(world)).toBe(true);
		});

		it('returns false after all modals are closed', () => {
			const modal = createModal(world);
			modal.show();
			modal.close();

			expect(isModalOpen(world)).toBe(false);
		});
	});

	// =========================================================================
	// getModalStack
	// =========================================================================

	describe('getModalStack', () => {
		it('returns empty array when no modals are open', () => {
			expect(getModalStack(world)).toEqual([]);
		});

		it('returns a copy of the stack (not the original)', () => {
			const modal = createModal(world);
			modal.show();

			const stack1 = getModalStack(world);
			const stack2 = getModalStack(world);
			expect(stack1).not.toBe(stack2);
			expect(stack1).toEqual(stack2);
		});

		it('reflects correct order of opened modals', () => {
			const modal1 = createModal(world);
			const modal2 = createModal(world);

			modal1.show();
			modal2.show();

			const stack = getModalStack(world);
			expect(stack[0]).toBe(modal1.eid);
			expect(stack[1]).toBe(modal2.eid);
		});
	});

	// =========================================================================
	// onClose / onOpen callbacks
	// =========================================================================

	describe('callbacks', () => {
		it('onClose registers multiple callbacks', () => {
			const cb1 = vi.fn();
			const cb2 = vi.fn();
			const modal = createModal(world);
			modal.onClose(cb1).onClose(cb2);
			modal.show();

			modal.close();

			expect(cb1).toHaveBeenCalledOnce();
			expect(cb2).toHaveBeenCalledOnce();
		});

		it('onOpen registers multiple callbacks', () => {
			const cb1 = vi.fn();
			const cb2 = vi.fn();
			const modal = createModal(world);
			modal.onOpen(cb1).onOpen(cb2);

			modal.show();

			expect(cb1).toHaveBeenCalledOnce();
			expect(cb2).toHaveBeenCalledOnce();
		});

		it('onClose returns widget for chaining', () => {
			const modal = createModal(world);
			const result = modal.onClose(() => {});
			expect(result).toBe(modal);
		});

		it('onOpen returns widget for chaining', () => {
			const modal = createModal(world);
			const result = modal.onOpen(() => {});
			expect(result).toBe(modal);
		});

		it('closeModal fires onClose callbacks', () => {
			const cb = vi.fn();
			const modal = createModal(world);
			modal.onClose(cb);
			modal.show();

			closeModal(world, modal.eid);

			expect(cb).toHaveBeenCalledOnce();
		});
	});

	// =========================================================================
	// openModal convenience
	// =========================================================================

	describe('openModal', () => {
		it('creates and immediately shows a modal', () => {
			const modal = openModal(world, { content: 'Quick modal' });

			expect(modal.isOpen()).toBe(true);
			expect(modal.getContent()).toBe('Quick modal');
			expect(getModalStack(world)).toHaveLength(1);
		});
	});

	// =========================================================================
	// closeModal
	// =========================================================================

	describe('closeModal', () => {
		it('closes a specific modal by entity ID', () => {
			const modal = createModal(world);
			modal.show();

			closeModal(world, modal.eid);

			expect(modal.isOpen()).toBe(false);
		});

		it('does nothing for non-modal entities', () => {
			const eid = addEntity(world);
			expect(() => closeModal(world, eid)).not.toThrow();
		});

		it('does nothing for already-closed modals', () => {
			const modal = createModal(world);
			expect(() => closeModal(world, modal.eid)).not.toThrow();
		});
	});

	// =========================================================================
	// destroy
	// =========================================================================

	describe('destroy', () => {
		it('removes modal marker', () => {
			const modal = createModal(world);
			const eid = modal.eid;

			expect(isModal(world, eid)).toBe(true);
			modal.destroy();
			expect(isModal(world, eid)).toBe(false);
		});

		it('removes from stack if open', () => {
			const modal = createModal(world);
			modal.show();

			modal.destroy();

			expect(getModalStack(world)).toHaveLength(0);
		});

		it('fires onClose callbacks on destroy when open', () => {
			const cb = vi.fn();
			const modal = createModal(world);
			modal.onClose(cb);
			modal.show();

			modal.destroy();

			expect(cb).toHaveBeenCalledOnce();
		});

		it('does not fire onClose callbacks on destroy when already closed', () => {
			const cb = vi.fn();
			const modal = createModal(world);
			modal.onClose(cb);
			// Never shown, so already closed

			modal.destroy();

			expect(cb).not.toHaveBeenCalled();
		});

		it('clears typed array data', () => {
			const modal = createModal(world, { backdrop: true });
			const eid = modal.eid;

			modal.destroy();

			expect(Modal.isModal[eid]).toBe(0);
			expect(Modal.isOpen[eid]).toBe(0);
			expect(Modal.backdropEnabled[eid]).toBe(0);
		});
	});

	// =========================================================================
	// isModal utility
	// =========================================================================

	describe('isModal', () => {
		it('returns true for modal entities', () => {
			const modal = createModal(world);
			expect(isModal(world, modal.eid)).toBe(true);
		});

		it('returns false for non-modal entities', () => {
			const eid = addEntity(world);
			expect(isModal(world, eid)).toBe(false);
		});
	});

	// =========================================================================
	// resetModalStore
	// =========================================================================

	describe('resetModalStore', () => {
		it('clears all modal state', () => {
			const modal1 = createModal(world);
			const modal2 = createModal(world);
			modal1.show();
			modal2.show();

			resetModalStore();

			expect(Modal.isModal[modal1.eid]).toBe(0);
			expect(Modal.isModal[modal2.eid]).toBe(0);
			expect(getModalStack(world)).toHaveLength(0);
			expect(isModalOpen(world)).toBe(false);
		});
	});

	// =========================================================================
	// Method chaining
	// =========================================================================

	describe('method chaining', () => {
		it('supports full method chaining', () => {
			const modal = createModal(world, {
				width: 40,
				height: 10,
			});

			modal.show().setPosition(10, 10).move(5, 5).setContent('Chained Content').center(80, 24);

			const pos = getPosition(world, modal.eid);
			// After center: (80 - 40) / 2 = 20, (24 - 10) / 2 = 7
			expect(pos?.x).toBe(20);
			expect(pos?.y).toBe(7);
			expect(modal.getContent()).toBe('Chained Content');
			expect(modal.isOpen()).toBe(true);
		});
	});
});
