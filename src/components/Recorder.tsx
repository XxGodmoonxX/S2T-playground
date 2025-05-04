import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import OpenAI from 'openai'

// WebSocketサーバー設定
const WS_SERVER_URL = 'ws://localhost:3001';

// リアルタイム文字起こし用の型定義
interface RealtimeTranscription {
  text: string
  isFinal: boolean
}

interface RecorderProps {
  onTranscriptionReceived: (text: string) => void
  setIsLoading: (isLoading: boolean) => void
}

const Recorder: React.FC<RecorderProps> = ({ onTranscriptionReceived, setIsLoading }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState<number>(0)
  const [isRealtime, setIsRealtime] = useState<boolean>(true)
  const [realtimeText, setRealtimeText] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-transcribe')
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const openaiRef = useRef<OpenAI | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // WebSocket関連のRef
  const webSocketRef = useRef<WebSocket | null>(null)
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const audioIntervalRef = useRef<number | null>(null)
  
  // 集約した文字起こしテキスト
  const transcriptionTextRef = useRef<string>('')
  
  // OpenAIクライアントの初期化
  useEffect(() => {
    openaiRef.current = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here',
      dangerouslyAllowBrowser: true // フロントエンドでの使用を許可（本番環境では推奨されません）
    })
    
    return () => {
      // WebSocketのクリーンアップ
      cleanupWebSocket();
      
      // AudioContextのクリーンアップ
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error)
        audioContextRef.current = null
      }
      
      // タイマーのクリーンアップ
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      // 音声処理インターバルのクリーンアップ
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }
      
      // マイクストリームの停止
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
    }
  }, [])
  
  // WebSocketのクリーンアップ
  const cleanupWebSocket = () => {
    if (webSocketRef.current) {
      if (webSocketRef.current.readyState === WebSocket.OPEN) {
        webSocketRef.current.close();
      }
      webSocketRef.current = null;
    }
    
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    
    // インターバルのクリーンアップを追加
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
  }
  
  // WebSocketの初期化と接続
  const initWebSocket = () => {
    // 既存のWebSocket接続をクリーンアップ
    cleanupWebSocket();
    
    // 新しいWebSocket接続を作成
    const ws = new WebSocket(WS_SERVER_URL);
    webSocketRef.current = ws;
    
    // WebSocket接続イベント
    ws.onopen = () => {
      console.log('WebSocket接続が確立されました');
      
      // セッション開始メッセージを送信
      ws.send(JSON.stringify({
        type: 'start',
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        model: selectedModel
      }));
    };
    
    // WebSocketからのメッセージ受信
    ws.onmessage = (event) => {
      try {
        console.log('WebSocketからメッセージを受信:', event.data.substring(0, 100));
        const data = JSON.parse(event.data);
        console.log('パースされたメッセージ:', data);
        
        // 文字起こし結果の処理
        if (data.text !== undefined) {
          const text = data.text.trim();
          console.log('文字起こしテキスト受信:', text, 'isFinal:', data.isFinal);
          
          if (text) {
            // isFinalフラグがある場合は最終結果
            if (data.isFinal) {
              transcriptionTextRef.current += ' ' + text;
              const finalText = transcriptionTextRef.current.trim();
              console.log('最終テキストを設定:', finalText);
              setRealtimeText(finalText);
              onTranscriptionReceived(finalText);
            } else {
              // 中間結果は表示のみを更新
              const updatedText = transcriptionTextRef.current + ' ' + text;
              console.log('中間テキストを更新:', updatedText);
              setRealtimeText(updatedText);
            }
          }
        }
        
        // エラーメッセージの処理
        if (data.type === 'error') {
          console.error('WebSocketエラー:', data.message);
          setError(`リアルタイム文字起こしエラー: ${data.message}`);
        }
        
        // 接続終了メッセージの処理
        if (data.type === 'connection_closed') {
          console.log('WebSocket接続が終了しました:', data.message);
        }
      } catch (e) {
        console.error('WebSocketメッセージの解析エラー:', e, '元データ:', event.data.substring(0, 200));
      }
    };
    
    // WebSocketエラーハンドリング
    ws.onerror = (event) => {
      console.error('WebSocketエラー:', event);
      setError('WebSocket接続でエラーが発生しました。サーバーが起動しているか確認してください。');
    };
    
    // WebSocket接続終了
    ws.onclose = (event) => {
      console.log('WebSocket接続が終了しました:', event);
      if (isRecording && isRealtime) {
        setError('WebSocket接続が切断されました。再接続中...');
        // 再接続を試みる
        setTimeout(() => {
          if (isRecording && isRealtime) {
            initWebSocket();
          }
        }, 2000);
      }
    };
    
    return ws;
  };
  
  // 録音時間のタイマー処理
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording])
  
  // フォーマット変換関数（秒数を「MM:SS」形式に変換）
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 録音開始処理を修正
  const startRecording = async () => {
    try {
      setError(null)
      setAudioBlob(null)
      setRecordingTime(0)
      setRealtimeText('')
      transcriptionTextRef.current = ''
      audioChunksRef.current = []
      onTranscriptionReceived('')
      
      // マイクの設定を指定
      const constraints = { 
        audio: {
          channelCount: 1, // モノラル
          sampleRate: 16000, // 16kHz (OpenAIの推奨レート)
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      }
      
      console.log('マイク取得を試みます:', constraints)
      
      try {
        // マイクストリームの取得
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream
        
        // オーディオトラック情報を出力
        const audioTracks = stream.getAudioTracks()
        console.log(`取得したオーディオトラック: ${audioTracks.length}個`)
        audioTracks.forEach((track, i) => {
          console.log(`トラック ${i+1}:`, track.label, track.getSettings())
        })
        
        if (isRealtime) {
          // リアルタイムモードではWebSocketを使用
          try {
            // WebSocket接続を初期化
            initWebSocket();
            
            // AudioContextの初期化
            const audioContext = new AudioContext({
              sampleRate: 16000
            });
            audioContextRef.current = audioContext;
            
            // マイク入力ソースの作成
            const source = audioContext.createMediaStreamSource(stream);
            
            // 代替の音声処理方法を使用
            // 定期的なインターバルを使って音声データを処理
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            
            const bufferLength = 4096;
            const dataArray = new Float32Array(bufferLength);
            
            audioIntervalRef.current = window.setInterval(() => {
              if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
                // 音声データの取得
                analyser.getFloatTimeDomainData(dataArray);
                
                // PCM 16bit形式に変換
                const pcm16 = new Int16Array(dataArray.length);
                for (let i = 0; i < dataArray.length; i++) {
                  // Float32 [-1.0,1.0] を Int16 [-32768,32767] に変換
                  pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(dataArray[i] * 32768)));
                }
                
                // WebSocketでバイナリデータを送信
                webSocketRef.current.send(pcm16.buffer);
              }
            }, 100); // 100msごとに音声データを送信
            
            // 録音フラグを設定
            setIsRecording(true);
            setIsLoading(true);
          } catch (wsError) {
            console.error('WebSocketストリーミング初期化失敗:', wsError);
            setError('WebSocketの初期化に失敗しました。通常の録音モードに切り替えます。');
            
            // WebSocket失敗時は通常の録音に切り替え
            initializeNormalRecording(stream);
          }
        } else {
          // バッチモード - 通常の録音を使用
          initializeNormalRecording(stream);
        }
      } catch (initialError) {
        console.warn('標準設定でのマイク取得に失敗。フォールバック設定を試みます:', initialError);
        
        // フォールバック: より単純な設定で再試行
        const fallbackConstraints = { 
          audio: true // シンプルな設定
        }
        
        try {
          const stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          streamRef.current = stream;
          console.log('フォールバック設定でマイク取得に成功しました');
          
          // フォールバックモードでは通常の録音を使用
          initializeNormalRecording(stream);
        } catch (fallbackError) {
          console.error('フォールバックマイク取得にも失敗:', fallbackError);
          setError('マイクへのアクセスができませんでした。ブラウザの設定でマイクの使用を許可してください。');
        }
      }
    } catch (err) {
      console.error('録音の開始に失敗しました:', err);
      setError('マイクへのアクセスができませんでした。ブラウザの設定でマイクの使用を許可してください。');
    }
  }
  
  // 通常の録音初期化（WebSocketを使用しない場合）
  const initializeNormalRecording = (stream: MediaStream) => {
    // より安全なMIME形式を使用
    let mimeType = undefined; // デフォルト設定を使用
    
    // ブラウザサポートによってはWebMを優先
    if (MediaRecorder.isTypeSupported('audio/webm')) {
      mimeType = 'audio/webm'; // WebMはほとんどのブラウザで動作
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      mimeType = 'audio/mp4';
    }
    
    try {
      if (mimeType) {
        console.log(`録音に使用するMIME type: ${mimeType}`);
        mediaRecorderRef.current = new MediaRecorder(stream, { 
          mimeType,
          audioBitsPerSecond: 128000 // 128kbps
        });
      } else {
        console.log('特定のMIME typeを指定せず、デフォルト設定を使用します');
        mediaRecorderRef.current = new MediaRecorder(stream); // デフォルト設定
      }
      
      console.log(`MediaRecorderのMIME type: ${mediaRecorderRef.current.mimeType}`);
      
      // 録音データ取得
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        // 録音停止時の処理
        if (audioChunksRef.current.length === 0) {
          console.error('録音データがありません');
          setError('録音データの取得に失敗しました。もう一度試してください。');
          return;
        }
        
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        console.log(`録音完了: ${audioChunksRef.current.length} チャンク, MIME: ${mimeType}`);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(`録音Blobサイズ: ${audioBlob.size} バイト`);
        
        if (audioBlob.size < 1000) {
          console.error('録音データが小さすぎます');
          setError('録音データが小さすぎます。もう少し長く録音してください。');
          return;
        }
        
        setAudioBlob(audioBlob);
      };
      
      // 録音開始
      mediaRecorderRef.current.start();
      console.log('バッチモードで録音を開始しました');
      setIsRecording(true);
    } catch (recorderError) {
      console.error('MediaRecorder初期化エラー:', recorderError);
      setError('録音デバイスの初期化に失敗しました。ブラウザの設定を確認してください。');
    }
  }

  // 録音停止処理を修正
  const stopRecording = () => {
    // WebSocketのクリーンアップ
    cleanupWebSocket();
    
    // AudioContextのクリーンアップ
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    
    // 通常の録音停止
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setIsLoading(false);
    
    // マイクのストリームを停止
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }

  // OpenAI APIに音声を送信して文字起こしを取得（バッチ処理）
  const transcribeAudio = async () => {
    if (!audioBlob || !openaiRef.current) return
    
    setIsLoading(true)
    
    try {
      // 音声データのMIMEタイプを取得
      let mimeType = audioBlob.type || 'audio/webm'
      console.log(`元の音声ファイル形式: ${mimeType}, サイズ: ${audioBlob.size} バイト`)
      
      // コーデック指定を削除
      if (mimeType.includes(';')) {
        mimeType = mimeType.split(';')[0]
        console.log(`修正後の音声形式: ${mimeType}`)
      }
      
      // 一貫したファイル名とMIMEタイプ
      const fileName = `recording_${Date.now()}.webm`
      
      // 音声データが小さすぎる場合はエラー
      if (audioBlob.size < 5000) {
        throw new Error('録音データが短すぎます。より長い音声を録音してください。')
      }
      
      try {
        // Blob→File変換
        const audioFile = new File([audioBlob], fileName, { type: mimeType })
        console.log(`APIに送信: ファイル名=${fileName}, MIME=${mimeType}, サイズ=${audioFile.size}バイト`)
        
        // OpenAI API呼び出し
        const transcription = await openaiRef.current.audio.transcriptions.create({
          file: audioFile,
          model: selectedModel,
          response_format: 'verbose_json'
        })
        
        // レスポンス処理
        if (transcription && 'text' in transcription) {
          const text = transcription.text.trim()
          console.log('文字起こし完了:', text)
          onTranscriptionReceived(text)
        } else {
          console.warn('予期しないレスポンス形式:', transcription)
          throw new Error('APIからの応答が期待と異なります')
        }
      } catch (e) {
        console.error('API呼び出し中のエラー:', e)
        throw e
      }
    } catch (err: any) {
      console.error('文字起こしに失敗しました:', err)
      
      let errorMessage = '文字起こし処理中にエラーが発生しました。'
      
      // 詳細なエラーメッセージを構築
      if (err?.response?.data?.error?.message) {
        errorMessage += `\nエラー詳細: ${err.response.data.error.message}`
      } else if (err?.message) {
        errorMessage += `\nエラー: ${err.message}`
        
        // 一般的なエラーメッセージに対応する詳細情報
        if (err.message.includes('Audio file might be corrupted')) {
          errorMessage += '\n\n考えられる原因:\n- 音声形式がサポートされていない\n- マイクの設定に問題がある\n- イヤホンマイクとブラウザの互換性に問題がある'
        } else if (err.message.includes('timeout') || err.message.includes('aborted')) {
          errorMessage += '\n\nリクエストがタイムアウトしました。インターネット接続を確認して再試行してください。'
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 dark:text-white">音声録音</h2>
      
      <div className="flex flex-col items-center">
        {/* モデル選択 */}
        <div className="mb-4 w-full">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            文字起こしモデル
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isRecording}
            className="block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="gpt-4o-transcribe">GPT-4o Transcribe</option>
            <option value="gpt-4o-mini-transcribe">GPT-4o Mini Transcribe</option>
          </select>
        </div>
        
        {/* リアルタイム切り替え */}
        <div className="mb-4 flex items-center">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={isRealtime}
              onChange={() => setIsRealtime(!isRealtime)}
              disabled={isRecording}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-gray-300">
              リアルタイム文字起こし {isRealtime && "(WebSocket)"}
            </span>
          </label>
        </div>
        
        {/* 録音時間表示 */}
        <div className="text-2xl font-mono my-4 dark:text-white">
          {formatTime(recordingTime)}
        </div>
        
        {/* 録音コントロールボタン */}
        <div className="flex space-x-4 my-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-6 py-2 rounded-full font-medium ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isRecording ? '停止' : '録音開始'}
          </button>
          
          {audioBlob && !isRecording && !isRealtime && (
            <button
              onClick={transcribeAudio}
              className="px-6 py-2 rounded-full bg-green-500 hover:bg-green-600 text-white font-medium"
            >
              文字起こし
            </button>
          )}
        </div>
        
        {/* 音声波形表示 */}
        {isRecording && (
          <div className="flex items-center justify-center space-x-1 h-10 my-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-blue-500 rounded-full animate-pulse"
                style={{
                  height: `${20 + Math.random() * 30}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              ></div>
            ))}
          </div>
        )}
        
        {/* リアルタイム文字起こしテキスト */}
        {isRealtime && isRecording && (
          <div className="w-full mt-4 text-sm text-gray-600 dark:text-gray-300 border p-2 rounded bg-gray-50 dark:bg-gray-800 max-h-20 overflow-y-auto">
            {realtimeText || "音声を認識しています..."}
          </div>
        )}
        
        {/* 録音済みの音声プレビュー */}
        {audioBlob && !isRecording && (
          <div className="w-full mt-4">
            <audio 
              controls 
              src={URL.createObjectURL(audioBlob)} 
              className="w-full"
            />
          </div>
        )}
        
        {/* エラーメッセージ */}
        {error && (
          <div className="text-red-500 mt-4 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default Recorder 