import { AudioDetector } from './components/AudioDetector'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            S2T Playground
          </h1>
          <p className="text-gray-600">
            Speech-to-Text 音声検出デモ
          </p>
        </div>
        
        <AudioDetector 
          volumeThreshold={0.01}
          silenceDuration={1500}
        />
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ブラウザでマイクの使用を許可してください
          </p>
        </div>
      </div>
    </div>
  )
}

export default App