/* eslint-disable @typescript-eslint/no-explicit-any */

chrome.runtime.onInstalled.addListener(async () => {
  chrome.contextMenus.create({
    id: 'explain',
    title: '選択したテキストを簡単に説明',
    contexts: ['selection'],
  });
});

const pendingMessages: Record<number, any[]> = {};

const systemPrompt =
  'You are a helpful dictionary assistant. You explain English words simply for learners. You MUST return only valid JSON. Do not include any other text.';

// Global session
let globalSession: any = null;

// Initialize global session
const initializeGlobalSession = async () => {
  if (globalSession) return globalSession;

  try {
    globalSession = await LanguageModel!.create({
      initialPrompts: [
        {
          role: 'system',
          content: systemPrompt,
        },
      ],
    });
    return globalSession;
  } catch (e) {
    console.error('[Background] Failed to initialize global session:', e);
    throw e;
  }
};

// check model status (now just tries to init global session)
const checkModelStatus = async () => {
  try {
    await initializeGlobalSession();
  } catch (e) {
    console.error('[Background] Model check/init failed:', e);
    // Don't re-throw to allow retry later
  }
};

// check availability status when page loaded
const checkModelOnPageLoad = async () => {
  try {
    await checkModelStatus();
  } catch (e) {
    console.error('[Background] Page load model check failed:', e);
  }
};

const explainText = async (text: string, tabId: number) => {
  let session: any = null;

  try {
    // Ensure global session exists
    if (!globalSession) {
      await initializeGlobalSession();
    }

    // Clone session for this specific request
    // Fallback: if clone not available, use globalSession directly (not recommended for concurrency) or create new.
    if (globalSession.clone) {
      session = await globalSession.clone();
    } else {
      // If clone is missing (older API), we might have to create fresh or use global (risk of context pollution).
      // Let's create fresh as fallback to be safe if clone isn't there.
      console.warn('[Background] .clone() not found, creating fresh session');
      session = await LanguageModel!.create({
        initialPrompts: [{ role: 'system', content: systemPrompt }],
      });
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

    let result;
    if (session.prompt) {
      result = await session.prompt(prompt);
    } else {
      // Fallback if signature differs
      result = (await session.promptStreaming) ? await session.promptStreaming(prompt) : 'Error: No prompt method';
    }

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

    // 5. Send to Tab
    if (!pendingMessages[tabId]) pendingMessages[tabId] = [];
    pendingMessages[tabId].push(parsedResult);

    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW',
        data: parsedResult,
      });
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
    // Always destroy the CLONED session after use
    if (session && session !== globalSession && session.destroy) {
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

    checkModelOnPageLoad();

    const messages = pendingMessages[tabId] || [];
    messages.forEach(m => {
      chrome.tabs.sendMessage(tabId, { type: 'SHOW', data: m });
    });
    pendingMessages[tabId] = [];
  } else if (msg.type === 'EXPLAIN_TEXT' && sender.tab?.id && msg.text) {
    explainText(msg.text, sender.tab.id);
  }
});
