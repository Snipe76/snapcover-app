import type { Metadata, Viewport } from 'next';
import { Analytics } from '@/components/Analytics';
import './globals.css';

export const metadata: Metadata = {
  title: 'SnapCover — Never lose a warranty',
  description: 'Photograph your receipts, track your warranties, get reminded before they expire.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SnapCover',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.svg' },
      { url: '/favicon.ico' },
    ],
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'SnapCover',
    description: 'Photograph your receipts, track your warranties, get reminded before they expire.',
    url: 'https://snapcover-app.vercel.app',
    siteName: 'SnapCover',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)',  color: '#0D0D0D' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
        <div data-toast-root />
        <Analytics />
      </body>
    </html>
  );
}
