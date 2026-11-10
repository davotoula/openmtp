import clp from 'console-log-plus';
import os, { EOL } from 'os';
import { IS_PROD } from '../constants/env';
import { APP_NAME, APP_VERSION } from '../constants/meta';
import { PATHS } from '../constants/paths';
import { appendFileAsync } from '../helpers/fileOps';
import { dateTimeUnixTimestampNow } from './date';
import { sentryService } from '../services/sentry';
import { getDeviceInfo } from '../helpers/deviceInfo';
import { isEmpty } from './funcs';
import { getMtpModeSetting } from '../helpers/settings';
import { redactHomeDirectory } from '../helpers/logs';
import { isConsoleError } from './errors';
import { getMachineId } from '../helpers/identifiers';

const { logFile } = PATHS;

// An entry carries the MTP mode from settings.json, and settingsStorage logs
// its own read failures through here. Without this guard a missing or corrupt
// settings.json (no profile yet, or one that cannot be created) recurses until
// the stack overflows, then spins: the process hangs and ignores SIGTERM.
// A log call made while an entry is being composed is not written to the file.
let isComposingEntry = false;

export const log = {
  printBoundary(char = '═', length = 70, allowInProd = false) {
    if (IS_PROD && !allowInProd) {
      return;
    }

    let output = char;

    for (let i = 0; i < length; i += 1) {
      output += char;
    }

    console.info(output);
  },
  info(e, title = ``, logError = false, allowInProd = false, report = false) {
    this.doLog(e, title, null, logError, report, false);

    if (IS_PROD && !allowInProd) {
      return;
    }

    if (!isEmpty(title)) {
      try {
        clp({
          color: 'white',
          background: 'green',
          message: title,
        });
      } catch (_) {
        console.info(title);
      }
    }

    if (!isEmpty(e)) {
      try {
        clp({
          color: 'blue',
          message: e,
        });
      } catch (_) {
        console.info(e);
      }
    }
  },

  /**
   *
   * @param e - error
   * @param title - Title
   * @param logError - should log the error to the log file
   * @param allowInProd - display the error in production
   * @param report - should report the error to crashanalytics services
   */
  error(e, title = `Log`, logError = true, allowInProd = false, report = true) {
    this.doLog(e, title, null, logError, report, true);

    if (IS_PROD && !allowInProd) {
      return;
    }

    if (!isEmpty(title)) {
      try {
        clp({
          color: 'white',
          background: 'red',
          message: title,
        });
      } catch (_) {
        console.error(title);
      }
    }

    try {
      clp({
        color: 'red',
        message: e,
      });
    } catch (_) {
      console.error(e);
    }
  },

  /**
   *
   * @param {any} e - error
   * @param {boolean} logError - should log the error to the log file
   * @param {string|null}  customError
   * @param {any} report - should report the error to crashanalytics services
   * @param {string|null} title
   * @param {boolean} isError - is an error or info
   */ async doLog(
    e,
    title = null,
    customError = null,
    logError = true,
    report = true,
    isError = true
  ) {
    if (logError === false || isComposingEntry) {
      return null;
    }

    const sectionSeperator = `=============================================================`;

    const logType = isError ? `Error` : `Info`;
    let err = `${logType} title: ${title}${EOL}${logType} body: ${EOL}${e?.toString()}${EOL}`;

    // if [e] is an Instance of Error then stringify it
    if (isConsoleError(e)) {
      err += `${logType} Stacktrace: ${EOL}${JSON.stringify(e.stack)}${EOL}`;
    }

    if (!isEmpty(customError)) {
      err += `Custom ${logType}: ${customError?.toString()}${EOL}`;
    }

    // [Privacy] redact home directory path from the error log
    err = redactHomeDirectory(err);

    let _deviceInfoStrigified = '';
    let deviceInfo;
    let mtpMode;
    let uuid;

    isComposingEntry = true;

    try {
      deviceInfo = getDeviceInfo();
      mtpMode = getMtpModeSetting();
      uuid = getMachineId();
    } finally {
      isComposingEntry = false;
    }

    if (!isEmpty(deviceInfo)) {
      Object.keys(deviceInfo).forEach((a) => {
        const item = deviceInfo[a];

        _deviceInfoStrigified += `${a}: ${item}${EOL}`;
      });
    }

    const _date = `Date Time: ${dateTimeUnixTimestampNow({
      monthInletters: true,
    })}`;
    const _appInfo = `${EOL}App Name: ${APP_NAME}${EOL}App Version: ${APP_VERSION}${EOL}UUID: ${uuid}`;
    const _mtpMode = `${EOL}MTP Mode: ${mtpMode}`;
    const _osInfo = `OS type: ${os.type()} / OS Platform: ${os.platform()} / OS Release: ${os.release()}`;
    const _error = `${sectionSeperator}${EOL}${_appInfo}${EOL}${_mtpMode}${EOL}${_date}${EOL}${_osInfo}${EOL}${_deviceInfoStrigified}${logType}: ${err}${EOL}${sectionSeperator}${EOL}`;

    appendFileAsync(logFile, _error);

    if (report) {
      let errorToReport = e;

      if (e && !isConsoleError(e)) {
        // [Privacy] redact home directory path from the error log
        const _e = redactHomeDirectory(e);

        errorToReport = new Error(_e);
      }

      await sentryService.report({ error: errorToReport, title, mtpMode });
    }
  },
};
