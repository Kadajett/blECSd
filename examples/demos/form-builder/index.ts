#!/usr/bin/env node
/**
 * Interactive Form Builder
 *
 * Multi-step form with validation demonstrating interactive widgets:
 * - TextInput fields with cursor
 * - Checkbox groups
 * - RadioButton selections
 * - Select dropdowns
 * - Slider for numeric ranges
 * - Submit button with validation
 * - Focusable tab-order traversal
 * - Zod-style validation feedback
 * - Styled error/success messages
 *
 * Controls: Tab/Shift+Tab to navigate fields, Space to toggle,
 *           Arrow keys for sliders/selects, Enter to submit, Q to quit
 *
 * @module examples/demos/form-builder
 */

import {
	createWorld,
	createCellBuffer,
	fillRect,
} from 'blecsd';
import type { World } from 'blecsd';

// =============================================================================
// CONFIGURATION
// =============================================================================

const TARGET_FPS = 15;
const FRAME_TIME = 1000 / TARGET_FPS;

// Colors
const BG = 0x1e1e2eff;
const FG = 0xcdd6f4ff;
const LABEL_FG = 0xbac2deff;
const FOCUS_FG = 0x1e1e2eff;
const FOCUS_BG = 0x89b4faff;
const INPUT_FG = 0xcdd6f4ff;
const INPUT_BG = 0x313244ff;
const ERROR_FG = 0xf38ba8ff;
const SUCCESS_FG = 0xa6e3a1ff;
const BORDER_FG = 0x585b70ff;
const HEADER_FG = 0xcba6f7ff;
const BUTTON_FG = 0x1e1e2eff;
const BUTTON_BG = 0xa6e3a1ff;
const SLIDER_FG = 0x89b4faff;
const SLIDER_BG = 0x45475aff;
const CHECK_FG = 0xa6e3a1ff;
const RADIO_FG = 0xf9e2afff;
const SELECT_FG = 0x89dcebff;

// =============================================================================
// TYPES
// =============================================================================

type FieldType = 'text' | 'checkbox' | 'radio' | 'select' | 'slider' | 'button';

interface FormField {
	type: FieldType;
	label: string;
	name: string;
	value: string;
	options?: string[];
	min?: number;
	max?: number;
	required?: boolean;
	error?: string;
	cursorPos?: number;
}

interface CellBufferDirect {
	width: number;
	height: number;
	cells: { char: string; fg: number; bg: number }[][];
	setCell: (x: number, y: number, char: string, fg: number, bg: number) => void;
}

interface AppState {
	world: World;
	fields: FormField[];
	focusIndex: number;
	buffer: CellBufferDirect;
	width: number;
	height: number;
	running: boolean;
	submitted: boolean;
	submittedValues: Record<string, string> | null;
	step: number;
	blinkOn: boolean;
}

// =============================================================================
// FORM DEFINITION
// =============================================================================

