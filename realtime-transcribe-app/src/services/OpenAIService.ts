import OpenAI from 'openai';

// Define types/interfaces
export interface RealtimeTranscriptionConfig {
  onOpen: () => void;
  onClose: () => void;
  onMessage: (transcript: string) => void;
  onError: (error: Event | Error) => void;
  language?: string;
  model?: string;
}

export interface TranscriptionResponse {
  // This is a placeholder, actual structure might vary
  transcript: string;
  is_final?: boolean;
  // Add other relevant fields based on OpenAI's API
}

class OpenAIService {
  private openai: OpenAI;
  private apiKey: string;
  private webSocket: WebSocket | null = null;
  // Placeholder WebSocket URL - this will likely need to be updated
  private WSS_URL = "wss://api.openai.com/v1/audio/transcriptions/realtime";

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
    console.log("Transcribing (non-realtime) audio blob:", audioBlob);
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

  // Realtime Transcription Methods

  public startRealtimeTranscription(config: RealtimeTranscriptionConfig) {
    if (this.webSocket && (this.webSocket.readyState === WebSocket.OPEN || this.webSocket.readyState === WebSocket.CONNECTING)) {
      console.log("WebSocket is already open or connecting.");
      return;
    }

    const model = config.model || 'gpt-4o-transcribe'; // Updated model name
    const language = config.language || 'ja';

    // Construct WebSocket URL (this is an assumption and might need adjustment)
    // Using apiKey in query param for simplicity, but OpenAI might use a different auth method (e.g., initial message)
    const url = `${this.WSS_URL}?model=${model}&language=${language}&apiKey=${this.apiKey}`;
    console.log(`Attempting to connect to WebSocket: ${this.WSS_URL}?model=${model}&language=${language}&apiKey=REDACTED`);


    try {
      this.webSocket = new WebSocket(url);

      this.webSocket.onopen = () => {
        console.log("WebSocket connection established.");
        config.onOpen();
        // Potentially send an initial configuration message here if required by OpenAI's API
        // e.g., this.webSocket?.send(JSON.stringify({ apiKey: this.apiKey, model, language }));
      };

      this.webSocket.onmessage = (event) => {
        console.log("WebSocket message received:", event.data);
        try {
          // Assuming the server sends JSON with a 'transcript' field
          // Adjust parsing based on actual API response structure
          const messageData = JSON.parse(event.data as string) as TranscriptionResponse;
          if (messageData.transcript) {
            config.onMessage(messageData.transcript);
          } else {
            // Handle cases where the message might not be a transcript
            // or has a different structure
            console.warn("Received message without transcript field:", messageData);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
          // Optionally, propagate this as a specific type of error via config.onError
        }
      };

      this.webSocket.onerror = (event) => {
        console.error("WebSocket error:", event);
        config.onError(event instanceof Error ? event : new Error('WebSocket error occurred'));
      };

      this.webSocket.onclose = (event) => {
        console.log("WebSocket connection closed.", event.code, event.reason);
        config.onClose();
        this.webSocket = null; // Clean up
      };
    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
      config.onError(error instanceof Error ? error : new Error('Failed to initialize WebSocket'));
    }
  }

  public sendAudioChunk(audioData: ArrayBuffer) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      console.log("Sending audio chunk:", audioData);
      this.webSocket.send(audioData);
    } else {
      console.warn("WebSocket is not open. Cannot send audio data.");
      // Optionally, queue data or inform the caller
    }
  }

  public stopRealtimeTranscription() {
    if (this.webSocket) {
      console.log("Closing WebSocket connection.");
      this.webSocket.close();
      // The onclose event handler (setup in startRealtimeTranscription)
      // will handle setting this.webSocket to null and calling config.onClose
    } else {
      console.log("WebSocket is not active, no need to close.");
    }
  }
}

// シングルトンインスタンスとしてエクスポート (任意)
const openAIService = new OpenAIService();
export default openAIService;
