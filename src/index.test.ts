import { describe, expect, it } from 'vitest';
import {
	cleanup,
	createDoubleBuffer,
	layoutSystem,
	outputSystem,
	renderSystem,
	VERSION,
} from './index';

describe('blECSd', () => {
	it('should export VERSION', () => {
		expect(VERSION).toBe('0.4.1');
	});

	it('should export core render/output helpers', () => {
		expect(typeof cleanup).toBe('function');
		expect(typeof renderSystem).toBe('function');
		expect(typeof outputSystem).toBe('function');
		expect(typeof layoutSystem).toBe('function');

		const buffer = createDoubleBuffer(1, 1);
		expect(buffer.width).toBe(1);
		expect(buffer.height).toBe(1);
	});
});
