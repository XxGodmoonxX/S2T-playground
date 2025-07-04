import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioDetectionState, AudioSegmentEvent, AudioDetectionConfig } from '../types/audio';

const DEFAULT_CONFIG: AudioDetectionConfig = {
  volumeThreshold: 0.01, // 音声検出の閾値
  silenceDuration: 1000, // 1秒の無音で録音終了
  sampleRate: 44100,
};

export const useAudioDetection = (config: Partial<AudioDetectionConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [state, setState] = useState<AudioDetectionState>({
    isListening: false,
    isRecording: false,
    volume: 0,
    error: null,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const animationFrameRef = useRef<number>();
  const silenceTimerRef = useRef<number>();
  const isRecordingRef = useRef(false);
  const recordingStartTimeRef = useRef<number>(0);

  // 音量計算
  const calculateVolume = useCallback((dataArray: Uint8Array): number => {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += (dataArray[i] - 128) * (dataArray[i] - 128);
    }
    return Math.sqrt(sum / dataArray.length) / 128;
  }, []);

  // 音声区間イベントのログ出力
  const logAudioEvent = useCallback((event: AudioSegmentEvent) => {
    switch (event.type) {
      case 'start':
        console.log('🎙️ 音声区間開始:', {
          timestamp: new Date(event.timestamp).toISOString(),
          volume: event.volume?.toFixed(4),
        });
        break;
      case 'data':
        console.log('📊 音声データ:', {
          timestamp: new Date(event.timestamp).toISOString(),
          dataLength: event.audioData?.length,
          volume: event.volume?.toFixed(4),
        });
        break;
      case 'end':
        console.log('🔚 音声区間終了:', {
          timestamp: new Date(event.timestamp).toISOString(),
          duration: event.timestamp - recordingStartTimeRef.current,
        });
        break;
    }
  }, []);

  // 音声処理
  const processAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const volume = calculateVolume(dataArray);
    
    setState((prev: AudioDetectionState) => ({ ...prev, volume }));

    // 音声検出ロジック
    if (volume > finalConfig.volumeThreshold) {
      // 音声が検出された
      if (!isRecordingRef.current) {
        // 録音開始
        isRecordingRef.current = true;
        recordingStartTimeRef.current = Date.now();
        setState((prev: AudioDetectionState) => ({ ...prev, isRecording: true }));
        
        const startEvent: AudioSegmentEvent = {
          type: 'start',
          timestamp: recordingStartTimeRef.current,
          volume,
        };
        logAudioEvent(startEvent);
      }

      // 無音タイマーをクリア
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = undefined;
      }

      // 音声データイベント
      if (isRecordingRef.current) {
        const dataEvent: AudioSegmentEvent = {
          type: 'data',
          timestamp: Date.now(),
          volume,
        };
        logAudioEvent(dataEvent);
      }
    } else if (isRecordingRef.current) {
      // 録音中で無音が検出された
      if (!silenceTimerRef.current) {
        silenceTimerRef.current = window.setTimeout(() => {
          // 録音終了
          isRecordingRef.current = false;
          setState((prev: AudioDetectionState) => ({ ...prev, isRecording: false }));
          
          const endEvent: AudioSegmentEvent = {
            type: 'end',
            timestamp: Date.now(),
          };
          logAudioEvent(endEvent);
          
          silenceTimerRef.current = undefined;
        }, finalConfig.silenceDuration);
      }
    }

    animationFrameRef.current = requestAnimationFrame(processAudio);
  }, [calculateVolume, finalConfig.volumeThreshold, finalConfig.silenceDuration, logAudioEvent]);

  // マイクアクセス開始
  const startListening = useCallback(async () => {
    try {
      setState((prev: AudioDetectionState) => ({ ...prev, error: null }));

      // メディアストリーム取得
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: finalConfig.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      // Web Audio API セットアップ
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      setState((prev: AudioDetectionState) => ({ ...prev, isListening: true }));
      
      // 音声処理開始
      processAudio();

      console.log('🎤 マイクアクセス開始');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
      setState((prev: AudioDetectionState) => ({ ...prev, error: errorMessage }));
      console.error('マイクアクセスエラー:', error);
    }
  }, [finalConfig.sampleRate, processAudio]);

  // 停止
  const stopListening = useCallback(() => {
    // アニメーションフレームを停止
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // タイマーをクリア
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = undefined;
    }

    // 録音中であれば終了イベントを発行
    if (isRecordingRef.current) {
      const endEvent: AudioSegmentEvent = {
        type: 'end',
        timestamp: Date.now(),
      };
      logAudioEvent(endEvent);
    }

    // メディアストリームを停止
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      mediaStreamRef.current = null;
    }

    // Web Audio Contextを閉じる
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    processorRef.current = null;
    isRecordingRef.current = false;

    setState({
      isListening: false,
      isRecording: false,
      volume: 0,
      error: null,
    });

    console.log('🛑 マイクアクセス停止');
  }, [logAudioEvent]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    ...state,
    startListening,
    stopListening,
  };
};