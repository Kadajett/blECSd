/**
 * Tests for Result type and operations.
 * @module errors/result.test
 */

import { describe, expect, it } from 'vitest';
import {
	err,
	flatMap,
	isErr,
	isOk,
	map,
	mapError,
	ok,
	type Result,
	unwrap,
	unwrapOr,
	unwrapOrElse,
} from './result';

describe('Constructors', () => {
	describe('ok', () => {
		it('creates successful Result', () => {
			const result = ok(42);

			expect(result.ok).toBe(true);
			expect(result.value).toBe(42);
		});

		it('works with different types', () => {
			expect(ok('string').value).toBe('string');
			expect(ok(true).value).toBe(true);
			expect(ok({ foo: 'bar' }).value).toEqual({ foo: 'bar' });
			expect(ok(null).value).toBeNull();
		});
	});

	describe('err', () => {
		it('creates failed Result', () => {
			const result = err('error message');

			expect(result.ok).toBe(false);
			expect(result.error).toBe('error message');
		});

		it('works with different error types', () => {
			expect(err('string').error).toBe('string');
			expect(err(42).error).toBe(42);
			expect(err(new Error('test')).error).toBeInstanceOf(Error);
		});
	});
});

describe('Type Guards', () => {
	describe('isOk', () => {
		it('returns true for Ok results', () => {
			expect(isOk(ok(42))).toBe(true);
		});

		it('returns false for Err results', () => {
			expect(isOk(err('error'))).toBe(false);
		});

		it('narrows type correctly', () => {
			const result: Result<number, string> = ok(42);

			if (isOk(result)) {
				// TypeScript should know result.value exists
				expect(result.value).toBe(42);
			}
		});
	});

	describe('isErr', () => {
		it('returns true for Err results', () => {
			expect(isErr(err('error'))).toBe(true);
		});

		it('returns false for Ok results', () => {
			expect(isErr(ok(42))).toBe(false);
		});

		it('narrows type correctly', () => {
			const result: Result<number, string> = err('failed');

			if (isErr(result)) {
				// TypeScript should know result.error exists
				expect(result.error).toBe('failed');
			}
		});
	});
});

describe('Unwrap Functions', () => {
	describe('unwrap', () => {
		it('returns value from Ok result', () => {
			const result = ok(42);
			expect(unwrap(result)).toBe(42);
		});

		it('throws on Err result with string error', () => {
			const result = err('test error');
			expect(() => unwrap(result)).toThrow('Called unwrap on Err: test error');
		});

		it('throws on Err result with Error', () => {
			const result = err(new Error('test error'));
			expect(() => unwrap(result)).toThrow('Called unwrap on Err: test error');
		});

		it('throws on Err result with object containing message', () => {
			const result = err({ message: 'custom error' });
			expect(() => unwrap(result)).toThrow('Called unwrap on Err: custom error');
		});

		it('throws on Err result with number', () => {
			const result = err(42);
			expect(() => unwrap(result)).toThrow('Called unwrap on Err: 42');
		});
	});

	describe('unwrapOr', () => {
		it('returns value from Ok result', () => {
			const result = ok(42);
			expect(unwrapOr(result, 0)).toBe(42);
		});

		it('returns default value from Err result', () => {
			const result = err('error');
			expect(unwrapOr(result, 0)).toBe(0);
		});

		it('works with different default types', () => {
			expect(unwrapOr(err('error'), 'default')).toBe('default');
			expect(unwrapOr(err('error'), null)).toBeNull();
			expect(unwrapOr(err('error'), false)).toBe(false);
		});
	});

	describe('unwrapOrElse', () => {
		it('returns value from Ok result', () => {
			const result = ok(42);
			expect(unwrapOrElse(result, () => 0)).toBe(42);
		});

		it('computes default value from Err result', () => {
			const result = err('error');
			expect(unwrapOrElse(result, (e) => e.length)).toBe(5);
		});

		it('passes error to function', () => {
			const result = err(10);
			expect(unwrapOrElse(result, (e) => e * 2)).toBe(20);
		});

		it('only calls function for Err', () => {
			let called = false;
			const result = ok(42);

			unwrapOrElse(result, () => {
				called = true;
				return 0;
			});

			expect(called).toBe(false);
		});
	});
});

