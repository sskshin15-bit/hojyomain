-- Phase 4: プロジェクトファイル用 Storage バケット

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'project-files',
  'project-files',
  false,
  10485760
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit;
