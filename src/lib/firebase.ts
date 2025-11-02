import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User
} from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";

// --- FIX: Add declarations for global variables ---
// This tells TypeScript that these variables will be provided by the environment.
declare const __app_id: string;
declare const __firebase_config: string;
declare const __initial_auth_token: string;

// Use the global variables, providing defaults for local development
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "MOCK_KEY", authDomain: "MOCK_DOMAIN", projectId: "MOCK_PROJECT_ID" }; // Add mock config

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- FIX: Added Debug Logging ---
// This will help you see Firestore logs in the console
setLogLevel('debug');

// Set persistence to local
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting persistence: ", error);
  });

// --- Authentication ---
let currentUserId: string | null = null;
let isAuthReady = false;
let authPromise: Promise<User | null> | null = null;

const initializeAuth = () => {
  if (authPromise) return authPromise;

  authPromise = new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Firebase Auth: User is signed in.", user.uid);
        currentUserId = user.uid;
        isAuthReady = true;
        resolve(user);
      } else if (typeof __initial_auth_token !== 'undefined') {
        console.log("Firebase Auth: Signing in with custom token...");
        try {
          const userCredential = await signInWithCustomToken(auth, __initial_auth_token);
          currentUserId = userCredential.user.uid;
          isAuthReady = true;
          resolve(userCredential.user);
        } catch (error) {
          console.error("Firebase Auth: Error signing in with custom token:", error);
          reject(error);
        }
      } else {
        console.log("Firebase Auth: No user, signing in anonymously...");
        try {
          const userCredential = await signInAnonymously(auth);
          currentUserId = userCredential.user.uid;
          isAuthReady = true;
          resolve(userCredential.user);
        } catch (error) {
          console.error("Firebase Auth: Error signing in anonymously:", error);
          reject(error);
        }
      }
    }, (error) => {
      console.error("Firebase Auth: Auth state change error:", error);
      reject(error);
    });
  });

  return authPromise;
};

// Ensure auth is initialized
initializeAuth();

// --- Helper function to get User ID ---
// This ensures auth is ready before returning the ID
const getUserId = async (): Promise<string> => {
  if (isAuthReady && currentUserId) {
    return currentUserId;
  }
  
  await initializeAuth();
  
  if (currentUserId) {
    return currentUserId;
  }
  
  // Fallback, though it shouldn't be reached
  console.warn("getUserId fallback: creating random ID");
  return crypto.randomUUID();
};

export { db, auth, appId, getUserId };
