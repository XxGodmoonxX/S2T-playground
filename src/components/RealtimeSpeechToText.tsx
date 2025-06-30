import { useState, useRef } from 'react';

interface RealtimeState {
  isConnected: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  currentTranscription: string;
  finalTranscriptions: string[];
  error: string | null;
}

export const RealtimeSpeechToText = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isRecording: false,
    isTranscribing: false,
    currentTranscription: '',
    finalTranscriptions: [],
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // WebSocket接続
  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setState(prev => ({ ...prev, error: 'OpenAI APIキーを入力してください' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, error: null }));
      
      // WebSocketのURLにAPIキーを含める（簡易実装）
      const wsUrl = `wss://api.openai.com/v1/realtime?intent=transcription&authorization=${encodeURIComponent(apiKey)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('🔗 Realtime API接続成功');
        setState(prev => ({ ...prev, isConnected: true }));
        
        // セッション設定を送信
        const sessionConfig = {
          type: 'transcription_session.update',
          session: {
            input_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'gpt-4o-transcribe',
              language: 'ja',
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000,
            },
          }
        };
        
        ws.send(JSON.stringify(sessionConfig));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('WebSocketメッセージの解析エラー:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocketエラー:', error);
        setState(prev => ({ 
          ...prev, 
          error: 'WebSocket接続エラーが発生しました',
          isConnected: false 
        }));
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket接続が閉じられました');
        setState(prev => ({ 
          ...prev, 
          isConnected: false,
          isRecording: false,
          isTranscribing: false
        }));
      };

      wsRef.current = ws;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'WebSocket接続に失敗しました'
      }));
    }
  };

  // WebSocketメッセージ処理
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'transcription_session.created':
        console.log('✅ 文字起こしセッション作成完了');
        break;
        
      case 'transcription_session.updated':
        console.log('✅ 文字起こしセッション更新完了');
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('🎤 音声検出開始');
        setState(prev => ({ ...prev, isTranscribing: true }));
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('🔇 音声検出停止');
        setState(prev => ({ ...prev, isTranscribing: false }));
        break;
        
      case 'conversation.item.input_audio_transcription.delta':
        const delta = message.delta || '';
        setState(prev => ({ 
          ...prev, 
          currentTranscription: prev.currentTranscription + delta 
        }));
        break;
        
      case 'conversation.item.input_audio_transcription.completed':
        const transcript = message.transcript || '';
        setState(prev => ({ 
          ...prev, 
          finalTranscriptions: [...prev.finalTranscriptions, transcript],
          currentTranscription: ''
        }));
        break;
        
      case 'error':
        console.error('Realtime APIエラー:', message.error);
        setState(prev => ({ 
          ...prev, 
          error: `API Error: ${message.error?.message || 'Unknown error'}` 
        }));
        break;
        
      default:
        console.log('受信メッセージ:', message.type);
    }
  };

  // 録音開始
  const handleStartRecording = async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setState(prev => ({ ...prev, error: 'WebSocket接続が確立されていません' }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      streamRef.current = stream;
      setState(prev => ({ ...prev, isRecording: true }));
      console.log('🎙️ リアルタイム録音開始');
      
      // 実際の音声処理は後で実装
      // 今は概念実証として接続とUIの動作確認
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'マイクアクセスに失敗しました。マイクの使用を許可してください。' 
      }));
    }
  };

  // 録音停止
  const handleStopRecording = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setState(prev => ({ 
      ...prev, 
      isRecording: false,
      isTranscribing: false
    }));
    
    console.log('🎙️ リアルタイム録音停止');
  };

  // 切断
  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    handleStopRecording();
  };

  // リセット
  const handleReset = () => {
    setState(prev => ({ 
      ...prev,
      currentTranscription: '',
      finalTranscriptions: [],
      error: null
    }));
  };

  // 全文字起こし結果をコピー
  const handleCopyAll = () => {
    const allText = state.finalTranscriptions.join(' ');
    navigator.clipboard.writeText(allText);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        🔥 Realtime Speech to Text (GPT-4o Transcribe)
      </h2>

      {/* API Key Input */}
      <div className="mb-6">
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
          OpenAI API Key
        </label>
        <div className="flex gap-2">
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {!state.isConnected ? (
            <button
              onClick={handleConnect}
              disabled={!apiKey.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-md transition-colors duration-200"
            >
              接続
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors duration-200"
            >
              切断
            </button>
          )}
        </div>
      </div>

      {/* 接続状態 */}
      <div className="mb-6 p-4 rounded-lg bg-gray-50">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${state.isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="font-medium">
            {state.isConnected ? 'Realtime API接続中' : '未接続'}
          </span>
        </div>
      </div>

      {/* Recording Controls */}
      {state.isConnected && (
        <div className="flex justify-center gap-4 mb-6">
          {!state.isRecording ? (
            <button
              onClick={handleStartRecording}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
            >
              <span className="w-3 h-3 bg-white rounded-full"></span>
              リアルタイム録音開始
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 animate-pulse"
            >
              <span className="w-3 h-3 bg-white rounded-full"></span>
              録音停止
            </button>
          )}

          <button
            onClick={handleReset}
            disabled={state.isRecording}
            className="px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            リセット
          </button>
        </div>
      )}

      {/* Status */}
      <div className="mb-6">
        {state.isRecording && (
          <div className="text-center text-blue-600 font-medium mb-2">
            🎙️ リアルタイム録音中... 話してください
          </div>
        )}
        {state.isTranscribing && (
          <div className="text-center text-green-600 font-medium">
            ⚡ リアルタイム文字起こし中...
          </div>
        )}
      </div>

      {/* Current Transcription */}
      {state.currentTranscription && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">現在の文字起こし:</h3>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 whitespace-pre-wrap">{state.currentTranscription}</p>
          </div>
        </div>
      )}

      {/* Final Transcriptions */}
      {state.finalTranscriptions.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-900">完了した文字起こし:</h3>
            <button
              onClick={handleCopyAll}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded transition-colors duration-200"
            >
              📋 全てコピー
            </button>
          </div>
          <div className="space-y-2">
            {state.finalTranscriptions.map((transcript, index) => (
              <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 whitespace-pre-wrap">{transcript}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">エラー:</p>
          <p className="text-red-700">{state.error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">🔥 Realtime API の特徴:</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>**リアルタイム処理**: 話しながら即座に文字起こし結果が表示</li>
          <li>**低遅延**: WebSocket接続による高速通信</li>
          <li>**音声活動検出**: 自動的に音声の開始・停止を検出</li>
          <li>**高精度**: GPT-4o Transcribeモデルによる高品質な文字起こし</li>
        </ul>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-amber-800 text-xs">
            <strong>⚠️ 注意</strong>: この実装は概念実証版です。実際の音声処理は追加実装が必要です。
          </p>
        </div>
      </div>
    </div>
  );
};