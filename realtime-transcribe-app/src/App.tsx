import React, { useState, useCallback } from 'react';
import './App.css'
import MicrophoneInput from './components/MicrophoneInput';
import openAIService from './services/OpenAIService';

function App() {
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [isStreamingActive, setIsStreamingActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAudioChunk = useCallback((chunk: Float32Array) => {
    if (!isStreamingActive) return;
    // The OpenAIService's sendAudioChunk expects ArrayBuffer.
    // Float32Array.buffer gives the underlying ArrayBuffer.
    openAIService.sendAudioChunk(chunk.buffer);
  }, [isStreamingActive]);

  const startStreaming = useCallback(async () => {
    console.log("Attempting to start streaming...");
    setIsStreamingActive(true);
    setIsLoading(true);
    setTranscribedText('');
    setErrorMessage(null);

    openAIService.startRealtimeTranscription({
      model: "gpt-4o-transcribe", // Updated model name
      language: "ja",  // Specify Japanese
      onOpen: () => {
        console.log("WebSocket connection opened.");
        setIsLoading(false);
      },
      onMessage: (newText: string) => {
        console.log("Received transcript:", newText);
        setTranscribedText(prevText => prevText + newText);
      },
      onError: (error: Event | Error) => {
        console.error("WebSocket error:", error);
        const errorMsg = error instanceof Error ? error.message : (typeof error === 'string' ? error : '不明な接続エラーが発生しました。');
        setErrorMessage(`リアルタイム文字起こしエラー: ${errorMsg}`);
        setIsLoading(false);
        setIsStreamingActive(false); // Stop streaming on error
      },
      onClose: () => {
        console.log("WebSocket connection closed.");
        setIsLoading(false);
        // Only set isStreamingActive to false if it wasn't an error that already did so.
        // Or if user intentionally stopped.
        // For now, if it closes unexpectedly, we reflect that.
        setIsStreamingActive(current => {
          if (current) { // If it was active and closed unexpectedly
            setErrorMessage(prevErr => prevErr || "リアルタイム接続が予期せず終了しました。");
          }
          return false;
        });
      }
    });
  }, []); // Dependencies: openAIService is a singleton, so not needed.

  const stopStreaming = useCallback(async () => {
    console.log("Attempting to stop streaming...");
    setIsStreamingActive(false); // This will also make MicrophoneInput inactive via prop
    openAIService.stopRealtimeTranscription();
    // isLoading should be handled by onClose or onError of startRealtimeTranscription
  }, []); // Dependencies: openAIService is a singleton.

  return (
    <div className="App">
      <header className="App-header">
        <h1>リアルタイム文字起こし</h1>
      </header>
      <main>
        <MicrophoneInput
          isActive={isStreamingActive}
          onAudioChunk={handleAudioChunk}
        />
        <div className="controls">
          {!isStreamingActive && !isLoading && (
            <button onClick={startStreaming} disabled={isLoading}>
              ストリーミング開始
            </button>
          )}
          {(isStreamingActive || isLoading) && (
            <button onClick={stopStreaming} disabled={!isStreamingActive && !isLoading}>
              {isLoading && !isStreamingActive ? "接続中..." : "ストリーミング停止"}
            </button>
          )}
        </div>

        {isLoading && <p>接続中または処理中...</p>}
        {errorMessage && <p style={{ color: 'red' }}>エラー: {errorMessage}</p>}

        <div className="transcription-container">
          <h2>文字起こし結果：</h2>
          <p>{transcribedText || "ここに文字起こし結果が表示されます..."}</p>
        </div>
      </main>
    </div>
  );
}

export default App;
