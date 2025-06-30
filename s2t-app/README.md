# 音声認識テストアプリ

このプロジェクトは、OpenAIのGPT-4o-transcribeとElevenLabsのscribe v1の音声認識機能を比較検証するためのReact + TypeScriptアプリケーションです。

## 機能

- ブラウザでの音声録音
- OpenAI GPT-4o-transcribeによる音声認識
- ElevenLabs scribe v1による音声認識
- 認識結果の表示（ElevenLabsの場合は単語ごとのタイミング情報も表示）

## 前提条件

- Node.js (v14以上)
- npm (v6以上)
- OpenAI APIキー
- ElevenLabs APIキー

## セットアップ

1. リポジトリをクローンまたはダウンロードします

2. 依存関係をインストールします
```bash
cd s2t-app
npm install
```

3. `.env`ファイルを作成し、APIキーを設定します
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

## 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開いてアプリケーションにアクセスします。

## 使用方法

1. 使用したい音声認識サービス（OpenAIまたはElevenLabs）を選択します
2. 「録音開始」ボタンをクリックして音声を録音します
3. 「録音終了」ボタンをクリックして録音を停止します
4. 「音声認識実行」ボタンをクリックして選択したサービスで音声認識を実行します
5. 認識結果が表示されます

## 注意事項

- このアプリケーションはブラウザのMediaRecorder APIを使用しているため、対応しているブラウザ（Chrome、Firefox、Edgeなど）で実行してください
- APIキーは秘密情報なので、公開リポジトリにコミットしないでください
- 本番環境では、APIキーをクライアントサイドで使用するのではなく、サーバーサイドで処理することをお勧めします

## 技術スタック

- React
- TypeScript
- Vite
- OpenAI API
- ElevenLabs API
