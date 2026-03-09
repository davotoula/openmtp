import React, { PureComponent, Fragment } from 'react';
import classnames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import LinearProgress from '@material-ui/core/LinearProgress';
import Dialog from '@material-ui/core/Dialog';
import Tooltip from '@material-ui/core/Tooltip';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import Button from '@material-ui/core/Button';
import Collapse from '@material-ui/core/Collapse';
import LiveHelpIcon from '@material-ui/icons/LiveHelp';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import { styles } from '../styles/ProgressBar';
import { checkIf } from '../../../utils/checkIf';

class ProgressBar extends PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      failedFilesExpanded: false,
    };
  }

  _handleToggleFailedFiles = () => {
    this.setState((prev) => ({
      failedFilesExpanded: !prev.failedFilesExpanded,
    }));
  };

  _renderCompletedStats() {
    const { classes: styles, completedStats, onDismiss } = this.props;
    const { failedFilesExpanded } = this.state;

    return (
      <Fragment>
        <DialogContent>
          <div className={styles.statsContainer}>
            <div className={styles.statsRow}>
              <span className={styles.statsLabel}>Files transferred</span>
              <span className={styles.statsValue}>
                {completedStats.filesTransferred} / {completedStats.totalFiles}
              </span>
            </div>
            {completedStats.filesSkipped > 0 && (
              <div className={styles.statsRow}>
                <span className={styles.statsLabel}>Files skipped</span>
                <span className={styles.statsValue}>
                  {completedStats.filesSkipped}
                </span>
              </div>
            )}
            <div className={styles.statsRow}>
              <span className={styles.statsLabel}>Total size</span>
              <span className={styles.statsValue}>
                {completedStats.totalSize}
              </span>
            </div>
            <div className={styles.statsRow}>
              <span className={styles.statsLabel}>Elapsed time</span>
              <span className={styles.statsValue}>
                {completedStats.elapsedTime}
              </span>
            </div>
            <div className={styles.statsRow}>
              <span className={styles.statsLabel}>Average speed</span>
              <span className={styles.statsValue}>
                {completedStats.averageSpeed}
              </span>
            </div>
          </div>

          {completedStats.failedFiles && completedStats.failedFiles.length > 0 && (
            <div className={styles.failedFilesSection}>
              <Button
                onClick={this._handleToggleFailedFiles}
                className={styles.failedFilesToggle}
                size="small"
              >
                {completedStats.failedFiles.length} failed{' '}
                {completedStats.failedFiles.length === 1 ? 'file' : 'files'}
                {failedFilesExpanded ? (
                  <ExpandLessIcon fontSize="small" />
                ) : (
                  <ExpandMoreIcon fontSize="small" />
                )}
              </Button>
              <Collapse in={failedFilesExpanded}>
                <div className={styles.failedFilesList}>
                  {completedStats.failedFiles.map((f, i) => (
                    <DialogContentText
                      // eslint-disable-next-line react/no-array-index-key
                      key={i}
                      className={styles.failedFileItem}
                    >
                      {f}
                    </DialogContentText>
                  ))}
                </div>
              </Collapse>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onDismiss} className={styles.btnPositive}>
            OK
          </Button>
        </DialogActions>
      </Fragment>
    );
  }

  _renderProgress() {
    const { classes: styles, values, bottomText, children } = this.props;

    return (
      <DialogContent>
        {values.map((a, index) => {
          return (
            // eslint-disable-next-line react/no-array-index-key
            <Fragment key={index}>
              <DialogContentText
                className={classnames(styles.dialogContentTextTop, {
                  [styles.dialogFixMultipleProgressPadding]: index > 0,
                })}
              >
                {a.bodyText1 ?? ''}
              </DialogContentText>

              <LinearProgress
                color="secondary"
                variant={a.variant ?? 'determinate'}
                value={a.percentage}
              />

              <DialogContentText className={styles.dialogContentTextBottom}>
                {a.bodyText2 ?? ''}
              </DialogContentText>
            </Fragment>
          );
        })}

        {bottomText && <div className={styles.bottomText}>{bottomText}</div>}
        {children && <div className={styles.childrenWrapper}>{children}</div>}
      </DialogContent>
    );
  }

  render() {
    const {
      classes: styles,
      values,
      trigger,
      titleText,
      fullWidthDialog,
      maxWidthDialog,
      helpText,
      completedStats,
    } = this.props;

    const isCompleted = !!completedStats;

    if (!isCompleted) {
      checkIf(values, 'array');
    }

    return (
      <Dialog
        disableBackdropClick={!isCompleted}
        disableEscapeKeyDown={!isCompleted}
        className={styles.root}
        open={trigger}
        fullWidth={fullWidthDialog}
        maxWidth={maxWidthDialog}
        aria-labelledby="progressbar-dialogbox"
      >
        <DialogTitle>
          <span className={styles.dialogTitleInnerWrapper}>
            <span className={styles.titleText}>{titleText}</span>
            {!isCompleted && helpText && (
              <span>
                <Tooltip title={helpText}>
                  <LiveHelpIcon className={styles.helpText} />
                </Tooltip>
              </span>
            )}
          </span>
        </DialogTitle>

        {isCompleted ? this._renderCompletedStats() : this._renderProgress()}
      </Dialog>
    );
  }
}

export default withStyles(styles)(ProgressBar);
