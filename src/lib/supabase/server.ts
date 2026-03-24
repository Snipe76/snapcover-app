import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client for App Router (RSC, Server Components, Server Actions, Route Handlers).
 *
 * IMPORTANT: In Route Handlers, you MUST call `getUser()` or `getSession()` early
 * (before any response is generated) to ensure the session cookie is read and the
 * PKCE code verifier from the auth flow is available.
 *
 * @example In a Route Handler:
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser(); // ← call this first!
 *   if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll can fail in contexts where cookies can't be modified
          }
        },
      },
    },
  );
}
