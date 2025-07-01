import { useState } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

export const SpeechToText = () => {
  const [apiKey, setApiKey] = useState<string>('');
  const {
    isRecording,
    isProcessing,
    audioBlob,
    transcription,
    error,
    startRecording,
    stopRecording,
    transcribeAudio,
    reset,
  } = useAudioRecorder();

  const handleTranscribe = () => {
    if (!apiKey.trim()) {
      alert('OpenAI APIキーを入力してください');
      return;
    }
    transcribeAudio(apiKey);
  };

  const handleReset = () => {
    reset();
    setApiKey('');
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        🎤 Speech to Text (GPT-4o Transcribe)
      </h2>

      {/* API Key Input */}
      <div className="mb-6">
        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
          OpenAI API Key
        </label>
        <input
          type="password"
          id="apiKey"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Recording Controls */}
      <div className="flex justify-center gap-4 mb-6">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isProcessing}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2"
          >
            <span className="w-3 h-3 bg-white rounded-full"></span>
            録音開始
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center gap-2 animate-pulse"
          >
            <span className="w-3 h-3 bg-white rounded-full"></span>
            録音停止
          </button>
        )}

        {audioBlob && !isRecording && (
          <button
            onClick={handleTranscribe}
            disabled={isProcessing}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            {isProcessing ? '処理中...' : '文字起こし実行'}
          </button>
        )}

        <button
          onClick={handleReset}
          disabled={isRecording || isProcessing}
          className="px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors duration-200"
        >
          リセット
        </button>
      </div>

      {/* Status */}
      <div className="mb-6">
        {isRecording && (
          <div className="text-center text-green-600 font-medium">
            🔴 録音中... 話してください
          </div>
        )}
        {isProcessing && (
          <div className="text-center text-blue-600 font-medium">
            ⏳ 文字起こし処理中...
          </div>
        )}
        {audioBlob && !isRecording && !isProcessing && (
          <div className="text-center text-gray-600">
            ✅ 録音完了 - 文字起こしボタンを押してください
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">エラー:</p>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Transcription Result */}
      {transcription && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">文字起こし結果:</h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-gray-800 whitespace-pre-wrap">{transcription}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(transcription)}
            className="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm rounded transition-colors duration-200"
          >
            📋 コピー
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">使用方法:</h4>
        <ol className="list-decimal list-inside space-y-1">
          <li>OpenAI APIキーを入力してください</li>
          <li>「録音開始」ボタンを押してマイクの使用を許可してください</li>
          <li>音声を話してから「録音停止」ボタンを押してください</li>
          <li>「文字起こし実行」ボタンを押してGPT-4o Transcribeで結果を取得してください</li>
        </ol>
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-xs">
            <strong>✨ GPT-4o Transcribe</strong>: Whisper-1より高精度で、単語レベルのタイムスタンプも取得可能です
          </p>
        </div>
      </div>
    </div>
  );
};