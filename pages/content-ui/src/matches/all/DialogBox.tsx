import { Clear, ContentCopyOutlined, VolumeUp, Settings } from '@mui/icons-material';
import { Avatar, Box, ClickAwayListener, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';

export interface DialogBoxProps {
  originText: string;
  partOfSpeech: string;
  descriptionText: string;
  exampleText1: string;
  exampleText2: string;
  exampleText3: string;
  onClose: () => void;
}

export const DialogBox = (props: DialogBoxProps) => {
  const [opened, setOpened] = useState(true);
  const IconUrl = chrome.runtime.getURL('icon-128.png');

  const handleClickAway = () => {
    setOpened(false);
    props.onClose();
  };

  return opened ? (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box
        sx={{ p: 2, width: 450, backgroundColor: 'white', borderRadius: 2, boxShadow: '0px 0px 10px rgba(0,0,0,.3)' }}>
        <Stack direction="row" justifyContent="space-between" pb={1}>
          <Stack direction="row" alignItems="center" spacing={0}>
            <Avatar src={IconUrl} />
            <Typography variant="body1" color="textPrimary" sx={{ fontWeight: 'bold' }}>
              {props.originText}
            </Typography>
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="end" spacing={0}>
            <IconButton size="small">
              <Settings />
            </IconButton>
            <IconButton size="small" onClick={handleClickAway}>
              <Clear />
            </IconButton>
          </Stack>
        </Stack>
        <Divider />
        <Stack pt={1} spacing={1} textAlign="left">
          <Typography variant="body2" color="info">
            {props.partOfSpeech}
          </Typography>
          <Typography variant="body2" color="textPrimary">
            {props.descriptionText}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {props.exampleText1}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {props.exampleText2}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {props.exampleText3}
          </Typography>
          <Stack direction="row" justifyContent="flex-end" spacing={1} pr={2}>
            <Tooltip title="音声読み上げ" placement="top" arrow>
              <IconButton>
                <VolumeUp />
              </IconButton>
            </Tooltip>
            <Tooltip title="クリップボードにコピー" placement="top" arrow>
              <IconButton onClick={() => navigator.clipboard.writeText(props.descriptionText)}>
                <ContentCopyOutlined />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
    </ClickAwayListener>
  ) : null;
};
