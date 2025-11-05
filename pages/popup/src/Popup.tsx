import { withErrorBoundary, withSuspense } from '@extension/shared';
import { showIconStorage } from '@extension/storage';
import { ErrorDisplay } from '@extension/ui';
import { Stack, Switch, Typography } from '@mui/material';
import { useState, useEffect } from 'react';

const Popup = () => {
  const [checked, setChecked] = useState(showIconStorage.getSnapshot() ?? false);

  useEffect(() => {
    showIconStorage.get().then(setChecked);
    const unsubscribe = showIconStorage.subscribe(async () => {
      showIconStorage.get().then(setChecked);
    });
    return () => {
      unsubscribe(); // *3
    };
  }, []);

  const handleToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.currentTarget.checked;
    setChecked(newValue);
    chrome.storage.sync.set({ showIcon: newValue });
    showIconStorage.set(newValue);
  };

  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" p={1}>
      <Typography variant="body1">拡張機能のアイコンを表示</Typography>
      <Switch checked={checked} onChange={handleToggle} color="success" />
    </Stack>
  );
};

export default withErrorBoundary(withSuspense(Popup, <div> Loading ... </div>), ErrorDisplay);
