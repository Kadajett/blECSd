/**
 * Tests for the BlECSd Error System
 */

import { describe, expect, it } from 'vitest';
import {
	BlECSdErrorCode,
	ComponentErrorCode,
	ConfigErrorCode,
	EntityErrorCode,
	InputErrorCode,
	InternalErrorCode,
	RenderErrorCode,
	SystemErrorCode,
	TerminalErrorCode,
	ValidationErrorCode,
} from './codes';
import {
	createComponentError,
	createConfigError,
	createEntityError,
	createInputError,
	createInternalError,
	createRenderError,
	createSystemError,
	createTerminalError,
	createValidationError,
	fromNativeError,
	toNativeError,
	wrapError,
} from './factories';
import {
	hasBlECSdErrorShape,
	hasCause,
	hasContext,
	hasErrorCode,
	hasZodIssues,
	isBlECSdError,
	isComponentError,
	isConfigError,
	isEntityError,
	isErrorKind,
	isInputError,
	isInternalError,
	isRenderError,
	isSystemError,
	isTerminalError,
	isValidationError,
} from './guards';
import {
	err,
	flatMap,
	isErr,
	isOk,
	map,
	mapError,
	ok,
	unwrap,
	unwrapOr,
	unwrapOrElse,
} from './result';
import { BLECSD_ERROR_SYMBOL } from './types';

// =============================================================================
// ERROR CODES TESTS
// =============================================================================

describe('Error Codes', () => {
	it('should have unique validation error codes', () => {
		const codes = Object.values(ValidationErrorCode);
		const unique = new Set(codes);
		expect(codes.length).toBe(unique.size);
	});

	it('should have unique terminal error codes', () => {
		const codes = Object.values(TerminalErrorCode);
		const unique = new Set(codes);
		expect(codes.length).toBe(unique.size);
	});

	it('should have unique system error codes', () => {
		const codes = Object.values(SystemErrorCode);
		const unique = new Set(codes);
		expect(codes.length).toBe(unique.size);
	});

	it('should have unique entity error codes', () => {
		const codes = Object.values(EntityErrorCode);
		const unique = new Set(codes);
		expect(codes.length).toBe(unique.size);
	});

	it('should combine all codes in BlECSdErrorCode', () => {
		expect(BlECSdErrorCode.INVALID_HEX_COLOR).toBe(ValidationErrorCode.INVALID_HEX_COLOR);
		expect(BlECSdErrorCode.TERMINFO_NOT_FOUND).toBe(TerminalErrorCode.TERMINFO_NOT_FOUND);
		expect(BlECSdErrorCode.LOOP_ALREADY_RUNNING).toBe(SystemErrorCode.LOOP_ALREADY_RUNNING);
	});
});

// =============================================================================
// FACTORY TESTS
// =============================================================================

