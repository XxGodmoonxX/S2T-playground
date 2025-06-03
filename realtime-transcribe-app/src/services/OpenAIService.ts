import OpenAI from 'openai';

// Helper functions
function float32ToInt16(buffer: ArrayBuffer): Int16Array {
  const float32Array = new Float32Array(buffer);
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const val = float32Array[i];
    // Clamp and convert to 16-bit PCM range. Max value for Int16 is 32767, min is -32768.
    int16Array[i] = Math.max(-32768, Math.min(32767, Math.floor(val * 32767)));
  }
  return int16Array;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Define types/interfaces
export interface RealtimeTranscriptionConfig {
  onOpen: () => void;
  onClose: () => void;
  onMessage: (data: any) => void; // Changed to any for now, to log raw messages
  onError: (error: Event | Error) => void;
  language: string; // Now mandatory
  model: string;    // Now mandatory
}

// More specific types for messages can be added here later based on API docs
// For example:
// interface AuthMessage { type: "auth"; token: string; }
// interface SessionUpdateMessage { type: "transcription_session.update"; ... }
// interface AudioAppendMessage { type: "input_audio_buffer.append"; audio: string; }
// interface ServerResponseMessage { type: string; transcript?: string; text?: string; error?: string; ... }

class OpenAIService {
  private openai: OpenAI;
  private apiKey: string;
  private webSocket: WebSocket | null = null;
  // Updated WebSocket URL
  private WSS_URL = "wss://api.openai.com/v1/realtime?intent=transcription";

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

  // Non-realtime transcription method (kept for now)
  public async transcribe(audioBlob: Blob): Promise<string> {
    if (!this.apiKey) {
      return "Error: API Key not configured.";
    }
    console.log("Transcribing (non-realtime) audio blob:", audioBlob);
    try {
      const file = new File([audioBlob], "audio.wav", { type: audioBlob.type });
      const response = await this.openai.audio.transcriptions.create({
        model: "whisper-1",
        file: file,
        language: "ja",
      });
      // @ts-ignore
      return response.text || "No transcription result.";
    } catch (error) {
      console.error("Error during non-realtime transcription:", error);
      return `Error transcribing: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // Realtime Transcription Methods
  public startRealtimeTranscription(config: RealtimeTranscriptionConfig) {
    if (this.webSocket && (this.webSocket.readyState === WebSocket.OPEN || this.webSocket.readyState === WebSocket.CONNECTING)) {
      console.log("WebSocket is already open or connecting.");
      return;
    }

    const { model, language } = config;

    console.log(`Attempting to connect to WebSocket: ${this.WSS_URL}`);
    console.log(`Using config: model=${model}, language=${language}`);

    try {
      this.webSocket = new WebSocket(this.WSS_URL);

      this.webSocket.onopen = () => {
        console.log("WebSocket connection established. Sending auth and session configuration...");

        const authMessage = { type: "auth", token: this.apiKey };
        this.webSocket?.send(JSON.stringify(authMessage));
        console.log("Auth message sent:", JSON.stringify(authMessage, null, 2));

        const sessionConfigMessage = {
          type: "transcription_session.update",
          input_audio_format: "pcm16",
          input_audio_transcription: { model: model, language: language }
        };
        this.webSocket?.send(JSON.stringify(sessionConfigMessage));
        console.log("Session config message sent:", JSON.stringify(sessionConfigMessage, null, 2));

        config.onOpen();
      };

      this.webSocket.onmessage = (event) => {
        console.log("Raw WebSocket message received from server:", event.data);
        try {
          const parsedMessage = JSON.parse(event.data as string);
          console.log("Parsed WebSocket message from server:", parsedMessage);
          config.onMessage(parsedMessage);
        } catch (error) {
          console.warn("Received non-JSON message or error parsing message from server:", event.data, error);
          config.onMessage(event.data);
        }
      };

      this.webSocket.onerror = (event) => {
        console.error("WebSocket error:", event);
        config.onError(event instanceof Error ? event : new Error('WebSocket error occurred'));
      };

      this.webSocket.onclose = (event) => {
        console.log("WebSocket connection closed.", event.code, event.reason);
        config.onClose();
        this.webSocket = null;
      };
    } catch (error) {
      console.error("Failed to initialize WebSocket:", error);
      config.onError(error instanceof Error ? error : new Error('Failed to initialize WebSocket'));
    }
  }

  public sendAudioChunk(audioData: ArrayBuffer) { // Expects ArrayBuffer of Float32 PCM
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      try {
        const int16PcmData = float32ToInt16(audioData);
        const base64EncodedAudio = arrayBufferToBase64(int16PcmData.buffer);
        const audioMessage = { type: "input_audio_buffer.append", audio: base64EncodedAudio };
        this.webSocket.send(JSON.stringify(audioMessage));
      } catch (error) {
        console.error("Error processing or sending audio chunk:", error);
      }
    } else {
      console.warn("WebSocket is not open. Cannot send audio data.");
    }
  }

  public stopRealtimeTranscription() {
    if (this.webSocket) {
      console.log("Closing WebSocket connection.");
      this.webSocket.close();
    } else {
      console.log("WebSocket is not active, no need to close.");
    }
  }
}

const openAIService = new OpenAIService();
export default openAIService;
