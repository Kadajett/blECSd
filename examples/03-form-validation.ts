/**
 * Form with Validation Example
 *
 * This example demonstrates:
 * - Creating form controls (TextInput, Checkbox)
 * - Form validation
 * - Focus management
 * - Submit handling
 *
 * Run with: tsx examples/03-form-validation.ts
 */

import {
	addEntity,
	appendChild,
	createBox,
	createCheckbox,
	createPanel,
	createText,
	createTextInput,
	createWorld,
	enableInput,
	focusNext,
	focusPrev,
	getInputEventBus,
	render,
	setContent,
	setFocusable,
} from '../src/index';

// Create the ECS world
const world = createWorld();
enableInput(world);

// Create form panel
const formPanel = createPanel(world, {
	x: 5,
	y: 2,
	width: 60,
	height: 20,
	title: 'User Registration',
	border: { type: 'rounded' },
});

// Username field
const usernameLabel = addEntity(world);
appendChild(world, formPanel, usernameLabel);
createText(world, {
	entity: usernameLabel,
	x: 2,
	y: 2,
	content: 'Username:',
});

const usernameInput = addEntity(world);
appendChild(world, formPanel, usernameInput);
createTextInput(world, {
	entity: usernameInput,
	x: 13,
	y: 2,
	width: 30,
	placeholder: 'Enter username (min 3 chars)',
});
setFocusable(world, usernameInput, true);

// Email field
const emailLabel = addEntity(world);
appendChild(world, formPanel, emailLabel);
createText(world, {
	entity: emailLabel,
	x: 2,
	y: 5,
	content: 'Email:',
});

const emailInput = addEntity(world);
appendChild(world, formPanel, emailInput);
createTextInput(world, {
	entity: emailInput,
	x: 13,
	y: 5,
	width: 30,
	placeholder: 'user@example.com',
});
setFocusable(world, emailInput, true);

// Terms checkbox
const termsCheckbox = addEntity(world);
appendChild(world, formPanel, termsCheckbox);
createCheckbox(world, {
	entity: termsCheckbox,
	x: 2,
	y: 8,
	label: 'I agree to the terms and conditions',
	checked: false,
});
setFocusable(world, termsCheckbox, true);

// Validation message
const validationBox = createBox(world, {
	x: 2,
	y: 11,
	width: 54,
	height: 4,
	border: { type: 'single' },
});
appendChild(world, formPanel, validationBox);
setContent(world, validationBox, 'Fill out all fields and press Enter to submit');

// Instructions
const instructions = addEntity(world);
appendChild(world, formPanel, instructions);
createText(world, {
	entity: instructions,
	x: 2,
	y: 16,
	content: 'Tab: Next field | Shift+Tab: Previous field | Enter: Submit | q: Quit',
	align: 'center',
});

// Render initial frame
render(world);

// Validation logic
function validateForm(): { valid: boolean; message: string } {
	// Get form values (pseudo-code - actual implementation would use proper getters)
	import { getTextInputValue } from '../src/index';
	const username = getTextInputValue(world, usernameInput) || '';
	const email = getTextInputValue(world, emailInput) || '';

	// Username validation
	if (username.length < 3) {
		return { valid: false, message: 'Username must be at least 3 characters' };
	}

	// Email validation
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return { valid: false, message: 'Please enter a valid email address' };
	}

	// Terms validation
	import { getCheckboxValue } from '../src/index';
	const termsAccepted = getCheckboxValue(world, termsCheckbox);
	if (!termsAccepted) {
		return { valid: false, message: 'You must accept the terms and conditions' };
	}

	return { valid: true, message: 'Form submitted successfully!' };
}

// Handle input
const inputBus = getInputEventBus(world);
inputBus.on('key', (event) => {
	if (event.name === 'q') {
		process.exit(0);
	}

	if (event.name === 'tab') {
		if (event.shift) {
			focusPrev(world);
		} else {
			focusNext(world);
		}
		render(world);
	}

	if (event.name === 'return') {
		// Validate and submit form
		const result = validateForm();
		setContent(world, validationBox, result.message);
		render(world);

		if (result.valid) {
			setTimeout(() => {
				console.log('\nForm submitted successfully!');
				process.exit(0);
			}, 1000);
		}
	}
});

console.log('\nForm Validation Example');
console.log('Fill out the form and press Enter to submit\n');
