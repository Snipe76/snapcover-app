import { redirect } from 'next/navigation';

export default function RootPage() {
  // All routes go through (app)/layout which handles auth
  // Root redirects to home or login based on auth state
  redirect('/login');
}
