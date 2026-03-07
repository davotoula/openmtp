const { execSync } = require('child_process');
const { semverSatisfies } = require('./semver');

const requiredVersionRange = '>=6.x';

try {
  const npmVersion = execSync('npm -v').toString().trim();

  if (!semverSatisfies(npmVersion, requiredVersionRange)) {
    console.error(
      `Error: This project requires npm version ${requiredVersionRange}. You have version ${npmVersion}.`
    );
    process.exit(1);
  }

  console.info(`Using compatible npm version: ${npmVersion}`);
} catch (error) {
  console.error('Error checking npm version:', error);

  process.exit(1);
}

if (!/yarn\.js$/.test(process.env.npm_execpath || '')) {
  console.warn(
    "\u001b[33mYou don't seem to be using yarn. This could produce unexpected results.\u001b[39m"
  );
}
