import type { LegalDoc } from '@/components/legal/LegalPage';

export const TERMS_DOC: LegalDoc = {
  title: 'Terms & Conditions',
  effectiveDate: '26 July 2026',
  intro:
    'Welcome to Pepertect. By creating an account or using our services, you agree to be bound by these Terms & Conditions. Please read them carefully. If you do not agree, you must not register or use the platform.',
  sections: [
    {
      heading: 'Acceptance of Terms',
      body: [
        'By accessing Pepertect, you confirm that you are at least 18 years of age and legally capable of entering into binding contracts. If you are accessing the platform on behalf of an entity, you represent that you have authority to bind that entity.',
        'Your continued use of the platform after any updates to these Terms constitutes acceptance of the revised Terms. We will notify users of material changes via email or in-app notification at least 7 days before they take effect.',
      ],
    },
    {
      heading: 'Paper Trading — Educational Use Only',
      body: [
        'Pepertect is a paper trading platform. All trades, positions, orders, and portfolio values shown are simulated using virtual money. No real securities are bought, sold, or held. No real money is at risk.',
        'The platform is intended for educational purposes — to help users learn about markets, practice trading strategies, and understand order types without financial risk. Performance on Pepertect does not guarantee similar results in real trading.',
        'Virtual capital provided to new users (₹1,00,000) has no monetary value and cannot be withdrawn, transferred, or redeemed for cash under any circumstances.',
      ],
    },
    {
      heading: 'User Account Responsibilities',
      body: [
        'You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. Notify us immediately at support@pepertect.com if you suspect unauthorized access.',
        'You agree to provide accurate and complete information during registration and to keep your profile information updated. Creating multiple accounts to abuse free trials or virtual capital is prohibited.',
        'Each user is entitled to one free trial of 30 days. Attempting to circumvent this limit by creating new accounts or using different email addresses may result in permanent suspension of all associated accounts.',
      ],
    },
    {
      heading: 'Acceptable Use',
      body: [
        'You agree not to: (a) use the platform for any unlawful purpose; (b) attempt to gain unauthorized access to our systems or another user\'s account; (c) use bots, scrapers, or automated tools to extract data; (d) interfere with the proper functioning of the platform; (e) impersonate another person or entity.',
        'Reverse engineering, decompiling, or attempting to extract the source code of the platform is strictly prohibited. Market data shown on the platform is simulated and may not match real exchange data — relying on it for real trading decisions is at your own risk.',
      ],
    },
    {
      heading: 'Premium Subscription',
      body: [
        'Premium features (Futures trading, Options trading, advanced analytics) are unlocked via the 30-day free trial or paid subscription. Subscription fees, if any, will be clearly displayed before payment.',
        'Paid subscriptions auto-renew unless cancelled at least 24 hours before the renewal date. Refunds are governed by our Refund Policy. The free trial converts to no charge if not actively upgraded — your account simply reverts to FREE tier after 30 days.',
      ],
    },
    {
      heading: 'Intellectual Property',
      body: [
        'All content on Pepertect — including logos, designs, text, graphics, software, and the proprietary stock universe — is owned by Pepertect or its licensors and protected by Indian and international IP laws.',
        'You may not copy, modify, distribute, or create derivative works from any part of the platform without our prior written consent. Trademarks (Pepertect name, logo) may not be used without permission.',
      ],
    },
    {
      heading: 'Disclaimer of Liability',
      body: [
        'Pepertect is provided "as is" without warranties of any kind, express or implied. We do not warrant that the platform will be uninterrupted, error-free, or free of harmful components.',
        'In no event shall Pepertect, its founders, employees, or partners be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform — including but not limited to loss of profits, data, or goodwill.',
        'Since this is a paper trading platform with no real money involved, financial loss claims are explicitly excluded. Any decisions you make in real markets based on learnings from Pepertect are solely your responsibility.',
      ],
    },
    {
      heading: 'Termination',
      body: [
        'We may suspend or terminate your account at any time, with or without cause, and with or without notice. Upon termination, your right to use the platform ceases immediately.',
        'You may delete your account at any time via Profile → Settings. Account deletion will remove your personal data, positions, orders, and trade history within 30 days, in compliance with applicable data protection laws.',
      ],
    },
    {
      heading: 'Governing Law & Disputes',
      body: [
        'These Terms are governed by the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.',
        'Before initiating legal action, you agree to first attempt to resolve the dispute through good-faith negotiation and, if needed, mediation through our Grievance Officer (see Grievance Officer page for contact details).',
      ],
    },
    {
      heading: 'Changes to Terms',
      body: [
        'We reserve the right to update these Terms at any time. Material changes will be communicated via email or in-app notification at least 7 days before taking effect.',
        'Your continued use of Pepertect after the effective date of any change constitutes acceptance of the updated Terms. If you do not agree, you must stop using the platform and request account deletion.',
      ],
    },
  ],
};

