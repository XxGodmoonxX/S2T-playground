import React, { useState } from 'react';
import './App.css'
import MicrophoneInput from './components/MicrophoneInput';
import openAIService from './services/OpenAIService';

function App() {
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // isLoading state を追加
  const [errorMessage, setErrorMessage] = useState<string>(''); // errorMessage state を追加

  const handleAudioData = async (data: Blob) => {
    console.log('Audio data received in App:', data);
    if (data.size === 0) {
      console.log("Received empty audio data, skipping transcription.");
      return;
    }

    setIsLoading(true); // API呼び出し前にローディング開始
    setErrorMessage(''); // エラーメッセージをクリア

    try {
      const newText = await openAIService.transcribe(data);
      console.log("Transcription result:", newText);

      if (newText && newText !== "No transcription result." && !newText.startsWith("Error transcribing:")) {
        setTranscribedText(prevText => prevText + (prevText ? ' ' : '') + newText);
        setErrorMessage(''); // 成功時はエラーメッセージをクリア
      } else if (newText.startsWith("Error transcribing:")) {
        console.error("Transcription API error:", newText);
        setErrorMessage(`文字起こしエラー: ${newText}`);
      } else {
        // "No transcription result." の場合など、特にエラーではないが結果がない場合
        setErrorMessage('文字起こし結果がありませんでした。');
      }
    } catch (error) {
      console.error("Error in transcription process:", error);
      setErrorMessage(`文字起こし中に予期せぬエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false); // API呼び出し完了後にローディング終了
    }
  };

  return (
    <div>
      <MicrophoneInput onAudioData={handleAudioData} />
      {isLoading && <p>文字起こし中...</p>} {/* ローディング表示 */}
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>} {/* エラーメッセージ表示 */}
      <div>
        <h2>文字起こし結果：</h2>
        <p>{transcribedText}</p>
      </div>
    </div>
  )
}

export default App
