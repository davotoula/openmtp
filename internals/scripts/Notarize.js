require('dotenv').config();

const path = require('path');
const fs = require('fs');
const { notarize: electronNotarize } = require('@electron/notarize');
const electronBuilderConfig = require('../../electron-builder-config');

const electronBuilderData = electronBuilderConfig();

const { ELECTRON_NOTARIZE } = process.env;

exports.default = async (context) => {
  const { electronPlatformName, appOutDir } = context;

  if (ELECTRON_NOTARIZE === 'NO') {
    return;
  }

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appBundleId = electronBuilderData.appId;
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

  console.info(`Notarizing ${appBundleId} found at ${appPath}`);

  // eslint-disable-next-line no-return-await
  return await electronNotarize({
    appBundleId,
    appPath,
    appleId,
    appleIdPassword,
    teamId: appleTeamId,
  });
};
