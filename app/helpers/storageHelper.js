import { PATHS } from '../constants/paths';
import Storage from '../classes/Storage';

const { settingsFile, identifierFile } = PATHS;

export const identifierStorage = new Storage(identifierFile, true);

export const settingsStorage = new Storage(settingsFile, false);

// For the logger's own settings reads. settingsStorage reports its failures
// through log.error, so the logger reading through it recursed without end
// when settings.json was missing or corrupt, hanging the process.
export const settingsStorageForLog = new Storage(settingsFile, true);
