import OpenAI from 'openai';
import { OPENAI_API_KEY } from '../config';

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // ブラウザでの使用を許可（本番環境では推奨されません）
});

/**
 * 音声ファイルからテキストに変換する関数（GPT-4o-transcribe）
 * @param audioBlob 音声データのBlob
 * @returns 変換されたテキスト
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    // 音声ファイルをFormDataに変換
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'gpt-4o');

    // OpenAIのAPIを使用して音声をテキストに変換
    const response = await openai.audio.transcriptions.create({
      file: audioBlob,
      model: 'gpt-4o',
    });

    return response.text;
  } catch (error) {
    console.error('OpenAI transcription error:', error);
    throw new Error('音声の変換に失敗しました');
  }
};