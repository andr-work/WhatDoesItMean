import { Clear } from '@mui/icons-material';
import {
  Avatar,
  Box,
  ClickAwayListener,
  Divider,
  IconButton,
  Stack,
  Typography,
  Chip,
  Skeleton,
  Grow,
} from '@mui/material';
import { useState } from 'react';

export interface DialogBoxProps {
  originText: string;
  partOfSpeech: string;
  description: string;
  similarText1: string;
  similarText2: string;
  similarText3: string;
  onClose: () => void;
  loading?: boolean;
}

export const DialogBox = (props: DialogBoxProps) => {
  const [opened, setOpened] = useState(true);
  const IconUrl = chrome.runtime.getURL('meanAI.svg');

  const handleClickAway = () => {
    setOpened(false);
    props.onClose();
  };

  return opened ? (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Grow in={opened} style={{ transformOrigin: '0 0 0' }} timeout={300}>
        <Box
          sx={{
            p: 3,
            width: 400,
            backgroundColor: '#ffffff',
            borderRadius: 4,
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.05)',
            fontFamily: '"Inter", sans-serif',
          }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ width: '100%' }}>
              <Avatar src={IconUrl} sx={{ width: 32, height: 32, bgcolor: 'transparent' }} variant="rounded" />
              {props.loading ? (
                <Skeleton variant="text" width="60%" height={32} />
              ) : (
                <Typography
                  variant="h6"
                  color="textPrimary"
                  sx={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
                  {props.originText}
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <IconButton size="small" onClick={handleClickAway} sx={{ color: 'text.secondary' }}>
                <Clear fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Divider sx={{ my: 1.5, opacity: 0.6 }} />

          <Stack spacing={2} textAlign="left">
            <Box>
              {props.loading ? (
                <>
                  <Skeleton variant="rounded" width={60} height={24} sx={{ mb: 1 }} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="90%" />
                  <Skeleton variant="text" width="40%" />
                </>
              ) : (
                <>
                  <Chip
                    label={props.partOfSpeech}
                    size="small"
                    sx={{
                      mb: 1,
                      fontWeight: 600,
                      color: 'primary.main',
                      bgcolor: 'primary.50',
                      fontSize: '0.75rem',
                      height: 24,
                    }}
                  />
                  <Typography variant="body2" color="textPrimary" sx={{ lineHeight: 1.6, fontSize: '0.95rem' }}>
                    {props.description}
                  </Typography>
                </>
              )}
            </Box>

            {(props.loading || props.similarText1 || props.similarText2 || props.similarText3) && (
              <Box>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: 'block', mb: 1, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Similar
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {props.loading ? (
                    <>
                      <Skeleton variant="rounded" width={80} height={24} />
                      <Skeleton variant="rounded" width={80} height={24} />
                      <Skeleton variant="rounded" width={80} height={24} />
                    </>
                  ) : (
                    <>
                      {props.similarText1 && (
                        <Chip label={props.similarText1} size="small" variant="outlined" sx={{ borderRadius: 1.5 }} />
                      )}
                      {props.similarText2 && (
                        <Chip label={props.similarText2} size="small" variant="outlined" sx={{ borderRadius: 1.5 }} />
                      )}
                      {props.similarText3 && (
                        <Chip label={props.similarText3} size="small" variant="outlined" sx={{ borderRadius: 1.5 }} />
                      )}
                    </>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      </Grow>
    </ClickAwayListener>
  ) : null;
};
