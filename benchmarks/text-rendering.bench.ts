/**
 * Text Rendering Performance Benchmarks
 *
 * Measures text rendering performance across different scenarios:
 * - Plain ASCII text rendering (various sizes)
 * - Unicode text rendering (CJK, emoji, combining characters)
 * - Word wrapping performance (short lines vs long paragraphs)
 * - Syntax highlighting performance (small, medium, large code blocks)
 * - Tag/markup parsing performance
 *
 * These benchmarks help identify text processing bottlenecks and validate
 * optimization strategies for terminal text rendering.
 */

import { describe, bench } from 'vitest';

describe('Text Rendering: Plain ASCII', () => {
	bench('render short ASCII text (50 chars)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text = 'The quick brown fox jumps over the lazy dog abc';
		wrapText(text, { width: 80 });
	});

	bench('render medium ASCII text (500 chars)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text =
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
			'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
			'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
			'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in ' +
			'reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla ' +
			'pariatur. Excepteur sint occaecat cupidatat non proident, sunt in ' +
			'culpa qui officia deserunt mollit anim id est laborum. Sed ut ' +
			'perspiciatis unde omnis iste natus error sit voluptatem accusantium.';

		wrapText(text, { width: 80 });
	});

	bench('render large ASCII text (5000 chars)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const paragraph =
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
			'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ';

		// Repeat to get ~5000 chars
		const text = paragraph.repeat(50);

		wrapText(text, { width: 80 });
	});

	bench('render with ANSI codes (500 chars)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text =
			'\x1b[31mRed text\x1b[0m followed by \x1b[1m\x1b[32mbold green\x1b[0m and ' +
			'\x1b[4munderlined\x1b[0m content. More text here to make it longer. ' +
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
			'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
			'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
			'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor.';

		wrapText(text, { width: 80 });
	});
});

describe('Text Rendering: Unicode', () => {
	bench('render CJK characters (100 chars)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text = '日本語のテキストです。中文文本测试。한국어 텍스트 테스트입니다。これはテストです。';

		wrapText(text, { width: 80 });
	});

	bench('render emoji text (50 chars)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text = '🚀 Hello 👋 World 🌍! Testing emoji 😀🎉🔥⚡️💯✨🌟 rendering performance 🎯';

		wrapText(text, { width: 80 });
	});

	bench('render combining characters (100 chars)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		// Text with combining diacritics
		const text = 'café résumé naïve Zürich Åse Çağatay Москва Київ Ελλάδα über mañana São Paulo';

		wrapText(text, { width: 80 });
	});

	bench('render mixed ASCII and Unicode (500 chars)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text =
			'This is English text with 日本語 and 中文 mixed in. ' +
			'Some emoji: 🚀🌟💻 and more text here. ' +
			'ελληνικά, русский, العربية characters too. ' +
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
			'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
			'More Unicode: café, résumé, naïve, über, mañana. ' +
			'Testing performance with diverse character sets and scripts.';

		wrapText(text, { width: 80 });
	});
});

describe('Text Rendering: Word Wrapping', () => {
	bench('wrap short lines (20 chars per line)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text = 'The quick brown fox jumps over the lazy dog and runs away quickly';

		wrapText(text, { width: 20 });
	});

	bench('wrap medium lines (40 chars per line)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text =
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
			'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

		wrapText(text, { width: 40 });
	});

	bench('wrap long paragraph (80 chars per line)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text =
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
			'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
			'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
			'nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in ' +
			'reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla ' +
			'pariatur. Excepteur sint occaecat cupidatat non proident, sunt in ' +
			'culpa qui officia deserunt mollit anim id est laborum.';

		wrapText(text, { width: 80 });
	});

	bench('wrap with break-word (long unbreakable words)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text =
			'ThisIsAVeryLongWordThatExceedsTheMaximumWidth ' +
			'AnotherSuperLongWordWithoutAnySpacesInIt ' +
			'AndYetAnotherExtremelyLongWordThatNeedsBreaking';

		wrapText(text, { width: 20, breakWord: true });
	});

	bench('wrap with alignment (center)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const text =
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
			'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

		wrapText(text, { width: 60, align: 'center' });
	});

	bench('wrap very long text (5000 chars, 80 width)', () => {
		const { wrapText } = require('../src/utils/textWrap');

		const paragraph =
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
			'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ';

		const text = paragraph.repeat(50);

		wrapText(text, { width: 80 });
	});
});

