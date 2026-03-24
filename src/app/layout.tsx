import type { Metadata, Viewport } from 'next';
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
      { url: '/favicon.ico' },
      { url: '/icon-192.png', rel: 'icon', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', rel: 'icon', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
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
      </body>
    </html>
  );
}
