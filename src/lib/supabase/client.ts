import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 * Use this in Client Components only.
 * Env vars are public (VITE_ prefix in Vite, NEXT_PUBLIC_ in Next.js).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
