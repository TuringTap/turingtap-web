/**
 * Firebase client SDK — Auth only.
 * Config comes from NEXT_PUBLIC_* env vars (see .env.local.example).
 * When env is unset (build/CI), a placeholder config is used so the
 * module imports without throwing; auth calls will fail at runtime.
 *
 * Providers: Email-link (passwordless, primary), Google, Apple.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  getAdditionalUserInfo,
  signOut as fbSignOut,
  type Auth,
  type User,
} from "firebase/auth";

export interface SignInResult {
  user: User;
  isNewUser: boolean;
}

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "placeholder",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "placeholder.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "placeholder",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "placeholder",
};

const PENDING_EMAIL_KEY = "tt_pending_email";

export const firebaseApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(config);

export const auth: Auth = getAuth(firebaseApp);

export function onUser(cb: (u: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}

/**
 * Send a passwordless sign-in link to `email`. The link lands on
 * /auth/callback which calls completeSignInLink().
 */
export async function sendSignInLink(email: string): Promise<void> {
  await sendSignInLinkToEmail(auth, email, {
    url: `${window.location.origin}/auth/callback`,
    handleCodeInApp: true,
  });
  window.localStorage.setItem(PENDING_EMAIL_KEY, email);
}

/**
 * Complete an email-link sign-in on the callback page. Returns the signed-in
 * user + whether Firebase just created the account, or null if the current
 * URL is not a sign-in link.
 */
export async function completeSignInLink(): Promise<SignInResult | null> {
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) return null;

  let email = window.localStorage.getItem(PENDING_EMAIL_KEY);
  if (!email) {
    // Link opened on a different device/browser than where it was requested.
    email = window.prompt("Confirm your email to finish signing in:");
    if (!email) throw new Error("Email required to complete sign-in.");
  }

  const cred = await signInWithEmailLink(auth, email, href);
  window.localStorage.removeItem(PENDING_EMAIL_KEY);
  return {
    user: cred.user,
    isNewUser: getAdditionalUserInfo(cred)?.isNewUser ?? false,
  };
}

export async function signInWithGoogle(): Promise<SignInResult> {
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  return {
    user: cred.user,
    isNewUser: getAdditionalUserInfo(cred)?.isNewUser ?? false,
  };
}

export async function signInWithApple(): Promise<SignInResult> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const cred = await signInWithPopup(auth, provider);
  return {
    user: cred.user,
    isNewUser: getAdditionalUserInfo(cred)?.isNewUser ?? false,
  };
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

/** Fresh Firebase ID token for Authorization: Bearer against the api service. */
export async function getIdToken(): Promise<string | null> {
  const u = auth.currentUser;
  return u ? u.getIdToken() : null;
}
