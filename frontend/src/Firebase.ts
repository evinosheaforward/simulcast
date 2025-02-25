import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { urlOf } from "./Utilities";

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
  redirect: () => void,
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
    redirect();
  } catch (_) {
    console.error("Login failed");
    setError("Login Failed");
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
  redirect: () => void,
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
    redirect();
  } catch (error: any) {
    console.error("Registration failed");
    const errorCode = error.code;
    switch (errorCode) {
      case "auth/email-already-in-use":
        setError("Email is already in use.");
        break;
      case "auth/weak-password":
        setError("Password should be at least 6 characters");
        break;
      default:
        setError("An error occurred");
        break;
    }
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

export function useIsLoggedIn(): boolean {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  return isLoggedIn;
}

export async function requestWithAuth(
  method: string,
  url: string,
  body?: string,
) {
  let token = await auth.currentUser?.getIdToken(true);

  let request: any;
  if (token) {
    console.log("user logged in, using auth token to make request");
    request = {
      method: method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    };
  } else {
    console.log("user not logged in");
    request = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
    };
  }

  if (body) {
    request.body = body;
  }

  return await fetch(urlOf(url), request);
}
