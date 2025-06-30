import { useState, useRef, useCallback } from 'react';
import { RecordingState } from '../types/speech';

export const useAudioRecorder = () => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isProcessing: false,
    audioBlob: null,
    transcription: '',
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      setState((prev: RecordingState) => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        setState((prev: RecordingState) => ({ 
          ...prev, 
          isRecording: false, 
          audioBlob 
        }));
        
        // ストリームを停止
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setState((prev: RecordingState) => ({ ...prev, isRecording: true }));
    } catch (error) {
      setState((prev: RecordingState) => ({ 
        ...prev, 
        error: 'マイクへのアクセスに失敗しました。マイクの使用を許可してください。' 
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
    }
  }, [state.isRecording]);

  const transcribeAudio = useCallback(async (apiKey: string) => {
    if (!state.audioBlob) {
      setState((prev: RecordingState) => ({ ...prev, error: '音声データがありません' }));
      return;
    }

    setState((prev: RecordingState) => ({ ...prev, isProcessing: true, error: null }));

    try {
      // GPT-4o Transcribeを使用
      const formData = new FormData();
      formData.append('file', state.audioBlob, 'audio.webm');
      formData.append('model', 'gpt-4o-transcribe');
      formData.append('language', 'ja');
      formData.append('response_format', 'verbose_json');
      formData.append('timestamp_granularities[]', 'word');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setState((prev: RecordingState) => ({ 
        ...prev, 
        transcription: result.text,
        isProcessing: false 
      }));
    } catch (error) {
      setState((prev: RecordingState) => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : '文字起こしに失敗しました',
        isProcessing: false 
      }));
    }
  }, [state.audioBlob]);

  const reset = useCallback(() => {
    setState({
      isRecording: false,
      isProcessing: false,
      audioBlob: null,
      transcription: '',
      error: null,
    });
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    transcribeAudio,
    reset,
  };
};