export const PRIVACY_DOC: LegalDoc = {
  title: 'Privacy Policy',
  effectiveDate: '26 July 2026',
  intro:
    'This Privacy Policy explains how Pepertect collects, uses, stores, and protects your personal information. We are committed to transparency and to complying with the Digital Personal Data Protection Act, 2023 (DPDP Act) of India.',
  sections: [
    {
      heading: 'Information We Collect',
      body: [
        'Account information: name, email address, hashed password, optional phone number, and profile picture. We use this to authenticate you and personalize your experience.',
        'Trading data: your virtual orders, positions, watchlists, and trade history. This data is simulated and has no real financial value, but we still protect it as personal data.',
        'Device and usage data: IP address, browser type, operating system, device identifiers, pages visited, and timestamps. We use this for security, analytics, and to improve the platform.',
      ],
    },
    {
      heading: 'How We Use Your Information',
      body: [
        'To provide and maintain the service: authenticate your account, display your portfolio, save your watchlists, and process virtual orders.',
        'To communicate with you: send transactional emails (order confirmations, password resets), product updates, and important account security notifications. You can opt out of promotional emails.',
        'To improve the platform: analyze usage patterns to identify bugs, prioritize features, and understand which sections are most used. All analytics are aggregated and anonymized where possible.',
        'To ensure security: detect and prevent fraud, unauthorized access, and abuse. We may share data with law enforcement if required by valid legal process.',
      ],
    },
    {
      heading: 'Data Sharing & Third Parties',
      body: [
        'We do not sell your personal data. We share data only with: (a) service providers who help us operate (hosting, email delivery, analytics) — they are bound by strict confidentiality; (b) authorities when required by law.',
        'Third-party services we use: Vercel (hosting), Supabase/PostgreSQL (database), and email delivery providers. Each has its own privacy policy and complies with EU GDPR and India DPDP Act standards.',
        'Stock logos are fetched from icon.horse — when you view a stock, your browser fetches the logo directly from their servers. Their privacy policy applies to that request.',
      ],
    },
    {
      heading: 'Data Storage & Security',
      body: [
        'Your data is stored in encrypted PostgreSQL databases hosted on Supabase (Singapore region). Passwords are hashed using bcrypt — we never see or store your plain-text password.',
        'JWT tokens are used for authentication. Sessions expire after 7 days of inactivity. We log device info, IP, and last-seen timestamps for each active session so you can review and revoke them from Profile → Login Activity.',
        'All API requests are made over HTTPS. We monitor for suspicious activity and will notify you if we detect unauthorized access attempts on your account.',
      ],
    },
    {
      heading: 'Your Rights (DPDP Act)',
      body: [
        'Access: you can request a copy of all personal data we hold about you via Profile → Settings → Download My Data.',
        'Correction: you can edit your name, email, phone, and avatar from Profile at any time.',
        'Erasure: you can delete your account from Profile → Settings → Delete Account. This removes your personal data within 30 days, except where retention is required by law.',
        'Grievance: if you have concerns about how we handle your data, contact our Grievance Officer (see Grievance Officer page).',
      ],
    },
    {
      heading: 'Data Retention',
      body: [
        'We retain your account data for as long as your account is active. After account deletion, we anonymize or delete your data within 30 days, except: (a) transaction records we are legally required to keep; (b) security logs kept for 12 months to detect fraud.',
        'Virtual trading data (orders, positions, trades) is automatically cleaned up after 24 hours as part of the paper trading simulation. Long-term history is kept only in aggregate form for analytics.',
      ],
    },
    {
      heading: 'Children\'s Privacy',
      body: [
        'Pepertect is not directed at children under 18. We do not knowingly collect personal information from minors. If you believe a child has registered an account, please contact us and we will delete it immediately.',
      ],
    },
    {
      heading: 'Cookies & Tracking',
      body: [
        'We use essential cookies to keep you logged in and remember your preferences (language, theme, watchlist sort order). These are necessary for the platform to function and cannot be disabled.',
        'We do not use third-party advertising cookies or tracking pixels. Analytics are collected server-side and are aggregated. See our Cookie Policy for the full list of cookies used.',
      ],
    },
    {
      heading: 'Changes to This Policy',
      body: [
        'We may update this Privacy Policy from time to time. Material changes will be notified via email or in-app notification at least 7 days before they take effect.',
        'The "Effective Date" at the top of this page indicates the last revision. We encourage you to review this page periodically.',
      ],
    },
  ],
};

