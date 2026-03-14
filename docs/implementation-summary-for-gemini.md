# 補助金提案SaaS 実装内容サマリ（Gemini向け）

税理士向け補助金提案SaaS「hojyomain」に実装した内容の全体像です。別のAI（Gemini等）に引き継ぐ際に渡してください。

---

## 1. プロジェクト概要

- **技術スタック**: Next.js 16, React 19, TypeScript, Supabase, Vercel AI SDK (OpenAI), Tailwind CSS
- **ホスティング**: Vercel
- **リポジトリ**: GitHub (hojyomain)

---

## 2. データベース（Supabase）

### subsidies テーブル（補助金）

マスター仕様のマイグレーション `20260315000000_subsidies_master_schema.sql` で以下を追加：

| カラム | 型 | 説明 |
|--------|-----|------|
| `api_id` | text | jGrants等の固有ID（Upsertのキー、UNIQUE） |
| `name` | text | 補助金名 |
| `description` | text | 要件・概要（HTMLクレンジング済み） |
| `url` | text | 公式公募要領のURL |
| `deadline` | timestamptz | 締切日 |
| `status` | text | 'draft'（未確認）, 'needs_review'（要確認）, 'published'（公開中）, 'archived'（アーカイブ） |
| `ai_memo` | text | API同期時の変更差分メモ |
| `flags_reviewed` | boolean | 管理者が3警告フラグを確認・確定したか（初期値 false） |
| `is_exclusive_to_scrivener` | boolean | 行政書士等の独占業務フラグ |
| `requires_certified_agency` | boolean | 認定支援機関必須フラグ |
| `has_post_grant_reporting` | boolean | 事後報告義務フラグ |

その他: `id`, `agency`, `target_industries`, `max_amount`, `is_active`, `created_at` 等

- **AI判定で使うのは `status='published'` の補助金のみ**

### profiles テーブル（RBAC）

`20260318000000_create_profiles_rbac.sql` で作成:

| カラム | 型 | 説明 |
|--------|-----|------|
| `id` | uuid | auth.users.id を参照（PK） |
| `role` | text | 'admin' \| 'user'（デフォルト 'user'） |
| `created_at`, `updated_at` | timestamptz | |

- サインアップ時に `handle_new_user` トリガーで自動作成（role='user'）
- 初回管理者は SQL で `update profiles set role='admin' where id='...'` を実行
- 既存行: `is_active=true` → `status='published'`, `false` → `archived` にマイグレーションで変換

---

## 3. 補助金同期 Cron（sync-subsidies）

**ファイル**: `src/app/api/cron/sync-subsidies/route.ts`

- **認証**: `Authorization: Bearer {CRON_SECRET}` または `x-cron-key` ヘッダ
- **jGrants API**: `JGRANTS_API_BASE_URL` が設定されていれば、キーワード「補助」で全件取得
- **ページネーション**: `limit=100`, `start` でループ、1リクエストごとに1秒スリープ（Rate Limit対策）
- **HTML除去**: 正規表現で完全除去（`stripHtml`）
- **差分検知（AIは使わない）**:
  - 締切のみ変更 → `status` 維持、`deadline` のみ更新
  - 要件テキスト変更 → `status=needs_review`, `flags_reviewed=false`, `ai_memo='要件テキストの更新を検知しました'`
  - 新規 → `status=draft`
- **アーカイブ**: 同名で新しい `api_id` がある既存行は `status='archived'`
- **通知**: 新規 or needs_review が1件以上あれば `ADMIN_WEBHOOK_URL` に POST、`ADMIN_LINE_CHANNEL_ACCESS_TOKEN` + `ADMIN_LINE_USER_ID` があれば LINE Messaging API にプッシュ送信

---

## 4. jGrants クライアント

**ファイル**: `src/lib/jgrants.ts`

- `fetchSubsidiesByKeyword(keyword, { limit, start })`: ページネーション対応
- `fetchAllSubsidiesFromJgrants()`: 全件取得、1秒スリープ込み
- `fetchMetiSubsidiesFromJgrants()`: 経産省系（IT導入、ものづくり等）のみ取得

---

## 5. 管理者ダッシュボード

**URL**: `/admin/subsidies`

- **認証**: Supabase Auth + RBAC — `src/middleware.ts` で `/admin` 配下を保護。`profiles.role='admin'` のユーザーのみアクセス可。未ログインは `/login?redirectTo=...` へリダイレクト
- **機能**: ステータス・フラグ確認状況でフィルター、補助金一覧表示、編集パネルで名前・概要・3警告フラグを編集し「保存してフラグを確定する」で `flags_reviewed=true` に
- **ファイル**: `src/app/(admin)/admin/subsidies/page.tsx`, `actions.ts`, `layout.tsx`

