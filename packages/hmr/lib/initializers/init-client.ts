import { DO_UPDATE, DONE_UPDATE, LOCAL_RELOAD_SOCKET_URL } from '../consts.js';
import MessageInterpreter from '../interpreter/index.js';

export default ({ id, onUpdate }: { id: string; onUpdate: () => void }) => {
  // WebSocketが利用可能かチェック（Service Worker環境では使用できない）
  if (typeof WebSocket === 'undefined') {
    return;
  }

  try {
    const ws = new WebSocket(LOCAL_RELOAD_SOCKET_URL);

    ws.onopen = () => {
      ws.addEventListener('message', event => {
        const message = MessageInterpreter.receive(String(event.data));

        if (message.type === DO_UPDATE && message.id === id) {
          onUpdate();
          ws.send(MessageInterpreter.send({ type: DONE_UPDATE }));
        }
      });
    };

    ws.onerror = () => {
      // HMRサーバーが起動していない場合は静かに失敗する
      // 開発時のみ使用される機能のため、エラーをログに出力しない
    };

    ws.onclose = () => {
      // 接続が閉じられた場合も静かに処理
    };
  } catch {
    // WebSocket接続に失敗した場合は無視（HMRは開発時のみ使用）
  }
};
