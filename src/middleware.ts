import { NextRequest, NextResponse } from "next/server";

/**
 * Basic HTTP auth gate for the whole app.
 *
 * This isn't a real multi-user auth system — it's the minimum needed to
 * stop this from being a fully public tool that anyone with the URL can
 * use to trigger real external API calls (SEC EDGAR, DNS lookups) at
 * whatever volume they like. Before adding real users/teams, replace
 * this with proper session-based auth (NextAuth.js pairs well with the
 * Postgres setup once that's wired in).
 *
 * Credentials come from env vars — see .env.example. If they aren't set,
 * the app fails closed (denies access) rather than silently staying
 * open, so a missing env var in a new environment can't accidentally
 * expose it.
 */

export function middleware(req: NextRequest) {
  // Let health checks through unauthenticated so uptime monitors work.
  if (req.nextUrl.pathname === "/api/health") {
    return NextResponse.next();
  }

  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return new NextResponse("Auth not configured — set ADMIN_USER and ADMIN_PASSWORD.", { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const [reqUser, reqPass] = decoded.split(":");
      if (reqUser === user && reqPass === pass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="leadintel"' },
  });
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next's internal static assets, so the login
     * prompt doesn't block CSS/JS/images from loading once authenticated.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
