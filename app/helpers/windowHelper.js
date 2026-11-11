import { BrowserWindow } from 'electron';
import { urls } from 'nice-utils';
import { getAppThemeMode } from './theme';
import { getCurrentThemePalette } from '../containers/App/styles';
import { undefinedOrNull } from '../utils/funcs';
import { IS_RENDERER } from '../constants/env';
import { getRemoteWindow } from './remoteWindowHelpers';

const remote = getRemoteWindow();

export const getMainWindowMainProcess = () => {
  const _mainWindow = BrowserWindow.getAllWindows();

  if (typeof _mainWindow === 'undefined' || _mainWindow === null) {
    return null;
  }

  return BrowserWindow.getAllWindows()[_mainWindow.length - 1];
};

export const getMainWindowRendererProcess = () => {
  const _mainWindow = remote.BrowserWindow.getAllWindows();

  if (typeof _mainWindow === 'undefined' || _mainWindow === null) {
    return null;
  }

  return remote.BrowserWindow.getAllWindows()[_mainWindow.length - 1];
};

// Colours for a page shown straight in a window, without the app's theme.
export const getWindowColors = () => {
  const { background, primary } = getCurrentThemePalette(getAppThemeMode());

  return {
    background: background.paper,
    // paper is the primary colour in both palettes, so this is its contrast
    text: primary.contrastText,
  };
};

export const getWindowBackgroundColor = () => getWindowColors().background;

export const getCurrentWindowHash = () => {
  if (!IS_RENDERER) {
    return null;
  }

  const hash = urls().getHash();

  if (undefinedOrNull(hash) || hash === '') {
    return '/';
  }

  return hash;
};
