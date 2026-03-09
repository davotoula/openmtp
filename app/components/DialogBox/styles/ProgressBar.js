import { mixins } from '../../../styles/js';

export const styles = (theme) => ({
  root: {
    flexGrow: 1,
  },
  dialogFixMultipleProgressPadding: {
    marginTop: 35,
  },
  dialogContentTextTop: {
    marginBottom: 10,
    fontSize: 14,
  },
  dialogContentTextBottom: {
    marginTop: 10,
    fontSize: 14,
  },
  dialogTitleInnerWrapper: {
    alignItems: `center`,
  },
  helpText: {
    float: `right`,
  },
  titleText: {
    float: `left`,
    fontSize: 17,
  },
  bottomText: {
    fontSize: 10,
    fontWeight: 400,
    padding: '0px 0 15px 0',
  },
  childrenWrapper: {
    padding: '0px 0 5px 0',
  },
  statsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '8px 0',
  },
  statsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 14,
  },
  statsLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statsValue: {
    fontWeight: 500,
  },
  failedFilesSection: {
    marginTop: 12,
  },
  failedFilesToggle: {
    textTransform: 'none',
    color: '#f44336',
    padding: '4px 8px',
    fontSize: 13,
  },
  failedFilesList: {
    maxHeight: 150,
    overflowY: 'auto',
    padding: '8px 0',
  },
  failedFileItem: {
    fontSize: 12,
    padding: '2px 8px',
    wordBreak: 'break-all',
  },
  btnPositive: {
    ...mixins({ theme }).btnPositive,
  },
});
