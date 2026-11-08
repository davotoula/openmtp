#!/usr/bin/env node
/* eslint-disable no-console */
// CI gate: launch the packaged app and fail if the renderer throws or never
// mounts.
//
// Lint, webpack and electron-builder prove the app builds and packages; none
// of them starts it. PR #9 was green and shipped a blank window. This script
// starts the packaged app with --remote-debugging-port, attaches to the main
// window over the Chrome DevTools Protocol (Node 22 has fetch and WebSocket,
// so no Playwright or puppeteer), reloads the page so the capture covers a
// full initial load, and then:
//
//   PASS  #root has children AND no Runtime.exceptionThrown AND no unfiltered
//         console.error / browser-log error
//   FAIL  otherwise
//
// It always writes dist/smoke-launch.png (screenshot of the window) and
// dist/smoke-launch.log (the app's stdout/stderr) for the CI artifact.
//
// Usage: node internals/scripts/smoke-launch.mjs [electron-binary]
//          [--port N] [--target-timeout S] [--mount-timeout S]
//        yarn smoke-launch

import { spawn } from 'child_process';
import fs from 'fs';
import net from 'net';
import path from 'path';
import {
  PKG_ROOT,
  heading,
  parseArgs,
  resolveElectronBinary,
  sleep,
} from './smoke-shared.mjs';

const OUT_DIR = path.join(PKG_ROOT, 'dist');
const SCREENSHOT = path.join(OUT_DIR, 'smoke-launch.png');
const APP_LOG = path.join(OUT_DIR, 'smoke-launch.log');

// Console / browser-log errors that are expected on a CI runner and must not
// fail the job. Anything else that is an error still fails. A real exception
// (Runtime.exceptionThrown) is never filtered.
const NOISE = [
  // Electron's dev-time CSP nag; harmless and not a renderer fault.
  /Insecure Content-Security-Policy/,
  // No MTP device is attached on the runner; the app logs the failed probe in
  // red via console-log-plus, which may come through as console.error.
  /ErrorMtpDetectFailed|churnMtpBuffer|MTP_DETECT/i,
];

// Browser-log network errors (net::ERR_FILE_NOT_FOUND for an optional asset,
// a failed analytics beacon) are tolerated only when the UI still mounted.
const isNetworkLogEntry = (entry) => entry.source === 'network';

function describeException(details) {
  const { exception, text, lineNumber, columnNumber, url, stackTrace } =
    details;
  const message =
    exception?.description ?? exception?.value ?? text ?? '(no message)';
  const where = url ? ` at ${url}:${lineNumber}:${columnNumber}` : '';
  // exception.description usually already carries the stack; only add our
  // own frames when it does not.
  const frames = /\n\s+at /.test(message)
    ? ''
    : (stackTrace?.callFrames ?? [])
        .slice(0, 5)
        .map(
          (f) =>
            `      at ${f.functionName || '<anon>'} (${f.url}:${f.lineNumber})`
        )
        .join('\n');

  return `${message}${where}${frames ? `\n${frames}` : ''}`;
}

function describeConsole(params) {
  const text = params.args
    .map((a) => a.value ?? a.description ?? a.type)
    .join(' ');
  const frame = params.stackTrace?.callFrames?.[0];
  const where = frame ? ` (${frame.url}:${frame.lineNumber})` : '';

  return `${text}${where}`;
}

function describeLogEntry(entry) {
  return `[${entry.source}] ${entry.text}${entry.url ? ` (${entry.url})` : ''}`;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();

    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();

      srv.close(() => resolve(port));
    });
  });
}

