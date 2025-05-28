import './App.css'
import MicrophoneInput from './components/MicrophoneInput';
import openAIService from './services/OpenAIService'; // インポートを追加

function App() {
  const handleAudioData = async (data: Blob) => { // async を追加
    console.log('Audio data received in App:', data);
    if (data.size > 0) { // データサイズが0より大きい場合のみ送信
      try {
        const transcription = await openAIService.transcribe(data); // サービスを呼び出し
        console.log("Transcription result:", transcription);
      } catch (error) {
        console.error("Error in transcription process:", error);
      }
    } else {
      console.log("Received empty audio data, skipping transcription.");
    }
  };

  return (
    <MicrophoneInput onAudioData={handleAudioData} />
  )
}

export default App
