# Claude Code 設定

このプロジェクトでの開発フローと設定について記載します。

## Git ワークフロー

### ブランチ戦略
- 新しい機能や修正を行う際は、main、developなどのprotectedブランチ以外では新しいブランチを作成してから作業を開始する
- protectedブランチでない場合は、現在のブランチで直接作業を行っても良い
- ブランチ名は機能に応じて適切に命名する（例: `feat/add-user-auth`, `fix/button-styling`）

### コミットルール
- 作業の区切りごとに適宜gitにコミットする
- コミットメッセージはConventional Commitルールに従う

#### コミットメッセージの形式
```
<type>: <description>

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### コミットタイプ
- `feat:` - 新機能の追加
- `fix:` - バグ修正
- `docs:` - ドキュメントの変更
- `style:` - コードスタイルの変更（機能に影響しない）
- `refactor:` - リファクタリング
- `test:` - テストの追加・修正
- `chore:` - その他の変更（ビルド、依存関係など）

#### 例
- `feat: ユーザー認証機能を追加`
- `fix: ボタンのスタイリングを修正`
- `docs: READMEを更新`

## プロジェクト構成

### フロントエンド
- React + TypeScript + Tailwind CSS
- Vite (開発サーバー・ビルドツール)
- ESLint (コード品質管理)

### 開発コマンド
- `npm install` - 依存関係のインストール
- `npm run dev` - 開発サーバー起動
- `npm run build` - プロダクションビルド
- `npm run lint` - ESLintによるコードチェック
- `npm run preview` - ビルド結果のプレビュー