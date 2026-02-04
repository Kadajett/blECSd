/**
 * Terminfo parameterized string compiler.
 *
 * Compiles terminfo capability strings with parameter placeholders into
 * executable functions for efficient repeated use. Implements the tparm
 * parameter substitution language.
 *
 * @module terminal/terminfo/compiler
 *
 * @example
 * ```typescript
 * import { compileCapability, tparm } from 'blecsd';
 *
 * // One-off parameter substitution
 * const seq = tparm('\x1b[%i%p1%d;%p2%dH', 10, 5);
 * // Returns: '\x1b[11;6H' (cursor to row 11, col 6)
 *
 * // Compile for repeated use
 * const cup = compileCapability('\x1b[%i%p1%d;%p2%dH');
 * cup.execute(0, 0);   // '\x1b[1;1H'
 * cup.execute(10, 20); // '\x1b[11;21H'
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

/**
 * Instruction types for compiled capabilities.
 */
type InstructionType =
	| 'literal'
	| 'push_param'
	| 'push_char'
	| 'push_int'
	| 'output_char'
	| 'output_string'
	| 'output_decimal'
	| 'output_hex'
	| 'output_octal'
	| 'increment'
	| 'add'
	| 'subtract'
	| 'multiply'
	| 'divide'
	| 'modulo'
	| 'bit_and'
	| 'bit_or'
	| 'bit_xor'
	| 'logical_and'
	| 'logical_or'
	| 'logical_not'
	| 'bit_not'
	| 'equals'
	| 'less_than'
	| 'greater_than'
	| 'cond_start'
	| 'cond_then'
	| 'cond_else'
	| 'cond_end'
	| 'strlen'
	| 'set_var'
	| 'get_var';

/**
 * A single compiled instruction.
 */
interface Instruction {
	readonly type: InstructionType;
	readonly value?: string | number;
}

/**
 * A compiled capability ready for execution.
 */
export interface CompiledCapability {
	/** Original capability string */
	readonly source: string;
	/** Compiled instructions */
	readonly instructions: readonly Instruction[];
	/**
	 * Execute with parameters.
	 *
	 * @param params - Parameters to substitute
	 * @returns Rendered capability string
	 */
	execute(...params: number[]): string;
}

/**
 * Execution state during capability evaluation.
 */
interface ExecutionState {
	stack: number[];
	params: number[];
	staticVars: Map<string, number>;
	dynamicVars: Map<string, number>;
	output: string;
	instructionIndex: number;
}

// =============================================================================
// COMPILATION
// =============================================================================

/**
 * Parses a character constant like %'x'.
 */
function parseCharConstant(
	format: string,
	startIndex: number,
): { value: number; endIndex: number } {
	// Skip the opening quote
	let idx = startIndex + 1;
	if (idx >= format.length) {
		return { value: 0, endIndex: idx };
	}

	let char = format[idx];
	let value: number;

	// Handle escape sequences
	if (char === '\\' && idx + 1 < format.length) {
		idx++;
		char = format[idx];
		switch (char) {
			case 'n':
				value = 10;
				break;
			case 'r':
				value = 13;
				break;
			case 't':
				value = 9;
				break;
			case 'b':
				value = 8;
				break;
			case 'f':
				value = 12;
				break;
			case '\\':
				value = 92;
				break;
			case "'":
				value = 39;
				break;
			default:
				value = (char ?? ' ').charCodeAt(0);
		}
	} else {
		value = (char ?? ' ').charCodeAt(0);
	}

	idx++;

	// Skip closing quote if present
	if (idx < format.length && format[idx] === "'") {
		idx++;
	}

	return { value, endIndex: idx };
}

/**
 * Parses an integer constant like %{123}.
 */
function parseIntConstant(format: string, startIndex: number): { value: number; endIndex: number } {
	let numStr = '';
	let idx = startIndex;
	while (idx < format.length && format[idx] !== '}') {
		numStr += format[idx];
		idx++;
	}
	// Skip closing brace
	if (idx < format.length && format[idx] === '}') {
		idx++;
	}
	return { value: Number.parseInt(numStr, 10) || 0, endIndex: idx };
}

/**
 * Finds the matching else or endif for a conditional.
 */
function findConditionalEnd(
	instructions: Instruction[],
	startIndex: number,
	findElse: boolean,
): number {
	let depth = 1;
	let i = startIndex;

	while (i < instructions.length && depth > 0) {
		const instr = instructions[i];
		if (instr?.type === 'cond_start') {
			// Nested %? increases depth
			depth++;
		} else if (instr?.type === 'cond_end') {
			depth--;
			if (depth === 0) return i;
		} else if (instr?.type === 'cond_else' && depth === 1 && findElse) {
			return i;
		}
		i++;
	}

	return instructions.length;
}

/**
 * Compiles a capability string into instructions.
 */
