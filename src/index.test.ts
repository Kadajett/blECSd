import { describe, expect, it } from 'vitest';
import { VERSION } from './index';

describe('blECSd', () => {
	it('should export VERSION', () => {
		expect(VERSION).toBe('0.0.1');
	});
});
