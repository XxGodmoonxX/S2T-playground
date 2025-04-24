import { useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { transcribeAudio as transcribeWithOpenAI } from '../services/openaiService';
import { transcribeAudio as transcribeWithElevenLabs } from '../services/elevenlabsService';
import { WordTiming } from '../types/transcription';

// 音声認識サービスの種類
type TranscriptionService = 'openai' | 'elevenlabs';

const AudioTranscriber = () => {
  // 音声録音のカスタムフック
  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    audioUrl,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecorder();

  // 音声認識の状態
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState<string>('');
  const [transcriptionWords, setTranscriptionWords] = useState<WordTiming[]>([]);
  const [selectedService, setSelectedService] = useState<TranscriptionService>('openai');
  const [error, setError] = useState<string | null>(null);

  // 録音時間のフォーマット
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 音声認識を実行する関数
  const handleTranscribe = async () => {
    if (!audioBlob) {
      setError('録音データがありません');
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      if (selectedService === 'openai') {
        // OpenAIのGPT-4o-transcribeで音声認識
        const text = await transcribeWithOpenAI(audioBlob);
        setTranscriptionText(text);
        setTranscriptionWords([]);
      } else {
        // ElevenLabsのscribe v1で音声認識
        const result = await transcribeWithElevenLabs(audioBlob);
        setTranscriptionText(result.text);
        setTranscriptionWords(result.words || []);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setError('音声認識に失敗しました');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="audio-transcriber">
      <h2>音声認識テスト</h2>
      
      {/* サービス選択 */}
      <div className="service-selector">
        <label>
          <input
            type="radio"
            value="openai"
            checked={selectedService === 'openai'}
            onChange={() => setSelectedService('openai')}
            disabled={isRecording || isTranscribing}
          />
          OpenAI GPT-4o-transcribe
        </label>
        <label>
          <input
            type="radio"
            value="elevenlabs"
            checked={selectedService === 'elevenlabs'}
            onChange={() => setSelectedService('elevenlabs')}
            disabled={isRecording || isTranscribing}
          />
          ElevenLabs scribe v1
        </label>
      </div>

      {/* 録音コントロール */}
      <div className="recording-controls">
        {!isRecording ? (
          <button 
            onClick={startRecording} 
            disabled={isTranscribing}
          >
            録音開始
          </button>
        ) : (
          <>
            {!isPaused ? (
              <button onClick={pauseRecording}>一時停止</button>
            ) : (
              <button onClick={resumeRecording}>再開</button>
            )}
            <button onClick={stopRecording}>録音終了</button>
          </>
        )}
        {recordingTime > 0 && (
          <span className="recording-time">録音時間: {formatTime(recordingTime)}</span>
        )}
      </div>

      {/* 音声プレイヤー */}
      {audioUrl && (
        <div className="audio-player">
          <audio src={audioUrl} controls />
          <div className="transcription-controls">
            <button 
              onClick={handleTranscribe} 
              disabled={isTranscribing}
            >
              {isTranscribing ? '認識中...' : '音声認識実行'}
            </button>
            <button 
              onClick={resetRecording} 
              disabled={isRecording || isTranscribing}
            >
              リセット
            </button>
          </div>
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* 認識結果 */}
      {transcriptionText && (
        <div className="transcription-result">
          <h3>認識結果:</h3>
          <div className="transcription-text">
            {transcriptionText}
          </div>
          
          {/* 単語ごとのタイミング情報（ElevenLabsの場合のみ） */}
          {selectedService === 'elevenlabs' && transcriptionWords.length > 0 && (
            <div className="word-timing">
              <h4>単語ごとのタイミング:</h4>
              <div className="words-container">
                {transcriptionWords.map((word, index) => (
                  <div key={index} className="word-item">
                    <span className="word">{word.word}</span>
                    <span className="timing">
                      {word.start.toFixed(2)}s - {word.end.toFixed(2)}s
                    </span>
                    <span className="confidence">
                      信頼度: {(word.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioTranscriber;