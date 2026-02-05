# ASCII Art Clock

A real-time terminal clock that renders the current time using the BigText widget.

## Features

- Large ASCII art digits
- Real-time updates with blinking colon
- Optional seconds and date display
- 12-hour or 24-hour format
- Skinny or normal font styles
- Custom fill character and colors
- Auto-centers and responds to terminal resize

## Running

```bash
pnpm install
pnpm start
```

### Development

```bash
pnpm dev
```

## Options

```bash
pnpm start -- --seconds          # Show seconds
pnpm start -- --date             # Show date
pnpm start -- --12hour           # 12-hour format
pnpm start -- --skinny           # Skinny digits (terminus-14-normal)
pnpm start -- --fill=*           # Fill character for glyphs
pnpm start -- --fg=#36c7ff        # Time color (hex)
pnpm start -- --date-fg=#9aa0a6   # Date color (hex)
pnpm start -- --date-format=YYYY-MM-DD
```

Supported date format tokens:
- `YYYY` year
- `MM` month (01-12)
- `DD` day (01-31)
- `MMM` short month (Jan)
- `ddd` short weekday (Mon)

## Keybindings

| Key | Action |
| --- | --- |
| q | Quit |
| Escape | Quit |
| s | Toggle seconds |
| d | Toggle date |

## Screenshot

![ASCII Clock](screenshots/clock.png)
