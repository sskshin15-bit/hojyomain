import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

export function createServerClientWithAuth() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(_name: string, _value: string, _options: CookieOptions) {
        // In Server Components we cannot write cookies directly.
        // Cookie refresh is handled via middleware/proxy instead.
      },
      remove(_name: string, _options: CookieOptions) {
        // See comment in set(): cookie mutations are handled elsewhere.
      },
    },
  })
}

