/**
 * system_prompts テーブル操作用
 */

import { createClient } from "@supabase/supabase-js"

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase env vars not configured")
  return createClient(url, key)
}

export async function getCriticPrompt(): Promise<{ prompt_text: string; version: number } | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("system_prompts")
    .select("prompt_text, version")
    .eq("role", "critic")
    .single()
  if (error || !data) return null
  return { prompt_text: data.prompt_text, version: data.version }
}

export async function updateCriticPrompt(
  promptText: string,
  version: number
): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("system_prompts")
    .update({
      prompt_text: promptText,
      version: version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("role", "critic")
  if (error) throw new Error(`Failed to update critic prompt: ${error.message}`)
}
