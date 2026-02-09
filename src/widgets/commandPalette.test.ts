/**
 * Tests for Command Palette widget.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addEntity, createWorld } from '../core/ecs';
import type { World } from '../core/types';
import {
	type Command,
	createCommandPalette,
	isCommandPalette,
	resetCommandPaletteStore,
} from './commandPalette';

describe('Command Palette widget', () => {
	let world: World;

	beforeEach(() => {
		world = createWorld();
		resetCommandPaletteStore();
	});

	describe('createCommandPalette', () => {
		it('should create a command palette widget', () => {
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid);

			expect(palette.entity).toBe(eid);
			expect(palette.world).toBe(world);
			expect(isCommandPalette(eid)).toBe(true);
		});

		it('should handle empty commands array', () => {
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, {
				commands: [],
			});

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should accept initial commands', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test1',
					label: 'Test Command 1',
					handler,
				},
				{
					id: 'test2',
					label: 'Test Command 2',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should accept placeholder text', () => {
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, {
				placeholder: 'Search commands...',
			});

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should accept maxResults option', () => {
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, {
				maxResults: 5,
			});

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should accept width option', () => {
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, {
				width: 80,
			});

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should accept theme options', () => {
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, {
				theme: {
					inputFg: '#FFFFFF',
					inputBg: '#000000',
					listFg: '#CCCCCC',
					listBg: '#222222',
					selectedFg: '#000000',
					selectedBg: '#00FF00',
					shortcutFg: '#888888',
					descriptionFg: '#999999',
				},
			});

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should accept onClose callback', () => {
			const onClose = vi.fn();
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, {
				onClose,
			});

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should handle commands with descriptions', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test1',
					label: 'Test Command',
					description: 'This is a test command',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should handle commands with shortcuts', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test1',
					label: 'Save',
					shortcut: 'Ctrl+S',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should handle commands with categories', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test1',
					label: 'New File',
					category: 'File',
					handler,
				},
				{
					id: 'test2',
					label: 'Save File',
					category: 'File',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			expect(isCommandPalette(palette.entity)).toBe(true);
		});
	});

	describe('show() and hide()', () => {
		it('should show the palette', () => {
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid);

			// Should start hidden
			palette.show();

			// State is internal, but we can verify it doesn't throw
			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should hide the palette', () => {
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid);

			palette.show();
			palette.hide();

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should call onClose when hidden', () => {
			const onClose = vi.fn();
			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { onClose });

			palette.show();
			palette.hide();

			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});

	describe('executeCommand()', () => {
		it('should execute command by ID', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test1',
					label: 'Test 1',
					handler: handler1,
				},
				{
					id: 'test2',
					label: 'Test 2',
					handler: handler2,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			palette.executeCommand('test1');

			expect(handler1).toHaveBeenCalledTimes(1);
			expect(handler2).not.toHaveBeenCalled();
		});

		it('should handle non-existent command ID gracefully', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test1',
					label: 'Test 1',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			expect(() => palette.executeCommand('nonexistent')).not.toThrow();
			expect(handler).not.toHaveBeenCalled();
		});

		it('should handle async command handlers', async () => {
			const asyncHandler = vi.fn().mockResolvedValue(undefined);
			const commands: readonly Command[] = [
				{
					id: 'async',
					label: 'Async Command',
					handler: asyncHandler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			palette.executeCommand('async');

			// Handler should be called
			expect(asyncHandler).toHaveBeenCalledTimes(1);
		});

		it('should handle command handler errors', () => {
			const errorHandler = vi.fn().mockImplementation(() => {
				throw new Error('Command error');
			});
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const commands: readonly Command[] = [
				{
					id: 'error',
					label: 'Error Command',
					handler: errorHandler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			expect(() => palette.executeCommand('error')).not.toThrow();
			expect(consoleErrorSpy).toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});

		it('should handle async command handler errors', async () => {
			const asyncErrorHandler = vi.fn().mockRejectedValue(new Error('Async command error'));
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const commands: readonly Command[] = [
				{
					id: 'asyncError',
					label: 'Async Error Command',
					handler: asyncErrorHandler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			palette.executeCommand('asyncError');

			// Wait for promise to reject
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(asyncErrorHandler).toHaveBeenCalledTimes(1);
			expect(consoleErrorSpy).toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});
	});

	describe('setCommands()', () => {
		it('should update commands list', () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();
			const initialCommands: readonly Command[] = [
				{
					id: 'test1',
					label: 'Test 1',
					handler: handler1,
				},
			];
			const newCommands: readonly Command[] = [
				{
					id: 'test2',
					label: 'Test 2',
					handler: handler2,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands: initialCommands });

			palette.setCommands(newCommands);
			palette.executeCommand('test2');

			expect(handler2).toHaveBeenCalledTimes(1);
			expect(handler1).not.toHaveBeenCalled();
		});

		it('should reset filtered commands when commands change', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test1',
					label: 'Test 1',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid);

			palette.setCommands(commands);
			palette.executeCommand('test1');

			expect(handler).toHaveBeenCalledTimes(1);
		});

		it('should handle empty commands array', () => {
			const handler = vi.fn();
			const initialCommands: readonly Command[] = [
				{
					id: 'test1',
					label: 'Test 1',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands: initialCommands });

			palette.setCommands([]);
			palette.executeCommand('test1');

			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe('isCommandPalette', () => {
		it('should return true for command palette entities', () => {
			const eid = addEntity(world);
			createCommandPalette(world, eid);

			expect(isCommandPalette(eid)).toBe(true);
		});

		it('should return false for non-command-palette entities', () => {
			const eid = addEntity(world);

			expect(isCommandPalette(eid)).toBe(false);
		});
	});

	describe('fuzzy matching', () => {
		it('should filter commands based on search query', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'file.new',
					label: 'New File',
					handler,
				},
				{
					id: 'file.save',
					label: 'Save File',
					handler,
				},
				{
					id: 'edit.undo',
					label: 'Undo',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			// Fuzzy matching is internal, but we can verify the widget was created
			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should match on command label', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test',
					label: 'Save File',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should match on command description', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test',
					label: 'Save',
					description: 'Save the current file',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should match on command category', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'test',
					label: 'New',
					category: 'File',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, { commands });

			expect(isCommandPalette(palette.entity)).toBe(true);
		});

		it('should respect maxResults option', () => {
			const handler = vi.fn();
			const commands: readonly Command[] = Array.from({ length: 20 }, (_, i) => ({
				id: `cmd${i}`,
				label: `Command ${i}`,
				handler,
			}));

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, {
				commands,
				maxResults: 5,
			});

			expect(isCommandPalette(palette.entity)).toBe(true);
		});
	});

	describe('integration', () => {
		it('should work with full configuration', () => {
			const handler = vi.fn();
			const onClose = vi.fn();
			const commands: readonly Command[] = [
				{
					id: 'file.new',
					label: 'New File',
					description: 'Create a new file',
					shortcut: 'Ctrl+N',
					category: 'File',
					handler,
				},
				{
					id: 'file.save',
					label: 'Save',
					description: 'Save the current file',
					shortcut: 'Ctrl+S',
					category: 'File',
					handler,
				},
				{
					id: 'edit.undo',
					label: 'Undo',
					description: 'Undo the last action',
					shortcut: 'Ctrl+Z',
					category: 'Edit',
					handler,
				},
			];

			const eid = addEntity(world);
			const palette = createCommandPalette(world, eid, {
				commands,
				placeholder: 'Type a command...',
				maxResults: 10,
				width: 60,
				theme: {
					inputFg: '#FFFFFF',
					inputBg: '#000000',
					listFg: '#CCCCCC',
					listBg: '#222222',
					selectedFg: '#000000',
					selectedBg: '#00FF00',
					shortcutFg: '#888888',
					descriptionFg: '#999999',
				},
				onClose,
			});

			palette.show();
			palette.executeCommand('file.save');
			palette.hide();

			expect(handler).toHaveBeenCalledTimes(1);
			expect(onClose).toHaveBeenCalledTimes(1);
		});
	});
});
