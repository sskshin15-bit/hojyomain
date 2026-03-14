-- ========================================
-- テスト・サンプル用の補助金を削除する
-- Supabase ダッシュボード → SQL エディタで実行
-- ========================================
--
-- 削除対象:
-- - api_id = 'test-001'（ドキュメントのテスト用）
-- - name に「テスト補助金」を含む
-- - name に「test subsidy」を含む（大文字小文字無視）

-- 【ステップ1】まず削除対象を確認（これだけ実行して結果を見る）
SELECT id, api_id, name, created_at
FROM public.subsidies
WHERE api_id = 'test-001'
   OR name LIKE '%テスト補助金%'
   OR name ILIKE '%test subsidy%';

-- 【ステップ2】上記の結果を確認して問題なければ、以下を実行（1行ずつ実行可）
-- DELETE FROM public.subsidies
-- WHERE api_id = 'test-001'
--    OR name LIKE '%テスト補助金%'
--    OR name ILIKE '%test subsidy%';
