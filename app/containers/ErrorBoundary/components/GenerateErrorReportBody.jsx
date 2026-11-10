import React, { PureComponent, Fragment } from 'react';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import TouchAppIcon from '@material-ui/icons/TouchApp';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import SendIcon from '@material-ui/icons/Send';
import UsbIcon from '@material-ui/icons/Usb';
import BugReportIcon from '@material-ui/icons/BugReport';
import Button from '@material-ui/core/Button';
import { DEVICES_LABEL } from '../../../constants';
import { DEVICE_TYPE } from '../../../enums';
import { openExternalUrl } from '../../../utils/url';

export default class GenerateErrorReportBody extends PureComponent {
  render() {
    const { styles, zippedLogFileBaseName, issuesUrl, onGenerateErrorLogs } =
      this.props;

    return (
      <Fragment>
        <List>
          <ListItem>
            <ListItemIcon>
              <UsbIcon />
            </ListItemIcon>
            <ListItemText
              primary={`Unlock your ${
                DEVICES_LABEL[DEVICE_TYPE.mtp]
              } and connect it to your ${
                DEVICES_LABEL[DEVICE_TYPE.local]
              } via USB`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <FileCopyIcon />
            </ListItemIcon>
            <ListItemText primary="Turn on the 'File Transfer' mode" />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <TouchAppIcon />
            </ListItemIcon>
            <ListItemText
              primary="Click the 'GENERATE ERROR LOGS' button below"
              secondary="This saves the logs to your Desktop and opens the GitHub Issues page"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <AttachFileIcon />
            </ListItemIcon>
            <ListItemText
              primary="Open a new issue and attach the generated Error Log file"
              secondary={`Check Desktop Folder for ${zippedLogFileBaseName}`}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <SendIcon />
            </ListItemIcon>
            <ListItemText primary="Describe the problem and submit the issue" />
          </ListItem>
        </List>
        <Button
          variant="outlined"
          color="primary"
          className={styles.generateLogsBtn}
          onClick={onGenerateErrorLogs}
        >
          GENERATE ERROR LOGS
        </Button>
        <List component="div">
          <ListItem>
            <ListItemIcon>
              <BugReportIcon />
            </ListItemIcon>
            <ListItemText
              primary={
                <a
                  onClick={(events) => {
                    openExternalUrl(issuesUrl, events);
                  }}
                  className={styles.issuesLink}
                >
                  {issuesUrl}
                </a>
              }
              secondary={`Attach ${zippedLogFileBaseName} to your issue; an issue and its attachments are public.`}
            />
          </ListItem>
        </List>
      </Fragment>
    );
  }
}
