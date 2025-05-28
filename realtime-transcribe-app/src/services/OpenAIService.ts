import OpenAI from 'openai';

class OpenAIService {
  private openai: OpenAI;
  private apiKey: string;

  constructor() {
    // Viteの場合、環境変数は import.meta.env からアクセスします
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      console.error("OpenAI APIキーが設定されていません。VITE_OPENAI_API_KEY を .env ファイルに設定してください。");
      throw new Error("OpenAI API key not configured.");
    }
    this.apiKey = apiKey;
    this.openai = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true // ブラウザからの直接呼び出しを許可 (本番環境では非推奨、サーバー経由が望ましい)
    });
    console.log("OpenAIService initialized");
  }

  public async transcribe(audioBlob: Blob): Promise<string> {
    if (!this.apiKey) {
      return "Error: API Key not configured.";
    }
    console.log("Transcribing audio blob:", audioBlob);
    // ここに実際のOpenAI API呼び出し処理を実装します
    // 現時点ではダミーのレスポンスを返します
    try {
      // OpenAI SDKの transcription.create を使用する例 (ファイルとして渡す必要がある)
      // BlobをFileオブジェクトに変換する必要があるかもしれません
      const file = new File([audioBlob], "audio.wav", { type: audioBlob.type });

      const response = await this.openai.audio.transcriptions.create({
        model: "whisper-1", // または他の適切なモデル
        file: file,
        language: "ja", // 日本語を指定
      });

      console.log("Transcription response:", response);
      // @ts-ignore
      return response.text || "No transcription result.";

    } catch (error) {
      console.error("Error during transcription:", error);
      return `Error transcribing: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

// シングルトンインスタンスとしてエクスポート (任意)
const openAIService = new OpenAIService();
export default openAIService;