describe('Error Factories', () => {
	describe('createValidationError', () => {
		it('should create a validation error', () => {
			const error = createValidationError(
				ValidationErrorCode.INVALID_HEX_COLOR,
				'Invalid hex color',
			);

			expect(error.kind).toBe('validation');
			expect(error.code).toBe(ValidationErrorCode.INVALID_HEX_COLOR);
			expect(error.message).toBe('Invalid hex color');
			expect(error.timestamp).toBeGreaterThan(0);
			expect(error.cause).toBeUndefined();
			expect(error.context).toBeUndefined();
		});

		it('should include cause and context', () => {
			const cause = new Error('Original error');
			const error = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Invalid input', {
				cause,
				context: { data: { input: 'test' } },
			});

			expect(error.cause).toBe(cause);
			expect(error.context?.data?.['input']).toBe('test');
		});

		it('should include Zod issues', () => {
			const zodIssues = [
				{
					code: 'invalid_type' as const,
					expected: 'string' as const,
					path: ['color'],
					message: 'Expected string',
				},
			];

			const error = createValidationError(
				ValidationErrorCode.SCHEMA_VALIDATION_FAILED,
				'Schema validation failed',
				{ zodIssues },
			);

			expect(error.context?.zodIssues).toEqual(zodIssues);
		});
	});

	describe('createTerminalError', () => {
		it('should create a terminal error', () => {
			const error = createTerminalError(TerminalErrorCode.TERMINFO_NOT_FOUND, 'Terminfo not found');

			expect(error.kind).toBe('terminal');
			expect(error.code).toBe(TerminalErrorCode.TERMINFO_NOT_FOUND);
		});
	});

	describe('createSystemError', () => {
		it('should create a system error', () => {
			const error = createSystemError(SystemErrorCode.LOOP_ALREADY_RUNNING, 'Loop already running');

			expect(error.kind).toBe('system');
			expect(error.code).toBe(SystemErrorCode.LOOP_ALREADY_RUNNING);
		});
	});

	describe('createEntityError', () => {
		it('should create an entity error', () => {
			const error = createEntityError(EntityErrorCode.NOT_FOUND, 'Entity not found', {
				context: { entityId: 42 },
			});

			expect(error.kind).toBe('entity');
			expect(error.code).toBe(EntityErrorCode.NOT_FOUND);
			expect(error.context?.entityId).toBe(42);
		});
	});

	describe('createComponentError', () => {
		it('should create a component error', () => {
			const error = createComponentError(ComponentErrorCode.NOT_FOUND, 'Component not found');

			expect(error.kind).toBe('component');
			expect(error.code).toBe(ComponentErrorCode.NOT_FOUND);
		});
	});

	describe('createInputError', () => {
		it('should create an input error', () => {
			const error = createInputError(InputErrorCode.INVALID_KEY_SEQUENCE, 'Invalid key sequence');

			expect(error.kind).toBe('input');
			expect(error.code).toBe(InputErrorCode.INVALID_KEY_SEQUENCE);
		});
	});

	describe('createRenderError', () => {
		it('should create a render error', () => {
			const error = createRenderError(RenderErrorCode.BUFFER_OVERFLOW, 'Buffer overflow');

			expect(error.kind).toBe('render');
			expect(error.code).toBe(RenderErrorCode.BUFFER_OVERFLOW);
		});
	});

	describe('createConfigError', () => {
		it('should create a config error', () => {
			const error = createConfigError(ConfigErrorCode.INVALID_GAME_CONFIG, 'Invalid game config');

			expect(error.kind).toBe('config');
			expect(error.code).toBe(ConfigErrorCode.INVALID_GAME_CONFIG);
		});
	});

	describe('createInternalError', () => {
		it('should create an internal error', () => {
			const error = createInternalError(InternalErrorCode.ASSERTION_FAILED, 'Assertion failed');

			expect(error.kind).toBe('internal');
			expect(error.code).toBe(InternalErrorCode.ASSERTION_FAILED);
		});
	});
});

// =============================================================================
// NATIVE ERROR CONVERSION TESTS
// =============================================================================

describe('Native Error Conversion', () => {
	describe('toNativeError', () => {
		it('should convert BlECSdError to native Error', () => {
			const blecsdError = createValidationError(
				ValidationErrorCode.INVALID_HEX_COLOR,
				'Invalid hex color',
			);

			const nativeError = toNativeError(blecsdError);

			expect(nativeError).toBeInstanceOf(Error);
			expect(nativeError.message).toBe('Invalid hex color');
			expect(nativeError.name).toBe('BlECSdValidationError');
			expect(nativeError[BLECSD_ERROR_SYMBOL]).toBe(blecsdError);
		});

		it('should preserve cause', () => {
			const cause = new Error('Original');
			const blecsdError = createValidationError(
				ValidationErrorCode.INVALID_INPUT,
				'Wrapped error',
				{ cause },
			);

			const nativeError = toNativeError(blecsdError);

			expect(nativeError.cause).toBe(cause);
		});
	});

	describe('fromNativeError', () => {
		it('should extract BlECSdError from native Error', () => {
			const blecsdError = createValidationError(
				ValidationErrorCode.INVALID_HEX_COLOR,
				'Invalid hex color',
			);
			const nativeError = toNativeError(blecsdError);

			const extracted = fromNativeError(nativeError);

			expect(extracted).toBe(blecsdError);
		});

		it('should return null for regular Error', () => {
			const regularError = new Error('Regular error');

			const extracted = fromNativeError(regularError);

			expect(extracted).toBeNull();
		});

		it('should return null for non-objects', () => {
			expect(fromNativeError(null)).toBeNull();
			expect(fromNativeError(undefined)).toBeNull();
			expect(fromNativeError('string')).toBeNull();
			expect(fromNativeError(42)).toBeNull();
		});
	});

	describe('wrapError', () => {
		it('should return existing BlECSdError', () => {
			const blecsdError = createValidationError(ValidationErrorCode.INVALID_INPUT, 'Invalid input');
			const nativeError = toNativeError(blecsdError);

			const wrapped = wrapError(
				nativeError,
				InternalErrorCode.UNEXPECTED_STATE,
				'Fallback message',
			);

			expect(wrapped).toBe(blecsdError);
		});

		it('should wrap regular Error as InternalError', () => {
			const regularError = new Error('Regular error');

			const wrapped = wrapError(
				regularError,
				InternalErrorCode.UNEXPECTED_STATE,
				'Unexpected error',
			);

			expect(wrapped.kind).toBe('internal');
			expect(wrapped.code).toBe(InternalErrorCode.UNEXPECTED_STATE);
			expect(wrapped.message).toBe('Unexpected error: Regular error');
			expect(wrapped.cause).toBe(regularError);
		});

		it('should wrap non-Error as InternalError', () => {
			const wrapped = wrapError(
				'string error',
				InternalErrorCode.UNEXPECTED_STATE,
				'Unexpected error',
			);

			expect(wrapped.kind).toBe('internal');
			expect(wrapped.message).toBe('Unexpected error: string error');
			expect(wrapped.cause).toBeUndefined();
		});
	});
});

