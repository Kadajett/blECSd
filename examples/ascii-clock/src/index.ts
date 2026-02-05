/**
 * ASCII Art Clock
 *
 * Demonstrates the BigText widget by rendering a live-updating clock
 * using bitmap fonts and a manual render loop.
 */

import {
	addEntity,
	cleanup as cleanupOutput,
	clearBuffer,
	clearScreen,
	createDoubleBuffer,
	createInputHandler,
	createScreenEntity,
	createWorld,
	type Entity,
	enterAlternateScreen,
	getContent,
	getOutputBuffer,
	getStyle,
	hexToColor,
	hideCursor,
	outputSystem,
	setDimensions,
	setOutputBuffer,
	setOutputStream,
	setRenderBuffer,
	setupSigwinchHandler,
	triggerResize,
	type World,
	writeString,
} from 'blecsd';
import { createBigText, type FontDefinition } from 'blecsd/widgets';
import { loadFont } from 'blecsd/widgets/fonts';

interface ClockOptions {
	showSeconds: boolean;
	showMillis: boolean;
	show24Hour: boolean;
	showDate: boolean;
	skinny: boolean;
	fillChar: string;
	fg: string;
	dateFg: string;
	dateFormat: string;
}

const DEFAULT_OPTIONS: ClockOptions = {
	showSeconds: false,
	showMillis: true,
	show24Hour: true,
	showDate: false,
	skinny: false,
	fillChar: '█',
	fg: '#36c7ff',
	dateFg: '#9aa0a6',
	dateFormat: 'YYYY-MM-DD',
};

const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 40;

const monthNames = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad2 = (value: number): string => value.toString().padStart(2, '0');
const pad3 = (value: number): string => value.toString().padStart(3, '0');

const sanitizeGlyphChar = (value: string, fallback: string): string => {
	const trimmed = value.trim();
	if (!trimmed) return fallback;
	const [first] = [...trimmed];
	return first ?? fallback;
};

const showHelp = (): never => {
	process.stdout.write(`ASCII Clock\n\n`);
	process.stdout.write(`Options:\n`);
	process.stdout.write(`  --seconds         Show seconds\n`);
	process.stdout.write(`  --millis          Show milliseconds\n`);
	process.stdout.write(`  --date            Show date\n`);
	process.stdout.write(`  --12hour          Use 12-hour format\n`);
	process.stdout.write(`  --skinny          Use skinny font\n`);
	process.stdout.write(`  --fill=<char>     Glyph fill character\n`);
	process.stdout.write(`  --fg=<hex>        Time color (e.g. #36c7ff)\n`);
	process.stdout.write(`  --date-fg=<hex>   Date color\n`);
	process.stdout.write(`  --date-format=... Date format tokens (YYYY, MM, DD, MMM, ddd)\n`);
	process.exit(0);
};

const parseArgs = (args: readonly string[]): ClockOptions => {
	const options = { ...DEFAULT_OPTIONS };
	const handlers: Record<string, (value: string) => void> = {
		'--seconds': () => {
			options.showSeconds = true;
		},
		'--millis': () => {
			options.showMillis = true;
			options.showSeconds = true;
		},
		'--date': () => {
			options.showDate = true;
		},
		'--12hour': () => {
			options.show24Hour = false;
		},
		'--skinny': () => {
			options.skinny = true;
		},
		'--help': () => showHelp(),
		'-h': () => showHelp(),
	};
	const prefixes: Array<[string, (value: string) => void]> = [
		[
			'--fill=',
			(value) => {
				options.fillChar = sanitizeGlyphChar(value, options.fillChar);
			},
		],
		[
			'--fg=',
			(value) => {
				options.fg = value || options.fg;
			},
		],
		[
			'--date-fg=',
			(value) => {
				options.dateFg = value || options.dateFg;
			},
		],
		[
			'--date-format=',
			(value) => {
				options.dateFormat = value || options.dateFormat;
			},
		],
	];

	for (const arg of args) {
		const handler = handlers[arg];
		if (handler) {
			handler(arg);
			continue;
		}
		for (const [prefix, applyValue] of prefixes) {
			if (!arg.startsWith(prefix)) continue;
			applyValue(arg.slice(prefix.length));
			break;
		}
	}

	return options;
};

const formatTime = (date: Date, showColon: boolean, options: ClockOptions): string => {
	let hours = date.getHours();
	if (!options.show24Hour) {
		hours = hours % 12 || 12;
	}

	const hoursStr = pad2(hours);
	const minutes = pad2(date.getMinutes());
	const seconds = pad2(date.getSeconds());
	const millis = pad3(date.getMilliseconds());
	const colon = showColon ? ':' : ' ';
	const showSeconds = options.showSeconds || options.showMillis;

	if (showSeconds) {
		const base = `${hoursStr}${colon}${minutes}${colon}${seconds}`;
		if (options.showMillis) {
			return `${base}.${millis}`;
		}
		return base;
	}

	return `${hoursStr}${colon}${minutes}`;
};

const formatDate = (date: Date, pattern: string): string => {
	const tokens: Record<string, string> = {
		YYYY: date.getFullYear().toString(),
		MM: pad2(date.getMonth() + 1),
		DD: pad2(date.getDate()),
		MMM: monthNames[date.getMonth()] ?? '',
		ddd: dayNames[date.getDay()] ?? '',
	};

	return pattern.replace(/YYYY|MMM|MM|DD|ddd/g, (token) => tokens[token] ?? token);
};

