-- Phase 1: マネタイズ用DBスキーマと上納金拡張

-- Step 1.1: profiles の role 拡張と bidding_fee_rate 追加
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
UPDATE public.profiles SET role = 'tax_accountant' WHERE role = 'user';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('tax_accountant', 'president', 'expert', 'admin'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bidding_fee_rate numeric NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.profiles.bidding_fee_rate IS '専門家の追加中抜き上納金率（オークション入札用）';

-- handle_new_user トリガーのデフォルトroleを tax_accountant に変更
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'tax_accountant');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 1.2: subsidies に料率カラム追加
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS fixed_success_fee_rate numeric;
ALTER TABLE public.subsidies ADD COLUMN IF NOT EXISTS base_platform_fee_rate numeric;
COMMENT ON COLUMN public.subsidies.fixed_success_fee_rate IS '固定の成功報酬率（例: 0.15）';
COMMENT ON COLUMN public.subsidies.base_platform_fee_rate IS '基本中抜き率（例: 0.30）';

-- Step 2: projects, project_messages, project_files テーブル作成
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subsidy_id uuid REFERENCES public.subsidies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  tax_accountant_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  expert_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'matching' CHECK (status IN (
    'matching', 'in_progress', 'applying', 'adopted', 'completed', 'canceled'
  )),
  success_fee_amount numeric,
  platform_fee_amount numeric,
  is_paid boolean NOT NULL DEFAULT false,
  agreed_to_terms_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.projects IS '案件進行管理（丸投げマッチング）';
COMMENT ON COLUMN public.projects.status IS 'matching: マッチング中, in_progress: 進行中, applying: 申請中, adopted: 採択, completed: 完了, canceled: キャンセル';

CREATE TABLE IF NOT EXISTS public.project_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.project_messages IS '密室チャット（直接取引防止）';

CREATE TABLE IF NOT EXISTS public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  uploader_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.project_files IS '機密書類共有';

-- Step 3: RLS 厳格化
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- projects: 関係者のみアクセス可能
DROP POLICY IF EXISTS "projects_select" ON public.projects;
CREATE POLICY "projects_select" ON public.projects FOR SELECT
  USING (
    auth.uid() = tax_accountant_id
    OR auth.uid() = expert_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = tax_accountant_id);

DROP POLICY IF EXISTS "projects_update" ON public.projects;
CREATE POLICY "projects_update" ON public.projects FOR UPDATE
  USING (
    auth.uid() = tax_accountant_id
    OR auth.uid() = expert_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "projects_delete" ON public.projects;
CREATE POLICY "projects_delete" ON public.projects FOR DELETE
  USING (
    auth.uid() = tax_accountant_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- project_messages: プロジェクト関係者のみ
DROP POLICY IF EXISTS "project_messages_select" ON public.project_messages;
CREATE POLICY "project_messages_select" ON public.project_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
      AND (
        auth.uid() = pr.tax_accountant_id
        OR auth.uid() = pr.expert_id
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "project_messages_insert" ON public.project_messages;
CREATE POLICY "project_messages_insert" ON public.project_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
      AND (
        auth.uid() = pr.tax_accountant_id
        OR auth.uid() = pr.expert_id
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

-- project_files: プロジェクト関係者のみ
DROP POLICY IF EXISTS "project_files_select" ON public.project_files;
CREATE POLICY "project_files_select" ON public.project_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
      AND (
        auth.uid() = pr.tax_accountant_id
        OR auth.uid() = pr.expert_id
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "project_files_insert" ON public.project_files;
CREATE POLICY "project_files_insert" ON public.project_files FOR INSERT
  WITH CHECK (
    auth.uid() = uploader_id
    AND EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
      AND (
        auth.uid() = pr.tax_accountant_id
        OR auth.uid() = pr.expert_id
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );

DROP POLICY IF EXISTS "project_files_delete" ON public.project_files;
CREATE POLICY "project_files_delete" ON public.project_files FOR DELETE
  USING (
    auth.uid() = uploader_id
    OR EXISTS (
      SELECT 1 FROM public.projects pr
      WHERE pr.id = project_id
      AND (
        auth.uid() = pr.tax_accountant_id
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
    )
  );
