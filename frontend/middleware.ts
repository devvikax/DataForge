import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/admin"];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
