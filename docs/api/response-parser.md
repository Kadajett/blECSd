# Terminal Response Parser

The response parser module provides utilities for parsing responses from terminal queries. When you send query sequences to the terminal (like requesting cursor position or device attributes), the terminal responds with escape sequences that this module can parse into structured data.

## Overview

Terminal queries follow a request-response pattern:
1. Send a query sequence (e.g., `ESC [ 6 n` for cursor position)
2. Terminal responds with data (e.g., `ESC [ 10 ; 20 R` for row 10, column 20)
3. Parse the response to extract the data

## Functions

### parseResponse

Parses a terminal response string into a structured object.

```typescript
function parseResponse(response: string): TerminalResponse
```

**Parameters:**
- `response` - Raw response string from terminal

**Returns:** Parsed response object (see Response Types below)

**Example:**
```typescript
import { parseResponse, isCursorPosition, ResponseType } from 'blecsd/terminal';

const response = '\x1b[10;20R';
const parsed = parseResponse(response);

if (parsed.type === ResponseType.CURSOR_POSITION) {
  console.log(`Row: ${parsed.row}, Column: ${parsed.column}`);
}

// Or using type guard
if (isCursorPosition(parsed)) {
  console.log(`Row: ${parsed.row}, Column: ${parsed.column}`);
}
```

## Query Generators

The `query` namespace provides functions to generate query sequences.

### query.cursorPosition

Request the current cursor position.

```typescript
function cursorPosition(): string  // Returns '\x1b[6n'
```

**Response:** `ESC [ Pr ; Pc R` where Pr is row, Pc is column

**Example:**
```typescript
import { query, parseResponse, isCursorPosition } from 'blecsd/terminal';

// Send query
process.stdout.write(query.cursorPosition());

// Parse response (you'd read this from stdin)
const response = '\x1b[10;20R';
const parsed = parseResponse(response);

if (isCursorPosition(parsed)) {
  console.log(`Cursor at (${parsed.row}, ${parsed.column})`);
}
```

### query.primaryDA

Request Primary Device Attributes (DA1).

```typescript
function primaryDA(): string  // Returns '\x1b[c'
```

**Response:** `ESC [ ? Pn ; ... c`

**Example:**
```typescript
import { query, parseResponse, isPrimaryDA } from 'blecsd/terminal';

process.stdout.write(query.primaryDA());
// Terminal responds with something like: \x1b[?62;1;2;6;7;8;9c

const parsed = parseResponse(response);
if (isPrimaryDA(parsed)) {
  console.log(`Device class: ${parsed.deviceClass}`);
  console.log(`Attributes: ${parsed.attributes.join(', ')}`);
}
```

### query.secondaryDA

Request Secondary Device Attributes (DA2).

```typescript
function secondaryDA(): string  // Returns '\x1b[>c'
```

**Response:** `ESC [ > Pn ; Pn ; Pn c`

**Example:**
```typescript
import { query, parseResponse, isSecondaryDA } from 'blecsd/terminal';

process.stdout.write(query.secondaryDA());
// xterm responds with: \x1b[>41;354;0c

const parsed = parseResponse(response);
if (isSecondaryDA(parsed)) {
  console.log(`Terminal type: ${parsed.terminalType}`);
  console.log(`Firmware version: ${parsed.firmwareVersion}`);
}
```

### query.deviceStatus

Request Device Status Report (DSR).

```typescript
function deviceStatus(): string  // Returns '\x1b[5n'
```

**Response:** `ESC [ 0 n` (OK) or `ESC [ 3 n` (error)

### query.windowState

Request window state (iconified or normal).

```typescript
function windowState(): string  // Returns '\x1b[11t'
```

**Response:** `ESC [ 1 t` (open) or `ESC [ 2 t` (iconified)

### query.windowPosition

Request window position in pixels.

```typescript
function windowPosition(): string  // Returns '\x1b[13t'
```

**Response:** `ESC [ 3 ; x ; y t`

### query.windowSizePixels

Request window size in pixels.

```typescript
function windowSizePixels(): string  // Returns '\x1b[14t'
```

**Response:** `ESC [ 4 ; height ; width t`

### query.textAreaSize

Request text area size in characters.

```typescript
function textAreaSize(): string  // Returns '\x1b[18t'
```

**Response:** `ESC [ 8 ; rows ; columns t`

### query.screenSize

Request screen size in characters.

```typescript
function screenSize(): string  // Returns '\x1b[19t'
```

**Response:** `ESC [ 9 ; rows ; columns t`

### query.charCellSize

Request character cell size in pixels.

```typescript
function charCellSize(): string  // Returns '\x1b[16t'
```

**Response:** `ESC [ 6 ; height ; width t`

### query.windowTitle

Request window title.

```typescript
function windowTitle(): string  // Returns '\x1b[21t'
```

**Response:** `OSC L ; title ST`

### query.iconLabel

Request icon label.

```typescript
function iconLabel(): string  // Returns '\x1b[20t'
```

**Response:** `OSC l ; label ST`

### query.enableLocator

Enable DEC Locator reporting.

```typescript
function enableLocator(mode?: 0 | 1 | 2): string
```

**Parameters:**
- `mode` - 0=disabled, 1=one-shot (default), 2=continuous

### query.locatorPosition

Request DEC Locator position.

```typescript
function locatorPosition(): string  // Returns '\x1b[\'|'
```

**Response:** `ESC [ Pe ; Pb ; Pr ; Pc ; Pp & w`

## Type Guards

Type guards for checking response types:

