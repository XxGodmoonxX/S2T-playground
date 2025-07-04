import React from 'react';
import { useAudioDetection } from '../hooks/useAudioDetection';

interface AudioDetectorProps {
  volumeThreshold?: number;
  silenceDuration?: number;
}

export const AudioDetector = ({ 
  volumeThreshold = 0.01, 
  silenceDuration = 1000 
}: AudioDetectorProps) => {
  const { 
    isListening, 
    isRecording, 
    volume, 
    error, 
    startListening, 
    stopListening 
  } = useAudioDetection({
    volumeThreshold,
    silenceDuration
  });

  // 音量レベルを視覚的に表示するための計算
  const volumePercentage = Math.min(volume * 1000, 100);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        音声検出
      </h2>
      
      {/* 状態表示 */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">マイク状態:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isListening 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isListening ? '🎤 リスニング中' : '🔇 停止中'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-gray-700">録音状態:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isRecording 
              ? 'bg-red-100 text-red-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isRecording ? '🔴 録音中' : '⚪ 待機中'}
          </span>
        </div>
      </div>

      {/* 音量レベル表示 */}
      {isListening && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700">音量レベル:</span>
            <span className="text-sm text-gray-600">
              {volume.toFixed(4)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-100 ${
                isRecording ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${volumePercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* 設定表示 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">設定</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <div>音声検出閾値: {volumeThreshold}</div>
          <div>無音判定時間: {silenceDuration}ms</div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">
            ⚠️ エラー: {error}
          </p>
        </div>
      )}

      {/* コントロールボタン */}
      <div className="flex gap-3">
        <button
          onClick={startListening}
          disabled={isListening}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            isListening
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          開始
        </button>
        
        <button
          onClick={stopListening}
          disabled={!isListening}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            !isListening
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          停止
        </button>
      </div>

      {/* 使用方法 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-2">
          💡 使用方法
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 開始ボタンでマイクアクセスを開始</li>
          <li>• 音声が検出されると自動で録音開始</li>
          <li>• 無音が続くと録音終了</li>
          <li>• コンソールで音声区間の詳細を確認</li>
        </ul>
      </div>
    </div>
  );
};