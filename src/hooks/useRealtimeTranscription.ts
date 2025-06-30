import { useState, useRef, useCallback, useEffect } from 'react';

export interface RealtimeState {
  isConnected: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  currentTranscription: string;
  finalTranscriptions: string[];
  error: string | null;
}

export const useRealtimeTranscription = () => {
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isRecording: false,
    isTranscribing: false,
    currentTranscription: '',
    finalTranscriptions: [],
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // WebSocket接続を確立
  const connect = useCallback(async (apiKey: string) => {
    try {
      setState((prev: RealtimeState) => ({ ...prev, error: null }));
      
      const wsUrl = `wss://api.openai.com/v1/realtime?intent=transcription`;
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
            input_audio_noise_reduction: {
              type: 'near_field',
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
  }, []);

  // WebSocketメッセージの処理
  const handleWebSocketMessage = useCallback((message: any) => {
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
  }, []);

  // 録音開始
  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setState(prev => ({ ...prev, error: 'WebSocket接続が確立されていません' }));
      return;
    }

    try {
      // マイクアクセスを取得
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      streamRef.current = stream;
      
      // AudioContextを設定
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // ScriptProcessorNodeでリアルタイム音声処理
      processorRef.current = audioContextRef.current.createScriptProcessor(1024, 1, 1);
      
      processorRef.current.onaudioprocess = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Float32ArrayをPCM16に変換
        const pcm16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcm16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        
        // Base64エンコード
        const audioData = Array.from(new Uint8Array(pcm16Data.buffer));
        const base64Data = btoa(String.fromCharCode(...audioData));
        
        // Realtime APIに送信
        const audioMessage = {
          type: 'input_audio_buffer.append',
          audio: base64Data
        };
        
        wsRef.current.send(JSON.stringify(audioMessage));
      };
      
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      setState(prev => ({ ...prev, isRecording: true }));
      console.log('🎙️ リアルタイム録音開始');
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: 'マイクアクセスに失敗しました。マイクの使用を許可してください。' 
      }));
    }
  }, []);

  // 録音停止
  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
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
  }, []);

  // 接続切断
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    stopRecording();
    
    setState(prev => ({ 
      ...prev, 
      isConnected: false,
      currentTranscription: '',
      finalTranscriptions: []
    }));
  }, [stopRecording]);

  // リセット
  const reset = useCallback(() => {
    setState(prev => ({ 
      ...prev,
      currentTranscription: '',
      finalTranscriptions: [],
      error: null
    }));
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    reset,
  };
};