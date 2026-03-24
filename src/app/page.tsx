import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <span className="landing-logo">
            <svg width="28" height="28" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect width="48" height="48" rx="12" fill="var(--accent)" />
              <path d="M14 20h20M14 24h12M14 28h16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="36" cy="34" r="6" fill="var(--accent-secondary)" />
              <path d="M33.5 34l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>SnapCover</span>
          </span>
          <nav className="landing-nav" aria-label="Landing navigation">
            <Link href="/login" className="landing-nav-signin">Sign in</Link>
            <Link href="/login" className="landing-nav-cta">Get started</Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        {/* Hero */}
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-inner">
            <p className="hero-eyebrow">Receipt saving + warranty tracking</p>
            <h1 id="hero-heading" className="hero-heading">
              Your receipts.<br />Your warranties.<br />One app.
            </h1>
            <p className="hero-sub">
              Save your receipts by photo. SnapCover reads them, tracks every warranty,
              and reminds you before they expire — so you never miss a claim.
            </p>
            <div className="hero-actions">
              <Link href="/login" className="btn-primary">
                Get started free
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link href="#how-it-works" className="btn-ghost">See how it works</Link>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="hero-mockup" aria-hidden="true">
            <div className="phone-frame">
              <div className="phone-screen">
                <div className="mock-header">
                  <span className="mock-title">SnapCover</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#98989D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#98989D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="mock-list">
                  {[
                    { name: 'MacBook Pro 16"', store: 'Apple Store', days: 312, color: 'var(--accent-secondary)' },
                    { name: 'Sony WH-1000XM5', store: 'Amazon', days: 14, color: 'var(--warning)' },
                    { name: 'Dyson V15', store: 'Best Buy', days: 2, color: 'var(--danger)' },
                  ].map((w) => (
                    <div className="mock-card" key={w.name}>
                      <div className="mock-card-left">
                        <div className="mock-card-name">{w.name}</div>
                        <div className="mock-card-store">{w.store}</div>
                      </div>
                      <div className="mock-badge" style={{ color: w.color }}>
                        {w.days > 0 ? `${w.days}d left` : 'Expired'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mock-nav">
                  <div className="mock-nav-item mock-nav-active">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="9 22 9 12 15 12 15 22" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Home</span>
                  </div>
                  <div className="mock-nav-fab">+</div>
                  <div className="mock-nav-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="3" stroke="#98989D" strokeWidth="1.75" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="#98989D" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Settings</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="how" aria-labelledby="how-heading">
          <div className="how-inner">
            <p className="section-eyebrow">How it works</p>
            <h2 id="how-heading" className="section-heading">Three steps. No clutter.</h2>

            <div className="steps">
              <div className="step">
                <div className="step-num" aria-hidden="true">1</div>
                <div className="step-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="4" stroke="var(--accent)" strokeWidth="1.75" />
                  </svg>
                </div>
                <h3 className="step-title">Photograph your receipt</h3>
                <p className="step-desc">Use your camera or pick from your photo library. SnapCover reads the text instantly, right on your device.</p>
              </div>

              <div className="step-connector" aria-hidden="true" />

              <div className="step">
                <div className="step-num" aria-hidden="true">2</div>
                <div className="step-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M9 11l3 3L22 4" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="step-title">We extract the details</h3>
                <p className="step-desc">Store name, item, purchase date, and warranty length are pulled from the photo automatically. You just confirm.</p>
              </div>

              <div className="step-connector" aria-hidden="true" />

              <div className="step">
                <div className="step-num" aria-hidden="true">3</div>
                <div className="step-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="step-title">Get reminded before expiry</h3>
                <p className="step-desc">SnapCover sends you a notification 30 days, 7 days, and 1 day before your warranty expires. No more guessing.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="features" aria-labelledby="features-heading">
          <div className="features-inner">
            <p className="section-eyebrow">Everything you need</p>
            <h2 id="features-heading" className="section-heading">Built for the way you think</h2>

            <div className="feature-grid">
              {[
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
                      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: 'Zero effort to add',
                  desc: 'Snap a receipt. We do the rest. No forms to fill out, no manual entry required.',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: 'Private by design',
                  desc: 'Your data is yours. No third-party trackers, no data brokering. Ever.',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
                      <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: 'Timely reminders',
                  desc: 'Notified 30, 7, and 1 day before expiry. Pick which reminders you want.',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  ),
                  title: 'Your data, your export',
                  desc: 'Download all your warranties as a JSON file anytime. No lock-in.',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.75" />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
                    </svg>
                  ),
                  title: 'Works offline',
                  desc: 'Add warranties and view your list even without an internet connection.',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                  title: 'Beautiful on any device',
                  desc: 'Designed native-first for iPhone and Android. Feels like the apps you already love.',
                },
              ].map((f) => (
                <div className="feature-item" key={f.title}>
                  <div className="feature-icon" aria-hidden="true">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section" aria-labelledby="cta-heading">
          <div className="cta-inner">
            <h2 id="cta-heading" className="cta-heading">Ready to protect your purchases?</h2>
            <p className="cta-sub">No credit card required. Core features are free, forever.</p>
            <Link href="/login" className="btn-primary btn-large">
              Create your account
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-logo">
            <svg width="18" height="18" viewBox="0 0 48 48" fill="none" aria-hidden="true">
              <rect width="48" height="48" rx="12" fill="var(--accent)" />
              <path d="M14 20h20M14 24h12M14 28h16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="36" cy="34" r="6" fill="var(--accent-secondary)" />
              <path d="M33.5 34l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            SnapCover
          </span>
          <nav className="landing-footer-links" aria-label="Footer links">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </nav>
          <p className="landing-footer-copy">&copy; {new Date().getFullYear()} SnapCover</p>
        </div>
      </footer>
    </div>
  );
}
