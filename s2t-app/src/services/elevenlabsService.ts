import { ElevenLabs } from 'elevenlabs';
import { ELEVENLABS_API_KEY } from '../config';
import { ElevenLabsTranscriptionResult } from '../types/transcription';

// ElevenLabsクライアントの初期化
const elevenlabs = new ElevenLabs({
  apiKey: ELEVENLABS_API_KEY
});

/**
 * 音声ファイルからテキストに変換する関数（ElevenLabs scribe v1）
 * @param audioBlob 音声データのBlob
 * @returns 変換されたテキストと単語ごとのタイミング情報
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<ElevenLabsTranscriptionResult> => {
  try {
    // ElevenLabsのAPIを使用して音声をテキストに変換
    const response = await elevenlabs.transcribe({
      audioData: audioBlob,
      modelId: 'scribe-v1' // ElevenLabs scribe v1モデルを指定
    });

    return response;
  } catch (error) {
    console.error('ElevenLabs transcription error:', error);
    throw new Error('音声の変換に失敗しました');
  }
};