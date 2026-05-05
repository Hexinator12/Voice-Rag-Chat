import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyACkqAELGikMdw8sCVHqxis4xJevYhn9iM',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'voice-rag-a27cd.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'voice-rag-a27cd',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'voice-rag-a27cd.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '250484802672',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:250484802672:web:5c76c17865a70f349720b5',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-4X1P2RKDLG'
};

let app: FirebaseApp | null = null;

export const getFirebaseApp = () => {
    if (!app) {
        app = initializeApp(firebaseConfig);
    }
    return app;
};

export const getFirebaseAuth = () => getAuth(getFirebaseApp());
