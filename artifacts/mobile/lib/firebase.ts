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

import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

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
 * On native, sessions persist via AsyncStorage (survives app restart).
 * On web, default Firebase session persistence is used.
 */
export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

/** `db` — Firestore database handle used for reading/writing scores. */
export const db = getFirestore(app);