export const DISCLAIMER_DOC: LegalDoc = {
  title: 'Disclaimer',
  effectiveDate: '26 July 2026',
  intro:
    'Pepertect is an educational paper trading platform. This disclaimer explains the limitations of our service and the risks you should be aware of when using real-market learnings from this platform.',
  sections: [
    {
      heading: 'Not Investment Advice',
      body: [
        'All content on Pepertect — including stock data, charts, option chains, analytics, and educational materials — is for informational and educational purposes only. It is not investment advice, financial advice, brokerage advice, or any other form of recommendation.',
        'Nothing on this platform should be construed as an offer to buy or sell securities. We do not endorse any specific security, strategy, or trading style. Any references to specific stocks are for example purposes only.',
      ],
    },
    {
      heading: 'Simulated Data',
      body: [
        'Stock prices, option premiums, open interest, volumes, and other market data shown on Pepertect are simulated. While we base seed prices on real NSE/BSE values, intraday changes are generated algorithmically and may not reflect actual market conditions.',
        'The 430+ stock universe, sector classifications, and lot sizes are compiled from public sources but may contain errors or outdated information. Always verify with NSE/BSE official sources before making real trading decisions.',
        'Option chain data — strikes, IV, OI, volume — is generated using pricing models and random seeds. It is not real exchange data and should not be used for actual trading decisions.',
      ],
    },
    {
      heading: 'No Real Money Involved',
      body: [
        'Pepertect uses virtual money (₹1,00,000 starting capital). You cannot deposit, withdraw, or transfer real money. Virtual profits cannot be converted to real cash. Virtual losses have no financial consequence.',
        'This platform exists solely to help you practice trading in a risk-free environment. Past performance on Pepertect does not guarantee future results in real markets.',
      ],
    },
    {
      heading: 'Market Risk Warning',
      body: [
        'Securities investments are subject to market risks. Real trading can result in substantial financial loss. You are solely responsible for any real-world trading decisions you make and for understanding the risks involved.',
        'Derivatives (Futures and Options) carry especially high risk and can result in losses exceeding your initial margin. Never trade with money you cannot afford to lose. Consult a SEBI-registered investment advisor before making real investments.',
      ],
    },
    {
      heading: 'Third-Party Links',
      body: [
        'Pepertect may link to third-party websites (e.g., TradingView, NSE, BSE) for your convenience. We do not control and are not responsible for the content, accuracy, or privacy practices of these external sites.',
        'The "Open in TradingView" feature redirects you to tradingview.com — their terms and privacy policy apply once you leave Pepertect.',
      ],
    },
    {
      heading: 'No Warranty',
      body: [
        'Pepertect is provided "as is" without warranty of any kind. We do not guarantee that the platform will be available 24/7, that data will be accurate, or that the service will meet your specific requirements.',
        'We are not liable for any losses — direct, indirect, or consequential — arising from your use of or reliance on the platform. Since no real money is at stake, financial loss claims are explicitly excluded.',
      ],
    },
  ],
};

