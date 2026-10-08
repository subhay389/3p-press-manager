import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { landingPathFor } from "@/lib/roles";

// Optimistic route guard. Pages still call requireUser()/requireAdmin(),
// and every mutation must check permissions on the server itself.
const ADMIN_ONLY = ["/jobs/new", "/settings"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if (!user) {
    if (pathname === "/login") return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const landing = landingPathFor(user.role);
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.redirect(new URL(landing, req.nextUrl));
  }
  if (user.role !== "ADMIN" && ADMIN_ONLY.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/jobs", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
