-- 補助金（subsidies）を全件削除する
-- Supabase ダッシュボード → SQL エディタで実行
--
-- ※削除すると元に戻せません。実行前に必ず内容を確認してください。

-- 【ステップ1】削除対象の件数を確認
SELECT COUNT(*) as 削除件数 FROM public.subsidies;

-- 【ステップ2】問題なければ以下を実行
DELETE FROM public.subsidies;