describe('Text Rendering: Syntax Highlighting', () => {
	bench('highlight small JavaScript (10 lines)', () => {
		const { highlight } = require('../src/text/syntaxHighlight');

		const code = `function hello(name) {
  console.log('Hello, ' + name);
  return name.toUpperCase();
}

const result = hello('world');
if (result) {
  console.log(result);
}`;

		highlight(code, 'javascript');
	});

	bench('highlight medium JavaScript (50 lines)', () => {
		const { highlight } = require('../src/text/syntaxHighlight');

		const code = `class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
  }

  getName() {
    return this.name;
  }

  setEmail(email) {
    if (!email.includes('@')) {
      throw new Error('Invalid email');
    }
    this.email = email;
  }

  toJSON() {
    return {
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
    };
  }
}

function createUser(name, email) {
  try {
    const user = new User(name, email);
    console.log('User created:', user.toJSON());
    return user;
  } catch (error) {
    console.error('Failed to create user:', error.message);
    return null;
  }
}

const users = [
  createUser('Alice', 'alice@example.com'),
  createUser('Bob', 'bob@example.com'),
  createUser('Charlie', 'charlie@example.com'),
];

users.forEach((user, index) => {
  if (user) {
    console.log(\`User \${index + 1}: \${user.getName()}\`);
  }
});`;

		highlight(code, 'javascript');
	});

	bench('highlight large JavaScript (200 lines)', () => {
		const { highlight } = require('../src/text/syntaxHighlight');

		// Generate a large code block
		const smallBlock = `function process(data) {
  const result = data.map(item => item * 2);
  return result.filter(x => x > 10);
}

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
console.log(process(numbers));
`;

		const code = smallBlock.repeat(20); // ~200 lines

		highlight(code, 'javascript');
	});

	bench('highlight TypeScript (50 lines)', () => {
		const { highlight } = require('../src/text/syntaxHighlight');

		const code = `interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
}

type UserRole = User['role'];

class UserManager {
  private users: Map<number, User>;

  constructor() {
    this.users = new Map();
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUser(id: number): User | undefined {
    return this.users.get(id);
  }

  getUsersByRole(role: UserRole): User[] {
    return Array.from(this.users.values())
      .filter(user => user.role === role);
  }

  removeUser(id: number): boolean {
    return this.users.delete(id);
  }
}

const manager = new UserManager();
manager.addUser({ id: 1, name: 'Alice', email: 'alice@test.com', role: 'admin' });
manager.addUser({ id: 2, name: 'Bob', email: 'bob@test.com', role: 'user' });

const admins = manager.getUsersByRole('admin');
console.log('Admins:', admins);`;

		highlight(code, 'typescript');
	});

	bench('highlight JSON (100 lines)', () => {
		const { highlight } = require('../src/text/syntaxHighlight');

		const json = {
			users: Array.from({ length: 20 }, (_, i) => ({
				id: i + 1,
				name: `User ${i + 1}`,
				email: `user${i + 1}@example.com`,
				active: i % 2 === 0,
				scores: [10, 20, 30, 40, 50],
			})),
		};

		const code = JSON.stringify(json, null, 2);

		highlight(code, 'json');
	});

	bench('highlight Bash (30 lines)', () => {
		const { highlight } = require('../src/text/syntaxHighlight');

		const code = `#!/bin/bash

# Deploy script
DEPLOY_DIR="/var/www/app"
BACKUP_DIR="/var/backups"

function backup() {
  echo "Creating backup..."
  tar -czf "$BACKUP_DIR/backup-$(date +%Y%m%d).tar.gz" "$DEPLOY_DIR"
}

function deploy() {
  echo "Deploying application..."
  cd "$DEPLOY_DIR" || exit 1
  git pull origin main
  npm install --production
  npm run build
  pm2 restart app
}

if [ "$1" == "backup" ]; then
  backup
elif [ "$1" == "deploy" ]; then
  backup
  deploy
else
  echo "Usage: $0 {backup|deploy}"
  exit 1
fi`;

		highlight(code, 'bash');
	});
});