// =============================================================================
// TYPE GUARD TESTS
// =============================================================================

describe('Type Guards', () => {
	const validationError = createValidationError(ValidationErrorCode.INVALID_INPUT, 'test');
	const terminalError = createTerminalError(TerminalErrorCode.TERMINAL_ERROR, 'test');
	const systemError = createSystemError(SystemErrorCode.SYSTEM_ERROR, 'test');
	const entityError = createEntityError(EntityErrorCode.ENTITY_ERROR, 'test');
	const componentError = createComponentError(ComponentErrorCode.COMPONENT_ERROR, 'test');
	const inputError = createInputError(InputErrorCode.INPUT_ERROR, 'test');
	const renderError = createRenderError(RenderErrorCode.RENDER_ERROR, 'test');
	const configError = createConfigError(ConfigErrorCode.CONFIG_ERROR, 'test');
	const internalError = createInternalError(InternalErrorCode.INTERNAL_ERROR, 'test');

	describe('kind guards', () => {
		it('isValidationError', () => {
			expect(isValidationError(validationError)).toBe(true);
			expect(isValidationError(terminalError)).toBe(false);
		});

		it('isTerminalError', () => {
			expect(isTerminalError(terminalError)).toBe(true);
			expect(isTerminalError(validationError)).toBe(false);
		});

		it('isSystemError', () => {
			expect(isSystemError(systemError)).toBe(true);
			expect(isSystemError(validationError)).toBe(false);
		});

		it('isEntityError', () => {
			expect(isEntityError(entityError)).toBe(true);
			expect(isEntityError(validationError)).toBe(false);
		});

		it('isComponentError', () => {
			expect(isComponentError(componentError)).toBe(true);
			expect(isComponentError(validationError)).toBe(false);
		});

		it('isInputError', () => {
			expect(isInputError(inputError)).toBe(true);
			expect(isInputError(validationError)).toBe(false);
		});

		it('isRenderError', () => {
			expect(isRenderError(renderError)).toBe(true);
			expect(isRenderError(validationError)).toBe(false);
		});

		it('isConfigError', () => {
			expect(isConfigError(configError)).toBe(true);
			expect(isConfigError(validationError)).toBe(false);
		});

		it('isInternalError', () => {
			expect(isInternalError(internalError)).toBe(true);
			expect(isInternalError(validationError)).toBe(false);
		});
	});

	describe('isErrorKind', () => {
		it('should narrow to specific kind', () => {
			expect(isErrorKind(validationError, 'validation')).toBe(true);
			expect(isErrorKind(validationError, 'terminal')).toBe(false);
		});
	});

	describe('hasErrorCode', () => {
		it('should check error code', () => {
			expect(hasErrorCode(validationError, ValidationErrorCode.INVALID_INPUT)).toBe(true);
			expect(hasErrorCode(validationError, ValidationErrorCode.INVALID_HEX_COLOR)).toBe(false);
		});
	});

	describe('isBlECSdError', () => {
		it('should detect BlECSdError via symbol', () => {
			const nativeError = toNativeError(validationError);
			expect(isBlECSdError(nativeError)).toBe(true);
			expect(isBlECSdError(new Error('regular'))).toBe(false);
		});
	});

	describe('hasBlECSdErrorShape', () => {
		it('should detect error shape', () => {
			expect(hasBlECSdErrorShape(validationError)).toBe(true);
			expect(hasBlECSdErrorShape({ kind: 'validation' })).toBe(false);
			expect(hasBlECSdErrorShape(null)).toBe(false);
		});
	});

	describe('context guards', () => {
		it('hasContext', () => {
			const withContext = createValidationError(ValidationErrorCode.INVALID_INPUT, 'test', {
				context: { entityId: 42 },
			});
			expect(hasContext(withContext)).toBe(true);
			expect(hasContext(validationError)).toBe(false);
		});

		it('hasCause', () => {
			const withCause = createValidationError(ValidationErrorCode.INVALID_INPUT, 'test', {
				cause: new Error('cause'),
			});
			expect(hasCause(withCause)).toBe(true);
			expect(hasCause(validationError)).toBe(false);
		});

		it('hasZodIssues', () => {
			const withIssues = createValidationError(
				ValidationErrorCode.SCHEMA_VALIDATION_FAILED,
				'test',
				{
					zodIssues: [
						{
							code: 'invalid_type' as const,
							expected: 'string' as const,
							path: [],
							message: 'test',
						},
					],
				},
			);
			expect(hasZodIssues(withIssues)).toBe(true);
			expect(hasZodIssues(validationError)).toBe(false);
		});
	});
});

