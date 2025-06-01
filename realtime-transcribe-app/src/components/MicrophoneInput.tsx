import React, { useState, useRef } from 'react';

type RecordingStatus = 'idle' | 'recording' | 'error';

interface MicrophoneInputProps {
  onAudioChunk: (chunk: Float32Array) => void;
}

const MicrophoneInput: React.FC<MicrophoneInputProps> = ({ onAudioChunk }) => {
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
        // Get the raw Float32Array data for the first channel
        const rawPcmData = inputBuffer.getChannelData(0);

        // Send the raw PCM data chunk
        // A copy might be needed if the underlying buffer is reused by the browser: new Float32Array(rawPcmData)
        // For now, let's pass the direct reference. If issues arise (e.g. data corruption), revisit this.
        onAudioChunk(rawPcmData);
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
