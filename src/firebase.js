import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, update, remove, get, child, serverTimestamp, push } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, onValue, update, remove, get, child, serverTimestamp, push };

// Helper functions (can be expanded)
export const getRoomRef = (roomId) => ref(db, `rooms/${roomId}`);
export const getPlayersRef = (roomId) => ref(db, `rooms/${roomId}/players`);
export const getPlayerRef = (roomId, playerId) => ref(db, `rooms/${roomId}/players/${playerId}`);
export const getGameStateRef = (roomId) => ref(db, `rooms/${roomId}/gameState`);
export const getLogRef = (roomId) => ref(db, `rooms/${roomId}/gameState/logEntries`);