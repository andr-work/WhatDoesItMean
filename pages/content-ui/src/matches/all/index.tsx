import { DialogBox } from './DialogBox';
import { Icon } from './Icon';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import type { DialogBoxProps } from './DialogBox';

// Global listener setup
chrome.runtime.onMessage.addListener(message => {
  // Dispatch a custom event that the React app can listen to
  const event = new CustomEvent('chrome-extension-message', { detail: message });
  document.dispatchEvent(event);
  // Return false as we don't need to send a response asynchronously here
  return false;
});

const App = () => {
  const [data, setData] = useState<DialogBoxProps | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mode, setMode] = useState<'dialog' | 'icon' | 'idle'>('idle');
  const [iconPosition, setIconPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  // Use refs to access current state inside event listeners without re-binding
  const modeRef = useRef(mode);
  const showIcon = true; // Force true for debugging: showIconStorage.getSnapshot() ?? true;

  // Update ref when mode changes
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const handleDialogClose = () => {
    setData(null);
    setMode('idle');
  };

  const handleIconClick = () => {
    if (selectedText) {
      // Show loading state immediately
      setData({
        originText: selectedText,
        partOfSpeech: '',
        description: '',
        similarText1: '',
        similarText2: '',
        similarText3: '',
        onClose: handleDialogClose,
        loading: true,
      });
      setMode('dialog');

      chrome.runtime.sendMessage({
        type: 'EXPLAIN_TEXT',
        text: selectedText,
      });
    }
    // setMode('idle'); // Don't go to idle, go to dialog (set above)
    setIconPosition(null);
  };

  // React マウント完了時に ready ping を送信
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'CONTENT_READY' });
  }, []);

  // Listen for messages globally
  useEffect(() => {
    const handleCustomEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const message = customEvent.detail;

      if (message.type === 'SHOW' && message.data?.description) {
        const newData: DialogBoxProps = {
          originText: message.data.originText || '',
          partOfSpeech: message.data.partOfSpeech || '',
          description: message.data.description || '',
          similarText1: message.data.similar1 || '',
          similarText2: message.data.similar2 || '',
          similarText3: message.data.similar3 || '',
          onClose: handleDialogClose,
          loading: false, // Turn off loading
        };

        // Use the current selection rect if we don't have one (or if we want to update it)
        // Note: If the user clicked the icon, the selection might still be active or we might have saved it.
        // But here we just want to show the dialog.
        // If we are in 'idle' mode (after icon click), we need a rect.
        // We can try to get it from selection again or use a stored one.
        // For now, let's try getting it from selection if missing.
        if (!rect) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            setRect(selection.getRangeAt(0).getBoundingClientRect());
          }
        }

        setData(newData);
        setMode('dialog');
      }
    };

    document.addEventListener('chrome-extension-message', handleCustomEvent);
    return () => document.removeEventListener('chrome-extension-message', handleCustomEvent);
  }, [rect]);

  useEffect(() => {
    const handleMouseUp = (event: MouseEvent) => {
      // Ignore clicks on our own UI
      if ((event.target as HTMLElement).closest('chrome-extension-boilerplate-react-vite-content-view-root')) {
        return;
      }

      const selection = window.getSelection();
      const selectionStr = selection?.toString().trim() || '';
      const currentMode = modeRef.current;

      if (selectionStr.length > 0) {
        // Text selected
        setSelectedText(selectionStr);
        const range = selection!.getRangeAt(0);
        const newRect = range.getBoundingClientRect();

        if (newRect.width > 0 && newRect.height > 0) {
          setRect(newRect);
          setIconPosition({ x: newRect.right, y: newRect.bottom });
          setMode('icon');

          // Trigger prefetch
          chrome.runtime.sendMessage({ type: 'PREFETCH_SESSION' });
        }
      } else {
        // No text selected (clicked away)
        if (currentMode === 'icon' || currentMode === 'dialog') {
          // If we are in dialog mode, we might want to keep it open unless clicked outside?
          // For now, let's close icon if clicked away. Dialog usually has its own close button or overlay.
          // If user clicks outside dialog, we usually close it.
          if (currentMode === 'icon') {
            setMode('idle');
            setIconPosition(null);
          }
        }
      }
    };

    // Add listener once. We don't depend on 'mode' anymore for attachment.
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []); // Empty dependency array!

  return (
    <>
      {mode === 'dialog' && data && (data.description || data.loading) && (
        <div style={{ position: 'absolute', width: '100%', left: 0, top: 0, zIndex: 2147483550 }}>
          <div
            style={{
              position: 'absolute',
              left: rect ? window.scrollX + rect.left : 0,
              top: rect ? window.scrollY + rect.bottom + 10 : 0,
              zIndex: 2147483550,
              pointerEvents: 'auto',
              backgroundColor: 'white',
            }}>
            <DialogBox {...data} />
          </div>
        </div>
      )}
      {mode === 'icon' && iconPosition !== null && showIcon && (
        <div
          style={{
            position: 'absolute',
            left: window.scrollX + iconPosition.x,
            top: window.scrollY + iconPosition.y,
            zIndex: 2147483550,
            pointerEvents: 'auto',
          }}>
          <Icon handleClick={handleIconClick} />
        </div>
      )}
    </>
  );
};

const init = () => {
  if (!document.body) {
    setTimeout(init, 100);
    return;
  }

  const root = document.createElement('chrome-extension-boilerplate-react-vite-content-view-root');
  root.style.position = 'absolute';
  root.style.top = '0';
  root.style.left = '0';
  root.style.width = '100%';
  root.style.height = '100%';
  root.style.minHeight = '100vh';
  root.style.zIndex = '2147483647';
  root.style.pointerEvents = 'none';
  document.body.append(root);

  const shadowRoot = root.attachShadow({ mode: 'open' });
  const shadowContainer = document.createElement('div');
  shadowContainer.id = 'shadow-root';
  shadowContainer.style.position = 'absolute';
  shadowContainer.style.top = '0';
  shadowContainer.style.left = '0';
  shadowContainer.style.width = '100%';
  shadowContainer.style.height = '100%';
  shadowContainer.style.pointerEvents = 'none';
  shadowContainer.style.zIndex = '2147483647';
  shadowRoot.appendChild(shadowContainer);

  const cache = createCache({ key: 'shadow-css', prepend: true, container: shadowRoot });
  const theme = createTheme({});

  createRoot(shadowContainer).render(
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </CacheProvider>,
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
