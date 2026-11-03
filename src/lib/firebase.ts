import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  initializeFirestore,
  Firestore
} from 'firebase/firestore';
import baseFirebaseConfig from '../../firebase-applet-config.json';

// Resolve configuration securely: Allow environment variable overrides to hide or customize keys
const resolvedConfig = {
  ...baseFirebaseConfig,
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || baseFirebaseConfig.apiKey || '',
  projectId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) || baseFirebaseConfig.projectId || '',
  authDomain: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) || baseFirebaseConfig.authDomain || '',
  firestoreDatabaseId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID) || baseFirebaseConfig.firestoreDatabaseId || '',
};

/**
 * Returns a masked version of the Google Firebase Public API Key to protect it from public display
 */
export function getMaskedFirebaseKey(): string {
  const key = resolvedConfig.apiKey;
  if (!key) return 'Not Configured';
  if (key.length <= 8) return '••••••••';
  return `${key.substring(0, 4)}••••••••••••••••${key.substring(key.length - 4)}`;
}

// Track availability state across browsers
export let isFirebaseAvailable = true;

// Safe App Initialization
let appInstance: FirebaseApp;
try {
  if (getApps().length > 0) {
    appInstance = getApp();
  } else {
    appInstance = initializeApp(resolvedConfig);
  }
} catch (err) {
  console.warn('Firebase App initialization note (switching to resilient fallback):', err);
  isFirebaseAvailable = false;
  // Fallback placeholder app if blocked
  try {
    appInstance = getApps().length > 0 ? getApp() : initializeApp({ projectId: 'demo-resilient-app' }, 'fallback');
  } catch {
    appInstance = {} as FirebaseApp;
  }
}

export const app = appInstance;

// CRITICAL: Initialize Firestore with firestoreDatabaseId and experimentalForceLongPolling
// to prevent 10s connection timeout in proxied iframe environments, with safe fallback
let dbInstance: Firestore;
try {
  if (resolvedConfig.firestoreDatabaseId) {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, resolvedConfig.firestoreDatabaseId);
  } else {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true
    });
  }
} catch (err: any) {
  // If Firestore already initialized or settings cannot be changed, get existing instance
  try {
    dbInstance = resolvedConfig.firestoreDatabaseId 
      ? getFirestore(app, resolvedConfig.firestoreDatabaseId)
      : getFirestore(app);
  } catch (secondaryErr) {
    console.warn('Firestore fallback instance notice:', secondaryErr);
    isFirebaseAvailable = false;
    dbInstance = {} as Firestore;
  }
}

export const db = dbInstance;

// Safe Auth Initialization
let authInstance: Auth;
try {
  authInstance = getAuth(app);
} catch (err) {
  console.warn('Firebase Auth initialization note:', err);
  authInstance = {} as Auth;
}

export const auth = authInstance;

export const googleProvider = new GoogleAuthProvider();
try {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch {}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const currentAuth = auth && typeof auth.currentUser !== 'undefined' ? auth.currentUser : null;
  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    operationType,
    path,
    authInfo: {
      userId: currentAuth?.uid,
      email: currentAuth?.email,
      emailVerified: currentAuth?.emailVerified,
      isAnonymous: currentAuth?.isAnonymous,
      tenantId: currentAuth?.tenantId,
      providerInfo: currentAuth?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    }
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection to Firestore as mandated by skill with timeout guard
export async function testFirestoreConnection(): Promise<boolean> {
  if (!isFirebaseAvailable || !db) {
    return false;
  }
  try {
    let testDocRef;
    try {
      testDocRef = doc(db, 'test', 'connection');
    } catch {
      return false;
    }
    const timeout = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 2500)
    );
    await Promise.race([
      getDocFromServer(testDocRef),
      timeout
    ]);
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('timeout'))) {
      return false;
    }
    return true;
  }
}

export {
  signInWithPopup,
  fbSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged
};
export type { User };