export const REFUND_DOC: LegalDoc = {
  title: 'Refund Policy',
  effectiveDate: '26 July 2026',
  intro:
    'This Refund Policy applies to paid Premium subscriptions on Pepertect. Since virtual capital has no monetary value, refunds apply only to actual subscription fees paid.',
  sections: [
    {
      heading: 'Free Trial — No Refund Needed',
      body: [
        'Every new user gets a 30-day Premium trial at no cost. No payment information is required to start the trial, and the trial automatically downgrades to FREE after 30 days — you will not be charged unless you actively choose to subscribe.',
        'Since no money changes hands during the trial, there is nothing to refund.',
      ],
    },
    {
      heading: 'Subscription Refunds',
      body: [
        'If you purchase a paid Premium subscription, you may request a full refund within 7 days of payment, provided you have not engaged in significant Premium feature usage (defined as placing more than 10 Futures/Options orders during the period).',
        'To request a refund, email support@pepertect.com with your account email and payment receipt. Refunds are processed to the original payment method within 7-10 business days.',
      ],
    },
    {
      heading: 'Auto-Renewal Cancellation',
      body: [
        'Paid subscriptions auto-renew by default. You can cancel auto-renewal at any time from Profile → Subscription — your Premium access continues until the end of the current billing period, after which the account reverts to FREE.',
        'If you cancel after a renewal has already been charged, the 7-day refund window (above) applies from the renewal date.',
      ],
    },
    {
      heading: 'Non-Refundable Cases',
      body: [
        'Refund requests made after the 7-day window will not be entertained. Accounts terminated by us for violation of Terms (multiple free trial abuse, fraud, scraping) are not eligible for refund.',
        'Partial refunds for unused days are not available — please cancel before the next renewal date if you no longer wish to subscribe.',
      ],
    },
    {
      heading: 'Chargebacks',
      body: [
        'Before initiating a chargeback with your bank, please contact us at support@pepertect.com — we will try to resolve the issue within 48 hours. Unauthorized chargebacks may result in account suspension.',
      ],
    },
  ],
};

