import React, { useState, useRef } from 'react';

type RecordingStatus = 'idle' | 'recording' | 'error';

interface MicrophoneInputProps {
  onAudioData: (data: Blob) => void;
}

const MicrophoneInput: React.FC<MicrophoneInputProps> = ({ onAudioData }) => {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);

  const startRecording = async () => {
    setStatus('recording');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);

      const scriptProcessorNode = audioContext.createScriptProcessor(16384, 1, 1);
      scriptProcessorNodeRef.current = scriptProcessorNode;

      scriptProcessorNode.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0); // Mono Float32Array

        if (!audioContextRef.current) {
          console.error("AudioContext is not available for sample rate.");
          return;
        }

        // --- WAVエンコード処理開始 ---
        const sampleRate = audioContextRef.current.sampleRate;
        const numChannels = 1;
        const bitDepth = 16;

        let buffer = new ArrayBuffer(44 + inputData.length * 2); // 44バイトのヘッダ + 16ビットPCMデータ
        let view = new DataView(buffer);

        // RIFFヘッダ
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + inputData.length * 2, true); // ファイルサイズ - 8
        writeString(view, 8, 'WAVE');

        // FMTチャンク
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // fmtチャンクのサイズ
        view.setUint16(20, 1, true);  // フォーマットID (PCM)
        view.setUint16(22, numChannels, true); // チャンネル数
        view.setUint32(24, sampleRate, true); // サンプリングレート
        view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // データ速度 (Byte/sec)
        view.setUint16(32, numChannels * (bitDepth / 8), true); // ブロックサイズ (Byte/sample)
        view.setUint16(34, bitDepth, true); // サンプルあたりのビット数

        // DATAチャンク
        writeString(view, 36, 'data');
        view.setUint32(40, inputData.length * 2, true); // 波形データのサイズ

        // PCMデータ (Float32 to Int16)
        let offset = 44;
        for (let i = 0; i < inputData.length; i++, offset += 2) {
          let s = Math.max(-1, Math.min(1, inputData[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        // --- WAVエンコード処理終了 ---

        const wavBlob = new Blob([view], { type: 'audio/wav' });
        onAudioData(wavBlob);
      };

      source.connect(scriptProcessorNode);
      scriptProcessorNode.connect(audioContext.destination); // Connect to destination to start processing

      console.log('録音開始');
      setStatus('recording');
    } catch (err) {
      console.error('マイクへのアクセスに失敗しました:', err);
      setError('マイクへのアクセスに失敗しました。');
      setStatus('error');
    }
  };

  // Helper function
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  const stopRecording = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      scriptProcessorNodeRef.current.onaudioprocess = null;
      scriptProcessorNodeRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().then(() => {
        console.log('AudioContext closed');
      });
      audioContextRef.current = null;
    }
    console.log('録音停止');
    setStatus('idle');
  };

  return (
    <div>
      <h2>マイク入力</h2>
      <div>現在の状態: {status}</div>
      {error && <div style={{ color: 'red' }}>エラー: {error}</div>}
      <button onClick={startRecording} disabled={status === 'recording'}>
        録音開始
      </button>
      <button onClick={stopRecording} disabled={status !== 'recording'}>
        録音停止
      </button>
    </div>
  );
};

export default MicrophoneInput;
