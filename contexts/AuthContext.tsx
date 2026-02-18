import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserProfile } from '../types';
import {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAsDemo,
    signOut,
    onAuthStateChanged,
    type UserRole,
} from '../services/authService';

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    loginAsDemo: () => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    hasPermission: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_HIERARCHY: Record<UserRole, number> = {
    ADMIN: 4,
    EDITOR: 3,
    VIEWER: 2,
    DEMO: 1,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged((profile, isLoading) => {
            setUser(profile);
            setLoading(isLoading);
        });
        return () => unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        setError(null);
        setLoading(true);
        try {
            const profile = await signInWithEmail(email, password);
            setUser(profile);
        } catch (err: any) {
            const code = err?.code || '';
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                setError('Email ou senha incorretos.');
            } else if (code === 'auth/too-many-requests') {
                setError('Muitas tentativas. Tente novamente mais tarde.');
            } else {
                setError('Erro ao fazer login. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const signup = async (email: string, password: string, name: string) => {
        setError(null);
        setLoading(true);
        try {
            const profile = await signUpWithEmail(email, password, name);
            setUser(profile);
        } catch (err: any) {
            const code = err?.code || '';
            if (code === 'auth/email-already-in-use') {
                setError('Este email já está em uso.');
            } else if (code === 'auth/weak-password') {
                setError('Senha fraca. Use no mínimo 6 caracteres.');
            } else if (code === 'auth/invalid-email') {
                setError('Email inválido.');
            } else {
                setError('Erro ao criar conta. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        setError(null);
        setLoading(true);
        try {
            const profile = await signInWithGoogle();
            setUser(profile);
        } catch (err: any) {
            if (err?.code !== 'auth/popup-closed-by-user') {
                setError('Erro ao fazer login com Google.');
            }
        } finally {
            setLoading(false);
        }
    };

    const loginAsDemo = async () => {
        setError(null);
        setLoading(true);
        try {
            const profile = await signInAsDemo();
            setUser(profile);
        } catch {
            setError('Erro ao acessar modo demo.');
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            await signOut();
            setUser(null);
        } catch {
            setError('Erro ao fazer logout.');
        }
    };

    const clearError = () => setError(null);

    const hasPermission = (requiredRole: UserRole): boolean => {
        if (!user) return false;
        return ROLE_HIERARCHY[user.role as UserRole] >= ROLE_HIERARCHY[requiredRole];
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, signup, loginWithGoogle, loginAsDemo, logout, clearError, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
