import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');
  let next = requestUrl.searchParams.get('next') ?? '/dashboard';

  // Prevent open redirect vulnerabilities: ensure next is a relative path starting with /
  if (!next.startsWith('/') || next.startsWith('//')) {
    next = '/dashboard';
  }

  // Handle origin resolution for deployments with reverse proxies / load balancers
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  const origin = forwardedHost 
    ? `${forwardedProto}://${forwardedHost}` 
    : requestUrl.origin;

  // If the OAuth provider returned an error directly in query params
  if (errorParam || errorDescription) {
    const message = errorDescription || errorParam || 'Authentication was cancelled or failed.';
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, origin)
    );
  }

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        return NextResponse.redirect(new URL(next, origin));
      }
      
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, origin)
      );
    } catch (err: any) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(err.message || 'Authentication error')}`, origin)
      );
    }
  }

  // Fallback if no code and no error was provided
  return NextResponse.redirect(
    new URL('/login?error=Could not complete authentication. Please try again.', origin)
  );
}

