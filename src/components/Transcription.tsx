import React from 'react'

interface TranscriptionProps {
  text: string
  isLoading: boolean
}

const Transcription: React.FC<TranscriptionProps> = ({ text, isLoading }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4 dark:text-white">文字起こし結果</h2>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : text ? (
        <div className="border rounded-lg p-4 min-h-[200px] dark:text-white bg-gray-50 dark:bg-gray-700">
          {text}
        </div>
      ) : (
        <div className="border border-dashed rounded-lg p-4 min-h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400">
          録音した音声の文字起こし結果がここに表示されます
        </div>
      )}
    </div>
  )
}

export default Transcription 