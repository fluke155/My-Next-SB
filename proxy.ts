import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/login", "/signup"];
const PUBLIC_PATHS = ["/auth/callback", "/offline"];

/**
 * Next.js 16: proxy.ts (เดิมคือ middleware.ts)
 * - refresh session cookie ของ Supabase ทุก request
 * - ยังไม่ login -> ส่งไป /login, login แล้วเข้า /login -> ส่งไป /customers
 * เป็นแค่ด่านแรก การเช็กสิทธิ์จริงอยู่ที่ requireUser/requireAdmin + RLS
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // ห้ามมีโค้ดอื่นคั่นระหว่าง createServerClient กับ getUser
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    // ส่ง cookie ที่ refresh แล้วไปด้วย
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    return redirectResponse;
  };

  if (!user && !isAuthPage && !isPublic) return redirectTo("/login");
  if (user && isAuthPage) return redirectTo("/customers");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|apple-icon|icon|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
