import React, { useState } from 'react'; // useState をインポート
import './App.css'
import MicrophoneInput from './components/MicrophoneInput';
import openAIService from './services/OpenAIService';

function App() {
  const [transcribedText, setTranscribedText] = useState<string>(''); // transcribedText state を追加

  const handleAudioData = async (data: Blob) => {
    console.log('Audio data received in App:', data);
    if (data.size > 0) {
      try {
        const newText = await openAIService.transcribe(data);
        console.log("Transcription result:", newText);
        if (newText && newText !== "No transcription result." && !newText.startsWith("Error transcribing:")) {
          // 既存のテキストに新しいテキストを追加
          setTranscribedText(prevText => prevText + (prevText ? ' ' : '') + newText);
        } else if (newText.startsWith("Error transcribing:")) {
          console.error("Transcription API error:", newText);
          // エラーメッセージを表示することも検討
        }
      } catch (error) {
        console.error("Error in transcription process:", error);
      }
    } else {
      console.log("Received empty audio data, skipping transcription.");
    }
  };

  return (
    <div>
      <MicrophoneInput onAudioData={handleAudioData} />
      <div>
        <h2>文字起こし結果：</h2>
        <p>{transcribedText}</p>
      </div>
    </div>
  )
}

export default App
