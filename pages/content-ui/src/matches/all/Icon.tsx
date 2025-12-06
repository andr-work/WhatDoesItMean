import { Avatar, IconButton } from '@mui/material';

export interface IconProps {
  handleClick: () => void;
}

export const Icon = (props: IconProps) => (
  <IconButton
    onClick={props.handleClick}
    size="small"
    onMouseDown={e => {
      e.preventDefault();
    }}>
    <Avatar src={chrome.runtime.getURL('meanAI.svg')} sx={{ width: 24, height: 24, bgcolor: 'white' }}>
      AI
    </Avatar>
  </IconButton>
);
