import { useState, useRef, useCallback } from 'react';

interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

export const useAudioRecorder = () => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    recordingTime: 0,
    audioBlob: null,
    audioUrl: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // 録音を開始する関数
  const startRecording = useCallback(async () => {
    try {
      // マイクへのアクセス許可を取得
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // MediaRecorderの設定
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // データが利用可能になったときのイベントハンドラ
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // 録音が停止したときのイベントハンドラ
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        setState((prev) => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob,
          audioUrl,
        }));

        // ストリームのトラックを停止
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      // 録音開始
      mediaRecorder.start();

      // タイマーの開始
      let time = 0;
      timerRef.current = window.setInterval(() => {
        time += 1;
        setState((prev) => ({
          ...prev,
          recordingTime: time,
        }));
      }, 1000);

      setState({
        isRecording: true,
        isPaused: false,
        recordingTime: 0,
        audioBlob: null,
        audioUrl: null,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

  // 録音を一時停止する関数
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      
      // タイマーを停止
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        isPaused: true,
      }));
    }
  }, [state.isRecording, state.isPaused]);

  // 録音を再開する関数
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      
      // タイマーを再開
      let time = state.recordingTime;
      timerRef.current = window.setInterval(() => {
        time += 1;
        setState((prev) => ({
          ...prev,
          recordingTime: time,
        }));
      }, 1000);

      setState((prev) => ({
        ...prev,
        isPaused: false,
      }));
    }
  }, [state.isRecording, state.isPaused, state.recordingTime]);

  // 録音を停止する関数
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      // タイマーを停止
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [state.isRecording]);

  // 録音データをリセットする関数
  const resetRecording = useCallback(() => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }

    setState({
      isRecording: false,
      isPaused: false,
      recordingTime: 0,
      audioBlob: null,
      audioUrl: null,
    });
  }, [state.audioUrl]);

  return {
    ...state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  };
};