import { APP_GITHUB_ISSUES_URL } from '../constants/meta';

// Shown in its own window from a data: URL with no navigation guard, so a
// link here would load the page inside that window. Print the URL instead.
export const loadProfileErrorHtml = `
        <html lang="en-gb">
          <body>
              <h3>Unable to load profile files. Please restart the app. </h3>
              <p>If the problem persists, report it on GitHub:</p>
              <p>${APP_GITHUB_ISSUES_URL}</p>
          </body>
        </html>
      `;
