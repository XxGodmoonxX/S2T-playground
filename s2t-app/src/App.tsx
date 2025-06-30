import './App.css'
import AudioTranscriber from './components/AudioTranscriber'

function App() {
  return (
    <div className="app-container">
      <header>
        <h1>音声認識テストアプリ</h1>
        <p>OpenAI GPT-4o-transcribeとElevenLabs scribe v1の比較</p>
      </header>
      
      <main>
        <AudioTranscriber />
      </main>
      
      <footer>
        <p>
          注意: このアプリを使用するには、.envファイルにAPIキーを設定する必要があります。
        </p>
      </footer>
    </div>
  )
}

export default App