/** Launch the app with its own process group so the whole tree can be killed. */
function launchApp(binary, port) {
  const logStream = fs.createWriteStream(APP_LOG);
  const child = spawn(binary, [`--remote-debugging-port=${port}`], {
    cwd: PKG_ROOT,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  const state = { child, exited: false, exitInfo: null, log: '' };

  const capture = (chunk) => {
    const s = chunk.toString();

    state.log += s;
    logStream.write(s);
  };

  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.on('exit', (code, signal) => {
    state.exited = true;
    state.exitInfo = { code, signal };
    logStream.end();
  });

  return state;
}

async function killTree(app) {
  if (app.exited) {
    return;
  }

  const { pid } = app.child;
  const signalAll = (sig) => {
    // Negative pid = the process group created by detached: true.
    try {
      process.kill(-pid, sig);
    } catch (_) {
      /* group already gone */
    }

    try {
      process.kill(pid, sig);
    } catch (_) {
      /* process already gone */
    }
  };

  // Electron does not quit on SIGTERM when nothing in the app handles it, so
  // give it a short grace period and then force it.
  signalAll('SIGTERM');

  for (let i = 0; i < 15 && !app.exited; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await sleep(100);
  }

  if (!app.exited) {
    signalAll('SIGKILL');
    await sleep(300);
  }
}

async function waitForPageTarget(port, timeoutMs, app) {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no targets yet';

  while (Date.now() < deadline) {
    if (app.exited) {
      throw new Error(
        `App exited before exposing a window (code ${app.exitInfo.code}, ` +
          `signal ${app.exitInfo.signal}). Is another instance running? ` +
          `(single-instance lock)`
      );
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      // eslint-disable-next-line no-await-in-loop
      const targets = await res.json();
      const page = targets.find(
        (t) => t.type === 'page' && /app\.html/.test(t.url)
      );

      if (page) {
        return page;
      }

      lastError = `targets: ${
        targets.map((t) => `${t.type} ${t.url}`).join(', ') || '(none)'
      }`;
    } catch (e) {
      lastError = e.message;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(250);
  }

  throw new Error(
    `No app.html page target after ${timeoutMs / 1000} s. Last: ${lastError}`
  );
}

/** Tiny CDP client over the global WebSocket. */
function connectCdp(wsUrl, onEvent) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let nextId = 0;

    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          nextId += 1;
          const id = nextId;

          return new Promise((resolve, reject) => {
            pending.set(id, { resolve, reject, method });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        close() {
          try {
            ws.close();
          } catch (_) {
            /* ignore */
          }
        },
      });
    });

    ws.addEventListener('error', (ev) => {
      reject(new Error(`WebSocket error: ${ev.message ?? 'unknown'}`));
    });

    ws.addEventListener('close', () => {
      for (const { reject, method } of pending.values()) {
        reject(new Error(`CDP connection closed during ${method}`));
      }

      pending.clear();
    });

    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);

      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject, method } = pending.get(msg.id);

        pending.delete(msg.id);

        if (msg.error) {
          reject(new Error(`${method}: ${msg.error.message}`));
        } else {
          resolve(msg.result);
        }

        return;
      }

      if (msg.method) {
        onEvent(msg.method, msg.params);
      }
    });
  });
}

// Once the renderer has thrown, a still-empty #root is not going to fill in;
// stop polling after this grace period instead of waiting the full timeout.
const FAIL_FAST_AFTER_EXCEPTION_MS = 5000;

