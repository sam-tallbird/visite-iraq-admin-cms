"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  Auth
} from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import { auth } from "@/lib/firebase";
import Cookies from 'js-cookie';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Function to set the auth cookie
  const setAuthCookie = async (user: User | null) => {
    if (user) {
      try {
        Cookies.set('auth-token', 'authenticated', { expires: 7, path: '/' });
      } catch (error) {
        console.error("Error setting auth cookie:", error);
      }
    } else {
      Cookies.remove('auth-token', { path: '/' });
    }
  };

  // Set auth persistence to local (survives browser restarts)
  useEffect(() => {
    const initAuth = async () => {
      if (!auth) return;
      try {
        await setPersistence(auth as Auth, browserLocalPersistence);
      } catch (error) {
        console.error("Auth persistence error:", error);
      }
    };
    
    initAuth();
  }, []);

  // Check if user is authenticated and handle protected routes
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth as Auth, (user) => {
      setUser(user);
      setLoading(false);
      setIsAdmin(!!user);
      
      if (!user) {
        if (pathname && pathname.startsWith('/dashboard')) {
          router.push('/auth/login');
        }
      } else {
        if (pathname === '/auth/login') {
          router.push('/dashboard');
        }
      }
      
      setAuthCookie(user);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const signIn = async (email: string, password: string) => {
    if (!auth) throw new Error("Auth not initialized");

    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithEmailAndPassword(auth as Auth, email, password);
      setUser(result.user);
      setIsAdmin(true);
      await setAuthCookie(result.user);
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!auth) throw new Error("Auth not initialized");

    try {
      await firebaseSignOut(auth as Auth);
      setUser(null);
      setIsAdmin(false);
      Cookies.remove('auth-token', { path: '/' });
      router.push('/auth/login');
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || 'Failed to sign out');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        signIn,
        signOut,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
} 