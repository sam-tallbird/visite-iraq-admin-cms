"use client";

import { useRouter } from "next/navigation";

export function useAuthRedirects() {
  const router = useRouter();
  
  const redirectToSignIn = () => {
    router.push("/auth/login");
  };

  const redirectToDashboard = () => {
    router.push("/dashboard");
  };
  
  return {
    redirectToSignIn,
    redirectToDashboard
  };
} 