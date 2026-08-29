import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseUrl, getSupabaseAnonKey } from './config';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                           request.nextUrl.pathname.startsWith('/explore') ||
                           request.nextUrl.pathname.startsWith('/settings');
                           
  const isAuthRoute = request.nextUrl.pathname === '/login' ||
                      request.nextUrl.pathname === '/signup' ||
                      request.nextUrl.pathname === '/forgot-password';

  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirectPath = request.nextUrl.pathname + request.nextUrl.search;
    if (redirectPath !== '/') {
      url.searchParams.set('next', redirectPath);
    }
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    const nextParam = request.nextUrl.searchParams.get('next');
    // Ensure the redirect target is a safe internal path
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      url.pathname = nextParam;
      url.searchParams.delete('next');
    } else {
      url.pathname = '/dashboard';
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
