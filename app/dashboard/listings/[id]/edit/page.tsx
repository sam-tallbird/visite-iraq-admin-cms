"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { EditListingForm } from "@/components/forms/EditListingForm";
import { PageTitle } from "@/components/PageTitle";
import { useAuth } from "@/providers/auth-provider";

export default function EditListingPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading } = useAuth();
  
  // Get the listing ID from the params
  const id = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  
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
        title="Edit Listing" 
        description="Update your listing information" 
        backButtonUrl="/dashboard/listings"
      />
      <div className="mt-6">
        <EditListingForm listingId={id} />
      </div>
    </div>
  );
} 