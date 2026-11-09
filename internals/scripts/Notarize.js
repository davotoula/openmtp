const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { notarize: electronNotarize } = require('@electron/notarize');

exports.default = async (context) => {
  const { electronPlatformName, appOutDir } = context;

  // Called here rather than at module top level on purpose. electron-builder
  // 26 requires every hook module before packing starts, so a top-level
  // dotenv.config() would put APPLEID/CSC_* into process.env before AfterPack
  // runs, and AfterPack would then see a signing identity the builder config
  // never had and skip its ad-hoc signature.
  dotenv.config();

  if (process.env.ELECTRON_NOTARIZE === 'NO') {
    return;
  }

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);
  const appleId = process.env.APPLEID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const appleTeamId = process.env.APPLE_TEAM_ID;

  // Notarization needs a paid Apple Developer account. Without one the build
  // still has to succeed: AfterPack has already applied an ad-hoc signature so
  // the bundle is at least structurally valid for Gatekeeper.
  if (!appleId || !appleIdPassword || !appleTeamId) {
    console.info(
      'Skipping notarization: no Apple credentials found. The app is ad-hoc signed instead.'
    );

    return;
  }

  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  console.info(`Notarizing ${appPath}`);

  // @electron/notarize 3 takes only appPath plus one credential set; the
  // bundle id is read from the app itself.
  // eslint-disable-next-line no-return-await
  return await electronNotarize({
    appPath,
    appleId,
    appleIdPassword,
    teamId: appleTeamId,
  });
};
