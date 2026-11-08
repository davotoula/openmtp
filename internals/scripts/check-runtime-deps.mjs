#!/usr/bin/env node
/* eslint-disable no-console */
// CI gate: require() every runtime dependency under the app's own Node.
//
// Every entry in package.json "dependencies" is a webpack external, so the
// packaged app require()s it at runtime from the asar under Electron's
// bundled Node (16.x on Electron 18). A dependency that goes ESM-only, or a
// native module compiled against the wrong ABI, builds and packages fine and
// only fails when the app starts. PR #9 shipped exactly that: a blank window
// because sanitize-html pulled in an ESM-only htmlparser2.
//
// ELECTRON_RUN_AS_NODE=1 turns the Electron binary into that Node, so loading
// each dependency with it reproduces the runtime resolution in seconds,
// before the (slower) smoke launch.
//
// Usage: node internals/scripts/check-runtime-deps.mjs [electron-binary]
//        yarn check-runtime-deps

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  PKG_ROOT,
  heading,
  parseArgs,
  resolveElectronBinary,
} from './smoke-shared.mjs';

// Dependencies that legitimately cannot load outside an Electron renderer or
// main process, or that are not plain CommonJS modules at all.
const SKIP = {
  '@electron/remote': 'needs a live Electron main/renderer process',
  'electron-debug': 'needs the electron module (dev-only helper)',
  milligram: 'CSS-only package, no JS entry',
  'normalize.css': 'CSS-only package, no JS entry',
  'run-electron': 'CLI launcher for Electron, not a library',
  'electron-devtools-installer': 'git dependency, dev-only',
};

const CONCURRENCY = 8;

function loadOne(electronBinary, dep) {
  return new Promise((resolve) => {
    const child = spawn(
      electronBinary,
      ['-e', `require(${JSON.stringify(dep)})`],
      {
        cwd: PKG_ROOT,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let output = '';

    child.stdout.on('data', (d) => {
      output += d;
    });
    child.stderr.on('data', (d) => {
      output += d;
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      output += '\n[check-runtime-deps] timed out after 30 s';
    }, 30_000);

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ dep, ok: code === 0, code, signal, output: output.trim() });
    });
  });
}

async function runPool(items, worker) {
  const results = [];
  let next = 0;

  async function lane() {
    while (next < items.length) {
      const i = next;

      next += 1;
      // eslint-disable-next-line no-await-in-loop
      results[i] = await worker(items[i]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, lane)
  );

  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const electronBinary = resolveElectronBinary(args._[0] ?? args.app, {
    allowDev: true,
  });

  const pkg = JSON.parse(
    fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8')
  );
  const deps = Object.keys(pkg.dependencies ?? {});
  const toCheck = deps.filter((d) => !(d in SKIP));

  heading('Runtime dependency load gate');
  console.log(`Electron binary: ${electronBinary}`);
  console.log(`Checking ${toCheck.length} of ${deps.length} dependencies`);

  for (const dep of deps.filter((d) => d in SKIP)) {
    console.log(`  skip  ${dep}  (${SKIP[dep]})`);
  }

  const started = Date.now();
  const results = await runPool(toCheck, (dep) => loadOne(electronBinary, dep));
  const failed = results.filter((r) => !r.ok);

  for (const r of results) {
    console.log(`  ${r.ok ? 'ok   ' : 'FAIL '} ${r.dep}`);
  }

  console.log(`\n${results.length} checked in ${Date.now() - started} ms`);

  if (failed.length > 0) {
    heading(`${failed.length} dependencies failed to load`);

    for (const r of failed) {
      console.log(`\n--- ${r.dep} (exit ${r.code ?? r.signal}) ---`);
      console.log(r.output || '(no output)');
    }

    process.exitCode = 1;

    return;
  }

  console.log('PASS: every runtime dependency loads under Electron.');
}

main().catch((e) => {
  console.error(e.stack || e);
  process.exitCode = 1;
});
