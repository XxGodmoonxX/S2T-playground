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

      const scriptProcessorNode = audioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorNodeRef.current = scriptProcessorNode;

      scriptProcessorNode.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0); // Mono
        // Create a Blob from the Float32Array data
        const blob = new Blob([inputData.buffer], { type: 'application/octet-stream' });
        onAudioData(blob);
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
