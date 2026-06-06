/**
 * TermsPage.tsx — Terms of Service Page
 *
 * A static content page accessible at "/terms". Displays the PresenceCV
 * terms of service covering agreement, service description, accounts,
 * content ownership, and disclaimers.
 * Uses the same cream-tone visual style as LandingPage.
 *
 * Content sections: Agreement, Service Description, User Accounts, Ownership, Disclaimer
 * Depends on: react-router-dom (Link), lucide-react (Box icon)
 */
import React from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';

export default function TermsPage() {
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
        <h1 className="text-4xl font-semibold tracking-tight mb-8">Terms of Service</h1>
        <div className="prose prose-stone">
          <p className="text-lg text-gray-600 mb-8">Last updated: May 2026</p>
          
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              By accessing or using PresenceCV, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              PresenceCV provides a platform for generating, formatting, and sharing professional resumes. The service includes artificial intelligence tools to assist in content creation, which are provided "as is" without guaranteed accuracy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You are responsible for maintaining the confidentiality of your Google account login. PresenceCV is not liable for any loss or damage arising from your failure to protect your login credentials.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Content Ownership</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              You retain all rights to the information and data you input into PresenceCV. However, by using the service, you grant us the right to process, format, and temporarily host this data to provide the service to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Disclaimer</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              PresenceCV is provided on an "as is" and "as available" basis. We make no warranties, expressed or implied, regarding the continuous availability of the service or the specific outcomes of utilizing our AI tools for job applications.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