// =============================================================================
// RESULT TYPE TESTS
// =============================================================================

describe('Result Type', () => {
	describe('constructors', () => {
		it('ok creates successful result', () => {
			const result = ok(42);
			expect(result.ok).toBe(true);
			expect(result.value).toBe(42);
		});

		it('err creates failed result', () => {
			const result = err('error');
			expect(result.ok).toBe(false);
			expect(result.error).toBe('error');
		});
	});

	describe('type guards', () => {
		it('isOk identifies Ok results', () => {
			expect(isOk(ok(42))).toBe(true);
			expect(isOk(err('error'))).toBe(false);
		});

		it('isErr identifies Err results', () => {
			expect(isErr(ok(42))).toBe(false);
			expect(isErr(err('error'))).toBe(true);
		});
	});

	describe('unwrap functions', () => {
		it('unwrap returns value for Ok', () => {
			expect(unwrap(ok(42))).toBe(42);
		});

		it('unwrap throws for Err', () => {
			expect(() => unwrap(err('oops'))).toThrow('Called unwrap on Err: oops');
		});

		it('unwrap extracts message from Error', () => {
			expect(() => unwrap(err(new Error('msg')))).toThrow('Called unwrap on Err: msg');
		});

		it('unwrapOr returns value for Ok', () => {
			expect(unwrapOr(ok(42), 0)).toBe(42);
		});

		it('unwrapOr returns default for Err', () => {
			expect(unwrapOr(err('error'), 0)).toBe(0);
		});

		it('unwrapOrElse returns value for Ok', () => {
			expect(unwrapOrElse(ok(42), () => 0)).toBe(42);
		});

		it('unwrapOrElse computes default for Err', () => {
			expect(unwrapOrElse(err('error'), (e) => e.length)).toBe(5);
		});
	});

	describe('transformations', () => {
		it('map transforms Ok value', () => {
			const result = map(ok(42), (x) => x * 2);
			expect(isOk(result) && result.value).toBe(84);
		});

		it('map passes through Err', () => {
			const result = map(err('error'), (x: number) => x * 2);
			expect(isErr(result) && result.error).toBe('error');
		});

		it('mapError transforms Err error', () => {
			const result = mapError(err('error'), (e) => e.toUpperCase());
			expect(isErr(result) && result.error).toBe('ERROR');
		});

		it('mapError passes through Ok', () => {
			const result = mapError(ok(42), (e: string) => e.toUpperCase());
			expect(isOk(result) && result.value).toBe(42);
		});

		it('flatMap chains successful results', () => {
			const sqrt = (x: number) => (x >= 0 ? ok(Math.sqrt(x)) : err('negative'));

			expect(unwrap(flatMap(ok(16), sqrt))).toBe(4);
			expect(isErr(flatMap(ok(-1), sqrt))).toBe(true);
		});

		it('flatMap short-circuits on Err', () => {
			const sqrt = (x: number) => (x >= 0 ? ok(Math.sqrt(x)) : err('negative'));

			const result = flatMap(err('original') as ReturnType<typeof sqrt>, sqrt);
			expect(isErr(result) && result.error).toBe('original');
		});
	});
});
