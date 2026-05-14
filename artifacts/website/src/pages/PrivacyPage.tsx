// PrivacyPage.tsx — Privacy Policy page shown at /privacy.
// Linked from the Navbar and Footer.
// Uses the same Starfield background as the landing page for visual consistency.
// The prose/prose-invert Tailwind classes handle readable article-style typography.
// To update legal content, edit the <h2> and <p> sections below.

import React from 'react';
import { Starfield } from '@/components/Starfield';
// Starfield — canvas star animation rendered behind the privacy card.

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-foreground pt-24 pb-12 relative overflow-hidden">
      {/* Starfield: same animated star background used on the landing page */}
      <Starfield />

      <div className="container mx-auto px-4 max-w-3xl relative z-10">
        {/* Privacy card — frosted glass effect via backdrop-blur + bg-card/50 */}
        <div className="bg-card/50 backdrop-blur-md p-8 rounded-2xl border border-white/10 prose prose-invert max-w-none">
          <h1 className="vortrexyn-gradient-text">Privacy Policy</h1>

          {/* Dynamic date — always shows today's date when the page renders */}
          <p>Last updated: {new Date().toLocaleDateString()}</p>

          <h2>Introduction</h2>
          <p>Welcome to VORTREXYN Bubble Pop. Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you play our game.</p>

          <h2>Data Collection</h2>
          <p>We collect minimal data to provide you with the best possible experience. This includes:</p>
          <ul>
            <li><strong>Gameplay Data:</strong> Scores, timestamps, and settings used during gameplay to populate our global leaderboards.</li>
            <li><strong>Device Information:</strong> Anonymous diagnostic data to help us identify and fix bugs.</li>
          </ul>

          <h2>Third-Party Services</h2>
          {/* Firebase is used in the mobile app for auth and leaderboard storage */}
          <p>We use Firebase for authentication and database storage (leaderboards). By using our application, you agree to their respective privacy policies.</p>

          <h2>Your Rights</h2>
          <p>You have the right to request deletion of your account and associated score data at any time. Please contact us via the support email to initiate a deletion request.</p>

          <h2>Contact Us</h2>
          {/* Update this email address if the support contact changes */}
          <p>If you have any questions or concerns about this Privacy Policy, please contact us at support@vortrexyn.app.</p>
        </div>
      </div>
    </div>
  );
}
