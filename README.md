# GPT-4o Transcribe デモ

このプロジェクトは、OpenAIのGPT-4o Transcribe APIを使用して音声を文字起こしするWebアプリケーションです。ブラウザからマイクを使用して音声を録音し、OpenAI APIを使って文字起こしを行うことができます。

## 機能

- ブラウザからのマイク録音
- 録音音声のプレビュー再生
- OpenAI APIによる文字起こし
- 文字起こし履歴の保存

## セットアップ方法

1. リポジトリをクローンする
   ```
   git clone https://github.com/your-username/S2T-playground.git
   cd S2T-playground
   ```

2. 依存パッケージをインストールする
   ```
   npm install
   ```

3. 環境変数を設定する
   - `sample.env`ファイルを`.env.local`としてコピーする
   - `.env.local`ファイルを開き、OpenAI APIキーを設定する

4. 開発サーバーを起動する
   ```
   npm run dev
   ```

5. ブラウザで http://localhost:5173 を開く

## 使用技術

- React + TypeScript
- Tailwind CSS
- Vite
- OpenAI API (Whisper モデル)

## 注意事項

- このデモアプリケーションはフロントエンドのみで実装されているため、OpenAI APIキーがクライアントサイドに露出します。実際のプロダクションでは、APIキーを安全に管理するためにバックエンドサーバーを使用することをお勧めします。