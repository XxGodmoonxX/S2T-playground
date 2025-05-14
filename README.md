# GPT-4o Transcribe デモアプリ

OpenAIのGPT-4o Transcribeを使用したリアルタイム音声文字起こしデモアプリケーションです。

## 特徴

- **リアルタイム文字起こし**: WebSocketを使用して音声をリアルタイムで文字起こし
- **バッチ処理**: 録音完了後に一括で文字起こし処理も可能
- **音声録音**: ブラウザのマイクから音声を録音
- **モデル選択**: GPT-4o TranscribeとGPT-4o Mini Transcribeを選択可能

## セットアップ

1. このリポジトリをクローン
```bash
git clone <repository-url>
cd S2T-playground
```

2. 依存関係をインストール
```bash
npm install
```

3. 環境変数を設定
```bash
cp sample.env .env
```
`.env`ファイルを編集して、OpenAI APIキーを設定してください。

## 実行方法

### 開発モード（フロントエンドとサーバー同時実行）

```bash
npm run dev:all
```

これにより、Viteのフロントエンド開発サーバー（デフォルトポート: 5173）とWebSocketサーバー（デフォルトポート: 3001）が同時に起動します。

### フロントエンドのみ実行

```bash
npm run dev
```

### サーバーのみ実行

```bash
npm run server
```

## 使い方

1. アプリケーションにアクセス（デフォルト: http://localhost:5173）
2. 必要に応じて「リアルタイム文字起こし」のトグルをオン/オフ
3. 「録音開始」ボタンをクリックしてマイクへのアクセスを許可
4. 話し始めると、リアルタイムモードでは即座に文字起こし結果が表示される
5. 「停止」ボタンをクリックして録音を終了

## WebSocketストリーミングについて

このアプリケーションはOpenAIの音声文字起こしストリーミングAPIをWebSocketを通じて利用しています。WebSocketサーバーはNodeJS+Expressで実装されており、クライアントからの音声データをOpenAIのAPIにリレーします。

## 注意事項

- マイクアクセスにはHTTPS環境またはlocalhost環境が必要です
- WebSocketサーバーの起動にはNode.js環境が必要です
- OpenAIのAPIキーが必要です（有料）

## ライセンス

MIT