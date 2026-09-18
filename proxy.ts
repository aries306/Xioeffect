import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/app(.*)",
  "/api/account(.*)",
  "/api/chat(.*)",
  "/api/workspace(.*)",
  "/api/memory(.*)",
  "/api/feedback(.*)",
  "/api/billing/checkout(.*)",
  "/api/github(.*)",
  "/api/nexus(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect();
});

export const config = {
  // Keep Clerk at the protected boundary, avoiding a Next-only regex matcher and
  // allowing public/static routes to run without loading authentication middleware.
  matcher: [
    "/app/:path*",
    "/api/account/:path*",
    "/api/chat/:path*",
    "/api/workspace/:path*",
    "/api/memory/:path*",
    "/api/feedback/:path*",
    "/api/billing/checkout/:path*",
    "/api/github/:path*",
    "/api/nexus/:path*",
  ],
};
