import React, { useState, useRef, useEffect, useCallback } from 'react';

type RecordingStatus = 'idle' | 'recording' | 'error' | 'stopping';

interface MicrophoneInputProps {
  onAudioChunk: (chunk: Float32Array) => void;
  isActive: boolean;
  // Optional: callback to inform parent about status changes, if needed
  // onStatusChange?: (status: RecordingStatus, error?: string | null) => void;
}

const MicrophoneInput: React.FC<MicrophoneInputProps> = ({ onAudioChunk, isActive }) => {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  // To prevent calling start/stop multiple times if isActive prop changes rapidly
  const isTransitioning = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);

  const startRecording = useCallback(async () => {
    if (status === 'recording' || status === 'stopping' || isTransitioning.current) {
      console.log('MicrophoneInput: Already recording, stopping, or transitioning. Cannot start.');
      return;
    }
    isTransitioning.current = true;
    console.log('MicrophoneInput: Attempting to start recording...');
    setStatus('recording'); // Optimistically set status
    setError(null);
    // if (onStatusChange) onStatusChange('recording');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const newAudioContext = new AudioContext();
      audioContextRef.current = newAudioContext;

      const source = newAudioContext.createMediaStreamSource(stream);
      const newScriptProcessorNode = newAudioContext.createScriptProcessor(16384, 1, 1); // bufferSize, inputChannels, outputChannels
      scriptProcessorNodeRef.current = newScriptProcessorNode;

      newScriptProcessorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (status !== 'recording' || !isActive) { // Check status and isActive flag
          return;
        }
        const inputBuffer = event.inputBuffer;
        const rawPcmData = inputBuffer.getChannelData(0);
        onAudioChunk(new Float32Array(rawPcmData));
      };

      source.connect(newScriptProcessorNode);
      newScriptProcessorNode.connect(newAudioContext.destination);

      console.log('MicrophoneInput: Recording started successfully.');
      // Note: isTransitioning.current will be set to false in the finally block
    } catch (err) {
      console.error('MicrophoneInput: Failed to access microphone.', err);
      setError(`マイクへのアクセスに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
      setStatus('error');
      // if (onStatusChange) onStatusChange('error', `マイクへのアクセスに失敗しました: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Only set to false if not in an error state that should persist isTransitioning
      // However, for startRecording, we generally want to allow another attempt or stop.
      isTransitioning.current = false;
    }
  }, [onAudioChunk, status, isActive]); // Dependencies for useCallback

  const stopRecording = useCallback(async () => {
    if (status === 'idle' || status === 'stopping') {
      console.log('Already idle or stopping.');
      return;
    }
    isTransitioning.current = true;
    console.log('Attempting to stop recording...');
    setStatus('stopping'); // Indicate stopping process
    // if (onStatusChange) onStatusChange('stopping');

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      console.log('MicrophoneInput: Media stream stopped.');
    }

    if (scriptProcessorNodeRef.current) {
      scriptProcessorNodeRef.current.disconnect();
      scriptProcessorNodeRef.current.onaudioprocess = null; // Important to remove the handler
      scriptProcessorNodeRef.current = null;
      console.log('MicrophoneInput: ScriptProcessorNode disconnected.');
    }

    if (audioContextRef.current) {
      // AudioContext.close() is asynchronous
      try {
        await audioContextRef.current.close();
        console.log('MicrophoneInput: AudioContext closed successfully.');
      } catch (e) {
        console.error("MicrophoneInput: Error closing AudioContext", e);
      }
      audioContextRef.current = null;
    }

    console.log('MicrophoneInput: Recording stopped.');
    setStatus('idle');
    // if (onStatusChange) onStatusChange('idle');
    isTransitioning.current = false;
  }, [status]); // Dependencies for useCallback

  useEffect(() => {
    // Effect to control recording based on isActive prop
    if (isActive) {
      if (status === 'idle' && !isTransitioning.current) {
        startRecording();
      }
    } else {
      if ((status === 'recording' || status === 'error') && !isTransitioning.current) {
        // also stop if there was an error and isActive became false
        stopRecording();
      }
    }
    // Cleanup function to ensure recording is stopped when the component unmounts while active
    return () => {
      if (isActive && (status === 'recording' || status === 'stopping')) {
        // If the component unmounts while active, ensure cleanup.
        // This check for 'stopping' is to avoid issues if unmount happens mid-stop.
        console.log('MicrophoneInput: Unmounting, ensuring recording is stopped.');
        stopRecording();
      }
    };
  }, [isActive, startRecording, stopRecording, status]);


  return (
    <div>
      {/* User-facing status and error messages can be simplified or moved to parent (App.tsx) */}
      <div>Microphone Status: {status}</div>
      {error && <div style={{ color: 'red' }}>Mic Error: {error}</div>}
      {/* Buttons are removed as control is now via isActive prop */}
    </div>
  );
};

export default MicrophoneInput;
