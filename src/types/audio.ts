// 音声検出の状態を表す型
export interface AudioDetectionState {
  isListening: boolean;
  isRecording: boolean;
  volume: number;
  error: string | null;
}

// 音声区間のイベント型
export interface AudioSegmentEvent {
  type: 'start' | 'data' | 'end';
  timestamp: number;
  audioData?: Float32Array;
  volume?: number;
}

// 音声検出の設定
export interface AudioDetectionConfig {
  volumeThreshold: number; // 音声検出の閾値
  silenceDuration: number; // 無音判定時間（ms）
  sampleRate: number; // サンプリングレート
}