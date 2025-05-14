import { useState } from 'react'
import Recorder from './components/Recorder'
import Transcription from './components/Transcription'
import Header from './components/Header'
import TranscriptionHistory from './components/TranscriptionHistory'

function App() {
  const [transcription, setTranscription] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [history, setHistory] = useState<{text: string, timestamp: string}[]>([])
  
  const handleNewTranscription = (text: string) => {
    setTranscription(text)
    setHistory(prev => [
      { text, timestamp: new Date().toLocaleString() },
      ...prev
    ])
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto p-4 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <Recorder 
              onTranscriptionReceived={handleNewTranscription}
              setIsLoading={setIsLoading}
            />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <Transcription 
              text={transcription} 
              isLoading={isLoading} 
            />
          </div>
        </div>
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <TranscriptionHistory history={history} />
        </div>
      </main>
    </div>
  )
}

export default App 