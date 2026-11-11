import { app, shell } from 'electron';
import { PATHS } from '../constants/paths';
import { log } from '../utils/log';

// Every app window runs with nodeIntegration and without contextIsolation, so
// a page loaded into one gets full Node access. This guard keeps each window
// on the app's own page: a link, a window.open or a file dropped outside the
// explorer panes either goes to the OS (http, https, mailto) or nowhere.

export const NAVIGATION_DECISION = {
  allow: 'allow',
  external: 'external',
  deny: 'deny',
};

// Schemes handed to shell.openExternal. On macOS openExternal launches whatever
// app handles a scheme, so anything not listed here is dropped.
const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

// Parsed with the hash removed: a #route is the same page.
const parseUrl = (value) => {
  try {
    const url = new URL(value);

    url.hash = '';

    return url;
  } catch {
    // An unparseable URL is expected input, not a fault: the caller denies it.
    return null;
  }
};

/**
 * Decide what to do with a navigation away from an app window.
 *
 * @param {string} targetUrl - where the window wants to go
 * @param {string|null} appPageUrl - the app's own page (PATHS.loadUrlPath);
 *   null when the caller allows no in-window navigation at all
 * @returns {string} a NAVIGATION_DECISION value
 */
export const decideNavigation = (targetUrl, appPageUrl) => {
  const target = parseUrl(targetUrl);

  if (!target) {
    return NAVIGATION_DECISION.deny;
  }

  const appPage = parseUrl(appPageUrl);

  // A reload, or a route change that is not hash-only.
  if (target.href === appPage?.href) {
    return NAVIGATION_DECISION.allow;
  }

  if (EXTERNAL_PROTOCOLS.has(target.protocol)) {
    return NAVIGATION_DECISION.external;
  }

  return NAVIGATION_DECISION.deny;
};

const handOff = (url, decision, source) => {
  const title = `navigationGuard -> ${source}`;

  if (decision === NAVIGATION_DECISION.external) {
    log.info(`Opening in the default browser: ${url}`, title, true, true);
    shell.openExternal(url).catch((e) => log.error(e, title, true, true));
  } else {
    // not reported: a denied URL can be a local file path
    log.error(`Blocked navigation to: ${url}`, title, true, true, false);
  }
};

const guardWebContents = (contents) => {
  // Only app windows. DevTools, extension background pages and the like
  // load their own pages and are left alone.
  if (contents.getType() !== 'window') {
    return;
  }

  contents.on('will-navigate', (event) => {
    const { url } = event;
    const decision = decideNavigation(url, PATHS.loadUrlPath);

    if (decision === NAVIGATION_DECISION.allow) {
      return;
    }

    event.preventDefault();
    handOff(url, decision, 'will-navigate');
  });

  contents.setWindowOpenHandler(({ url }) => {
    handOff(url, decideNavigation(url, null), 'setWindowOpenHandler');

    return { action: 'deny' };
  });
};

/**
 * Register once, in the main process, before any window is created.
 */
export const registerNavigationGuard = () => {
  app.on('web-contents-created', (_, contents) => guardWebContents(contents));
};
