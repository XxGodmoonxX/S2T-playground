import React from 'react'

const Header: React.FC = () => {
  return (
    <header className="bg-blue-600 text-white p-4 shadow-md">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">GPT-4o Transcribe デモ</h1>
        <p className="text-sm opacity-80">マイクから音声入力して、GPT-4o Transcribeで文字起こしをテストできます</p>
      </div>
    </header>
  )
}

export default Header 