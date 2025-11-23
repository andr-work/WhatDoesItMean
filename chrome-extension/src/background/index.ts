/* eslint-disable @typescript-eslint/no-explicit-any */

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'explain',
    title: '選択したテキストを簡単に説明',
    contexts: ['selection'],
  });
});

const pendingMessages: Record<number, any[]> = {};
// Store prefetched sessions by tabId
const prefetchedSessions: Record<number, any> = {};

const createSession = async () => {
  console.log('[Background] Creating new session...');
  try {
    const capabilities = (globalThis as any).ai?.languageModel?.capabilities
      ? await (globalThis as any).ai.languageModel.capabilities()
      : null;

    if (capabilities && capabilities.available === 'no') {
      throw new Error('AI model not available');
    }

    const systemPrompt =
      'You are a helpful dictionary assistant. You explain English words simply for learners. You MUST return only valid JSON. Do not include any other text.';

    let session;
    if ((globalThis as any).ai?.languageModel) {
      // New API
      session = await (globalThis as any).ai.languageModel.create({
        systemPrompt: systemPrompt,
      });
    } else if ((globalThis as any).LanguageModel) {
      // Old API
      const params = {
        initialPrompts: [
          {
            role: 'system',
            content: systemPrompt,
          },
        ],
      };
      session = await (globalThis as any).LanguageModel.create(params);
    } else {
      throw new Error('Chrome Prompt API not found (window.ai or LanguageModel)');
    }
    console.log('[Background] Session created successfully');
    return session;
  } catch (e) {
    console.error('[Background] Failed to create session:', e);
    throw e;
  }
};

const prefetchSession = async (tabId: number) => {
  // If we already have a session for this tab, do nothing (or maybe check if it's valid?)
  if (prefetchedSessions[tabId]) {
    console.log('[Background] Session already prefetched for tab', tabId);
    return;
  }

  console.log('[Background] Starting warm-up (prefetch) for tab', tabId);
  try {
    const session = await createSession();
    prefetchedSessions[tabId] = session;
    console.log('[Background] Warm-up (prefetch) complete for tab', tabId);
  } catch (e) {
    console.error('[Background] Prefetch failed:', e);
  }
};

const explainText = async (text: string, tabId: number) => {
  console.log('[Background] explainText called with:', text);

  let session: any = null;

  try {
    // 1. Check for prefetched session
    if (prefetchedSessions[tabId]) {
      console.log('[Background] Using prefetched session for tab', tabId);
      session = prefetchedSessions[tabId];
      // Remove from cache so we don't reuse it indefinitely if we want fresh sessions per interaction
      // But user wanted "fast", so maybe we keep it?
      // The previous instruction was "disable connection pooling", which implies fresh sessions.
      // But "prefetch" implies we create it *for this interaction*.
      // So we should consume it.
      delete prefetchedSessions[tabId];
    } else {
      // Create fresh if not prefetched
      session = await createSession();
    }

    // 3. Prompt
    const prompt = `
Word: ${text}

Return a JSON object with this format:
{
  "originText": "${text}",
  "partOfSpeech": "noun/verb/etc",
  "description": "simple definition",
  "similar1": "synonym1",
  "similar2": "synonym2",
  "similar3": "synonym3"
}
`;
    console.log('[Background] Prompting:', prompt);

    let result;
    if (session.prompt) {
      result = await session.prompt(prompt);
    } else {
      // Fallback if signature differs
      result = (await session.promptStreaming) ? await session.promptStreaming(prompt) : 'Error: No prompt method';
    }

    console.log('[Background] Prompt result:', result);

    // 4. Parse Result
    let parsedResult;
    try {
      // Attempt to find JSON in the output if it's mixed with text
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : result;
      parsedResult = JSON.parse(jsonStr);
    } catch (e) {
      console.warn('[Background] Failed to parse JSON, using raw text', e);
      parsedResult = { description: result, originText: text };
    }

    // Ensure all fields exist
    parsedResult = {
      originText: text,
      partOfSpeech: parsedResult.partOfSpeech || 'Unknown',
      description: parsedResult.description || result,
      similar1: parsedResult.similar1 || '',
      similar2: parsedResult.similar2 || '',
      similar3: parsedResult.similar3 || '',
    };

    console.log('[Background] Final parsed result:', parsedResult);

    // 5. Send to Tab
    if (!pendingMessages[tabId]) pendingMessages[tabId] = [];
    pendingMessages[tabId].push(parsedResult);

    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW',
        data: parsedResult,
      });
      console.log('[Background] Message sent to tab', tabId);
    } catch (e) {
      console.error('[Background] Failed to send success message to tab:', e);
    }
  } catch (error: any) {
    console.error('[Background] Error explaining text:', error);
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW',
        data: {
          description: `Error: ${error.message || 'Unknown error occurred'}. Please ensure you have Chrome Canary with "Prompt API for Gemini Nano" enabled.`,
          originText: text,
        },
      });
    } catch (sendError) {
      console.error('[Background] Failed to send error message to tab:', sendError);
    }
  } finally {
    // Always destroy the session after use to ensure fresh state for next time (as requested by user previously)
    // Prefetching just moves the creation time earlier.
    if (session?.destroy) {
      await session.destroy();
    }
  }
};

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !info.selectionText) {
    return;
  }

  switch (info.menuItemId) {
    case 'explain': {
      await explainText(info.selectionText, tab.id);
      break;
    }
  }
});

// Content Script から ready ping を受信
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'CONTENT_READY' && sender.tab?.id) {
    const tabId = sender.tab.id;
    console.log('[Background] CONTENT_READY received from tab', tabId);

    // Warm up (prefetch) session on page load
    prefetchSession(tabId);

    const messages = pendingMessages[tabId] || [];
    messages.forEach(m => {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW', data: m });
    });
    pendingMessages[tabId] = [];
  } else if (msg.type === 'PREFETCH_SESSION' && sender.tab?.id) {
    console.log('[Background] PREFETCH_SESSION received from tab', sender.tab.id);
    prefetchSession(sender.tab.id);
  } else if (msg.type === 'EXPLAIN_TEXT' && sender.tab?.id && msg.text) {
    explainText(msg.text, sender.tab.id);
  }
});
