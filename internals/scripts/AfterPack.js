const path = require('path');
const { execFileSync } = require('child_process');
const glob = require('glob');
const fs = require('fs-extra');

// Invoked by absolute path rather than by name: resolving `codesign` through
// PATH would let any writable directory listed there shadow the real binary.
// /usr/bin lives on the sealed, read-only system volume.
const CODESIGN_BIN = '/usr/bin/codesign';

// When a real Developer ID is configured, electron-builder signs the app itself
// during the step that runs after this hook, so we must not touch it here.
const hasSigningIdentity = () =>
  Boolean(
    process.env.CSC_LINK ||
      process.env.CSC_NAME ||
      process.env.CSC_KEY_PASSWORD ||
      process.env.APPLEID
  );

// Without an identity electron-builder skips signing entirely, which leaves the
// bundle carrying the linker's ad-hoc signature but no `_CodeSignature` seal.
// Gatekeeper reads that as "code has no resources but signature indicates they
// must be present" and refuses to launch a downloaded copy with the unbypassable
// "is damaged and can't be opened" dialog. An ad-hoc signature produces a valid
// seal, which downgrades that to the ordinary "unidentified developer" prompt
// users can clear via System Settings > Privacy & Security > Open Anyway.
const adhocSign = (appPath) => {
  execFileSync(CODESIGN_BIN, ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });

  execFileSync(CODESIGN_BIN, ['--verify', '--deep', '--strict', appPath], {
    stdio: 'inherit',
  });
};

exports.default = async (context) => {
  // clean the unnecessary locales from packed app
  const lprojRegEx = /(en)\.lproj/g;
  const APP_NAME = context.packager.appInfo.productFilename;
  const APP_OUT_DIR = context.appOutDir;
  const PLATFORM = context.packager.platform.name;

  const cwd = path.join(`${APP_OUT_DIR}`, `${APP_NAME}.app/Contents/Resources`);
  const lproj = glob.sync('*.lproj', { cwd });
  const _promises = [];

  switch (PLATFORM) {
    case 'mac':
      lproj.forEach((dir) => {
        if (!lprojRegEx.test(dir)) {
          _promises.push(fs.remove(path.join(cwd, dir)));
        }
      });

      // the seal covers every file in the bundle, so it has to be applied only
      // once the locale pruning above has actually finished
      await Promise.all(_promises);

      if (!hasSigningIdentity()) {
        adhocSign(path.join(APP_OUT_DIR, `${APP_NAME}.app`));
      }

      break;
    default:
      break;
  }

  return _promises;
};
