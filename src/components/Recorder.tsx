import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import OpenAI from 'openai'

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
  
  // OpenAIクライアントの初期化
  useEffect(() => {
    openaiRef.current = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here',
      dangerouslyAllowBrowser: true // フロントエンドでの使用を許可（本番環境では推奨されません）
    })
  }, [])
  
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

  // リアルタイム文字起こし処理
  const processAudioChunk = async (audioChunk: Blob) => {
    if (!isRealtime || !openaiRef.current) return
    
    try {
      const transcription = await openaiRef.current.audio.transcriptions.create({
        file: new File([audioChunk], 'chunk.webm', { type: 'audio/webm' }),
        model: selectedModel
      })
      
      if (transcription.text) {
        const newText = transcription.text.trim()
        if (newText) {
          const updatedText = realtimeText + ' ' + newText
          setRealtimeText(updatedText)
          onTranscriptionReceived(updatedText)
        }
      }
    } catch (err) {
      console.error('リアルタイム文字起こしに失敗しました:', err)
    }
  }

  // 録音開始処理
  const startRecording = async () => {
    try {
      setError(null)
      setAudioBlob(null)
      setRecordingTime(0)
      setRealtimeText('')
      audioChunksRef.current = []
      onTranscriptionReceived('')
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      // 通常の録音データ取得
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
          
          // リアルタイムモードの場合、チャンクごとに文字起こし
          if (isRealtime) {
            processAudioChunk(event.data)
          }
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
      }
      
      // 短い時間間隔でデータを取得（リアルタイム処理用）
      mediaRecorderRef.current.start(isRealtime ? 3000 : undefined)
      setIsRecording(true)
      
      if (isRealtime) {
        setIsLoading(true)
      }
    } catch (err) {
      console.error('録音の開始に失敗しました:', err)
      setError('マイクへのアクセスができませんでした。ブラウザの設定でマイクの使用を許可してください。')
    }
  }

  // 録音停止処理
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsLoading(false)
      
      // マイクのストリームを停止
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }

  // OpenAI APIに音声を送信して文字起こしを取得（バッチ処理）
  const transcribeAudio = async () => {
    if (!audioBlob || !openaiRef.current) return
    
    setIsLoading(true)
    
    try {
      const transcription = await openaiRef.current.audio.transcriptions.create({
        file: new File([audioBlob], 'recording.webm', { type: 'audio/webm' }),
        model: selectedModel
      })
      
      if (transcription.text) {
        onTranscriptionReceived(transcription.text)
      }
    } catch (err) {
      console.error('文字起こしに失敗しました:', err)
      setError('文字起こし処理中にエラーが発生しました。もう一度試してください。')
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
              リアルタイム文字起こし
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