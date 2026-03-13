-- RLS で INSERT が拒否される場合の修正用
-- Supabase ダッシュボードの [SQL エディタ] で実行してください。

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "Allow public read and write" ON public.clients;

-- INSERT / UPDATE で WITH CHECK を明示したポリシーを作成
CREATE POLICY "Allow public read and write"
  ON public.clients
  FOR ALL
  USING (true)
  WITH CHECK (true);
