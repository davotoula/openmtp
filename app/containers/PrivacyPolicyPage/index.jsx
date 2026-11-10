import React, { Component } from 'react';
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Helmet } from 'react-helmet';
import {
  APP_GITHUB_ISSUES_URL,
  APP_GITHUB_URL,
  APP_NAME,
  APP_TITLE,
} from '../../constants/meta';
import { openExternalUrl } from '../../utils/url';
import { resetOverFlowY } from '../../utils/styleResets';
import { PRIVACY_POLICY_PAGE_TITLE } from '../../templates/privacyPolicyPage';
import { styles } from './styles';
import { PATHS } from '../../constants/paths';

class PrivacyPolicyPage extends Component {
  componentWillMount() {
    resetOverFlowY();
  }

  render() {
    const { classes: styles } = this.props;

    return (
      <div className={styles.root}>
        <Helmet titleTemplate={`%s - ${APP_TITLE}`}>
          <title>{PRIVACY_POLICY_PAGE_TITLE}</title>
        </Helmet>
        <Typography variant="h5" className={styles.heading}>
          Privacy policy for {APP_NAME}
        </Typography>
        <div className={styles.body}>
          <p>
            {APP_NAME} is an open-source fork of OpenMTP, published at&nbsp;
            <a
              className={styles.a}
              onClick={(events) => {
                openExternalUrl(APP_GITHUB_URL, events);
              }}
            >
              {APP_GITHUB_URL}
            </a>
            .
          </p>
          <p>
            <strong>No analytics, no crash reports.</strong> The app does not
            collect usage statistics and does not send crash reports.
          </p>
          <p>
            <strong>Updates.</strong> The app contacts GitHub to check for and
            download updates. To stop the automatic check, turn off Settings
            &gt; Updates &gt; &quot;Automatically check for updates&quot;.
            &quot;Check For Updates&quot; in the app menu still checks when you
            choose it.
          </p>
          <p>
            <strong>Your files.</strong> Files are transferred only between this
            Mac and the connected device. They are not uploaded anywhere.
          </p>
          <p>
            <strong>Logs.</strong> The app writes error logs to &quot;
            {PATHS.logDir}&quot; on this Mac and deletes old ones after about
            two months. They leave your Mac only if you attach them to a GitHub
            issue, and an issue and its attachments are public.
          </p>
          <p>
            <strong>Questions.</strong> Open an issue at&nbsp;
            <a
              className={styles.a}
              onClick={(events) => {
                openExternalUrl(APP_GITHUB_ISSUES_URL, events);
              }}
            >
              {APP_GITHUB_ISSUES_URL}
            </a>
            .
          </p>
        </div>
      </div>
    );
  }
}

const mapDispatchToProps = (dispatch, __) => bindActionCreators({}, dispatch);

const mapStateToProps = (_, __) => {
  return {};
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles)(PrivacyPolicyPage));
