import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { landingPathFor } from "@/lib/roles";

// Optimistic route guard. Pages still call requireUser()/requireAdmin(),
// and every mutation must check permissions on the server itself.
const ADMIN_ONLY = [/^\/jobs\/new/, /^\/jobs\/[^/]+\/edit/, /^\/settings/];
// Reachable without signing in (Google requires a public privacy policy).
const PUBLIC = ["/privacy"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if (PUBLIC.includes(pathname)) return NextResponse.next();

  if (!user) {
    if (pathname === "/login") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const landing = landingPathFor(user.role);
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.redirect(new URL(landing, req.nextUrl));
  }
  if (user.role !== "ADMIN" && ADMIN_ONLY.some((p) => p.test(pathname))) {
    return NextResponse.redirect(new URL("/jobs", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icon-192.png|icon-512.png|manifest.webmanifest).*)"],
};