export const COOKIES_DOC: LegalDoc = {
  title: 'Cookie Policy',
  effectiveDate: '26 July 2026',
  intro:
    'This Cookie Policy explains what cookies Pepertect uses, why we use them, and how you can manage them. We use cookies only for essential functionality — we do not use advertising cookies.',
  sections: [
    {
      heading: 'What Are Cookies',
      body: [
        'Cookies are small text files stored on your device by your browser when you visit a website. They help the website remember your actions and preferences over time, so you don\'t have to re-enter them on every page.',
      ],
    },
    {
      heading: 'Essential Cookies (Always On)',
      body: [
        'Session token: stores your JWT authentication token so you stay logged in across pages. Without this cookie, you would need to log in on every navigation.',
        'Theme preference: remembers your light/dark mode selection. Without this, the platform would default to dark mode on every visit.',
        'Language preference: remembers your selected interface language (English, Hindi, Marathi, Tamil, etc.).',
        'These cookies are strictly necessary for the platform to function. You cannot disable them while still using Pepertect.',
      ],
    },
    {
      heading: 'Analytics Cookies (Optional)',
      body: [
        'We collect aggregated usage analytics (page views, feature clicks, error rates) server-side. These do not use third-party cookies — your browser is not tracked across other websites.',
        'You can opt out of analytics by toggling "Anonymous usage analytics" off in Profile → Settings → Notifications.',
      ],
    },
    {
      heading: 'Cookies We Do NOT Use',
      body: [
        'Advertising cookies: we do not show ads and do not partner with ad networks (Google Ads, Meta Pixel, etc.).',
        'Cross-site tracking: we do not place cookies that track you on other websites.',
        'Third-party social plugins: we do not embed Like buttons, share widgets, or other social trackers.',
      ],
    },
    {
      heading: 'Managing Cookies',
      body: [
        'You can clear cookies in your browser settings at any time. Note that clearing cookies will log you out of Pepertect and reset your theme/language preferences.',
        'Most browsers also let you block cookies from specific sites. If you block Pepertect cookies, the platform will not function — you will not be able to log in or place virtual orders.',
      ],
    },
    {
      heading: 'Stock Logo Fetching',
      body: [
        'When you view a stock detail page, your browser fetches the company logo from icon.horse. This is a direct browser request — icon.horse may set their own cookies. We do not control their cookie practices. See their privacy policy at icon.horse for details.',
      ],
    },
  ],
};

export const GRIEVANCE_DOC: LegalDoc = {
  title: 'Grievance Officer',
  effectiveDate: '26 July 2026',
  intro:
    'In compliance with the Information Technology Act, 2000 and the Digital Personal Data Protection Act, 2023 of India, Pepertect has appointed a Grievance Officer to address user concerns related to the platform, content, or data privacy.',
  sections: [
    {
      heading: 'Grievance Officer Contact',
      body: [
        'Name: Grievance Officer, Pepertect',
        'Email: grievance@pepertect.com',
        'Postal Address: Pepertect, [Registered Office Address], Mumbai, Maharashtra, India — 400001',
        'Phone: +91-[Support Phone] (available Mon–Fri, 10 AM to 6 PM IST)',
      ],
    },
    {
      heading: 'When to Contact the Grievance Officer',
      body: [
        'Data privacy concerns: if you believe Pepertect has mishandled your personal data, has not responded to your access/correction/erasure request within the statutory timeline, or has shared your data without consent.',
        'Content complaints: if you find content on the platform that is unlawful, infringing, defamatory, or otherwise objectionable.',
        'Account disputes: if your account has been suspended and you believe it was in error, or if you have not received a satisfactory response from regular support within 48 hours.',
      ],
    },
    {
      heading: 'How to File a Grievance',
      body: [
        'Send an email to grievance@pepertect.com with the subject line "Grievance — [Your Account Email]". Include: (a) your name and registered email; (b) a clear description of the issue; (c) any relevant screenshots or transaction IDs; (d) the resolution you are seeking.',
        'Alternatively, send a written complaint to the postal address above. Please mention your email and a contact number so we can reach you.',
      ],
    },
    {
      heading: 'Response Timeline',
      body: [
        'We acknowledge all grievances within 24 hours of receipt. A substantive response is provided within 15 business days, in compliance with IT Act guidelines.',
        'If the issue requires more time to investigate (e.g., coordinating with third-party service providers), we will inform you of the expected timeline and provide weekly updates until resolution.',
      ],
    },
    {
      heading: 'Escalation',
      body: [
        'If you are not satisfied with the Grievance Officer\'s response, you may escalate to the Cyber Appellate Tribunal or the Data Protection Board of India as provided under applicable law.',
        'Before escalation, we encourage you to give us an opportunity to resolve the issue — most concerns can be addressed through direct communication.',
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  terms: TERMS_DOC,
  privacy: PRIVACY_DOC,
  disclaimer: DISCLAIMER_DOC,
  refund: REFUND_DOC,
  cookies: COOKIES_DOC,
  grievance: GRIEVANCE_DOC,
};
