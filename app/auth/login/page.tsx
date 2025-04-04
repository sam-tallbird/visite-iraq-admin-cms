"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, signIn, loading, error: authError } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      console.log("Attempting sign in with Supabase...");
      await signIn(email, password);
    } catch (err: any) {
      console.error("Unexpected error during handleSubmit:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Iraq Tourism</h1>
          <h2 className="mt-2 text-2xl font-semibold">Admin Dashboard</h2>
          <p className="mt-2 text-muted-foreground">
            Sign in to manage content
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {authError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {authError}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full"
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 