/**
 * PrivacyPage.tsx — Privacy Policy Page
 *
 * A static content page accessible at "/privacy". Displays the PresenceCV
 * privacy policy covering data collection, usage, and security practices.
 * Uses the same cream-tone visual style as LandingPage.
 *
 * Content sections: Introduction, Information Collected, Usage, Security, Contact
 * Depends on: react-router-dom (Link), lucide-react (Box icon)
 */
import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#1c1c1c] font-sans pb-32">
      <nav className="sticky top-0 z-50 bg-[#f7f4ed]/80 backdrop-blur-md border-b border-[#eceae4]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/favicon.png" className="w-6 h-6 rounded-full" style={{ mixBlendMode: 'multiply' }} alt="PresenceCV Logo" />
            <span className="text-xl font-semibold tracking-tight">PresenceCV</span>
          </Link>
          <Link to="/" className="text-sm font-medium hover:underline">Back to Home</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 mt-16">
        <h1 className="text-4xl font-semibold tracking-tight mb-8">Privacy Policy</h1>
        <div className="prose prose-stone">
          <p className="text-lg text-gray-600 mb-8">Last updated: May 2026</p>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Welcome to PresenceCV. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your data when you use our resume building service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Google Account Information:</strong> We authenticate users via Google. We only access the basic profile information (such as your email address and name) provided by Google to create and secure your account.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              <strong>Resume Data:</strong> Any text, links, or information you enter into the resume editor is stored securely in our database. This data is exclusively tied to your account and is used solely for the purpose of generating your resume and sharing links as you direct.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              - To provide and maintain the PresenceCV service.<br/>
              - To allow you to export or share your resume.<br/>
              - We <strong>do not</strong> sell, rent, or share your resume data with third-party marketers or advertisers.<br/>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Your data is stored using industry-standard backend infrastructure (Firebase) with strictly enforced security rules. Only your authenticated Google account can read or write to your personal resume profiles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              If you have questions or comments about this notice, you may contact us through the respective channels provided on the site.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
