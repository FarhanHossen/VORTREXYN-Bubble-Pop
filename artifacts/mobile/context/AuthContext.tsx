/**
 * AuthContext.tsx
 *
 * Provides a global authentication context that any screen can consume via
 * the `useAuth()` hook. It wraps Firebase Auth's `onAuthStateChanged` listener
 * and adds "Remember Me" behaviour:
 *
 *   - If the user signed in with "Remember Me" OFF, we store a flag in
 *     AsyncStorage (`vortrexyn_no_remember`). On the next cold start, when
 *     Firebase automatically restores the session, this context immediately
 *     signs the user out and clears the flag, effectively treating it as a
 *     single-session login.
 *
 *   - `signOut()` also clears the flag so a subsequent sign-in can be
 *     remembered normally.
 *
 *   - `deleteAccount()` deletes all the user's Firestore score documents
 *     and then permanently deletes their Firebase Auth account.
 *
 * Exports:
 *   - `AuthProvider`  — wrap your root layout with this
 *   - `useAuth()`     — returns { user, loading, signOut, deleteAccount }
 *   - `NO_REMEMBER_KEY` — AsyncStorage key for the remember-me flag
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deleteUser,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";

import { auth } from "@/lib/firebase";
import { clearUserScores } from "@/utils/storage";

/** AsyncStorage key used to mark single-session (no-remember) logins. */
export const NO_REMEMBER_KEY = "vortrexyn_no_remember";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  deleteAccount: async () => {},
});

/** Wrap your root layout with this so every screen can access auth state. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const noRemember = await AsyncStorage.getItem(NO_REMEMBER_KEY);
        if (noRemember === "true") {
          await AsyncStorage.removeItem(NO_REMEMBER_KEY);
          await firebaseSignOut(auth);
          return;
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signOut = async () => {
    await AsyncStorage.removeItem(NO_REMEMBER_KEY);
    await firebaseSignOut(auth);
  };

  /**
   * Permanently deletes the account:
   * 1. Deletes all Firestore score documents for this user.
   * 2. Deletes the Firebase Auth account itself.
   * Note: Firebase requires a recent login for deleteUser — if the token is
   * stale the call will throw an error which the caller should handle.
   */
  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    await clearUserScores(currentUser.uid);
    await AsyncStorage.removeItem(NO_REMEMBER_KEY);
    await deleteUser(currentUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Returns the current auth state. Must be used inside an <AuthProvider>. */
export const useAuth = () => useContext(AuthContext);
