import { useState } from 'react'
import { SpeechToText } from './components/SpeechToText'
import { RealtimeSpeechToText } from './components/RealtimeSpeechToText'

function App() {
  const [useRealtime, setUseRealtime] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            S2T Playground
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            GPT-4o Transcribe を使用した音声文字起こしアプリケーション
          </p>
          
          {/* API Mode Toggle */}
          <div className="mt-6 flex justify-center">
            <div className="bg-white rounded-lg p-1 shadow-sm border">
              <button
                onClick={() => setUseRealtime(false)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  !useRealtime 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📁 Batch API
              </button>
              <button
                onClick={() => setUseRealtime(true)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                  useRealtime 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🔥 Realtime API
              </button>
            </div>
          </div>
        </div>
        
        {useRealtime ? <RealtimeSpeechToText /> : <SpeechToText />}
        
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm text-sm text-gray-600">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            React + TypeScript + Tailwind CSS + GPT-4o {useRealtime ? 'Realtime' : 'Transcribe'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App