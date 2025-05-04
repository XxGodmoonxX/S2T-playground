import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'

interface RecorderProps {
  onTranscriptionReceived: (text: string) => void
  setIsLoading: (isLoading: boolean) => void
}

const Recorder: React.FC<RecorderProps> = ({ onTranscriptionReceived, setIsLoading }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState<number>(0)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  
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

  // 録音開始処理
  const startRecording = async () => {
    try {
      setError(null)
      setAudioBlob(null)
      setRecordingTime(0)
      audioChunksRef.current = []
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
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
      
      // マイクのストリームを停止
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  // OpenAI APIに音声を送信して文字起こしを取得
  const transcribeAudio = async () => {
    if (!audioBlob) return
    
    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      formData.append('model', 'whisper-1')
      
      // APIキーとエンドポイントの設定
      // 注意: 実際の実装では、APIキーはサーバーサイドで管理すべきです
      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here'}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      )
      
      if (response.data && response.data.text) {
        onTranscriptionReceived(response.data.text)
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
          
          {audioBlob && !isRecording && (
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