function createFormFields(): FormField[] {
	return [
		{ type: 'text', label: 'Full Name', name: 'name', value: '', required: true, cursorPos: 0 },
		{ type: 'text', label: 'Email', name: 'email', value: '', required: true, cursorPos: 0 },
		{
			type: 'select',
			label: 'Role',
			name: 'role',
			value: 'Developer',
			options: ['Developer', 'Designer', 'Manager', 'QA Engineer', 'DevOps'],
		},
		{
			type: 'radio',
			label: 'Experience Level',
			name: 'experience',
			value: 'Mid',
			options: ['Junior', 'Mid', 'Senior', 'Lead'],
		},
		{
			type: 'slider',
			label: 'Team Size Preference',
			name: 'teamSize',
			value: '5',
			min: 1,
			max: 20,
		},
		{
			type: 'checkbox',
			label: 'Skills',
			name: 'skills',
			value: '',
			options: ['TypeScript', 'Rust', 'Go', 'Python'],
		},
		{
			type: 'checkbox',
			label: 'Notifications',
			name: 'notifications',
			value: 'Email',
			options: ['Email', 'Slack', 'SMS'],
		},
		{ type: 'button', label: 'Submit', name: 'submit', value: '' },
	];
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateForm(fields: FormField[]): boolean {
	let valid = true;
	for (const field of fields) {
		field.error = undefined;

		if (field.required && !field.value.trim()) {
			field.error = `${field.label} is required`;
			valid = false;
		}

		if (field.name === 'email' && field.value && !field.value.includes('@')) {
			field.error = 'Invalid email address';
			valid = false;
		}

		if (field.name === 'name' && field.value && field.value.length < 2) {
			field.error = 'Name must be at least 2 characters';
			valid = false;
		}
	}
	return valid;
}

// =============================================================================
// INPUT HANDLING
// =============================================================================

function handleInput(state: AppState, key: string): void {
	const field = state.fields[state.focusIndex];
	if (!field) return;

	// Global keys
	if (key === '\t') {
		state.focusIndex = (state.focusIndex + 1) % state.fields.length;
		return;
	}
	if (key === '\x1b[Z') {
		// Shift+Tab
		state.focusIndex = (state.focusIndex - 1 + state.fields.length) % state.fields.length;
		return;
	}

	if (field.type === 'text') {
		handleTextInput(field, key);
	} else if (field.type === 'checkbox') {
		handleCheckboxInput(field, key);
	} else if (field.type === 'radio') {
		handleRadioInput(field, key);
	} else if (field.type === 'select') {
		handleSelectInput(field, key);
	} else if (field.type === 'slider') {
		handleSliderInput(field, key);
	} else if (field.type === 'button') {
		if (key === '\r' || key === ' ') {
			submitForm(state);
		}
	}
}

function handleTextInput(field: FormField, key: string): void {
	const cursor = field.cursorPos ?? 0;
	if (key === '\x7f') {
		if (cursor > 0) {
			field.value = field.value.slice(0, cursor - 1) + field.value.slice(cursor);
			field.cursorPos = cursor - 1;
		}
	} else if (key === '\x1b[D') {
		field.cursorPos = Math.max(0, cursor - 1);
	} else if (key === '\x1b[C') {
		field.cursorPos = Math.min(field.value.length, cursor + 1);
	} else if (key.length === 1 && key >= ' ') {
		field.value = field.value.slice(0, cursor) + key + field.value.slice(cursor);
		field.cursorPos = cursor + 1;
	}
}

function handleCheckboxInput(field: FormField, key: string): void {
	if (key !== ' ' && key !== '\r') return;
	if (!field.options) return;

	// Cycle through which option to toggle based on a sub-index
	const selected = new Set(field.value ? field.value.split(',') : []);
	// Simple: toggle first unselected, or clear all if all selected
	for (const opt of field.options) {
		if (!selected.has(opt)) {
			selected.add(opt);
			field.value = [...selected].join(',');
			return;
		}
	}
	// All selected, clear
	field.value = '';
}

function handleRadioInput(field: FormField, key: string): void {
	if (!field.options) return;
	const idx = field.options.indexOf(field.value);
	if (key === '\x1b[C' || key === '\x1b[B' || key === ' ') {
		field.value = field.options[(idx + 1) % field.options.length] ?? field.options[0] ?? '';
	} else if (key === '\x1b[D' || key === '\x1b[A') {
		field.value = field.options[(idx - 1 + field.options.length) % field.options.length] ?? field.options[0] ?? '';
	}
}

function handleSelectInput(field: FormField, key: string): void {
	if (!field.options) return;
	const idx = field.options.indexOf(field.value);
	if (key === '\x1b[B' || key === '\x1b[C') {
		field.value = field.options[(idx + 1) % field.options.length] ?? field.options[0] ?? '';
	} else if (key === '\x1b[A' || key === '\x1b[D') {
		field.value = field.options[(idx - 1 + field.options.length) % field.options.length] ?? field.options[0] ?? '';
	}
}

function handleSliderInput(field: FormField, key: string): void {
	const val = Number.parseInt(field.value, 10) || 0;
	const min = field.min ?? 0;
	const max = field.max ?? 100;
	if (key === '\x1b[C' || key === '\x1b[A') {
		field.value = String(Math.min(max, val + 1));
	} else if (key === '\x1b[D' || key === '\x1b[B') {
		field.value = String(Math.max(min, val - 1));
	}
}

function submitForm(state: AppState): void {
	if (validateForm(state.fields)) {
		state.submitted = true;
		state.submittedValues = {};
		for (const field of state.fields) {
			if (field.type !== 'button') {
				state.submittedValues[field.name] = field.value;
			}
		}
	}
}

// =============================================================================
// RENDERING
// =============================================================================

function renderForm(state: AppState): void {
	const { buffer, width, height, fields, focusIndex, submitted, submittedValues, blinkOn } = state;

	fillRect(buffer, 0, 0, width, height, ' ', FG, BG);

	// Header
	const title = '  Interactive Form Builder  ';
	const titleX = Math.floor((width - title.length) / 2);
	drawText(buffer, titleX, 1, title, HEADER_FG, BG);
	drawText(buffer, 2, 2, '\u2500'.repeat(width - 4), BORDER_FG, BG);

	if (submitted && submittedValues) {
		renderSuccess(state);
		return;
	}

	let y = 4;
	for (let i = 0; i < fields.length; i++) {
		const field = fields[i];
		if (!field) continue;
		const isFocused = i === focusIndex;

		if (field.type === 'text') {
			y = renderTextField(buffer, y, field, isFocused, width, blinkOn);
		} else if (field.type === 'checkbox') {
			y = renderCheckboxField(buffer, y, field, isFocused, width);
		} else if (field.type === 'radio') {
			y = renderRadioField(buffer, y, field, isFocused, width);
		} else if (field.type === 'select') {
			y = renderSelectField(buffer, y, field, isFocused, width);
		} else if (field.type === 'slider') {
			y = renderSliderField(buffer, y, field, isFocused, width);
		} else if (field.type === 'button') {
			y = renderButton(buffer, y, field, isFocused, width);
		}

		if (field.error) {
			drawText(buffer, 4, y, `! ${field.error}`, ERROR_FG, BG);
			y++;
		}
		y++;
	}
}

function drawText(
	buffer: CellBufferDirect,
	x: number,
	y: number,
	text: string,
	fg: number,
	bg: number,
): void {
	for (let i = 0; i < text.length; i++) {
		if (x + i >= buffer.width) break;
		buffer.setCell(x + i, y, text[i] ?? ' ', fg, bg);
	}
}

function renderTextField(
	buffer: CellBufferDirect,
	y: number,
	field: FormField,
	focused: boolean,
	width: number,
	blinkOn: boolean,
): number {
	const labelFg = focused ? FOCUS_BG : LABEL_FG;
	drawText(buffer, 4, y, field.label + (field.required ? ' *' : ''), labelFg, BG);
	y++;

	const inputW = Math.min(40, width - 8);
	fillRect(buffer, 4, y, inputW, 1, ' ', INPUT_FG, INPUT_BG);

	const display = field.value || (focused ? '' : 'Type here...');
	const fg = field.value ? INPUT_FG : BORDER_FG;
	drawText(buffer, 5, y, display.slice(0, inputW - 2), fg, INPUT_BG);

	if (focused && blinkOn) {
		const curX = 5 + (field.cursorPos ?? field.value.length);
		if (curX < 4 + inputW) {
			buffer.setCell(curX, y, '\u2588', FOCUS_BG, INPUT_BG);
		}
	}

	y++;
	return y;
}

function renderCheckboxField(
	buffer: CellBufferDirect,
	y: number,
	field: FormField,
	focused: boolean,
	_width: number,
): number {
	const labelFg = focused ? FOCUS_BG : LABEL_FG;
	drawText(buffer, 4, y, field.label, labelFg, BG);
	y++;

	const selected = new Set(field.value ? field.value.split(',') : []);
	for (const opt of field.options ?? []) {
		const checked = selected.has(opt);
		const icon = checked ? '[\u2713]' : '[ ]';
		const fg = checked ? CHECK_FG : FG;
		drawText(buffer, 6, y, `${icon} ${opt}`, fg, BG);
		y++;
	}

	if (focused) {
		drawText(buffer, 4, y, '(Space to toggle)', BORDER_FG, BG);
		y++;
	}

	return y;
}

function renderRadioField(
	buffer: CellBufferDirect,
	y: number,
	field: FormField,
	focused: boolean,
	_width: number,
): number {
	const labelFg = focused ? FOCUS_BG : LABEL_FG;
	drawText(buffer, 4, y, field.label, labelFg, BG);
	y++;

	for (const opt of field.options ?? []) {
		const isSelected = field.value === opt;
		const icon = isSelected ? '(\u25CF)' : '( )';
		const fg = isSelected ? RADIO_FG : FG;
		drawText(buffer, 6, y, `${icon} ${opt}`, fg, BG);
		y++;
	}

	if (focused) {
		drawText(buffer, 4, y, '(Arrows to select)', BORDER_FG, BG);
		y++;
	}

	return y;
}

function renderSelectField(
	buffer: CellBufferDirect,
	y: number,
	field: FormField,
	focused: boolean,
	width: number,
): number {
	const labelFg = focused ? FOCUS_BG : LABEL_FG;
	drawText(buffer, 4, y, field.label, labelFg, BG);
	y++;

	const inputW = Math.min(30, width - 8);
	fillRect(buffer, 4, y, inputW, 1, ' ', INPUT_FG, INPUT_BG);

	const arrow = focused ? ' \u25C4 \u25BA' : '';
	drawText(buffer, 5, y, `${field.value}${arrow}`, SELECT_FG, INPUT_BG);
	y++;

	return y;
}

function renderSliderField(
	buffer: CellBufferDirect,
	y: number,
	field: FormField,
	focused: boolean,
	width: number,
): number {
	const labelFg = focused ? FOCUS_BG : LABEL_FG;
	const val = Number.parseInt(field.value, 10) || 0;
	const min = field.min ?? 0;
	const max = field.max ?? 100;

	drawText(buffer, 4, y, `${field.label}: ${val}`, labelFg, BG);
	y++;

	const barW = Math.min(30, width - 8);
	const filled = Math.round(((val - min) / (max - min)) * barW);

	for (let x = 0; x < barW; x++) {
		const ch = x < filled ? '\u2588' : '\u2591';
		const fg = x < filled ? SLIDER_FG : SLIDER_BG;
		buffer.setCell(4 + x, y, ch, fg, BG);
	}

	drawText(buffer, 4 + barW + 1, y, `${min}`, BORDER_FG, BG);
	const maxStr = String(max);
	drawText(buffer, 4 + barW + 4, y, maxStr, BORDER_FG, BG);
	y++;

	return y;
}

function renderButton(
	buffer: CellBufferDirect,
	y: number,
	field: FormField,
	focused: boolean,
	_width: number,
): number {
	y++;
	const text = ` ${field.label} `;
	const fg = focused ? BUTTON_FG : FG;
	const bg = focused ? BUTTON_BG : BORDER_FG;

	const x = 4;
	for (let i = 0; i < text.length; i++) {
		buffer.setCell(x + i, y, text[i] ?? ' ', fg, bg);
	}
	y++;

	return y;
}

function renderSuccess(state: AppState): void {
	const { buffer, width, submittedValues } = state;
	if (!submittedValues) return;

	let y = 5;
	drawText(buffer, 4, y, '\u2713 Form submitted successfully!', SUCCESS_FG, BG);
	y += 2;

	drawText(buffer, 4, y, 'Submitted Values:', HEADER_FG, BG);
	y++;
	drawText(buffer, 4, y, '\u2500'.repeat(30), BORDER_FG, BG);
	y++;

	for (const [key, value] of Object.entries(submittedValues)) {
		drawText(buffer, 6, y, `${key}: `, LABEL_FG, BG);
		drawText(buffer, 6 + key.length + 2, y, value || '(empty)', FG, BG);
		y++;
	}

	y += 2;
	drawText(buffer, 4, y, 'Press Q to exit or R to reset', BORDER_FG, BG);
}

// =============================================================================
// OUTPUT
// =============================================================================

function bufferToAnsi(buffer: CellBufferDirect): string {
	let output = '\x1b[H';
	let lastFg = -1;
	let lastBg = -1;

	for (let y = 0; y < buffer.height; y++) {
		const row = buffer.cells[y];
		if (!row) continue;
		for (let x = 0; x < buffer.width; x++) {
			const cell = row[x];
			if (!cell) continue;
			if (cell.fg !== lastFg || cell.bg !== lastBg) {
				const fR = (cell.fg >> 24) & 0xff;
				const fG = (cell.fg >> 16) & 0xff;
				const fB = (cell.fg >> 8) & 0xff;
				const bR = (cell.bg >> 24) & 0xff;
				const bG = (cell.bg >> 16) & 0xff;
				const bB = (cell.bg >> 8) & 0xff;
				output += `\x1b[38;2;${fR};${fG};${fB};48;2;${bR};${bG};${bB}m`;
				lastFg = cell.fg;
				lastBg = cell.bg;
			}
			output += cell.char;
		}
		if (y < buffer.height - 1) output += '\n';
	}
	return output;
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
	const stdout = process.stdout;
	const stdin = process.stdin;
	const width = stdout.columns ?? 80;
	const height = stdout.rows ?? 24;

	const world = createWorld();

	const state: AppState = {
		world,
		fields: createFormFields(),
		focusIndex: 0,
		buffer: createCellBuffer(width, height) as CellBufferDirect,
		width,
		height,
		running: true,
		submitted: false,
		submittedValues: null,
		step: 0,
		blinkOn: true,
	};

	// Terminal setup
	stdout.write('\x1b[?1049h');
	stdout.write('\x1b[?25l');
	stdin.setRawMode?.(true);
	stdin.resume();

	// Input
	stdin.on('data', (data: Buffer) => {
		const key = data.toString();

		if (key === 'q' || key === 'Q' || key === '\x03') {
			state.running = false;
			return;
		}

		if (state.submitted && (key === 'r' || key === 'R')) {
			state.submitted = false;
			state.submittedValues = null;
			state.fields = createFormFields();
			state.focusIndex = 0;
			return;
		}

		if (!state.submitted) {
			handleInput(state, key);
		}
	});

	const cleanup = (): void => {
		stdout.write('\x1b[?25h');
		stdout.write('\x1b[?1049l');
		stdout.write('\x1b[0m');
		process.exit(0);
	};

	process.on('SIGINT', cleanup);
	process.on('SIGTERM', cleanup);

	let blinkCounter = 0;
	const loop = (): void => {
		if (!state.running) {
			cleanup();
			return;
		}

		blinkCounter++;
		if (blinkCounter % 8 === 0) {
			state.blinkOn = !state.blinkOn;
		}

		renderForm(state);
		stdout.write(bufferToAnsi(state.buffer));
		setTimeout(loop, FRAME_TIME);
	};

	loop();
}

main();