describe('Text Rendering: Tag/Markup Parsing', () => {
	bench('parse simple markup (50 chars)', () => {
		const { parseMarkup } = require('../src/text/markup');

		const text = '{bold}Hello{/bold} {red-fg}World{/red-fg}!';

		parseMarkup(text);
	});

	bench('parse nested markup (100 chars)', () => {
		const { parseMarkup } = require('../src/text/markup');

		const text = '{bold}{red-fg}Error:{/red-fg} {yellow-fg}Warning message here{/yellow-fg}{/bold}';

		parseMarkup(text);
	});

	bench('parse complex markup (500 chars)', () => {
		const { parseMarkup } = require('../src/text/markup');

		const text =
			'{bold}{blue-fg}System Status:{/blue-fg}{/bold} ' +
			'{green-fg}✓ OK{/green-fg} | ' +
			'{yellow-fg}⚠ Warning{/yellow-fg} | ' +
			'{red-fg}✗ Error{/red-fg} ' +
			'{dim}Last updated: 2024-01-01 12:00:00{/dim} ' +
			'{underline}{cyan-fg}More information{/cyan-fg}{/underline} ' +
			'Regular text here with {bold}emphasized{/bold} parts. ' +
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
			'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

		parseMarkup(text);
	});

	bench('parse markup with colors (200 chars)', () => {
		const { parseMarkup } = require('../src/text/markup');

		const text =
			'{#ff0000-fg}Red{/#ff0000-fg} ' +
			'{#00ff00-fg}Green{/#00ff00-fg} ' +
			'{#0000ff-fg}Blue{/#0000ff-fg} ' +
			'{#ff00ff-fg}Magenta{/#ff00ff-fg} ' +
			'{#ffff00-fg}Yellow{/#ffff00-fg} ' +
			'{#00ffff-fg}Cyan{/#00ffff-fg} ' +
			'{#ffffff-fg}White{/#ffffff-fg} ' +
			'{#000000-fg}Black{/#000000-fg}';

		parseMarkup(text);
	});

	bench('strip markup (500 chars)', () => {
		const { stripMarkup } = require('../src/text/markup');

		const text =
			'{bold}{blue-fg}System Status:{/blue-fg}{/bold} ' +
			'{green-fg}✓ OK{/green-fg} | ' +
			'{yellow-fg}⚠ Warning{/yellow-fg} | ' +
			'{red-fg}✗ Error{/red-fg} ' +
			'{dim}Last updated: 2024-01-01 12:00:00{/dim} ' +
			'{underline}{cyan-fg}More information{/cyan-fg}{/underline} ' +
			'Regular text here with {bold}emphasized{/bold} parts. ' +
			'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

		stripMarkup(text);
	});

	bench('render markup to ANSI (200 chars)', () => {
		const { parseMarkup, renderMarkup } = require('../src/text/markup');

		const text =
			'{bold}{red-fg}Error:{/red-fg}{/bold} ' +
			'{yellow-fg}Configuration file not found.{/yellow-fg} ' +
			'Please check {underline}/etc/config.json{/underline} and try again.';

		const segments = parseMarkup(text);
		renderMarkup(segments);
	});

	bench('markup length calculation (100 chars)', () => {
		const { markupLength } = require('../src/text/markup');

		const text = '{bold}{red-fg}Hello{/red-fg} {blue-fg}World{/blue-fg}{/bold}!';

		markupLength(text);
	});
});

describe('Text Rendering: Tab Expansion', () => {
	bench('expand tabs (simple)', () => {
		const { expandTabs } = require('../src/utils/textWrap');

		const text = 'hello\tworld\ttest\tfoo\tbar';

		expandTabs(text, 8);
	});

	bench('expand tabs (with ANSI)', () => {
		const { expandTabs } = require('../src/utils/textWrap');

		const text = '\x1b[31mhello\tworld\x1b[0m\ttest\t\x1b[1mfoo\x1b[0m';

		expandTabs(text, 8);
	});

	bench('expand tabs (code indentation)', () => {
		const { expandTabs } = require('../src/utils/textWrap');

		const text = `function test() {
\tif (true) {
\t\tconsole.log('hello');
\t\treturn true;
\t}
}`;

		expandTabs(text, 4);
	});
});