describe('Transformation Functions', () => {
	describe('map', () => {
		it('transforms Ok value', () => {
			const result = ok(42);
			const mapped = map(result, (x) => x * 2);

			expect(isOk(mapped)).toBe(true);
			if (isOk(mapped)) {
				expect(mapped.value).toBe(84);
			}
		});

		it('leaves Err unchanged', () => {
			const result = err('error');
			const mapped = map(result, (x: number) => x * 2);

			expect(isErr(mapped)).toBe(true);
			if (isErr(mapped)) {
				expect(mapped.error).toBe('error');
			}
		});

		it('can change value type', () => {
			const result = ok(42);
			const mapped = map(result, (x) => String(x));

			expect(isOk(mapped)).toBe(true);
			if (isOk(mapped)) {
				expect(mapped.value).toBe('42');
			}
		});
	});

	describe('mapError', () => {
		it('leaves Ok unchanged', () => {
			const result = ok(42);
			const mapped = mapError(result, (e: string) => new Error(e));

			expect(isOk(mapped)).toBe(true);
			if (isOk(mapped)) {
				expect(mapped.value).toBe(42);
			}
		});

		it('transforms Err error', () => {
			const result = err('test');
			const mapped = mapError(result, (e) => new Error(e));

			expect(isErr(mapped)).toBe(true);
			if (isErr(mapped)) {
				expect(mapped.error).toBeInstanceOf(Error);
				expect(mapped.error.message).toBe('test');
			}
		});

		it('can change error type', () => {
			const result = err(42);
			const mapped = mapError(result, (e) => `Error: ${e}`);

			expect(isErr(mapped)).toBe(true);
			if (isErr(mapped)) {
				expect(mapped.error).toBe('Error: 42');
			}
		});
	});

	describe('flatMap', () => {
		it('chains Ok results', () => {
			const sqrt = (x: number): Result<number, string> =>
				x >= 0 ? ok(Math.sqrt(x)) : err('negative number');

			const result = ok(16);
			const chained = flatMap(result, sqrt);

			expect(isOk(chained)).toBe(true);
			if (isOk(chained)) {
				expect(chained.value).toBe(4);
			}
		});

		it('propagates Err from function', () => {
			const sqrt = (x: number): Result<number, string> =>
				x >= 0 ? ok(Math.sqrt(x)) : err('negative number');

			const result = ok(-1);
			const chained = flatMap(result, sqrt);

			expect(isErr(chained)).toBe(true);
			if (isErr(chained)) {
				expect(chained.error).toBe('negative number');
			}
		});

		it('short-circuits on Err', () => {
			const sqrt = (x: number): Result<number, string> =>
				x >= 0 ? ok(Math.sqrt(x)) : err('negative number');

			const result = err('initial error');
			const chained = flatMap(result, sqrt);

			expect(isErr(chained)).toBe(true);
			if (isErr(chained)) {
				expect(chained.error).toBe('initial error');
			}
		});

		it('does not call function for Err', () => {
			let called = false;

			const result = err('error');
			flatMap(result, () => {
				called = true;
				return ok(42);
			});

			expect(called).toBe(false);
		});
	});
});

describe('Real-world Usage', () => {
	it('divides numbers safely', () => {
		function divide(a: number, b: number): Result<number, string> {
			if (b === 0) {
				return err('Division by zero');
			}
			return ok(a / b);
		}

		expect(unwrapOr(divide(10, 2), 0)).toBe(5);
		expect(unwrapOr(divide(10, 0), 0)).toBe(0);
	});

	it('chains multiple operations', () => {
		function parse(s: string): Result<number, string> {
			const n = Number.parseFloat(s);
			return Number.isNaN(n) ? err('Not a number') : ok(n);
		}

		function sqrt(x: number): Result<number, string> {
			return x >= 0 ? ok(Math.sqrt(x)) : err('Negative number');
		}

		const result = flatMap(parse('16'), sqrt);
		expect(unwrapOr(result, 0)).toBe(4);

		const resultErr = flatMap(parse('invalid'), sqrt);
		expect(isErr(resultErr)).toBe(true);
	});

	it('transforms errors consistently', () => {
		function operation(): Result<number, string> {
			return err('operation failed');
		}

		const result = mapError(operation(), (e) => new Error(e));

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error).toBeInstanceOf(Error);
		}
	});
});
