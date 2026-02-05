# Telnet Server Example

Serve blECSd UIs to remote clients over telnet. Each connected client gets an isolated UI session with full terminal capabilities.

## Features

- **Multi-client Support**: Multiple simultaneous connections with isolated sessions
- **Terminal Negotiation**: Automatic window size detection via NAWS protocol
- **Terminal Type Detection**: Identifies client terminal type for compatibility
- **256-color Support**: Full color support when client supports it
- **Clean Disconnect**: Graceful session cleanup on disconnect
- **Interactive Demo**: Menu-driven demo showcasing terminal capabilities

## Running

```bash
# Development mode (recommended)
pnpm dev

# Or build and run
pnpm build
pnpm start

# Custom port
TELNET_PORT=3000 pnpm dev
```

Default port is 2300.

## Connecting

```bash
# Using telnet
telnet localhost 2300

# Using netcat
nc localhost 2300

# Using PuTTY (Windows)
# Connection type: Raw, Port: 2300
```

## Keybindings

| Key | Action |
|-----|--------|
| j/↓ | Move selection down |
| k/↑ | Move selection up |
| Enter | Select menu item |
| q | Quit/disconnect |

## Demo Features

1. **System Info**: Server version, client ID, terminal info, uptime
2. **Client Stats**: List of all connected clients
3. **Color Test**: 16-color, 256-color cube, and grayscale display
4. **Box Drawing**: Unicode box drawing and block characters

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Telnet Server                            │
├─────────────────────────────────────────────────────────────────┤
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │   Client 1   │   │   Client 2   │   │   Client N   │       │
│   │    Socket    │   │    Socket    │   │    Socket    │       │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘       │
│          │                  │                  │                │
│   ┌──────┴───────┐   ┌──────┴───────┐   ┌──────┴───────┐       │
│   │   Telnet     │   │   Telnet     │   │   Telnet     │       │
│   │   Stream     │   │   Stream     │   │   Stream     │       │
│   │  (Protocol)  │   │  (Protocol)  │   │  (Protocol)  │       │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘       │
│          │                  │                  │                │
│   ┌──────┴───────┐   ┌──────┴───────┐   ┌──────┴───────┐       │
│   │   Program    │   │   Program    │   │   Program    │       │
│   │   (blECSd)   │   │   (blECSd)   │   │   (blECSd)   │       │
│   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘       │
│          │                  │                  │                │
│   ┌──────┴───────┐   ┌──────┴───────┐   ┌──────┴───────┐       │
│   │    Demo UI   │   │    Demo UI   │   │    Demo UI   │       │
│   │  (Isolated)  │   │  (Isolated)  │   │  (Isolated)  │       │
│   └──────────────┘   └──────────────┘   └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## How It Works

1. **Socket Acceptance**: Server accepts TCP connections on the telnet port
2. **Telnet Negotiation**: Exchanges telnet protocol options (NAWS, TTYPE, ECHO)
3. **Stream Wrapper**: Filters telnet commands from raw data stream
4. **Program Creation**: Creates blECSd Program with socket as I/O streams
5. **Session Isolation**: Each client gets independent world/program instances
6. **Input Routing**: Key events from socket are parsed and routed to session
7. **Output Routing**: Program writes go directly to client socket

## Telnet Protocol

This example implements key telnet options:

| Option | Code | Purpose |
|--------|------|---------|
| ECHO | 1 | Server echoes client input |
| SGA | 3 | Suppress go-ahead for full-duplex |
| TTYPE | 24 | Terminal type identification |
| NAWS | 31 | Negotiate window size |

## Use Cases

- **BBS Systems**: Classic bulletin board style applications
- **Remote Dashboards**: Server monitoring from any telnet client
- **Terminal Games**: Multiplayer games with remote access
- **Shared Sessions**: Collaborative terminal applications
- **Testing**: Automated testing of terminal UIs

## Security Considerations

**IMPORTANT**: Telnet is an unencrypted protocol. All data, including any credentials, is transmitted in plain text.

For production use:
- Use only on trusted, local networks
- Consider wrapping in SSH tunnels
- Implement rate limiting for public servers
- Add authentication if needed

## Troubleshooting

**Connection refused**
- Ensure server is running
- Check firewall settings
- Verify port is not in use

**Garbled output**
- Client may not support UTF-8
- Try different terminal emulator
- Check TERM environment variable

**No color**
- Client may not support 256 colors
- Try `TERM=xterm-256color telnet localhost 2300`

## Terminal Compatibility

Tested with:
- macOS Terminal.app
- iTerm2
- PuTTY
- Windows Terminal
- Linux console
- xterm
