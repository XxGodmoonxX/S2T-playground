export interface TranscriptionResponse {
  text: string;
}

export interface RecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  audioBlob: Blob | null;
  transcription: string;
  error: string | null;
}

export interface MediaRecorderRef {
  start: () => void;
  stop: () => void;
  isRecording: boolean;
}