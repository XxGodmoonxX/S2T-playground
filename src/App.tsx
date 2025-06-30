import { SpeechToText } from './components/SpeechToText'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            S2T Playground
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            GPT-4o Transcribeを使用したリアルタイム音声文字起こしアプリケーション
          </p>
        </div>
        
        <SpeechToText />
        
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-sm text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            React + TypeScript + Tailwind CSS + GPT-4o Transcribe
          </div>
        </div>
      </div>
    </div>
  )
}

export default App