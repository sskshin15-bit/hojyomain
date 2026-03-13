# 運用プレイブック

税理士向け補助金提案 SaaS の運用・トラブルシューティング手順です。

---

## 1. ローカル開発時の起動

### 前提

- Node.js 18以上
- `package.json` と同じディレクトリで実行すること

### 手順

1. 依存関係をインストール
   ```bash
   npm install
   ```

2. 環境変数を設定
   - `.env.local` に以下を用意する（例）:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   CRON_SECRET=my-super-secret-cron-key-reina0422
   JGRANTS_API_BASE_URL=https://api.jgrants-portal.go.jp/exp/v1
   ```

3. 開発サーバーを起動
   ```bash
   npm run dev
   ```

4. 起動後の変更
   - `.env.local` を編集した場合は、**必ず `Ctrl+C` でサーバーを止めてから再起動**する
   - Next.js は起動時にのみ環境変数を読み込む

---

## 2. 補助金データの同期（jGrants API）

### 概要

- jGrants API から補助金一覧を取得し、Supabase の `subsidies` テーブルに upsert する
- 所要時間は約 5〜6 分（1リクエストで1ページ分を取得）

### 実行方法

1. サーバーが起動していること
2. `JGRANTS_API_BASE_URL` が `.env.local` に設定されていること
3. 以下を実行（1行でコピー可能）:
   ```
   curl -X POST http://localhost:3000/api/cron/sync-subsidies -H "Authorization: Bearer my-super-secret-cron-key-reina0422" -H "Content-Type: application/json"
   ```
   ※ `CRON_SECRET` の値は、`.env.local` の `CRON_SECRET` と一致させる

### レスポンス例

- 成功: `{"message":"Sync completed.","count":50}`
- 環境変数未設定: `{"message":"No subsidies to sync.","hint":"Set JGRANTS_API_BASE_URL in .env.local and restart the dev server to sync from jGrants API."}`
- 認証エラー: `{"error":"Unauthorized"}`

### テスト用（JSON で手動登録）

補助金を1件だけ登録して動作確認する場合:
   ```
   curl -X POST http://localhost:3000/api/cron/sync-subsidies -H "Content-Type: application/json" -H "Authorization: Bearer my-super-secret-cron-key-reina0422" -d '{"subsidies":[{"api_id":"test-001","name":"テスト補助金","agency":"経済産業省","target_industries":["全業種"],"max_amount":1000000,"description":"テスト","is_active":true}]}'
   ```

---

## 3. 環境変数一覧

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー（同期・サーバー用） |
| `CRON_SECRET` | Cron API 認証用（本番では強力な値に変更すること） |
| `JGRANTS_API_BASE_URL` | jGrants API のベース URL（例: `https://api.jgrants-portal.go.jp/exp/v1`） |
| `ADMIN_USER` / `ADMIN_PASSWORD` | 管理画面 Basic 認証（利用する場合） |
| `ADMIN_WEBHOOK_URL` | 管理者通知用 Webhook（任意） |

---

## 4. トラブルシューティング

### 「No subsidies to sync.」と表示される

- `JGRANTS_API_BASE_URL` が `.env.local` に設定されているか確認
- サーバー起動後に編集した場合は、再起動してから再度 curl を実行

### jGrants API で 400 Bad Request

- `keyword` は 2 文字以上必須
- ターミナル curl で日本語を含む URL を使うと、エンコーディングで 400 になることがある
- アプリ側の fetch では問題ない想定

### 同期が終わらない・応答が返ってこない

- 初回は 5 分以上かかることがある
- `curl --max-time 600` でタイムアウトを伸ばして待つ

### /screenings が 404

- `src/middleware.ts` が空または正しく export されていない可能性
- 正しい middleware が定義されているか確認

### 複数の Next.js が起動している

- `pkill -f "next dev"` で既存プロセスを終了してから再起動

---

## 5. Vercel へのデプロイ（かんたん解説）

このアプリをインターネット上に公開する手順です。

---

### ステップ 0：準備するもの

| 準備するもの | 説明 |
|--------------|------|
| Vercel アカウント | [vercel.com](https://vercel.com) で無料登録 |
| GitHub アカウント | コードを置く場所 |
| コードを GitHub にプッシュ | ローカルの「hojyomain」フォルダを GitHub のリポジトリにアップロード |

**補足：** 補助金の自動同期は 5 分以上かかります。無料プラン（Hobby）は 10 秒で打ち切られるため、同期機能を使う場合は **Vercel Pro**（有料）が必要です。

---

### ステップ 1：Vercel でプロジェクトを作る

1. ブラウザで [vercel.com](https://vercel.com) を開く
2. ログインする（GitHub でログインすると楽）
3. 右上の **「Add New...」** をクリック → **「Project」** を選ぶ
4. 一覧から **「hojyomain」のリポジトリ** を選ぶ
5. そのまま **「Import」** をクリック

---

### ステップ 2：環境変数を入れる

「Configure Project」の画面が出たら、下にスクロールして **「Environment Variables」** のところを見ます。

次の変数を **1つずつ** 追加します。  
「Key」に変数名、「Value」に値を入れます。

| Key（変数名） | Value（値） | どこで確認するか |
|---------------|-------------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Supabase ダッシュボード → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...`（長い文字列） | 同上 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...`（長い文字列） | 同上（secret と書いてあるキー） |
| `CRON_SECRET` | ランダムな英数字（例: `abc123xyz789` など長め） | 自分で決める。他人に知られない値にする |
| `JGRANTS_API_BASE_URL` | `https://api.jgrants-portal.go.jp/exp/v1` | そのままコピペで OK |
| `OPENAI_API_KEY` | `sk-...` | OpenAI の API キー（AI スクリーニングを使う場合） |

`.env.local` にすでに入っている値をコピペしても大丈夫です（CRON_SECRET だけ本番用に別の値に変えるのがおすすめ）。

---

### ステップ 3：デプロイする

1. 画面下の **「Deploy」** ボタンを押す
2. 数分待つ（ビルドとデプロイが進む）
3. 「Congratulations!」と出たら完了
4. **「Visit」** をクリックすると、公開されたサイトが開く

これで、世界中からその URL でアクセスできます。

---

### 補助金の自動同期について

- **自動実行：** 毎日 世界標準時 2:00（日本時間 11:00）に、jGrants から補助金データを取得して Supabase に保存する処理が動きます。
- **設定は済んでいる：** プロジェクト内の `vercel.json` に書いてあるので、追加でやることはありません。
- **手動で実行したい場合：** 下のコマンドを、`あなたのドメイン` と `CRON_SECRETの値` を入れ替えて実行します。

   ```
   curl -X POST https://あなたのドメイン.vercel.app/api/cron/sync-subsidies -H "Authorization: Bearer CRON_SECRETの値" -H "Content-Type: application/json"
   ```

---

### まとめ

| やること | 内容 |
|----------|------|
| 1 | Vercel にログイン → Add New → Project |
| 2 | hojyomain のリポジトリを選んで Import |
| 3 | 環境変数を 1 つずつ登録 |
| 4 | Deploy を押して完了を待つ |

分からないところがあれば、Vercel のドキュメントや Cursor の AI に聞いてみてください。

---

## 6. 関連ドキュメント

- [README_subsidies.md](../README_subsidies.md) … 補助金テーブルの編集方法
- [docs/subsidy-test-checklist.md](./subsidy-test-checklist.md) … テスト手順
