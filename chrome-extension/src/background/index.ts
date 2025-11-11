/* eslint-disable @typescript-eslint/no-explicit-any */

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'explain',
    title: '選択したテキストを簡単に説明',
    contexts: ['selection'],
  });
});

const pendingMessages: Record<number, any[]> = {};

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !info.selectionText) {
    return;
  }

  switch (info.menuItemId) {
    case 'explain': {
      // Chrome Prompt APIを使用
      const LanguageModel = (globalThis as any).LanguageModel;

      if (!LanguageModel) {
        console.error('Prompt API is not available');
        break;
      }

      let session: any = null;
      try {
        const params = {
          initialPrompts: [
            {
              role: 'system',
              content:
                'You are a helpful assistant that explains text in simple and short, easy-to-understand language.',
            },
          ],
        };

        session = await LanguageModel.create(params);

        const schema = {
          originText: info.selectionText,
          partOfSpeech: 'string',
          description: 'string',
          exaple1: 'string',
          exaple2: 'string',
          exaple3: 'string',
        };

        const prompt = `explain the following text in same language: ${info.selectionText}`;
        const result = await session.prompt(prompt, {
          responseConstraint: schema,
        });

        let parsedResult;

        try {
          parsedResult = JSON.parse(result);
        } catch {
          parsedResult = { description: result };
        }

        console.log(parsedResult);

        // React が ready になるまで pendingMessages に保存
        if (!pendingMessages[tab.id]) pendingMessages[tab.id] = [];
        pendingMessages[tab.id].push(parsedResult);

        if (tab.id !== undefined) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW',
            data: parsedResult,
          });
        }
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

// Content Script から ready ping を受信
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CONTENT_READY' && sender.tab?.id) {
    const tabId = sender.tab.id;
    const messages = pendingMessages[tabId] || [];
    messages.forEach(m => {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW', data: m });
    });
    pendingMessages[tabId] = [];
  }
});
