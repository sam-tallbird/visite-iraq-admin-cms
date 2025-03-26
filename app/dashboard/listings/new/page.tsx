"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/PageTitle";
import { NewListingForm } from "@/components/forms/NewListingForm";
import { useAuth } from "@/providers/auth-provider";

export default function NewListingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);
  
  // Show loading state
  if (loading) {
    return <div className="container py-8">Loading...</div>;
  }
  
  // Don't render the form until we know the user is authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="container py-8">
      <PageTitle 
        title="Create New Listing" 
        description="Add a new location to the tourism directory" 
        backButtonUrl="/dashboard/listings"
      />
      <div className="mt-6">
        <NewListingForm />
      </div>
    </div>
  );
} 