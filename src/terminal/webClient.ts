/**
 * Web Client HTML Generator for blECSd
 *
 * Generates a self-contained HTML page with xterm.js for browser-based
 * terminal rendering. The page connects to the WebSocket server and
 * forwards keyboard/mouse input while rendering terminal output.
 *
 * @module terminal/webClient
 */

/**
 * Generate the complete HTML page for the browser terminal client.
 *
 * @param title - Page title
 * @param requiresAuth - Whether the server requires authentication
 * @returns Complete HTML string
 */
export function generateWebClientHtml(title: string, requiresAuth: boolean): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; background: #1e1e1e; overflow: hidden; }
  #terminal { width: 100%; height: 100%; }
  #overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.85); display: flex; align-items: center;
    justify-content: center; z-index: 100;
  }
  #overlay.hidden { display: none; }
  .auth-form {
    background: #2d2d2d; padding: 2rem; border-radius: 8px;
    color: #ccc; font-family: monospace; text-align: center;
    min-width: 300px;
  }
  .auth-form h2 { margin-bottom: 1rem; color: #4ec9b0; }
  .auth-form input {
    width: 100%; padding: 0.5rem; margin: 0.5rem 0;
    background: #1e1e1e; border: 1px solid #555; color: #fff;
    font-family: monospace; border-radius: 4px;
  }
  .auth-form button {
    padding: 0.5rem 2rem; margin-top: 0.5rem;
    background: #4ec9b0; color: #1e1e1e; border: none;
    cursor: pointer; font-family: monospace; border-radius: 4px;
    font-weight: bold;
  }
  .auth-form button:hover { background: #6fd9c0; }
  .auth-form .error { color: #f44747; margin-top: 0.5rem; }
  #status {
    position: fixed; top: 8px; right: 8px; padding: 4px 8px;
    border-radius: 4px; font-family: monospace; font-size: 12px;
    z-index: 50; transition: opacity 0.3s;
  }
  #status.connected { background: #4ec9b0; color: #1e1e1e; }
  #status.disconnected { background: #f44747; color: #fff; }
  #status.connecting { background: #dcdcaa; color: #1e1e1e; }
</style>
</head>
<body>
<div id="terminal"></div>
<div id="status" class="connecting">Connecting…</div>
${
	requiresAuth
		? `
<div id="overlay">
  <div class="auth-form">
    <h2>${escapeHtml(title)}</h2>
    <p>Authentication required</p>
    <input type="password" id="token-input" placeholder="Auth token" autofocus>
    <br>
    <button id="auth-btn">Connect</button>
    <div id="auth-error" class="error" style="display:none"></div>
  </div>
</div>
`
		: '<div id="overlay" class="hidden"></div>'
}
<script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@xterm/addon-web-links@0.11.0/lib/addon-web-links.min.js"></script>
<script>
(function() {
  'use strict';

  var term = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
    theme: {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#aeafad',
      selectionBackground: '#264f78',
    },
    allowProposedApi: true,
  });

  var fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);
  term.loadAddon(new WebLinksAddon.WebLinksAddon());

  var container = document.getElementById('terminal');
  term.open(container);
  fitAddon.fit();

  var statusEl = document.getElementById('status');
  var overlayEl = document.getElementById('overlay');
  var ws = null;
  var authenticated = false;
  var requiresAuth = ${requiresAuth};

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = cls;
    if (cls === 'connected') {
      setTimeout(function() { statusEl.style.opacity = '0'; }, 2000);
    } else {
      statusEl.style.opacity = '1';
    }
  }

  function connect() {
    var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(protocol + '//' + location.host + '/ws');

    ws.onopen = function() {
      setStatus('Connected', 'connecting');
    };

    ws.onmessage = function(evt) {
      try {
        var msg = JSON.parse(evt.data);
        switch (msg.type) {
          case 'auth_required':
            setStatus('Auth required', 'connecting');
            break;
          case 'ready':
            authenticated = true;
            overlayEl.classList.add('hidden');
            setStatus('Connected', 'connected');
            term.focus();
            // Send initial size
            ws.send(JSON.stringify({
              type: 'resize',
              cols: term.cols,
              rows: term.rows,
            }));
            break;
          case 'auth_failed':
            var errEl = document.getElementById('auth-error');
            if (errEl) {
              errEl.style.display = 'block';
              errEl.textContent = 'Invalid token';
            }
            break;
          default:
            // Unknown control message
            break;
        }
      } catch (e) {
        // Not JSON — treat as terminal output
        term.write(evt.data);
      }
    };

    ws.onclose = function() {
      authenticated = false;
      setStatus('Disconnected', 'disconnected');
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };

    ws.onerror = function() {
      setStatus('Error', 'disconnected');
    };
  }

  // Forward keyboard input to server
  term.onData(function(data) {
    if (ws && ws.readyState === WebSocket.OPEN && authenticated) {
      ws.send(JSON.stringify({ type: 'input', data: data }));
    }
  });

  // Forward resize events
  window.addEventListener('resize', function() {
    fitAddon.fit();
    if (ws && ws.readyState === WebSocket.OPEN && authenticated) {
      ws.send(JSON.stringify({
        type: 'resize',
        cols: term.cols,
        rows: term.rows,
      }));
    }
  });

  // Auth form handling
  if (requiresAuth) {
    var tokenInput = document.getElementById('token-input');
    var authBtn = document.getElementById('auth-btn');

    function doAuth() {
      var token = tokenInput.value.trim();
      if (!token) return;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'auth', token: token }));
      }
    }

    authBtn.addEventListener('click', doAuth);
    tokenInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doAuth();
    });
  }

  connect();
})();
</script>
</body>
</html>`;
}

/**
 * Escape HTML special characters to prevent XSS in the generated page.
 */
function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
