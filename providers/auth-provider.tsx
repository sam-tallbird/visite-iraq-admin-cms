"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client"; // Import Supabase client helper
import type { SupabaseClient, User } from "@supabase/supabase-js";

// Timeout constant (e.g., 8 seconds)
const QUERY_TIMEOUT_MS = 500; 

// Define a more specific type for the user, potentially including profile data later
type UserProfile = User;

interface AuthContextType {
  supabase: SupabaseClient; // Expose Supabase client instance
  user: UserProfile | null;
  loading: boolean; // Represents ongoing checks (initial or post-auth-change)
  initialAuthCheckCompleted: boolean; // Represents if the *very first* check is done
  error: string | null;
  isAdmin: boolean; // Keep isAdmin for now, potentially based on profile role
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient(); // Create client-side Supabase instance
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Start loading until initial check is done
  const [initialAuthCheckCompleted, setInitialAuthCheckCompleted] = useState(false); // <-- Add state
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false); // Default to false
  const router = useRouter();

  useEffect(() => {
    // Function to fetch profile and set admin status
    const checkAdminStatus = async (userId: string) => {
      console.log('[AuthProvider] checkAdminStatus: START', { userId });
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single(); // Expecting only one profile per user ID
          
        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = Row not found
            console.error("Error fetching user profile:", profileError);
            setIsAdmin(false); // Default to false on error
            return;
        }
        
        if (profile && profile.role === 'admin') {
             setIsAdmin(true);
        } else {
             setIsAdmin(false);
        }
      } catch (err) {
          console.error("[AuthProvider] checkAdminStatus: Unexpected error fetching profile:", err);
          setIsAdmin(false); // Default to false on unexpected errors
      }
      console.log('[AuthProvider] checkAdminStatus: END');
    };
    
    // Get initial session and check admin status
    const getSession = async () => {
      console.log('[AuthProvider] getSession: START');
      // setLoading(true); // Already true initially
      try {
          console.log('[AuthProvider] getSession: Calling supabase.auth.getSession()');
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          console.log('[AuthProvider] getSession: Got session response', { session, sessionError });
          if (sessionError) {
            console.error("[AuthProvider] getSession: Error getting initial session:", sessionError);
            setError(sessionError.message);
            setUser(null);
            setIsAdmin(false);
          } else if (session?.user) {
            console.log('[AuthProvider] getSession: User found, calling checkAdminStatus');
            setUser(session.user);
            await checkAdminStatus(session.user.id); // Check admin status for initial session
          } else {
             console.log('[AuthProvider] getSession: No user session found');
             setUser(null);
             setIsAdmin(false);
          }
      } catch (e) {
          // Catch any unexpected errors during getSession or checkAdminStatus
          console.error("[AuthProvider] getSession: Unexpected error during initial session check:", e);
          setError(e instanceof Error ? e.message : "An unknown error occurred");
          setUser(null);
          setIsAdmin(false);
      } finally {
         console.log('[AuthProvider] getSession: FINALLY block, calling setLoading(false) and setInitialAuthCheckCompleted(true)');
         setLoading(false); // Ensure loading is false after initial check completes
         setInitialAuthCheckCompleted(true); // <-- Set flag here
      }
    };

    console.log('[AuthProvider] useEffect: Calling getSession()');
    getSession();

    // Listen for changes on auth state (sign in, sign out, token refreshed)
    console.log('[AuthProvider] useEffect: Setting up onAuthStateChange listener');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthProvider] onAuthStateChange: TRIGGERED', { event, session });

        // ONLY update user state based on the session from the event.
        // DO NOT re-check admin status or manage loading state here.
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (!currentUser) {
             // If user is null (e.g., signed out), ensure isAdmin is false.
             console.log('[AuthProvider] onAuthStateChange: No user session, setting isAdmin=false');
             setIsAdmin(false);
        }
        // If currentUser exists, isAdmin state remains as it was set during initial getSession.
      }
    );

    // Cleanup function
    return () => {
      console.log('[AuthProvider] useEffect: Cleaning up onAuthStateChange listener');
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      
      // Redirect handled here, state change triggers listener which sets loading state
      console.log("AuthProvider: Sign in successful, redirecting...");
      router.push('/dashboard');
      
    } catch (error: any) {
      console.error("Sign in error:", error);
      setError(error.message || "Failed to sign in");
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      // No need to manually push, middleware/listener handles state change
      // router.push('/auth/login');
    } catch (error: any) {
      console.error("Sign out error:", error);
      setError(error.message || "Failed to sign out");
    } finally {
       // Loading state will be updated by onAuthStateChange listener
       // setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        supabase, // Provide the Supabase client instance
        user,
        loading,
        initialAuthCheckCompleted, // <-- Expose flag
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