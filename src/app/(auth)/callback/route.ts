import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const next = searchParams.get('next') ?? '/';

  console.log('[callback] Request URL:', request.url);
  console.log('[callback] code present:', !!code, 'error:', errorParam);

  if (errorParam) {
    console.error('[callback] Auth error from Supabase:', errorParam, searchParams.get('error_description'));
    return NextResponse.redirect(`${origin}/login?error=${errorParam}`);
  }

  if (!code) {
    console.error('[callback] No code in URL');
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    const supabase = await createClient();
    console.log('[callback] Calling exchangeCodeForSession...');
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    console.log('[callback] exchangeCodeForSession result:', { 
      hasData: !!data, 
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
      user: data?.user?.id,
    });

    if (error) {
      console.error('[callback] Session exchange error:', error.message, error.code);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    }

    if (data.session) {
      console.log('[callback] Session created successfully, user:', data.user?.id);
    }

    return NextResponse.redirect(`${origin}${next}`);
  } catch (err) {
    console.error('[callback] Unexpected error:', err);
    return NextResponse.redirect(`${origin}/login?error=unexpected`);
  }
}
