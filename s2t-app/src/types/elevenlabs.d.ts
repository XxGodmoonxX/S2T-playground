declare module 'elevenlabs' {
  export interface ElevenLabsOptions {
    apiKey: string;
  }

  export interface TranscriptionOptions {
    audioData: Blob;
    modelId?: string;
  }

  export interface TranscriptionResult {
    text: string;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      confidence: number;
    }>;
  }

  export class ElevenLabs {
    constructor(options: ElevenLabsOptions);
    
    transcribe(options: TranscriptionOptions): Promise<TranscriptionResult>;
  }
}