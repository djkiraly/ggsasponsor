import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never intercept the login page or the NextAuth API routes
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/admin/login")
  ) {
    // Forward a request header so the admin layout can skip auth
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-admin-login", "1");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
