import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signInAnonymously,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    updateProfile,
    type User,
    type Unsubscribe,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, limit, query } from 'firebase/firestore';
import { auth, googleProvider, firestore } from './firebaseConfig';
import type { UserProfile } from '../types';

export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'DEMO';

// Maps Firebase User → App UserProfile
const mapFirebaseUser = async (user: User): Promise<UserProfile> => {
    let role: UserRole = 'VIEWER';
    let organization = 'NeoGeo Hub';

    try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            role = (data.role as UserRole) || 'VIEWER';
            organization = data.organization || organization;
        }
    } catch (e) {
        console.warn('[Auth] Firestore read failed, using defaults:', e);
    }

    return {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Usuário',
        email: user.email || '',
        role,
        organization,
        avatarUrl: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=0D8ABC&color=fff&bold=true`,
        activeWorkspaceId: 'demo-session',
    };
};

// Creates/updates user document in Firestore (resilient to failures)
const ensureUserDocument = async (user: User, role: UserRole = 'VIEWER'): Promise<void> => {
    try {
        const userRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            // Check if this is the first user → make ADMIN
            let assignedRole = role;
            try {
                const usersQuery = query(collection(firestore, 'users'), limit(1));
                const snapshot = await getDocs(usersQuery);
                if (snapshot.empty) assignedRole = 'ADMIN';
            } catch {
                // If query fails, keep the provided role
            }

            await setDoc(userRef, {
                role: assignedRole,
                organization: 'NeoGeo Hub',
                email: user.email || '',
                displayName: user.displayName || '',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            });
        } else {
            await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
        }
    } catch (e) {
        console.warn('[Auth] Firestore write failed (non-blocking):', e);
    }
};

// Email + Password sign in
export const signInWithEmail = async (email: string, password: string): Promise<UserProfile> => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDocument(credential.user);
    return mapFirebaseUser(credential.user);
};

// Email + Password sign up
export const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<UserProfile> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName });
    await ensureUserDocument(credential.user, 'VIEWER');
    return mapFirebaseUser(credential.user);
};

// Google popup sign in
export const signInWithGoogle = async (): Promise<UserProfile> => {
    const credential = await signInWithPopup(auth, googleProvider);
    await ensureUserDocument(credential.user);
    return mapFirebaseUser(credential.user);
};

// Anonymous (Demo) sign in - completely offline-safe
export const signInAsDemo = async (): Promise<UserProfile> => {
    const credential = await signInAnonymously(auth);
    // Skip Firestore for anonymous users to avoid permission issues
    return {
        id: credential.user.uid,
        name: 'Visitante Demo',
        email: '',
        role: 'DEMO',
        organization: 'NeoGeo Hub',
        avatarUrl: `https://ui-avatars.com/api/?name=Demo&background=333&color=06b6d4&bold=true`,
        activeWorkspaceId: 'demo-session',
    };
};

// Sign out
export const signOut = async (): Promise<void> => {
    await firebaseSignOut(auth);
};

// Auth state observer
export const onAuthStateChanged = (callback: (user: UserProfile | null, loading: boolean) => void): Unsubscribe => {
    return firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            try {
                const profile = firebaseUser.isAnonymous
                    ? {
                        id: firebaseUser.uid,
                        name: 'Visitante Demo',
                        email: '',
                        role: 'DEMO' as UserRole,
                        organization: 'NeoGeo Hub',
                        avatarUrl: `https://ui-avatars.com/api/?name=Demo&background=333&color=06b6d4&bold=true`,
                        activeWorkspaceId: 'demo-session',
                    }
                    : await mapFirebaseUser(firebaseUser);
                callback(profile, false);
            } catch {
                callback(null, false);
            }
        } else {
            callback(null, false);
        }
    });
};
