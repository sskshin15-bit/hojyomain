-- Cron 同期の再開位置を保持する状態管理テーブル
-- Vercel の 5 分タイムアウトを回避するため、チャンク単位で処理し次回続きから再開する

CREATE TABLE IF NOT EXISTS public.cron_sync_state (
  key text PRIMARY KEY,
  offset_value int NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.cron_sync_state IS 'sync-subsidies のステートフル再開用。offset_value = 次回の start パラメータ';
COMMENT ON COLUMN public.cron_sync_state.key IS '例: subsidies_sync';
COMMENT ON COLUMN public.cron_sync_state.offset_value IS 'jGrants API の start パラメータ（次の取得開始位置）';