function compileToInstructions(format: string): Instruction[] {
	const instructions: Instruction[] = [];
	let i = 0;
	let literalStart = 0;

	while (i < format.length) {
		if (format[i] !== '%') {
			i++;
			continue;
		}

		// Emit any accumulated literal
		if (i > literalStart) {
			instructions.push({ type: 'literal', value: format.slice(literalStart, i) });
		}

		i++; // Skip %

		// Handle trailing % - emit as literal
		if (i >= format.length) {
			instructions.push({ type: 'literal', value: '%' });
			literalStart = i;
			break;
		}

		i = handleFormatCode(format, i, instructions);

		literalStart = i;
	}

	// Emit any remaining literal
	if (i > literalStart) {
		instructions.push({ type: 'literal', value: format.slice(literalStart) });
	}

	return instructions;
}

const SIMPLE_INSTRUCTIONS: Record<string, InstructionType> = {
	i: 'increment',
	l: 'strlen',
	'+': 'add',
	'-': 'subtract',
	'*': 'multiply',
	'/': 'divide',
	m: 'modulo',
	'&': 'bit_and',
	'|': 'bit_or',
	'^': 'bit_xor',
	A: 'logical_and',
	O: 'logical_or',
	'!': 'logical_not',
	'~': 'bit_not',
	'=': 'equals',
	'<': 'less_than',
	'>': 'greater_than',
	'?': 'cond_start',
	t: 'cond_then',
	e: 'cond_else',
	';': 'cond_end',
	d: 'output_decimal',
	o: 'output_octal',
	x: 'output_hex',
	X: 'output_hex',
	c: 'output_char',
	s: 'output_string',
};

function handleFormatCode(format: string, index: number, instructions: Instruction[]): number {
	const code = format[index];

	if (code === '%') {
		instructions.push({ type: 'literal', value: '%' });
		return index + 1;
	}

	if (code === 'p') {
		return handlePushParam(format, index, instructions);
	}

	if (code === 'P') {
		return handleSetVar(format, index, instructions);
	}

	if (code === 'g') {
		return handleGetVar(format, index, instructions);
	}

	if (code === "'") {
		return handleCharConstant(format, index, instructions);
	}

	if (code === '{') {
		return handleIntConstant(format, index, instructions);
	}

	const simple = code ? SIMPLE_INSTRUCTIONS[code] : undefined;
	if (simple) {
		instructions.push({ type: simple });
		return index + 1;
	}

	if (code && isPrintfFormatStart(code)) {
		return handlePrintfFormat(format, index, instructions);
	}

	instructions.push({ type: 'literal', value: `%${code ?? ''}` });
	return index + 1;
}

function handlePushParam(format: string, index: number, instructions: Instruction[]): number {
	const paramIndex = index + 1;
	if (paramIndex < format.length) {
		const paramNum = Number.parseInt(format[paramIndex] ?? '0', 10);
		instructions.push({ type: 'push_param', value: paramNum });
		return paramIndex + 1;
	}
	return paramIndex;
}

function handleSetVar(format: string, index: number, instructions: Instruction[]): number {
	const varIndex = index + 1;
	if (varIndex < format.length) {
		const varName = format[varIndex];
		const isStatic = varName !== undefined && varName >= 'a' && varName <= 'z';
		instructions.push({ type: 'set_var', value: (isStatic ? 's' : 'd') + (varName ?? '') });
		return varIndex + 1;
	}
	return varIndex;
}

function handleGetVar(format: string, index: number, instructions: Instruction[]): number {
	const varIndex = index + 1;
	if (varIndex < format.length) {
		const varName = format[varIndex];
		const isStatic = varName !== undefined && varName >= 'a' && varName <= 'z';
		instructions.push({ type: 'get_var', value: (isStatic ? 's' : 'd') + (varName ?? '') });
		return varIndex + 1;
	}
	return varIndex;
}

function handleCharConstant(format: string, index: number, instructions: Instruction[]): number {
	const charResult = parseCharConstant(format, index);
	instructions.push({ type: 'push_char', value: charResult.value });
	return charResult.endIndex;
}

function handleIntConstant(format: string, index: number, instructions: Instruction[]): number {
	const intResult = parseIntConstant(format, index + 1);
	instructions.push({ type: 'push_int', value: intResult.value });
	return intResult.endIndex;
}

function isPrintfFormatStart(code: string): boolean {
	return (
		(code >= '0' && code <= '9') || code === ':' || code === ' ' || code === '#' || code === '-'
	);
}

function handlePrintfFormat(format: string, index: number, instructions: Instruction[]): number {
	let i = index;
	while (i < format.length && !isPrintfOutputCode(format[i])) {
		i++;
	}
	if (i < format.length) {
		const outputCode = format[i];
		const outputType = SIMPLE_INSTRUCTIONS[outputCode ?? ''];
		if (outputType) {
			instructions.push({ type: outputType });
		}
		return i + 1;
	}
	return i;
}

