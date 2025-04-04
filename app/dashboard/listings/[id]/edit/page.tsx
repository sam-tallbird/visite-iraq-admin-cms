"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { EditListingForm } from "@/components/forms/EditListingForm";
import { PageTitle } from "@/components/PageTitle";
import { useAuth } from "@/providers/auth-provider";
import { Loader2 } from "lucide-react";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading, initialAuthCheckCompleted } = useAuth();
  
  // Get the listing ID from the params
  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  
  // Redirect to login if not authenticated AFTER initial check
  useEffect(() => {
    // Only redirect if initial check is done, loading is false, and there's no user
    if (initialAuthCheckCompleted && !loading && !user) {
      console.log("[EditListingPage] Redirecting: Initial check done, not loading, no user.");
      router.push("/auth/login");
    }
  }, [user, loading, initialAuthCheckCompleted, router]);
  
  // Use the flag to determine initial page load state
  // const showInitialLoading = !initialAuthCheckCompleted || loading; // Keep this logic conceptually

  // Display loading indicator ONLY until the very first auth check completes.
  // Once completed, always render the main structure.
  if (!initialAuthCheckCompleted) { 
      console.log("[EditListingPage] Showing initial loading screen (check not complete)");
      return (
          <div className="container py-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      );
  }

  // --- Removed useMemo wrapper --- 
  // const memoizedForm = useMemo(() => {
  //   console.log("[EditListingPage] Memoizing EditListingForm instance");
  //   return <EditListingForm listingId={id} />;
  // }, [id]); // Only recreate if the listing ID changes
  // -------------------------------

  // Removed check that returned null if !user, rely on useEffect redirect
  // if (!user) {
  //   return null;
  // }

  // Always render the container and form once initial auth check seems done,
  // assuming the redirect effect handles non-authenticated users.
  return (
    <div className="container py-8">
      <PageTitle 
        title="Edit Listing" 
        description="Update your listing information" 
        backButtonUrl="/dashboard/listings"
      />
      <div className="mt-6">
        {/* Overlay check remains the same, based on current loading state */} 
        {loading && (
          <div className="absolute inset-0 bg-background/50 flex justify-center items-center z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {/* Render EditListingForm directly */}
        <EditListingForm listingId={id} /> 
      </div>
    </div>
  );
} 