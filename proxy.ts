import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedPage = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(
  async (auth, request) => {
    if (isProtectedPage(request)) await auth.protect();
  },
  { signInUrl: "/sign-in" },
);

export const config = {
  // Clerk must run for private APIs so auth() can validate the request session.
  // API handlers return JSON 401/403 responses instead of middleware redirects.
  matcher: [
    "/app/:path*",
    "/api/account/:path*",
    "/api/chat/:path*",
    "/api/workspace/:path*",
    "/api/memory/:path*",
    "/api/preferences/:path*",
    "/api/feedback/:path*",
    "/api/billing/checkout/:path*",
    "/api/billing/portal/:path*",
    "/api/github/:path*",
    "/api/nexus/:path*",
  ],
};
