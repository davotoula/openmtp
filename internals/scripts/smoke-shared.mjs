/* eslint-disable no-console */
// Helpers shared by the CI smoke scripts (check-runtime-deps.mjs and
// smoke-launch.mjs). Plain Node 22 ESM, no dependencies.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const PKG_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

const PACKAGED_BINARY = path.join(
  PKG_ROOT,
  'dist/mac-arm64/OpenMTP-resume.app/Contents/MacOS/OpenMTP-resume'
);

const DEV_BINARY = path.join(
  PKG_ROOT,
  'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
);

/**
 * The Electron binary to drive. Resolution order:
 *   1. explicit argument (CLI positional or --app)
 *   2. SMOKE_APP env
 *   3. the packaged app in dist/ (what CI tests)
 *   4. the dev Electron in node_modules (local convenience; only meaningful
 *      for the dependency gate, since it does not carry the app bundle)
 */
export function resolveElectronBinary(explicit, { allowDev = false } = {}) {
  const candidates = [explicit, process.env.SMOKE_APP, PACKAGED_BINARY];

  if (allowDev) {
    candidates.push(DEV_BINARY);
  }

  const found = candidates.find((p) => p && fs.existsSync(p));

  if (!found) {
    const looked = candidates
      .filter(Boolean)
      .map((p) => `  ${p}`)
      .join('\n');

    throw new Error(
      `No Electron binary found. Looked for:\n${looked}\nRun "yarn package-mac-without-notarize" first, or pass a path (positional / --app / SMOKE_APP).`
    );
  }

  return found;
}

/** Minimal argv parser: --flag value, --flag=value, --bool, positionals. */
export function parseArgs(argv) {
  const out = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (!arg.startsWith('--')) {
      out._.push(arg);
    } else {
      const eq = arg.indexOf('=');

      if (eq !== -1) {
        out[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        out[arg.slice(2)] = argv[i + 1];
        i += 1;
      } else {
        out[arg.slice(2)] = true;
      }
    }
  }

  return out;
}

export const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export function heading(text) {
  console.log(`\n== ${text} ==`);
}
