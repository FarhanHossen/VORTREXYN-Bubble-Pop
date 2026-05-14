import { Router } from "express";

const privacyRouter = Router();

privacyRouter.get("/privacy", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy – VORTREXYN Bubble Pop</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #070718;
      color: #e0e0ff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.7;
      padding: 40px 24px 80px;
    }
    .wrap { max-width: 720px; margin: 0 auto; }
    h1 {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #a78bfa, #60a5fa);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .updated { color: #6b7280; font-size: 0.9rem; margin-bottom: 40px; }
    h2 {
      font-size: 1.1rem;
      font-weight: 700;
      color: #a78bfa;
      margin: 32px 0 10px;
    }
    p { color: #c4c4d8; margin-bottom: 12px; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .divider {
      border: none;
      border-top: 1px solid #1e1e3a;
      margin: 40px 0;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>VORTREXYN Bubble Pop</h1>
    <p class="updated">Privacy Policy &mdash; Last updated: April 28, 2026</p>

    <p>
      This Privacy Policy describes how VORTREXYN Bubble Pop ("we", "us", or "our")
      collects, uses, and shares information when you use our mobile game.
    </p>

    <h2>Information We Collect</h2>
    <p>
      We collect the following information when you use the app:
    </p>
    <p>
      <strong>Account information:</strong> If you sign in, we collect your email address and
      display name through Firebase Authentication to identify you on the leaderboard.
    </p>
    <p>
      <strong>Gameplay data:</strong> We store your high scores and game statistics in
      Firebase Firestore to power the global leaderboard.
    </p>
    <p>
      <strong>Device identifiers:</strong> We may use your device's advertising identifier
      (IDFA on iOS) to deliver personalized leaderboard experiences. You can opt out at any
      time in your device's privacy settings.
    </p>

    <h2>How We Use Your Information</h2>
    <p>We use the information we collect to:</p>
    <p>– Display your name and score on the global leaderboard</p>
    <p>– Track your personal best scores</p>
    <p>– Improve app performance and fix bugs</p>

    <h2>Data Sharing</h2>
    <p>
      We do not sell your personal information. We use Google Firebase (Auth and Firestore)
      to store and process your data. Firebase's privacy policy is available at
      <a href="https://firebase.google.com/support/privacy" target="_blank">
        firebase.google.com/support/privacy
      </a>.
    </p>

    <h2>Data Retention</h2>
    <p>
      We retain your account and score data for as long as you use the app. You may request
      deletion of your data at any time by contacting us.
    </p>

    <h2>Children's Privacy</h2>
    <p>
      VORTREXYN Bubble Pop is not directed at children under the age of 13. We do not
      knowingly collect personal information from children under 13.
    </p>

    <h2>Your Rights</h2>
    <p>
      Depending on your location, you may have the right to access, correct, or delete
      your personal data. To exercise these rights, contact us at the email below.
    </p>

    <h2>Changes to This Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. We will notify you of any
      significant changes by updating the date at the top of this page.
    </p>

    <hr class="divider" />

    <h2>Contact</h2>
    <p>
      For privacy questions or data requests, email us at:<br />
      <a href="mailto:farhan141549@gmail.com">farhan141549@gmail.com</a>
    </p>
  </div>
</body>
</html>`);
});

export default privacyRouter;
