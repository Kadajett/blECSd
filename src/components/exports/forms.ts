/**
 * Form control components (button, checkbox, radioButton, select, slider, form)
 * @module components/exports/forms
 */

// Button component
export type { ButtonEvent, ButtonState, ButtonStore } from '../button';
export {
	attachButtonBehavior,
	BUTTON_STATE_MACHINE_CONFIG,
	buttonStore,
	clearButtonCallbacks,
	disableButton,
	enableButton,
	getButtonState,
	handleButtonKeyPress,
	isButton,
	isButtonDisabled,
	isButtonFocused,
	isButtonHovered,
	isButtonInState,
	isButtonPressed,
	onButtonPress,
	pressButton,
	resetButtonStore,
	sendButtonEvent,
} from '../button';

// Checkbox component
export type {
	CheckboxDisplay,
	CheckboxDisplayOptions,
	CheckboxEvent,
	CheckboxState,
	CheckboxStore,
} from '../checkbox';
export {
	attachCheckboxBehavior,
	CHECKBOX_STATE_MACHINE_CONFIG,
	checkboxStore,
	checkCheckbox,
	clearCheckboxCallbacks,
	clearCheckboxDisplay,
	DEFAULT_CHECKED_CHAR,
	DEFAULT_UNCHECKED_CHAR,
	disableCheckbox,
	enableCheckbox,
	getCheckboxChar,
	getCheckboxDisplay,
	getCheckboxState,
	handleCheckboxKeyPress,
	isCheckbox,
	isCheckboxDisabled,
	isCheckboxInState,
	isChecked,
	isUnchecked,
	onCheckboxChange,
	resetCheckboxStore,
	sendCheckboxEvent,
	setCheckboxDisplay,
	setChecked,
	toggleCheckbox,
	uncheckCheckbox,
} from '../checkbox';

// Form component
export type {
	FormFieldValue,
	FormResetCallback,
	FormStore,
	FormSubmitCallback,
	FormValues,
} from '../form';
export {
	attachFormBehavior,
	autoRegisterFields,
	clearFormCallbacks,
	focusNextField,
	focusPrevField,
	formStore,
	getFieldName,
	getFieldValue,
	getFormFields,
	getFormTabOrder,
	getFormValues,
	handleFormKeyPress,
	isForm,
	isFormKeysEnabled,
	isFormSubmitOnEnter,
	onFormReset,
	onFormSubmit,
	registerFormField,
	resetForm,
	resetFormStore,
	setFieldValue,
	submitForm,
	unregisterFormField,
} from '../form';

// RadioButton component
export type {
	RadioButtonDisplay,
	RadioButtonDisplayOptions,
	RadioButtonEvent,
	RadioButtonState,
	RadioButtonStore,
	RadioSelectCallback,
	RadioSetStore,
} from '../radioButton';
export {
	attachRadioButtonBehavior,
	attachRadioSetBehavior,
	clearRadioButtonDisplay,
	clearRadioSetCallbacks,
	DEFAULT_RADIO_SELECTED_CHAR,
	DEFAULT_RADIO_UNSELECTED_CHAR,
	deselectRadioButton,
	disableRadioButton,
	enableRadioButton,
	getRadioButtonChar,
	getRadioButtonDisplay,
	getRadioButtonState,
	getRadioButtonsInSet,
	getRadioSet,
	getRadioValue,
	getSelectedButton,
	getSelectedValue,
	handleRadioButtonKeyPress,
	isRadioButton,
	isRadioButtonDisabled,
	isRadioButtonInState,
	isRadioSelected,
	isRadioSet,
	onRadioSelect,
	RADIO_BUTTON_STATE_MACHINE_CONFIG,
	radioButtonStore,
	radioSetStore,
	resetRadioButtonStore,
	selectRadioButton,
	selectRadioByValue,
	sendRadioButtonEvent,
	setRadioButtonDisplay,
	setRadioSet,
	setRadioValue,
} from '../radioButton';

// Select component
export type {
	SelectCallback,
	SelectDisplay,
	SelectDisplayOptions,
	SelectEvent,
	SelectOption,
	SelectState,
	SelectStore,
} from '../select';
export {
	DEFAULT_CLOSED_INDICATOR,
	DEFAULT_OPEN_INDICATOR,
	DEFAULT_SELECTED_MARK,
	DEFAULT_SEPARATOR,
	SELECT_STATE_MACHINE_CONFIG,
	selectStore,
} from '../select';

// Slider component
export type {
	SliderChangeCallback,
	SliderDisplay,
	SliderDisplayOptions,
	SliderEvent,
	SliderOrientationType,
	SliderState,
	SliderStore,
} from '../slider';
export {
	DEFAULT_FILL_BG as DEFAULT_SLIDER_FILL_BG,
	DEFAULT_FILL_CHAR as DEFAULT_SLIDER_FILL_CHAR,
	DEFAULT_FILL_CHAR_VERTICAL as DEFAULT_SLIDER_FILL_CHAR_VERTICAL,
	DEFAULT_FILL_FG as DEFAULT_SLIDER_FILL_FG,
	DEFAULT_THUMB_BG,
	DEFAULT_THUMB_CHAR,
	DEFAULT_THUMB_FG,
	DEFAULT_TRACK_BG,
	DEFAULT_TRACK_CHAR,
	DEFAULT_TRACK_CHAR_VERTICAL,
	DEFAULT_TRACK_FG,
	SLIDER_STATE_MACHINE_CONFIG,
	SliderOrientation,
	sliderStore,
} from '../slider';
