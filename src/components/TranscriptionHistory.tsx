import React from 'react'

interface TranscriptionHistoryProps {
  history: { text: string; timestamp: string }[]
}

const TranscriptionHistory: React.FC<TranscriptionHistoryProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4 dark:text-white">履歴</h2>
        <div className="text-gray-500 dark:text-gray-400 text-center py-8">
          文字起こし履歴はまだありません
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 dark:text-white">履歴</h2>
      <ul className="divide-y dark:divide-gray-700">
        {history.map((item, index) => (
          <li key={index} className="py-3">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {item.timestamp}
            </div>
            <div className="dark:text-white">{item.text}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TranscriptionHistory 