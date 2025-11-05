chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'translation',
    title: '選択したテキストを翻訳',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'explain',
    title: '選択したテキストを簡単に説明',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (tab === undefined || !info.selectionText) {
    return;
  }

  switch (info.menuItemId) {
    case 'translation':
      console.log('選択されたテキスト: ' + info.selectionText);
      break;

    case 'explain': {
      // Chrome Prompt APIを使用
      // 複数の場所から取得を試す（サンプルコードではグローバルに利用可能）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LanguageModel = (globalThis as any).LanguageModel;

      if (!LanguageModel) {
        console.error('Prompt API is not available');
        break;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let session: any = null;
      try {
        // サンプルコードに合わせてパラメータを設定
        const params = {
          initialPrompts: [
            {
              role: 'system',
              content: 'You are a helpful assistant that explains text in simple, easy-to-understand language.',
            },
          ],
        };

        session = await LanguageModel.create(params);
        const prompt = `explain the following text: ${info.selectionText}`;
        const result = await session.prompt(prompt);
        console.log(result);
      } catch (error) {
        console.error('Error explaining text:', error);
      } finally {
        // セッションを確実に破棄
        if (session?.destroy) {
          await session.destroy();
        }
      }
      break;
    }
  }
});
