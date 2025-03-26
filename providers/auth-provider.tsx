"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
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
        // Instead of using getIdToken which is causing errors, we'll just use a boolean
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
    if (auth) {
      setPersistence(auth, browserLocalPersistence)
        .catch((error) => {
          console.error("Auth persistence error:", error);
        });
    }
  }, []);

  // Check if user is authenticated and handle protected routes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      // Determine if the user is admin (in a real app, you might check claims or roles)
      setIsAdmin(!!user);
      
      // Handle redirects based on auth state
      if (!user) {
        // If user is not authenticated and trying to access protected routes
        if (pathname && pathname.startsWith('/dashboard')) {
          router.push('/auth/login');
        }
      } else {
        // If user is authenticated and on auth pages, redirect to dashboard
        if (pathname === '/auth/login') {
          router.push('/dashboard');
        }
      }
      
      // Set or remove the auth cookie based on user state
      setAuthCookie(user);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(result.user);
      setIsAdmin(true); // Assume all authenticated users are admin for now
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
    try {
      await firebaseSignOut(auth);
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