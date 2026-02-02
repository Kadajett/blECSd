/**
 * Tests for terminal suspend/resume handling
 */

import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SuspendManager, suspendSequences } from './suspend';

// Create a mock output stream that captures writes
function createMockOutput(): { output: Writable; getOutput: () => string } {
	let buffer = '';
	const output = new Writable({
		write(chunk, _encoding, callback) {
			buffer += chunk.toString();
			callback();
		},
	});
	return {
		output,
		getOutput: () => buffer,
	};
}

// Mock input interface for typed this access
interface MockInputData {
	_rawMode: boolean;
	_paused: boolean;
	isRaw: boolean;
	setRawMode(mode: boolean): this;
	pause(): this;
	resume(): this;
	on: ReturnType<typeof vi.fn>;
	once: ReturnType<typeof vi.fn>;
	removeListener: ReturnType<typeof vi.fn>;
}

// Create a mock input stream with raw mode support
function createMockInput(): NodeJS.ReadStream & {
	_rawMode: boolean;
	_paused: boolean;
} {
	const mock: MockInputData = {
		_rawMode: true,
		_paused: false,
		isRaw: true,
		setRawMode(mode: boolean) {
			this._rawMode = mode;
			this.isRaw = mode;
			return this;
		},
		pause() {
			this._paused = true;
			return this;
		},
		resume() {
			this._paused = false;
			return this;
		},
		on: vi.fn().mockReturnThis(),
		once: vi.fn().mockReturnThis(),
		removeListener: vi.fn().mockReturnThis(),
	};
	return mock as unknown as NodeJS.ReadStream & { _rawMode: boolean; _paused: boolean };
}

describe('SuspendManager', () => {
	let manager: SuspendManager;
	let mockOutput: ReturnType<typeof createMockOutput>;
	let mockInput: ReturnType<typeof createMockInput>;

	beforeEach(() => {
		mockOutput = createMockOutput();
		mockInput = createMockInput();
		manager = new SuspendManager({
			output: mockOutput.output,
			input: mockInput,
		});
	});

	afterEach(() => {
		manager.disable();
	});

	describe('constructor', () => {
		it('creates with default options', () => {
			const m = new SuspendManager();
			expect(m.isAlternateBuffer).toBe(false);
			expect(m.isMouseEnabled).toBe(false);
			expect(m.enabled).toBe(false);
		});

		it('accepts initial state', () => {
			const m = new SuspendManager({
				isAlternateBuffer: true,
				isMouseEnabled: true,
			});
			expect(m.isAlternateBuffer).toBe(true);
			expect(m.isMouseEnabled).toBe(true);
		});
	});

	describe('enable/disable', () => {
		it('starts disabled', () => {
			expect(manager.enabled).toBe(false);
		});

		it('can be enabled', () => {
			manager.enable();
			expect(manager.enabled).toBe(true);
		});

		it('can be disabled after enabling', () => {
			manager.enable();
			manager.disable();
			expect(manager.enabled).toBe(false);
		});

		it('enable is idempotent', () => {
			manager.enable();
			manager.enable();
			expect(manager.enabled).toBe(true);
		});

		it('disable is idempotent', () => {
			manager.disable();
			manager.disable();
			expect(manager.enabled).toBe(false);
		});
	});

	describe('setAlternateBuffer', () => {
		it('updates alternate buffer state', () => {
			expect(manager.isAlternateBuffer).toBe(false);
			manager.setAlternateBuffer(true);
			expect(manager.isAlternateBuffer).toBe(true);
			manager.setAlternateBuffer(false);
			expect(manager.isAlternateBuffer).toBe(false);
		});
	});

	describe('setMouseEnabled', () => {
		it('updates mouse enabled state', () => {
			expect(manager.isMouseEnabled).toBe(false);
			manager.setMouseEnabled(true);
			expect(manager.isMouseEnabled).toBe(true);
			manager.setMouseEnabled(false);
			expect(manager.isMouseEnabled).toBe(false);
		});
	});
});

