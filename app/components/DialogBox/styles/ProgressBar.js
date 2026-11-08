import { mixins } from '../../../styles/js';

export const styles = (theme) => ({
  root: {
    flexGrow: 1,
  },
  dialogFixMultipleProgressPadding: {
    marginTop: 35,
  },
  // equal width digits, so that the progress text doesn't shift as the numbers change
  progressContent: {
    fontVariantNumeric: 'tabular-nums',
  },
  dialogContentTextTop: {
    marginBottom: 10,
    fontSize: 14,
  },
  dialogContentTextBottom: {
    marginTop: 10,
    fontSize: 14,
  },
  // "Progress: [sent] / [total] [details]" with fixed width size columns, so that the sizes and the details
  // after them stay in place as the sizes change, and line up across progress rows
  progressColumns: {
    display: 'grid',
    // 11ch fits the longest size, "1023.99 MB"
    gridTemplateColumns: 'max-content 11ch max-content 11ch 1fr',
    columnGap: 6,
    whiteSpace: 'nowrap',
  },
  sizeColumn: {
    textAlign: 'right',
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
    color: theme.palette.text.secondary,
  },
  statsValue: {
    fontWeight: 500,
  },
  btnPositive: {
    ...mixins({ theme }).btnPositive,
  },
});