function isPrintfOutputCode(code: string | undefined): boolean {
	return (
		code === 'd' || code === 'o' || code === 'x' || code === 'X' || code === 's' || code === 'c'
	);
}

/**
 * Executes compiled instructions with given parameters.
 */
function executeInstructions(instructions: readonly Instruction[], params: number[]): string {
	const state: ExecutionState = {
		stack: [],
		params: [...params],
		staticVars: new Map(),
		dynamicVars: new Map(),
		output: '',
		instructionIndex: 0,
	};

	while (state.instructionIndex < instructions.length) {
		const instr = instructions[state.instructionIndex];
		if (!instr) {
			state.instructionIndex++;
			continue;
		}

		const handler = instructionHandlers[instr.type];
		if (handler) {
			handler(state, instr, instructions);
		}

		state.instructionIndex++;
	}

	return state.output;
}

type InstructionHandler = (
	state: ExecutionState,
	instr: Instruction,
	instructions: readonly Instruction[],
) => void;

const instructionHandlers: Record<InstructionType, InstructionHandler> = {
	literal: (state, instr) => {
		state.output += instr.value as string;
	},
	push_param: (state, instr) => {
		const paramIndex = (instr.value as number) - 1;
		state.stack.push(state.params[paramIndex] ?? 0);
	},
	push_char: (state, instr) => {
		state.stack.push(instr.value as number);
	},
	push_int: (state, instr) => {
		state.stack.push(instr.value as number);
	},
	increment: (state) => {
		if (state.params.length > 0 && state.params[0] !== undefined) state.params[0]++;
		if (state.params.length > 1 && state.params[1] !== undefined) state.params[1]++;
	},
	output_decimal: (state) => {
		state.output += String(popNumber(state));
	},
	output_octal: (state) => {
		state.output += popNumber(state).toString(8);
	},
	output_hex: (state) => {
		state.output += popNumber(state).toString(16);
	},
	output_char: (state) => {
		state.output += String.fromCharCode(popNumber(state));
	},
	output_string: (state) => {
		const value = state.stack.pop();
		state.output += String(value ?? '');
	},
	strlen: (state) => {
		const value = state.stack.pop() ?? 0;
		state.stack.push(String(value).length);
	},
	add: (state) => {
		state.stack.push(popBinary(state, (a, b) => a + b));
	},
	subtract: (state) => {
		state.stack.push(popBinary(state, (a, b) => a - b));
	},
	multiply: (state) => {
		state.stack.push(popBinary(state, (a, b) => a * b));
	},
	divide: (state) => {
		state.stack.push(popBinary(state, (a, b) => (b !== 0 ? Math.floor(a / b) : 0)));
	},
	modulo: (state) => {
		state.stack.push(popBinary(state, (a, b) => (b !== 0 ? a % b : 0)));
	},
	bit_and: (state) => {
		state.stack.push(popBinary(state, (a, b) => a & b));
	},
	bit_or: (state) => {
		state.stack.push(popBinary(state, (a, b) => a | b));
	},
	bit_xor: (state) => {
		state.stack.push(popBinary(state, (a, b) => a ^ b));
	},
	logical_and: (state) => {
		state.stack.push(popBinary(state, (a, b) => (a && b ? 1 : 0)));
	},
	logical_or: (state) => {
		state.stack.push(popBinary(state, (a, b) => (a || b ? 1 : 0)));
	},
	logical_not: (state) => {
		const value = popNumber(state);
		state.stack.push(value ? 0 : 1);
	},
	bit_not: (state) => {
		state.stack.push(~popNumber(state));
	},
	equals: (state) => {
		state.stack.push(popBinary(state, (a, b) => (a === b ? 1 : 0)));
	},
	less_than: (state) => {
		state.stack.push(popBinary(state, (a, b) => (a < b ? 1 : 0)));
	},
	greater_than: (state) => {
		state.stack.push(popBinary(state, (a, b) => (a > b ? 1 : 0)));
	},
	cond_start: () => {
		// Marker for conditional start - used for depth tracking, no execution action
	},
	cond_then: (state, _instr, instructions) => {
		const condition = popNumber(state);
		if (!condition) {
			const elseOrEnd = findConditionalEnd(
				instructions as Instruction[],
				state.instructionIndex + 1,
				true,
			);
			state.instructionIndex = elseOrEnd;
		}
	},
	cond_else: (state, _instr, instructions) => {
		const endIndex = findConditionalEnd(
			instructions as Instruction[],
			state.instructionIndex + 1,
			false,
		);
		state.instructionIndex = endIndex;
	},
	cond_end: () => {
		// End of conditional, continue
	},
	set_var: (state, instr) => {
		const varSpec = instr.value as string;
		const varType = varSpec[0];
		const varName = varSpec.slice(1);
		const value = popNumber(state);
		if (varType === 's') {
			state.staticVars.set(varName, value);
		} else {
			state.dynamicVars.set(varName, value);
		}
	},
	get_var: (state, instr) => {
		const varSpec = instr.value as string;
		const varType = varSpec[0];
		const varName = varSpec.slice(1);
		if (varType === 's') {
			state.stack.push(state.staticVars.get(varName) ?? 0);
		} else {
			state.stack.push(state.dynamicVars.get(varName) ?? 0);
		}
	},
};

