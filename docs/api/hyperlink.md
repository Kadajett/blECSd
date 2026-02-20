# Hyperlinks (OSC 8)

The `hyperlink` namespace provides functions for creating clickable links in terminal output using the OSC 8 escape sequence.

## Overview

Terminal hyperlinks allow you to display clickable URLs in terminal output where the visible text can be different from the actual URL. This is useful for:
- Credits screens with contributor links
- Help text with documentation links
- Error messages with file:// links to source code
- Log output with links to external resources

## Terminal Support

Hyperlinks are supported by many modern terminals:
- iTerm2
- GNOME Terminal 3.26+
- Konsole
- Windows Terminal
- Kitty
- Alacritty
- Hyper
- WezTerm
- VSCode integrated terminal

Terminals that don't support OSC 8 will simply display the text without a link.

## Quick Start

```typescript
import { hyperlink } from 'blecsd/terminal';

// Simple hyperlink
console.log(hyperlink.link('https://nodejs.org', 'Node.js'));

// Email link
console.log(hyperlink.mailto('support@example.com', 'Contact Support'));

// File link (for error output)
console.log(`Error at ${hyperlink.file('/src/app.ts', 'app.ts')}:42`);
```

## Functions

### hyperlink.link

Create a complete hyperlink with text.

```typescript
function link(url: string, text: string, options?: HyperlinkOptions): string
```

**Parameters:**
- `url` - The URL to link to
- `text` - The visible text for the link
- `options` - Optional `{ id?: string }` for multi-reference links

**Example:**
```typescript
import { hyperlink } from 'blecsd/terminal';

// Basic link
process.stdout.write(hyperlink.link('https://example.com', 'Click here'));

// Link with ID (for highlighting related links on hover)
process.stdout.write(hyperlink.link('https://docs.example.com', 'docs', { id: 'doc-link' }));
```

### hyperlink.start / hyperlink.end

Start and end a hyperlink region for multi-line or streamed content.

```typescript
function start(url: string, options?: HyperlinkOptions): string
function end(): string
```

**Example:**
```typescript
import { hyperlink } from 'blecsd/terminal';

// Multi-line link
process.stdout.write(hyperlink.start('https://example.com'));
process.stdout.write('This is a multi-line\n');
process.stdout.write('hyperlink that spans\n');
process.stdout.write('several lines.');
process.stdout.write(hyperlink.end());

// Multiple references with same ID (highlight together)
const url = 'https://docs.example.com';
process.stdout.write(`See ${hyperlink.start(url, { id: 'docs' })}[1]${hyperlink.end()}`);
process.stdout.write(' and ');
process.stdout.write(`${hyperlink.start(url, { id: 'docs' })}[2]${hyperlink.end()}\n`);
```

### hyperlink.safeLink

Create a hyperlink with URL validation. Only allows whitelisted protocols.

```typescript
function safeLink(url: string, text: string, options?: HyperlinkOptions): string
```

Returns just the text (no link) if the URL uses a blocked protocol.

**Example:**
```typescript
import { hyperlink } from 'blecsd/terminal';

// Safe - creates hyperlink
hyperlink.safeLink('https://example.com', 'Safe Link');

// Blocked - returns just 'Dangerous' (no link)
hyperlink.safeLink('javascript:alert(1)', 'Dangerous');
```

### hyperlink.mailto

Create a mailto: link.

```typescript
function mailto(email: string, text?: string, options?: HyperlinkOptions): string
```

**Parameters:**
- `email` - Email address
- `text` - Optional display text (defaults to the email address)
- `options` - Optional link options

**Example:**
```typescript
import { hyperlink } from 'blecsd/terminal';

// Email as text
process.stdout.write(hyperlink.mailto('user@example.com'));
// Output: user@example.com (clickable)

// Custom text
process.stdout.write(hyperlink.mailto('support@company.com', 'Contact Us'));
// Output: Contact Us (clickable, opens mailto:support@company.com)
```

### hyperlink.file

Create a file:// link for local files.

```typescript
function file(path: string, text?: string, options?: HyperlinkOptions): string
```

**Parameters:**
- `path` - Absolute file path
- `text` - Optional display text (defaults to the path)
- `options` - Optional link options

**Example:**
```typescript
import { hyperlink } from 'blecsd/terminal';

// Error output with clickable file links
const file = '/src/components/App.tsx';
const line = 42;
console.log(`Error at ${hyperlink.file(file, 'App.tsx')}:${line}`);

// Full path as text
console.log(hyperlink.file('/home/user/documents/report.pdf'));
```

## Security

### URL Validation

The `isHyperlinkAllowed` function checks if a URL uses an allowed protocol:

```typescript
import { isHyperlinkAllowed, HYPERLINK_ALLOWED_PROTOCOLS } from 'blecsd/terminal';

isHyperlinkAllowed('https://example.com');    // true
isHyperlinkAllowed('javascript:alert(1)');   // false
isHyperlinkAllowed('data:text/html,...');    // false

// Allowed protocols
console.log(HYPERLINK_ALLOWED_PROTOCOLS);
// ['http:', 'https:', 'mailto:', 'file:', 'tel:']
```

### Allowed Protocols

| Protocol | Use Case |
|----------|----------|
| `http:` | Web links |
| `https:` | Secure web links |
| `mailto:` | Email links |
| `file:` | Local file links |
| `tel:` | Phone number links |

### Blocked Protocols

The following protocols are blocked to prevent security issues:
- `javascript:` - Script execution
- `data:` - Data URLs (can contain scripts)
- `vbscript:` - VBScript execution

### Using safeLink for User Input

When displaying links from untrusted sources, always use `safeLink`:

```typescript
import { hyperlink } from 'blecsd/terminal';

function displayUserLink(url: string, label: string): void {
  // safeLink validates the URL and returns just the text if blocked
  process.stdout.write(hyperlink.safeLink(url, label));
}

displayUserLink('https://example.com', 'User Site');  // Creates link
displayUserLink('javascript:evil()', 'Hack');         // Just shows "Hack"
```

## Types

### HyperlinkOptions

```typescript
interface HyperlinkOptions {
  /**
   * Optional ID for multi-line/multi-reference links.
   * Links with the same ID highlight together on hover.
   */
  id?: string;
}
```

### HyperlinkProtocol

```typescript
type HyperlinkProtocol = 'http:' | 'https:' | 'mailto:' | 'file:' | 'tel:';
```

## OSC 8 Sequence Format

The OSC 8 hyperlink sequence format is:

```
OSC 8 ; params ; URI ST text OSC 8 ; ; ST
```

Where:
- `OSC` = `\x1b]`
- `ST` = `\x1b\\` (String Terminator)
- `params` = semicolon-separated key=value pairs (e.g., `id=my-link`)
- `URI` = the URL
- `text` = visible text

**Examples:**

```
\x1b]8;;https://example.com\x1b\\Click here\x1b]8;;\x1b\\
\x1b]8;id=doc;https://docs.example.com\x1b\\Docs\x1b]8;;\x1b\\
```

## Best Practices

1. **Use safeLink for untrusted input** - Always validate URLs from external sources.

2. **Provide meaningful text** - The visible text should describe the link destination.

3. **Use IDs for related links** - When multiple link regions point to the same URL, use the same ID so they highlight together.

4. **Graceful degradation** - Links will appear as plain text in unsupported terminals, so ensure the text is informative.

5. **Keep links short** - Long URLs can cause issues in some terminals. The visible text length matters more than URL length.
