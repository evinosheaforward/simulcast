import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  // ... other config values
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// If in development mode, connect to the Auth emulator:
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://localhost:9099"); // default emulator port
}

export { auth };
