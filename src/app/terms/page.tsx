import Link from 'next/link';
import styles from './legal.module.css';

export const metadata = {
  title: 'Terms of Service — SnapCover',
  description: 'Terms of Service for SnapCover.',
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← SnapCover
        </Link>
      </header>

      <main className={styles.content}>
        <p className={styles.lastUpdated}>Last updated: March 25, 2026</p>

        <h1>Terms of Service</h1>

        <p>
          Welcome to SnapCover. By using our website and services, you agree to these
          Terms of Service. If you do not agree, please do not use our services.
        </p>

        <h2>1. Use of Service</h2>
        <p>
          SnapCover provides a warranty tracking service. You must be at least 18 years
          old to create an account. You are responsible for keeping your account credentials
          secure.
        </p>

        <h2>2. Data Storage</h2>
        <p>
          Your warranty information and receipt images are stored securely using Supabase,
          our backend infrastructure provider. We do not sell your personal data.
        </p>

        <h2>3. Push Notifications</h2>
        <p>
          SnapCover may send you push notifications to remind you of upcoming warranty
          expirations. You can disable push notifications at any time through your browser
          or device settings, or through the SnapCover Settings page.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>
          You agree not to use SnapCover for any unlawful purpose or in any way that could
          damage or impair the service. You may not attempt to gain unauthorized access to
          any part of the service.
        </p>

        <h2>5. Availability</h2>
        <p>
          We strive to keep SnapCover available at all times, but we do not guarantee
          uninterrupted access. We may suspend or discontinue services at any time with
          or without notice.
        </p>

        <h2>6. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of SnapCover after
          changes constitutes acceptance of the new terms.
        </p>

        <h2>7. Contact</h2>
        <p>
          For questions about these Terms, contact us at{' '}
          <a href="mailto:snipe76@gmail.com">snipe76@gmail.com</a>.
        </p>
      </main>
    </div>
  );
}