const measureBigText = (text: string, font: FontDefinition): { width: number; height: number } => {
	const lines = text.split('\n');
	const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
	return {
		width: Math.max(1, maxLineLength * font.charWidth),
		height: Math.max(1, lines.length * font.charHeight),
	};
};

const options = parseArgs(process.argv.slice(2));

const world = createWorld() as World;

const initialWidth = Math.max(40, process.stdout.columns ?? DEFAULT_WIDTH);
const initialHeight = Math.max(15, process.stdout.rows ?? DEFAULT_HEIGHT);

createScreenEntity(world, { width: initialWidth, height: initialHeight });

let doubleBuffer = createDoubleBuffer(initialWidth, initialHeight);
setRenderBuffer(doubleBuffer);
setOutputBuffer(doubleBuffer);
setOutputStream(process.stdout);

enterAlternateScreen();
hideCursor();
clearScreen();

const font = loadFont(options.skinny ? 'terminus-14-normal' : 'terminus-14-bold');
const timeEntity = addEntity(world) as Entity;

// BigText pre-renders the clock string into bitmap glyphs stored as Content.
const timeWidget = createBigText(world, timeEntity, {
	text: '00:00',
	font,
	fg: options.fg,
	shrink: false,
});

let timeText = '';
let dateText = '';
let timeWidth = 0;
let timeHeight = 0;
let timeLeft = 0;
let timeTop = 0;
let dateLeft = 0;
let dateTop = 0;

const updateLayout = (): void => {
	const bufferWidth = doubleBuffer.width;
	const bufferHeight = doubleBuffer.height;

	const size = measureBigText(timeText, font);
	timeWidth = size.width;
	timeHeight = size.height;

	const dateHeight = options.showDate ? 1 : 0;
	const gap = options.showDate ? 1 : 0;
	const totalHeight = timeHeight + dateHeight + gap;

	timeLeft = Math.max(0, Math.floor((bufferWidth - timeWidth) / 2));
	timeTop = Math.max(0, Math.floor((bufferHeight - totalHeight) / 2));
	dateLeft = Math.max(0, Math.floor((bufferWidth - dateText.length) / 2));
	dateTop = timeTop + timeHeight + gap;

	setDimensions(world, timeWidget.eid, timeWidth, timeHeight);
	timeWidget.setPosition(timeLeft, timeTop);
};

const updateClock = (): void => {
	const now = new Date();
	const showColon = now.getSeconds() % 2 === 0;
	const nextTime = formatTime(now, showColon, options);
	const nextDate = options.showDate ? formatDate(now, options.dateFormat) : '';
	const layoutChanged = nextTime !== timeText || nextDate !== dateText;

	if (nextTime !== timeText) {
		timeText = nextTime;
		timeWidget.setText(timeText);
	}

	if (nextDate !== dateText) {
		dateText = nextDate;
	}

	if (layoutChanged) {
		updateLayout();
	}
};

const renderClock = (): void => {
	const buffer = doubleBuffer.backBuffer;
	clearBuffer(buffer);

	const content = getContent(world, timeWidget.eid);
	if (content) {
		const style = getStyle(world, timeWidget.eid);
		const fg = style?.fg ?? hexToColor(options.fg);
		const bg = style?.bg ?? 0x000000ff;
		const fillChar = options.fillChar;
		const lines = content.split('\n');

		for (let row = 0; row < lines.length; row += 1) {
			const rawLine = lines[row] ?? '';
			const line = fillChar === '█' ? rawLine : rawLine.replaceAll('█', fillChar);
			writeString(buffer, timeLeft, timeTop + row, line, fg, bg);
		}
	}

	if (options.showDate && dateText) {
		const dateFg = hexToColor(options.dateFg);
		writeString(buffer, dateLeft, dateTop, dateText, dateFg, 0x000000ff);
	}
};

const handleResize = (): void => {
	const cols = process.stdout.columns ?? DEFAULT_WIDTH;
	const rows = process.stdout.rows ?? DEFAULT_HEIGHT;
	triggerResize(world, cols, rows);

	const resized = getOutputBuffer();
	if (resized) {
		doubleBuffer = resized;
		setRenderBuffer(doubleBuffer);
	}

	updateLayout();
};

const resizeCleanup = setupSigwinchHandler(world);
process.stdout.on('resize', handleResize);

const input = createInputHandler(process.stdin);
if (process.stdin.isTTY) {
	process.stdin.setRawMode(true);
}
process.stdin.resume();

input.onKey((event) => {
	if (event.name === 'q' || event.name === 'escape' || (event.name === 'c' && event.ctrl)) {
		cleanup();
		return;
	}

	if (event.name === 's') {
		options.showSeconds = !options.showSeconds;
		updateClock();
		return;
	}

	if (event.name === 'd') {
		options.showDate = !options.showDate;
		updateClock();
		return;
	}
});

input.start();

updateClock();

const FRAME_MS = 1000 / 30;
const frameInterval = setInterval(() => {
	updateClock();
	renderClock();
	doubleBuffer.fullRedraw = true;
	outputSystem(world);
}, FRAME_MS);

function cleanup(): void {
	clearInterval(frameInterval);
	input.stop();
	process.stdout.off('resize', handleResize);
	resizeCleanup();
	cleanupOutput();
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(false);
	}
	process.stdin.pause();
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
