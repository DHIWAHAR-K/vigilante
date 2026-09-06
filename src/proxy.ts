import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { normalizeRedirectPath } from "@/lib/auth/redirects";
import { parsePublicEnv } from "@/lib/env";

const protectedPaths = ["/app"];
const authPaths = ["/sign-in", "/sign-up"];

function matchesPath(pathname: string, paths: string[]) {
  return paths.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const env = parsePublicEnv();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;
  const isAuthenticated = Boolean(data?.claims.sub);

  if (!isAuthenticated && matchesPath(pathname, protectedPaths)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectTo", normalizeRedirectPath(`${pathname}${search}`));
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && matchesPath(pathname, authPaths)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
