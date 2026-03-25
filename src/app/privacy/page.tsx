import Link from 'next/link';
import styles from './legal.module.css';

export const metadata = {
  title: 'Privacy Policy — SnapCover',
  description: 'Privacy Policy for SnapCover.',
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.back}>
          ← SnapCover
        </Link>
      </header>

      <main className={styles.content}>
        <p className={styles.lastUpdated}>Last updated: March 25, 2026</p>

        <h1>Privacy Policy</h1>

        <p>
          SnapCover does not sell, trade, or rent your personal information to third parties.
          We are committed to protecting your privacy.
        </p>

        <h2>1. Information We Collect</h2>
        <p>When you create a SnapCover account, we collect:</p>
        <ul>
          <li>Your email address</li>
          <li>Warranty information you provide (item name, store, purchase date, warranty length)</li>
          <li>Receipt images you upload</li>
          <li>Notification preferences</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain the warranty tracking service</li>
          <li>Send you push or email notifications before warranties expire</li>
          <li>Export your data upon request</li>
          <li>Delete your account and all associated data upon request</li>
        </ul>

        <h2>3. Data Storage</h2>
        <p>
          Your data is stored using Supabase, our backend infrastructure provider. All data is
          encrypted in transit and at rest. Receipt images are stored in Supabase Storage.
        </p>

        <h2>4. Push Notifications</h2>
        <p>
          To send push notifications, your browser may request permission. If granted, a
          push subscription is stored on our servers. You can unsubscribe at any time through
          the SnapCover Settings page or your browser settings.
        </p>

        <h2>5. Email Notifications</h2>
        <p>
          If you provide an email address, we may send transactional emails such as warranty
          reminders. We use Resend to deliver these emails. We do not use your email for
          marketing purposes.
        </p>

        <h2>6. Data Sharing</h2>
        <p>
          We do not share your personal information with any third parties, except as necessary
          to provide our service (Supabase for storage, Resend for email delivery, Vercel for hosting).
        </p>

        <h2>7. Data Export</h2>
        <p>
          You can export all your warranty data at any time from the SnapCover Settings page
          as a JSON file.
        </p>

        <h2>8. Data Deletion</h2>
        <p>
          You can delete your account and all associated data at any time from the SnapCover
          Settings page. This permanently removes all warranties, notifications, and your
          account.
        </p>

        <h2>9. Cookies</h2>
        <p>
          SnapCover uses authentication cookies to keep you signed in. These are essential for
          the service to function and are not used for tracking.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material
          changes by posting the updated policy on this page.
        </p>

        <h2>11. Contact</h2>
        <p>
          For questions about this Privacy Policy, contact us at{' '}
          <a href="mailto:snipe76@gmail.com">snipe76@gmail.com</a>.
        </p>
      </main>
    </div>
  );
}