```typescript
isPrimaryDA(response): response is PrimaryDAResponse
isSecondaryDA(response): response is SecondaryDAResponse
isCursorPosition(response): response is CursorPositionResponse
isDeviceStatus(response): response is DeviceStatusResponse
isWindowTitle(response): response is WindowTitleResponse
isIconLabel(response): response is IconLabelResponse
isWindowState(response): response is WindowStateResponse
isWindowPosition(response): response is WindowPositionResponse
isWindowSizePixels(response): response is WindowSizePixelsResponse
isTextAreaSize(response): response is TextAreaSizeResponse
isScreenSize(response): response is ScreenSizeResponse
isCharCellSize(response): response is CharCellSizeResponse
isLocatorPosition(response): response is LocatorPositionResponse
isUnknown(response): response is UnknownResponse
```

**Example:**
```typescript
import { parseResponse, isCursorPosition, isDeviceStatus } from 'blecsd/terminal';

const parsed = parseResponse(response);

if (isCursorPosition(parsed)) {
  // TypeScript knows parsed has row and column properties
  console.log(parsed.row, parsed.column);
} else if (isDeviceStatus(parsed)) {
  // TypeScript knows parsed has status and ok properties
  console.log(parsed.ok ? 'OK' : 'Error');
}
```

## Response Types

### CursorPositionResponse

```typescript
interface CursorPositionResponse {
  type: 'cursor_position';
  raw: string;
  row: number;     // 1-based
  column: number;  // 1-based
}
```

### PrimaryDAResponse

```typescript
interface PrimaryDAResponse {
  type: 'primary_da';
  raw: string;
  deviceClass: number;    // e.g., 1 for VT100, 62 for VT220
  attributes: number[];   // Supported attribute codes
}
```

### SecondaryDAResponse

```typescript
interface SecondaryDAResponse {
  type: 'secondary_da';
  raw: string;
  terminalType: number;
  firmwareVersion: number;
  romCartridge: number;
}
```

### DeviceStatusResponse

```typescript
interface DeviceStatusResponse {
  type: 'device_status';
  raw: string;
  status: number;  // 0 = OK, 3 = Error
  ok: boolean;
}
```

### WindowTitleResponse

```typescript
interface WindowTitleResponse {
  type: 'window_title';
  raw: string;
  title: string;
}
```

### WindowStateResponse

```typescript
interface WindowStateResponse {
  type: 'window_state';
  raw: string;
  state: number;      // 1 = open, 2 = iconified
  iconified: boolean;
}
```

### WindowPositionResponse

```typescript
interface WindowPositionResponse {
  type: 'window_position';
  raw: string;
  x: number;  // pixels
  y: number;  // pixels
}
```

### WindowSizePixelsResponse

```typescript
interface WindowSizePixelsResponse {
  type: 'window_size_pixels';
  raw: string;
  width: number;   // pixels
  height: number;  // pixels
}
```

### TextAreaSizeResponse

```typescript
interface TextAreaSizeResponse {
  type: 'text_area_size';
  raw: string;
  columns: number;  // characters
  rows: number;     // characters
}
```

### ScreenSizeResponse

```typescript
interface ScreenSizeResponse {
  type: 'screen_size';
  raw: string;
  columns: number;
  rows: number;
}
```

### UnknownResponse

```typescript
interface UnknownResponse {
  type: 'unknown';
  raw: string;
}
```

## Constants

### ResponseType

Enum-like object with all response type identifiers:

```typescript
const ResponseType = {
  PRIMARY_DA: 'primary_da',
  SECONDARY_DA: 'secondary_da',
  TERTIARY_DA: 'tertiary_da',
  CURSOR_POSITION: 'cursor_position',
  DEVICE_STATUS: 'device_status',
  WINDOW_TITLE: 'window_title',
  ICON_LABEL: 'icon_label',
  WINDOW_STATE: 'window_state',
  WINDOW_POSITION: 'window_position',
  WINDOW_SIZE_PIXELS: 'window_size_pixels',
  TEXT_AREA_SIZE: 'text_area_size',
  SCREEN_SIZE: 'screen_size',
  CHAR_CELL_SIZE: 'char_cell_size',
  LOCATOR_POSITION: 'locator_position',
  UNKNOWN: 'unknown',
} as const;
```

## Schemas

### CursorPositionSchema

Zod schema for validating cursor position responses:

```typescript
import { CursorPositionSchema } from 'blecsd/terminal';

const result = CursorPositionSchema.safeParse(data);
if (result.success) {
  console.log(result.data.row, result.data.column);
}
```

## Complete Example

```typescript
import {
  query,
  parseResponse,
  isCursorPosition,
  isPrimaryDA,
  tmux,
  isTmux,
} from 'blecsd/terminal';
import { createInterface } from 'readline';

async function getCursorPosition(): Promise<{ row: number; column: number }> {
  return new Promise((resolve, reject) => {
    // Set up stdin for raw input
    process.stdin.setRawMode(true);
    process.stdin.resume();

    let response = '';
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout waiting for cursor position'));
    }, 1000);

    const onData = (data: Buffer) => {
      response += data.toString();
      // Check if we have a complete response
      if (response.includes('R')) {
        cleanup();
        const parsed = parseResponse(response);
        if (isCursorPosition(parsed)) {
          resolve({ row: parsed.row, column: parsed.column });
        } else {
          reject(new Error('Unexpected response'));
        }
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    process.stdin.on('data', onData);

    // Send query (with tmux pass-through if needed)
    const querySeq = tmux.wrapIf(query.cursorPosition(), isTmux());
    process.stdout.write(querySeq);
  });
}

// Usage
const pos = await getCursorPosition();
console.log(`Cursor at row ${pos.row}, column ${pos.column}`);
```
