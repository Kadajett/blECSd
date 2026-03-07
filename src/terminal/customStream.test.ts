/**
 * Tests for custom stream sessions.
 */

import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it } from 'vitest';
import {
	createStreamSession,
	endSession,
	resetStreamSessionCounter,
	writeToSession,
} from './customStream';

afterEach(() => {
	resetStreamSessionCounter();
});

describe('createStreamSession', () => {
	it('creates a session with default dimensions', () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({ input, output });

		expect(session.id).toMatch(/^stream-/);
		expect(session.width).toBe(80);
		expect(session.height).toBe(24);
		expect(session.termType).toBe('xterm');
		expect(session.active).toBe(true);

		input.destroy();
		output.destroy();
	});

	it('creates a session with custom dimensions', () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({
			input,
			output,
			width: 120,
			height: 40,
			termType: 'vt100',
		});

		expect(session.width).toBe(120);
		expect(session.height).toBe(40);
		expect(session.termType).toBe('vt100');

		input.destroy();
		output.destroy();
	});

	it('generates unique session IDs', () => {
		const s1 = createStreamSession({ input: new PassThrough(), output: new PassThrough() });
		const s2 = createStreamSession({ input: new PassThrough(), output: new PassThrough() });

		expect(s1.id).not.toBe(s2.id);
	});
});

describe('data handling', () => {
	it('forwards input data to handlers', async () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({ input, output });

		const received: string[] = [];
		session.onData((data) => received.push(data));

		input.write('hello');
		input.write(' world');

		// Allow microtasks
		await new Promise((r) => setTimeout(r, 10));

		expect(received).toEqual(['hello', ' world']);

		input.destroy();
		output.destroy();
	});

	it('unsubscribes data handlers', async () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({ input, output });

		const received: string[] = [];
		const unsub = session.onData((data) => received.push(data));

		input.write('first');
		await new Promise((r) => setTimeout(r, 10));

		unsub();
		input.write('second');
		await new Promise((r) => setTimeout(r, 10));

		expect(received).toEqual(['first']);

		input.destroy();
		output.destroy();
	});
});

describe('writeToSession', () => {
	it('writes data to the output stream', async () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({ input, output });

		const chunks: string[] = [];
		output.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));

		const result = writeToSession(session, 'hello');
		expect(result).toBe(true);

		await new Promise((r) => setTimeout(r, 10));
		expect(chunks).toEqual(['hello']);

		input.destroy();
		output.destroy();
	});

	it('returns false for inactive sessions', () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({ input, output });

		endSession(session);
		const result = writeToSession(session, 'hello');
		expect(result).toBe(false);

		input.destroy();
		output.destroy();
	});
});

describe('resize', () => {
	it('emits resize events and updates dimensions', () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({ input, output });

		const resizes: [number, number][] = [];
		session.onResize((w, h) => resizes.push([w, h]));

		session.emitResize(120, 40);

		expect(session.width).toBe(120);
		expect(session.height).toBe(40);
		expect(resizes).toEqual([[120, 40]]);

		input.destroy();
		output.destroy();
	});
});

describe('endSession', () => {
	it('marks session as inactive', () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({ input, output });

		expect(session.active).toBe(true);
		endSession(session);
		expect(session.active).toBe(false);
	});

	it('does not process data after ending', async () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({ input, output });

		const received: string[] = [];
		session.onData((data) => received.push(data));

		endSession(session);
		input.write('after-end');
		await new Promise((r) => setTimeout(r, 10));

		expect(received).toEqual([]);

		input.destroy();
		output.destroy();
	});
});

describe('close handlers', () => {
	it('fires close handler when input ends', async () => {
		const input = new PassThrough();
		const output = new PassThrough();
		const session = createStreamSession({ input, output });

		const reasons: string[] = [];
		session.onClose((reason) => reasons.push(reason));

		input.end();
		await new Promise((r) => setTimeout(r, 10));

		expect(reasons).toEqual(['input ended']);
		expect(session.active).toBe(false);
	});
});
