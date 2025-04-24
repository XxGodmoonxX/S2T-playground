// 音声認識の単語タイミング情報の型定義
export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

// ElevenLabsの音声認識結果の型定義
export interface ElevenLabsTranscriptionResult {
  text: string;
  words?: WordTiming[];
}