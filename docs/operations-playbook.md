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

- 成功: `{"message":"Sync completed.","count":N,"new_count":N,"needs_review_count":N,"archived_count":N}`（要件テキスト変更時は status=needs_review、flags_reviewed リセット）
- 環境変数未設定: `{"message":"No subsidies to sync.","hint":"Set JGRANTS_API_BASE_URL in .env.local and restart the dev server to sync from jGrants API."}`
- 認証エラー: `{"error":"Unauthorized"}`

### テスト用（JSON で手動登録）

補助金を1件だけ登録して動作確認する場合:
   ```
   curl -X POST http://localhost:3000/api/cron/sync-subsidies -H "Content-Type: application/json" -H "Authorization: Bearer my-super-secret-cron-key-reina0422" -d '{"subsidies":[{"api_id":"test-001","name":"テスト補助金","agency":"経済産業省","target_industries":["全業種"],"max_amount":1000000,"description":"テスト","is_active":true}]}'
   ```

---

### 経済産業省関連補助金の同期（METI）

経済産業省系の補助金（IT導入補助金、ものづくり補助金、小規模事業者持続化補助金など）を jGrants API から取得し、`agency=経済産業省` として `subsidies` に upsert します。

- **キーワード**: IT導入、ものづくり、小規模事業者、経済産業、生産性向上（重複は排除）
- **実行スケジュール**: 毎日 3:00 UTC（日本時間 12:00）に Vercel Cron で自動実行
- **手動実行例**:
   ```
   curl -X POST http://localhost:3000/api/cron/sync-meti-subsidies -H "Authorization: Bearer あなたのCRON_SECRET" -H "Content-Type: application/json"
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
| `ADMIN_BASIC_USER` / `ADMIN_BASIC_PASSWORD` | 管理画面（/admin）Basic 認証（必須） |
| `ADMIN_WEBHOOK_URL` | 補助金同期後の通知用 Webhook（新規・needs_review あり時に POST） |
| `ADMIN_LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API のチャネルアクセストークン（通知送信用） |
| `ADMIN_LINE_USER_ID` | 通知を送る LINE のユーザーID（U で始まるID） |

---

## 4. API取得データの管理フロー検証

補助金データの取得・保存が正しく動いているか確認できます。

### データフロー

```
[jGrants API] → sync-subsidies / sync-meti-subsidies → [Supabase subsidies]
                                                              ↓
[スクリーニング画面] → runScreening → subsidies を読み取り → [OpenAI] → 推薦
                                                              ↓
                                              [Supabase clients] (recommended_subsidies)
```

### 検証方法

**1. ブラウザまたは curl で確認:**
```
http://localhost:3000/api/verify-subsidy-flow
```

**2. 期待されるレスポンス例:**
- `ok: true` … subsidies の読み取り・clients の保存が問題なし
- `checks.subsidies.count` … AI判定に使える補助金の件数（1件以上あればOK）
- `checks.subsidies.ok: false` … subsidies テーブルへのアクセスエラー（RLSやカラム不一致の可能性）

**3. 補助金が0件の場合:**
- sync-subsidies または sync-meti-subsidies を実行してデータを投入する
- AI判定に使うのは **status=published** の補助金のみ。管理画面で「公開中」に変更するか、マイグレーションで既存の is_active=true は status=published に寄せてある

### 管理者ダッシュボード（/admin）

- `/admin/subsidies` で補助金の一覧・編集・フラグ確定が可能
- **Basic 認証**: `ADMIN_BASIC_USER` と `ADMIN_BASIC_PASSWORD` を設定すると、`/admin` 配下が保護される
- ステータス（draft / needs_review / published）とフラグ確認状況でフィルターし、「保存してフラグを確定する」で flags_reviewed=true にできる

### マイグレーション（subsidies マスター仕様）

- `supabase/migrations/20260315000000_subsidies_master_schema.sql` を適用すると、`status`, `ai_memo`, `flags_reviewed`, `is_exclusive_to_scrivener`, `requires_certified_agency`, `has_post_grant_reporting` が追加される
- 既存行は is_active に応じて status が published / archived に設定される

### LINE Messaging API で通知を受け取る

補助金同期で新規・needs_review があったときに LINE へプッシュ通知を送れます。

1. [LINE Developers](https://developers.line.biz/) でチャネル（Messaging API）を作成
2. **チャネルアクセストークン**（長期）を発行 → `ADMIN_LINE_CHANNEL_ACCESS_TOKEN`
3. **ユーザーID**（`U` で始まる）を取得するには、一度 Bot を友だち追加してから Webhook で受信するか、LINE Login で取得。自分に送る場合は、Bot の「チャネル設定」→「あなたのユーザーID」や、Webhook 受信ログから確認 → `ADMIN_LINE_USER_ID`
4. `.env.local` に両方設定し、サーバー再起動

※月200通まで無料、超過分は有料です。1回の同期で1通なので通常は問題になりにくいです。

---

## 5. トラブルシューティング

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

## 6. Vercel へのデプロイ（かんたん解説）

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

## 7. 関連ドキュメント

- [README_subsidies.md](../README_subsidies.md) … 補助金テーブルの編集方法
- [docs/subsidy-test-checklist.md](./subsidy-test-checklist.md) … テスト手順