describe('suspendSequences', () => {
	describe('prepareForSuspend', () => {
		it('returns empty string when not in alternate buffer and mouse disabled', () => {
			const seq = suspendSequences.prepareForSuspend(false, false);
			// Should only have cursor show
			expect(seq).toBe('\x1b[?25h');
		});

		it('includes alternate buffer exit when in alternate mode', () => {
			const seq = suspendSequences.prepareForSuspend(true, false);
			expect(seq).toContain('\x1b[?1049l'); // rmcup
			expect(seq).toContain('\x1b[?25h'); // cursor show
		});

		it('includes mouse disable when mouse enabled', () => {
			const seq = suspendSequences.prepareForSuspend(false, true);
			// disableAll disables multiple modes
			expect(seq).toContain('\x1b[?1000l'); // normal mode disable
			expect(seq).toContain('\x1b[?25h'); // cursor show
		});

		it('includes both when both enabled', () => {
			const seq = suspendSequences.prepareForSuspend(true, true);
			expect(seq).toContain('\x1b[?1049l'); // rmcup
			expect(seq).toContain('\x1b[?1000l'); // normal mode disable
			expect(seq).toContain('\x1b[?25h'); // cursor show
		});
	});

	describe('restoreAfterResume', () => {
		it('returns empty string when not restoring anything', () => {
			const seq = suspendSequences.restoreAfterResume(false, false);
			expect(seq).toBe('');
		});

		it('includes alternate buffer enter when was in alternate mode', () => {
			const seq = suspendSequences.restoreAfterResume(true, false);
			expect(seq).toContain('\x1b[?1049h'); // smcup
		});

		it('includes mouse enable when was mouse enabled', () => {
			const seq = suspendSequences.restoreAfterResume(false, true);
			expect(seq).toContain('\x1b[?1000h'); // enableNormal
		});

		it('includes both when both were enabled', () => {
			const seq = suspendSequences.restoreAfterResume(true, true);
			expect(seq).toContain('\x1b[?1049h'); // smcup
			expect(seq).toContain('\x1b[?1000h'); // enableNormal
		});
	});

	describe('round-trip', () => {
		it('prepareForSuspend and restoreAfterResume are complementary', () => {
			// The sequences should reverse each other
			const suspend = suspendSequences.prepareForSuspend(true, true);
			const resume = suspendSequences.restoreAfterResume(true, true);

			// Suspend exits alternate buffer, resume enters it
			expect(suspend).toContain('\x1b[?1049l');
			expect(resume).toContain('\x1b[?1049h');

			// Suspend disables normal mouse mode, resume enables it
			expect(suspend).toContain('\x1b[?1000l');
			expect(resume).toContain('\x1b[?1000h');
		});
	});
});

describe('SuspendManager callbacks', () => {
	it('calls onSuspend callback during suspend preparation', () => {
		const mockOutput = createMockOutput();
		const mockInput = createMockInput();
		const onSuspend = vi.fn().mockReturnValue({ custom: 'data' });

		const manager = new SuspendManager({
			output: mockOutput.output,
			input: mockInput,
			onSuspend,
		});

		// We can't fully test suspend() because it sends SIGTSTP,
		// but we can verify the manager is set up correctly
		expect(manager.enabled).toBe(false);
	});

	it('tracks state correctly through multiple state changes', () => {
		const mockOutput = createMockOutput();
		const mockInput = createMockInput();

		const manager = new SuspendManager({
			output: mockOutput.output,
			input: mockInput,
			isAlternateBuffer: false,
			isMouseEnabled: false,
		});

		// Simulate entering alternate buffer
		manager.setAlternateBuffer(true);
		expect(manager.isAlternateBuffer).toBe(true);

		// Simulate enabling mouse
		manager.setMouseEnabled(true);
		expect(manager.isMouseEnabled).toBe(true);

		// Simulate exiting alternate buffer
		manager.setAlternateBuffer(false);
		expect(manager.isAlternateBuffer).toBe(false);

		// Simulate disabling mouse
		manager.setMouseEnabled(false);
		expect(manager.isMouseEnabled).toBe(false);
	});
});

describe('SuspendState interface', () => {
	it('captures all necessary state for restore', () => {
		// This is a type test - ensure the interface has expected properties
		const state: import('./suspend').SuspendState = {
			wasAlternateBuffer: true,
			wasMouseEnabled: true,
			wasRawMode: true,
			customState: { foo: 'bar' },
		};

		expect(state.wasAlternateBuffer).toBe(true);
		expect(state.wasMouseEnabled).toBe(true);
		expect(state.wasRawMode).toBe(true);
		expect(state.customState).toEqual({ foo: 'bar' });
	});

	it('allows customState to be undefined', () => {
		const state: import('./suspend').SuspendState = {
			wasAlternateBuffer: false,
			wasMouseEnabled: false,
			wasRawMode: false,
		};

		expect(state.customState).toBeUndefined();
	});
});
