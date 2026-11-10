import { mixins } from '../../../styles/js';

export const styles = (theme) => ({
  subHeading: {
    ...mixins({ theme }).noDrag,
    ...mixins({ theme }).noselect,
    marginTop: 15,
  },
  instructions: {
    listStyle: `none`,
    color: theme.palette.lightText1Color,
    lineHeight: '24px',
    marginTop: 15,
    paddingLeft: 0,
    marginBottom: 15,
  },
  generateLogsBtnWrapper: {},
  generateLogsBtn: {
    marginTop: 0,
    ...mixins({ theme }).btnPositive,
  },
  issuesLink: {
    fontWeight: `bold`,
    cursor: `pointer`,
  },
});
