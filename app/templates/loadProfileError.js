import { APP_GITHUB_ISSUES_URL } from '../constants/meta';

/**
 * Shown in its own window from a data: URL. The navigation guard sends the
 * link to the default browser and keeps the window where it is.
 *
 * @param {object} colors - from the current theme palette, so the page matches
 *   the window's backgroundColor in light and dark mode
 * @param {string} colors.background
 * @param {string} colors.text - the link too, so it keeps the text's contrast
 */
export const loadProfileErrorHtml = ({ background, text }) => `
        <html lang="en-gb">
          <head>
            <style>
              body {
                background: ${background};
                color: ${text};
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              }
              a {
                color: inherit;
              }
            </style>
          </head>
          <body>
              <h3>Unable to load profile files. Please restart the app. </h3>
              <p>If the problem persists, report it on GitHub:</p>
              <p><a href="${APP_GITHUB_ISSUES_URL}">${APP_GITHUB_ISSUES_URL}</a></p>
          </body>
        </html>
      `;
