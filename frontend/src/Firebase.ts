import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

if (import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://localhost:9099");
}

export { auth };

/**
 * Logs in a user with email and password.
 *
 * @param email - User's email address.
 * @param password - User's password.
 */
export async function login(
  email: string,
  password: string,
  setError: (arg0: string) => void,
): Promise<void> {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("Logged in:", userCredential.user);
    const token = await userCredential.user.getIdToken();
    console.log("ID Token:", token);
  } catch (error: any) {
    console.error("Login failed:", error);
    setError(error.message);
  }
}

/**
 * Registers a new user with email and password.
 *
 * @param email - User's email address.
 * @param password - User's password.
 */
export async function register(
  email: string,
  password: string,
  setError: (arg0: string) => void,
): Promise<void> {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("User registered:", userCredential.user);
    const token = await userCredential.user.getIdToken();
    console.log("ID Token:", token);
  } catch (error: any) {
    console.error("Registration failed:", error);
    setError(error.message as string);
  }
}

/**
 * Logs out the current user.
 */
export async function logout(setError: (arg0: string) => void): Promise<void> {
  try {
    await signOut(auth);
    console.log("User logged out");
  } catch (error: any) {
    console.error("Logout failed:", error);
    setError(error.message);
  }
}
