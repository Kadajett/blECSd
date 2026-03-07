/**
 * HTML client page generator for the WebSocket terminal server.
 *
 * Generates a self-contained HTML page that uses xterm.js (loaded from CDN)
 * to render terminal output received over WebSocket. Forwards keyboard and
 * mouse input back to the server.
 *
 * @module terminal/webClient
 */

/**
 * Generates the HTML client page.
 *
 * @param title - Page title
 * @param authToken - Optional auth token to include in the WebSocket handshake
 * @returns Complete HTML string
 */
export function getClientPage(title: string, authToken?: string): string {
	const tokenJson = authToken ? JSON.stringify(authToken) : 'null';

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #1e1e1e; }
    #terminal { width: 100%; height: 100%; }
    #status {
      position: fixed; top: 8px; right: 12px; z-index: 100;
      font: 12px/1 monospace; padding: 4px 8px; border-radius: 4px;
      background: rgba(0,0,0,0.6); color: #888;
    }
    #status.connected { color: #4caf50; }
    #status.error { color: #f44336; }
  </style>
</head>
<body>
  <div id="status">connecting…</div>
  <div id="terminal"></div>

  <script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5/lib/xterm.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0/lib/addon-fit.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0/lib/addon-web-links.min.js"></script>
  <script>
    (function() {
      'use strict';

      var AUTH_TOKEN = ${tokenJson};
      var statusEl = document.getElementById('status');
      var termEl = document.getElementById('terminal');

      // Create terminal
      var term = new Terminal({
        cursorBlink: true,
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", "Menlo", monospace',
        fontSize: 14,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          selectionBackground: '#264f78',
        },
        allowProposedApi: true,
      });

      var fitAddon = new FitAddon.FitAddon();
      var webLinksAddon = new WebLinksAddon.WebLinksAddon();
      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.open(termEl);
      fitAddon.fit();

      // WebSocket connection
      var ws = null;
      var reconnectDelay = 1000;
      var maxReconnectDelay = 30000;

      function setStatus(text, cls) {
        statusEl.textContent = text;
        statusEl.className = cls || '';
      }

      function connect() {
        var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        var url = proto + '//' + location.host + '/ws';
        ws = new WebSocket(url);

        ws.onopen = function() {
          setStatus('connected', 'connected');
          reconnectDelay = 1000;

          // Send auth if required
          if (AUTH_TOKEN) {
            ws.send(JSON.stringify({ type: 'auth', token: AUTH_TOKEN }));
          }

          // Send initial terminal size
          sendResize();
        };

        ws.onmessage = function(evt) {
          term.write(evt.data);
        };

        ws.onclose = function() {
          setStatus('disconnected — reconnecting…', 'error');
          setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
        };

        ws.onerror = function() {
          setStatus('connection error', 'error');
        };
      }

      function sendResize() {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'resize',
            width: term.cols,
            height: term.rows,
          }));
        }
      }

      // Forward keyboard input
      term.onData(function(data) {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data: data }));
        }
      });

      // Handle resize
      window.addEventListener('resize', function() {
        fitAddon.fit();
        sendResize();
      });

      // Also send resize when fit changes dimensions
      term.onResize(function() {
        sendResize();
      });

      // Fade status after connection
      var statusTimer;
      var origSetStatus = setStatus;
      setStatus = function(text, cls) {
        origSetStatus(text, cls);
        clearTimeout(statusTimer);
        statusEl.style.opacity = '1';
        if (cls === 'connected') {
          statusTimer = setTimeout(function() {
            statusEl.style.opacity = '0.3';
          }, 3000);
        }
      };

      // Focus terminal
      term.focus();

      // Connect
      connect();
    })();
  </script>
</body>
</html>`;
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
