// Run Vite first. This fixture intercepts every API request.
const { spawn } = require('node:child_process');
const { mkdtempSync, rmSync, readFileSync, existsSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const profile = mkdtempSync(join(tmpdir(), 'protocol-finding-counts-'));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Floating popups need real animation frames; virtual-time dump-dom can skip
// layout and animation completion. Use Chrome's local debugging socket instead.
async function run() {
  const chrome = spawn(process.env.CHROME_BIN || '/opt/google/chrome/chrome', [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--remote-debugging-port=0', '--window-size=1440,1000',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore', detached: true });
  let launchError;
  chrome.on('error', error => { launchError = error; });
  let socket;
  let command;
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    for (let attempt = 0; !existsSync(portFile) && attempt < 100; attempt++) {
      if (launchError) throw launchError;
      await delay(50);
    }
    const port = readFileSync(portFile, 'utf8').split('\n')[0];
    const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    let nextId = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timeout);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
    command = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome timed out: ${method}`)); }, 10000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
    await command('Emulation.setFocusEmulationEnabled', { enabled: true });
    const fixture = process.env.PROTOCOL_TEST_FIXTURE || 'protocol-finding-counts.html';
    for (const query of fixture === 'protocol-finding-counts.html' ? ['', '?synopsis=1'] : ['']) {
      await command('Page.navigate', {
        url: `${process.env.PROTOCOL_TEST_ORIGIN || 'http://localhost:5175'}/tests/${fixture}${query}`,
      });
      let status;
      for (let attempt = 0; attempt < 200; attempt++) {
        await delay(100);
        const result = await command('Runtime.evaluate', {
          expression: '({ status: document.getElementById("result")?.textContent, query: location.search })', returnByValue: true,
        });
        status = result.result?.value?.query === query ? result.result.value.status : undefined;
        if (status && status !== 'RUNNING') break;
      }
      if (!status?.startsWith('PASS:')) {
        console.error(status || 'Browser test did not complete');
        process.exitCode = 1;
      } else console.log(status);
    }
  } finally {
    if (command && socket?.readyState === WebSocket.OPEN) {
      await command('Browser.close').catch(() => {});
    }
    socket?.close();
    if (chrome.exitCode === null && chrome.signalCode === null) {
      const exited = new Promise(resolve => chrome.once('exit', resolve));
      chrome.kill();
      await exited;
    }
    // Chrome helpers can outlive the main process and keep writing the profile.
    if (chrome.pid) {
      try { process.kill(-chrome.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    await delay(250);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
