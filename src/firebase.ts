import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey
  && firebaseConfig.authDomain
  && firebaseConfig.projectId
  && firebaseConfig.appId,
);

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db: Firestore | null = app
  ? import.meta.env.VITE_FIREBASE_DATABASE_ID
    ? getFirestore(app, import.meta.env.VITE_FIREBASE_DATABASE_ID)
    : getFirestore(app)
  : null;
export const auth: Auth | null = app ? getAuth(app) : null;

export const loginWithGoogle = async () => {
  if (!auth) {
    throw Object.assign(
      new Error('Google sign-in is not configured for this build.'),
      { code: 'auth/not-configured' as const },
    );
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    return await signInWithPopup(auth, provider);
  } catch (error: unknown) {
    console.error('Login Error:', error);
    throw error;
  }
};

export const logout = async () => {
  if (!auth) return;

  try {
    await signOut(auth);
  } catch (error: unknown) {
    console.error('Logout Error:', error);
  }
};
