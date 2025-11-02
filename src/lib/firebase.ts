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

// --- FIX: Read from Vite's Environment Variables ---
// We will now read from `import.meta.env` which Netlify populates.
// This removes the need for the `declare const` hacks.
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

// Get the config string from the environment and parse it.
// Provide a fallback mock config for local dev *only*.
const firebaseConfigStr = import.meta.env.VITE_FIREBASE_CONFIG;
const firebaseConfig = firebaseConfigStr 
  ? JSON.parse(firebaseConfigStr)
  : { 
      apiKey: "MOCK_KEY_FOR_LOCAL_DEV", 
      authDomain: "MOCK_DOMAIN", 
      projectId: "MOCK_PROJECT_ID" 
    };

// --- End of Fix ---

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setLogLevel('debug');

setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting persistence: ", error);
  });

let currentUserId: string | null = null;
let isAuthReady = false;
let authPromise: Promise<User | null> | null = null;

// This will be provided by the Netlify/Canvas environment
declare const __initial_auth_token: string;

const initializeAuth = () => {
  if (authPromise) return authPromise;

  authPromise = new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("Firebase Auth: User is signed in.", user.uid);
        currentUserId = user.uid;
        isAuthReady = true;
        resolve(user);
      } else if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        // Use custom token if provided (e.g., in Canvas)
        console.log("Firebase Auth: Signing in with custom token...");
        try {
          const userCredential = await signInWithCustomToken(auth, __initial_auth_token);
          currentUserId = userCredential.user.uid;
          isAuthReady = true;
          resolve(userCredential.user.uid);
        } catch (error) {
          console.error("Firebase Auth: Error signing in with custom token:", error);
          reject(error);
        }
      } else {
        // Standard web flow: sign in anonymously
        console.log("Firebase Auth: No user, signing in anonymously...");
        try {
          const userCredential = await signInAnonymously(auth);
          currentUserId = userCredential.user.uid;
          isAuthReady = true;
          resolve(userCredential.user);
        } catch (error) {
          console.error("Firebase Auth: Error signing in anonymously:", error);
          // This is where your MOCK_KEY error was happening.
          // It will now use the *real* key.
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

initializeAuth();

const getUserId = async (): Promise<string> => {
  if (isAuthReady && currentUserId) {
    return currentUserId;
  }
  
  await initializeAuth();
  
  if (currentUserId) {
    return currentUserId;
  }
  
  console.warn("getUserId fallback: creating random ID");
  return crypto.randomUUID();
};

export { db, auth, appId, getUserId };

