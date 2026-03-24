import { redirect } from 'next/navigation';

export default function RootPage() {
  // Auth redirect is handled by middleware (/ → /login)
  // This page should never render directly
  redirect('/login');
}