---

## 6. AI スクリーニング

**ファイル**: `src/app/(dashboard)/screenings/actions.ts`

- **対象データ**: `status='published'` の補助金のみ（最大50件）
- **モデル**: OpenAI gpt-4o-mini、Vercel AI SDK の `generateObject` + Zod スキーマ
- **出力スキーマ**（補助金1件あたり）:
  - `match_rate`, `reason`, `missing_requirements`, `actionable_advice`, `next_question_to_ask`
  - `consulting_guide`: `{ key_evaluation_points: string[], drafting_tips: string }`
  - `ai_inferred_warnings`: `{ is_exclusive_to_scrivener, requires_certified_agency, has_post_grant_reporting }`
- **プロンプト**: 厳密な法律定義は生成しない旨を明記
- **DBのフラグ**: 各推薦に `db_url`, `db_flags_reviewed`, 3フラグを付与してUIに渡す

---

## 7. 顧客向けスクリーニング UI

**URL**: `/screenings`  
**ファイル**: `src/app/(dashboard)/screenings/page.tsx`

- **ハイブリッド警告**: `flags_reviewed=true` なら DB の3フラグに従い赤色バッジ（絶対ルール）。`false` なら AI の `ai_inferred_warnings` に従い「⚠️ AI判定（公式要領要確認）」
- **公式リンク**: 各カードに「📖 公式公募要領を確認する」ボタン（`db_url`）
- **免責**: 画面下部固定「AIの判定は目安です。要件の詳細は必ず一次情報をご確認ください」
- **コンサルティングUI**: 「📄 顧問先向け：事業計画策定コンサルティングシート」で `key_evaluation_points`, `drafting_tips` を表示

---

## 8. その他 API

| エンドポイント | 説明 |
|----------------|------|
| `POST /api/cron/sync-meti-subsidies` | 経産省系補助金のみ同期（Cron 認証必須） |
| `GET /api/verify-subsidy-flow` | 補助金フロー検証（subsidies の status=published 件数、clients 件数等を返す） |

---

## 9. 環境変数

| 変数名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー |
| `CRON_SECRET` | sync-subsidies / sync-meti-subsidies の認証 |
| `JGRANTS_API_BASE_URL` | jGrants API（例: https://api.jgrants-portal.go.jp/exp/v1） |
| `OPENAI_API_KEY` | AI スクリーニング用 |
| `ADMIN_BASIC_USER` | 管理画面 Basic 認証ユーザー名 |
| `ADMIN_BASIC_PASSWORD` | 管理画面 Basic 認証パスワード |
| `ADMIN_WEBHOOK_URL` | 補助金同期後の通知（任意） |
| `ADMIN_LINE_CHANNEL_ACCESS_TOKEN` | LINE 通知用（任意） |
| `ADMIN_LINE_USER_ID` | LINE 通知先ユーザーID（任意） |

---

## 10. 主要ファイル一覧

```
supabase/migrations/
  - 20260315000000_subsidies_master_schema.sql  # status, フラグ等追加

src/
  middleware.ts                              # /admin Basic認証
  lib/jgrants.ts                             # jGrants API（ページネーション・1秒スリープ）
  lib/html-clean.ts                          # stripHtml
  app/
    (admin)/admin/subsidies/
      page.tsx, actions.ts
    (dashboard)/screenings/
      page.tsx, actions.ts
    api/cron/
      sync-subsidies/route.ts
      sync-meti-subsidies/route.ts
    api/verify-subsidy-flow/route.ts

vercel.json                                  # Cron スケジュール
```

---

## 11. 別機能（JudgmentEngine）

- `src/app/(dashboard)/screenings/judgment/` に、補助金ごとの申請可否を質問フローで判定する機能がある
- AI スクリーニングとは別系統。マスター仕様の「顧客向け提案カード＋ハイブリッド警告」とは独立

---

## 12. テスト用補助金の削除

- `supabase/delete_test_subsidies.sql`: `api_id='test-001'` や「テスト補助金」等を削除するSQL
- Supabase SQL エディタで実行

---

## 13. デプロイ（Vercel）

- GitHub に push すると自動デプロイ
- 補助金同期 Cron: vercel.json で毎日 2:00 UTC, 3:00 UTC に実行
- 無料プランは sync-subsidies がタイムアウトする可能性あり（5分以上かかる場合）。Pro 推奨
