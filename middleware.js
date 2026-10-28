import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "cleanergy_admin_token";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  let isAuthenticated = false;
  const secretString = process.env.ADMIN_JWT_SECRET?.trim();

  // Strictly enforce dedicated secret with minimum 32 characters
  if (token && secretString && secretString.length >= 32) {
    try {
      const secret = new TextEncoder().encode(secretString);
      await jwtVerify(token, secret);
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  // 1. Root redirect
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 2. Protect all /admin routes
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 3. If already authenticated, redirect away from /login
  if (pathname === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/login"],
};