function popNumber(state: ExecutionState): number {
	return state.stack.pop() ?? 0;
}

function popBinary(state: ExecutionState, op: (a: number, b: number) => number): number {
	const b = popNumber(state);
	const a = popNumber(state);
	return op(a, b);
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Capability compilation cache.
 */
const capabilityCache = new Map<string, CompiledCapability>();

/**
 * Compiles a terminfo capability string for efficient repeated execution.
 *
 * @param source - Capability string with parameter placeholders
 * @returns Compiled capability object
 *
 * @example
 * ```typescript
 * import { compileCapability } from 'blecsd';
 *
 * // Compile cursor movement capability
 * const cup = compileCapability('\x1b[%i%p1%d;%p2%dH');
 *
 * // Execute with different parameters
 * cup.execute(0, 0);   // '\x1b[1;1H' (top-left)
 * cup.execute(10, 20); // '\x1b[11;21H' (row 11, col 21)
 * cup.execute(24, 79); // '\x1b[25;80H' (bottom-right on 80x25)
 * ```
 */
export function compileCapability(source: string): CompiledCapability {
	// Check cache
	const cached = capabilityCache.get(source);
	if (cached) {
		return cached;
	}

	const instructions = compileToInstructions(source);

	const compiled: CompiledCapability = {
		source,
		instructions,
		execute(...params: number[]): string {
			return executeInstructions(instructions, params);
		},
	};

	// Cache the compiled capability
	capabilityCache.set(source, compiled);

	return compiled;
}

/**
 * Executes a terminfo capability string with parameters (one-off).
 *
 * For repeated use with the same capability, use compileCapability() instead.
 *
 * @param source - Capability string with parameter placeholders
 * @param params - Parameters to substitute
 * @returns Rendered capability string
 *
 * @example
 * ```typescript
 * import { tparm } from 'blecsd';
 *
 * // Cursor movement
 * tparm('\x1b[%i%p1%d;%p2%dH', 10, 5);  // '\x1b[11;6H'
 *
 * // Set foreground color (256 colors)
 * tparm('\x1b[38;5;%p1%dm', 196);  // '\x1b[38;5;196m'
 *
 * // Parameterized line insert
 * tparm('\x1b[%p1%dL', 5);  // '\x1b[5L'
 * ```
 */
export function tparm(source: string, ...params: number[]): string {
	const compiled = compileCapability(source);
	return compiled.execute(...params);
}

/**
 * Clears the capability compilation cache.
 * Useful for testing or when memory is constrained.
 */
export function clearCapabilityCache(): void {
	capabilityCache.clear();
}

/**
 * Gets the current size of the capability cache.
 */
export function getCapabilityCacheSize(): number {
	return capabilityCache.size;
}

/**
 * Pre-compiles common capabilities for performance.
 *
 * @param capabilities - Map of capability names to strings
 * @returns Map of capability names to compiled capabilities
 *
 * @example
 * ```typescript
 * import { precompileCapabilities } from 'blecsd';
 *
 * const compiled = precompileCapabilities({
 *   cup: '\x1b[%i%p1%d;%p2%dH',
 *   setaf: '\x1b[38;5;%p1%dm',
 *   setab: '\x1b[48;5;%p1%dm',
 * });
 *
 * // Use compiled capabilities
 * compiled.get('cup')?.execute(10, 5);  // '\x1b[11;6H'
 * ```
 */
export function precompileCapabilities(
	capabilities: Record<string, string>,
): Map<string, CompiledCapability> {
	const result = new Map<string, CompiledCapability>();

	for (const [name, source] of Object.entries(capabilities)) {
		result.set(name, compileCapability(source));
	}

	return result;
}

/**
 * Checks if a capability string contains parameters.
 *
 * @param source - Capability string
 * @returns true if the string contains parameter placeholders
 *
 * @example
 * ```typescript
 * import { hasParameters } from 'blecsd';
 *
 * hasParameters('\x1b[H');              // false (no params)
 * hasParameters('\x1b[%i%p1%d;%p2%dH'); // true (has params)
 * ```
 */
export function hasParameters(source: string): boolean {
	return /%[pip{']/.test(source);
}
