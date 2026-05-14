/**
 * firebase.ts
 *
 * Initializes the Firebase app and exports the two services used across the app:
 *   - `auth`  — Firebase Authentication (email/password sign-in)
 *   - `db`    — Firestore database (global leaderboard / score storage)
 *
 * Auth persistence strategy:
 *   • On native iOS/Android, sessions are stored in AsyncStorage so the user
 *     stays logged in across app restarts (unless "Remember Me" is off).
 *   • On web, the default Firebase persistence (localStorage) is used instead.
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/** Firebase project credentials — safe to be public (security enforced by Firestore rules). */
const firebaseConfig = {
  apiKey: "AIzaSyAyJA6pKJI6IW3PAr-hqcarcOk5zgAGOjY",
  authDomain: "vortrexyn-bubble-pop.firebaseapp.com",
  projectId: "vortrexyn-bubble-pop",
  storageBucket: "vortrexyn-bubble-pop.firebasestorage.app",
  messagingSenderId: "485422024352",
  appId: "1:485422024352:web:75e6b33b108e9cf0352bc5",
};

/** Single Firebase app instance shared across the entire app. */
const app = initializeApp(firebaseConfig);

/**
 * `auth` — Firebase Auth instance.
 * Firebase v12 manages persistence automatically across platforms.
 */
export const auth = getAuth(app);

/** `db` — Firestore database handle used for reading/writing scores. */
export const db = getFirestore(app);