async function waitForMount(cdp, timeoutMs, hasThrown) {
  const started = Date.now();
  const deadline = started + timeoutMs;
  let last = 'not evaluated yet';

  while (Date.now() < deadline) {
    if (hasThrown() && Date.now() - started > FAIL_FAST_AFTER_EXCEPTION_MS) {
      throw new Error(
        `#root not mounted ${FAIL_FAST_AFTER_EXCEPTION_MS / 1000} s after ` +
          `an uncaught exception (${last})`
      );
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      const { result } = await cdp.send('Runtime.evaluate', {
        expression: "document.querySelector('#root')?.children.length ?? -1",
        returnByValue: true,
      });

      if (typeof result.value === 'number' && result.value > 0) {
        return result.value;
      }

      last = `#root children = ${result.value}`;
    } catch (e) {
      // Expected while the reload is tearing down the old execution context.
      last = e.message;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(500);
  }

  throw new Error(`#root never mounted within ${timeoutMs / 1000} s (${last})`);
}

async function screenshot(cdp) {
  try {
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png',
    });

    fs.writeFileSync(SCREENSHOT, Buffer.from(data, 'base64'));
    console.log(`Screenshot: ${SCREENSHOT}`);
  } catch (e) {
    console.log(`Screenshot failed: ${e.message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const binary = resolveElectronBinary(args._[0] ?? args.app);
  const port = args.port ? Number(args.port) : await freePort();
  const targetTimeout = Number(args['target-timeout'] ?? 60) * 1000;
  const mountTimeout = Number(args['mount-timeout'] ?? 30) * 1000;

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.rmSync(SCREENSHOT, { force: true });

  heading('Smoke launch');
  console.log(`Binary: ${binary}`);
  console.log(`CDP port: ${port}`);

  const exceptions = [];
  const consoleErrors = [];
  const logErrors = [];
  const app = launchApp(binary, port);
  let cdp = null;
  let mounted = 0;
  let failure = null;

  let onLoadEvent = null;
  const onEvent = (method, params) => {
    if (method === 'Page.loadEventFired') {
      onLoadEvent?.();
    } else if (method === 'Runtime.exceptionThrown') {
      exceptions.push(describeException(params.exceptionDetails));
    } else if (
      method === 'Runtime.consoleAPICalled' &&
      params.type === 'error'
    ) {
      consoleErrors.push(describeConsole(params));
    } else if (method === 'Log.entryAdded' && params.entry.level === 'error') {
      logErrors.push(params.entry);
    }
  };

  const t0 = Date.now();
  const elapsed = () => `${((Date.now() - t0) / 1000).toFixed(1)} s`;

  try {
    const page = await waitForPageTarget(port, targetTimeout, app);

    console.log(`Attached to ${page.url} after ${elapsed()}`);
    cdp = await connectCdp(page.webSocketDebuggerUrl, onEvent);

    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');

    // The first load happened before we attached; reload so the capture
    // covers a complete boot of the renderer. Wait for the reloaded page's
    // load event before polling, or the poll could see the old DOM and pass
    // before the fresh boot has even run.
    const loaded = new Promise((resolve) => {
      onLoadEvent = resolve;
    });

    await cdp.send('Page.reload', { ignoreCache: true });
    await Promise.race([
      loaded,
      sleep(mountTimeout).then(() => {
        throw new Error(
          `Page did not finish reloading within ${mountTimeout / 1000} s`
        );
      }),
    ]);
    console.log('Reloaded; renderer booted from scratch under observation');

    mounted = await waitForMount(
      cdp,
      mountTimeout,
      () => exceptions.length > 0
    );
    console.log(
      `#root mounted with ${mounted} child node(s) after ${elapsed()}`
    );

    // Give late async errors (device probe, settings load) a moment to land.
    await sleep(2000);
  } catch (e) {
    failure = e.message;
  }

  if (cdp) {
    await screenshot(cdp);
    cdp.close();
  }

  console.log(`Teardown started after ${elapsed()}`);
  await killTree(app);
  console.log(
    `App ${app.exited ? 'exited' : 'still running'} after ${elapsed()}`
  );

  const isNoise = (text) => NOISE.some((re) => re.test(text));
  const realConsoleErrors = consoleErrors.filter((t) => !isNoise(t));
  const realLogErrors = logErrors
    .filter((e) => !(mounted > 0 && isNetworkLogEntry(e)))
    .map(describeLogEntry)
    .filter((t) => !isNoise(t));

  heading('Collected renderer events');
  console.log(`Uncaught exceptions:      ${exceptions.length}`);
  console.log(
    `console.error calls:      ${consoleErrors.length} (${realConsoleErrors.length} after noise filter)`
  );
  console.log(
    `Browser log errors:       ${logErrors.length} (${realLogErrors.length} after noise filter)`
  );

  const dump = (title, items) => {
    if (items.length === 0) {
      return;
    }

    console.log(`\n-- ${title} --`);
    items.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
  };

  dump('Uncaught exceptions', exceptions);
  dump('console.error (all)', consoleErrors);
  dump('Browser log errors (all)', logErrors.map(describeLogEntry));

  const problems = [];

  if (failure) {
    problems.push(failure);
  }

  if (exceptions.length > 0) {
    problems.push(`${exceptions.length} uncaught exception(s) in the renderer`);
  }

  if (realConsoleErrors.length > 0) {
    problems.push(
      `${realConsoleErrors.length} unexpected console.error call(s)`
    );
  }

  if (realLogErrors.length > 0) {
    problems.push(`${realLogErrors.length} unexpected browser log error(s)`);
  }

  heading('Verdict');

  if (problems.length > 0) {
    problems.forEach((p) => console.log(`FAIL: ${p}`));
    console.log(`\nApp log: ${APP_LOG}`);

    if (app.log.trim()) {
      console.log('\n-- App stdout/stderr (tail) --');
      console.log(app.log.trim().split('\n').slice(-40).join('\n'));
    }

    return 1;
  }

  console.log('PASS: renderer mounted with no uncaught exceptions.');

  return 0;
}

// Exit explicitly: the CDP socket and the app's inherited stdio pipes can keep
// the event loop alive for tens of seconds after the verdict is in.
main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(e.stack || e);
    process.exit(1);
  });
