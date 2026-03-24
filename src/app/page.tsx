'use client';

// Root page — renders login directly.
// The login page is self-contained (no auth check needed).
// Middleware is not reliably intercepting / before static page on Vercel.
import LoginPage from './(auth)/login/page';

export default function RootPage() {
  return <LoginPage />;
}
