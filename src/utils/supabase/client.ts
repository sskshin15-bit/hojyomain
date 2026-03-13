import { createBrowserClient } from "@supabase/ssr"

/**
 * ブラウザ（Client Component）から Supabase にアクセスするためのクライアント。
 * .env.local の NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を使用します。
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
