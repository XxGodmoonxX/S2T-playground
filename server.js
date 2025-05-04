import express from 'express';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// 環境変数の読み込み
dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// CORSを設定
app.use(cors());
app.use(bodyParser.json());

// ルートへのアクセス - 生存確認用
app.get('/', (req, res) => {
  res.send('Audio Streaming Server is running');
});

// WebSocket接続の管理
const clients = new Map();

// WebSocketサーバーの処理
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  let openaiWs = null;
  
  console.log(`クライアント接続: ${clientId}`);
  
  // クライアントの状態を保存
  clients.set(clientId, {
    ws,
    openaiWs,
    audioChunks: [],
    connected: true
  });
  
  // クライアントからのメッセージ処理
  ws.on('message', async (message) => {
    const client = clients.get(clientId);
    
    // JSONメッセージの場合（設定情報など）
    if (typeof message === 'string' || message.toString().startsWith('{')) {
      try {
        // 文字列に変換
        const messageStr = typeof message === 'string' ? message : message.toString();
        const data = JSON.parse(messageStr);
        
        // セッション開始リクエスト
        if (data.type === 'start') {
          // OpenAI WebSocket接続の初期化
          await initializeOpenAIWebSocket(clientId, data.apiKey, data.model);
          ws.send(JSON.stringify({ type: 'start_acknowledgement' }));
        }
      } catch (e) {
        console.error('JSONメッセージ処理エラー:', e);
        ws.send(JSON.stringify({ type: 'error', message: e.message }));
      }
    } else {
      // バイナリデータ（音声チャンク）の場合
      const client = clients.get(clientId);
      
      if (client && client.openaiWs && client.openaiWs.readyState === WebSocket.OPEN) {
        try {
          // バイナリデータをBase64エンコード
          const audioBuffer = Buffer.from(message);
          const base64Audio = audioBuffer.toString('base64');
          
          // OpenAIのWebSocketに音声データを転送
          client.openaiWs.send(JSON.stringify({
            type: "input_audio_buffer.append",
            audio: base64Audio
          }));
        } catch (err) {
          console.error('音声データ送信エラー:', err);
        }
      } else {
        // OpenAI WebSocketがまだ接続されていない場合、一時的にバッファリング
        client.audioChunks.push(message);
      }
    }
  });
  
  // 接続終了イベント
  ws.on('close', () => {
    const client = clients.get(clientId);
    console.log(`クライアント切断: ${clientId}`);
    
    if (client && client.openaiWs) {
      client.openaiWs.close();
    }
    
    clients.delete(clientId);
  });
  
  // エラーイベント
  ws.on('error', (error) => {
    console.error(`クライアント ${clientId} エラー:`, error);
  });
});

// OpenAI WebSocket接続の初期化
async function initializeOpenAIWebSocket(clientId, apiKey, model) {
  if (!apiKey) {
    throw new Error('APIキーが指定されていません');
  }
  
  const client = clients.get(clientId);
  if (!client) return;
  
  // 既存の接続を閉じる
  if (client.openaiWs) {
    client.openaiWs.close();
  }
  
  // OpenAI WebSocket APIへの接続
  // v1/audio/speech-to-text/streamingエンドポイントが存在しないため、v1/realtimeエンドポイントを使用
  const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?intent=transcription', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'realtime=v1'
    }
  });
  
  openaiWs.on('open', () => {
    console.log(`OpenAI WebSocket接続成功: ${clientId}`);
    
    // 設定情報の送信 - 新しいAPIフォーマットに合わせて更新
    const config = {
      "type": "transcription_session.update",
      "session": {
        "input_audio_format": "pcm16",
        "input_audio_transcription": {
          "model": model || 'gpt-4o-transcribe',
          "language": "ja"
        },
        "turn_detection": {
          "type": "server_vad",
          "threshold": 0.5,
          "prefix_padding_ms": 300,
          "silence_duration_ms": 500
        }
      }
    };
    
    // 構成情報の送信
    openaiWs.send(JSON.stringify(config));
    
    // バッファに溜まった音声チャンクを送信
    if (client.audioChunks.length > 0) {
      client.audioChunks.forEach(chunk => {
        // 新しいAPIでは音声データをbase64エンコードして送信
        const base64Audio = Buffer.from(chunk).toString('base64');
        openaiWs.send(JSON.stringify({
          "type": "input_audio_buffer.append",
          "audio": base64Audio
        }));
      });
      client.audioChunks = [];
    }
  });
  
  openaiWs.on('message', (data) => {
    try {
      // OpenAIからのレスポンスを解析
      const message = JSON.parse(data.toString());
      console.log('OpenAI APIからのメッセージ:', message.type);
      
      // 文字起こし結果を抽出してクライアントに転送
      if (message.type === 'conversation.item.input_audio_transcription.delta') {
        // 中間結果の処理
        if (message.delta && message.delta.trim()) {
          if (client.ws && client.ws.readyState === WebSocket.OPEN) {
            // フロントエンドで期待される形式に合わせる
            client.ws.send(JSON.stringify({
              text: message.delta.trim(),
              isFinal: false
            }));
          }
        }
      } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
        // 最終結果の処理
        if (message.transcript && message.transcript.trim()) {
          if (client.ws && client.ws.readyState === WebSocket.OPEN) {
            // フロントエンドで期待される形式に合わせる
            client.ws.send(JSON.stringify({
              text: message.transcript.trim(),
              isFinal: true
            }));
          }
        }
      } else if (message.type === 'error') {
        console.error(`OpenAI API エラー:`, message.error);
        if (client.ws && client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'error',
            message: message.error?.message || 'OpenAI APIからエラーが返されました'
          }));
        }
      } else {
        // その他のメッセージタイプのログ記録
        console.log(`OpenAI メッセージ:`, message.type);
      }
    } catch (e) {
      console.error('メッセージ転送エラー:', e);
      console.error('元のメッセージ:', data.toString().substring(0, 200) + '...');
    }
  });
  
  openaiWs.on('error', (error) => {
    console.error(`OpenAI WebSocketエラー (${clientId}):`, error);
    
    if (client.ws && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'error',
        message: '音声認識サービスとの接続中にエラーが発生しました'
      }));
    }
  });
  
  openaiWs.on('close', () => {
    console.log(`OpenAI WebSocket切断: ${clientId}`);
    
    if (client.ws && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'connection_closed',
        message: '音声認識サービスとの接続が終了しました'
      }));
    }
  });
  
  // クライアント情報を更新
  client.openaiWs = openaiWs;
}

// サーバー起動
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
}); 