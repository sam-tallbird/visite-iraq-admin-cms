"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { 
  ChevronLeft, 
  Edit, 
  Trash2,
  Loader2,
  AlertCircle,
  MapPin,
  Mail,
  Phone,
  ArrowLeft,
  RefreshCw,
  Check,
  X,
  Globe,
  Clock,
  Tag,
  Info,
  Eye
} from "lucide-react";
import Shell from "@/components/layout/shell";
import { useFirestoreDocument } from "@/hooks/use-firestore";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { DocumentData, FirestoreError } from "firebase/firestore";

export default function ViewListingPage() {
  const router = useRouter();
  const params = useParams();
  // Ensure listingId is a string and never undefined
  const listingId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  
  // If listingId is empty, redirect to listings page
  useEffect(() => {
    if (!listingId) {
      router.push("/dashboard/listings");
    }
  }, [listingId, router]);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  
  // Auth check
  useEffect(() => {
    if (!auth) {
      console.error("Auth is not initialized");
      setIsAuthChecking(false);
      router.push("/auth/login");
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthChecking(false);
      if (user) {
        setIsAuthenticated(true);
      } else {
        console.log("No authenticated user, redirecting to login");
        router.push("/auth/login");
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  // Add logging to track component lifecycle and data loading
  useEffect(() => {
    console.log("ViewListingPage mounted, listingId:", listingId);
    return () => {
      console.log("ViewListingPage unmounted");
    };
  }, [listingId]);

  // Fetch the listing data
  const {
    data: listing,
    status,
    error,
    refresh,
    remove,
  } = useFirestoreDocument('listings', listingId, {
    onSuccess: (data: DocumentData | null) => {
      console.log("Firestore data loaded successfully:", data ? "data exists" : "no data");
    },
    onError: (error: FirestoreError) => {
      console.error("Firestore error:", error);
      setErrorMessage(`Error loading listing: ${error.message}`);
      
      // If the error is authentication related, redirect to login
      if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
        router.push("/auth/login");
      }
    }
  });

  // Refresh listing when the shouldRefresh state changes
  useEffect(() => {
    if (shouldRefresh) {
      refresh();
      setShouldRefresh(false);
    }
  }, [shouldRefresh, refresh]);

  const loading = status === 'loading' || status === 'idle' || isAuthChecking;

  // Handle deleting the listing
  const handleDelete = async () => {
    try {
      await remove();
      router.push("/dashboard/listings");
    } catch (error: any) {
      console.error("Error deleting listing:", error);
      setErrorMessage(`Failed to delete: ${error.message}`);
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Loading listing data...</p>
          </div>
        </div>
      </Shell>
    );
  }
  
  // Show error state
  if (status === 'error' && !errorMessage) {
    return (
      <Shell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <h2 className="text-xl font-bold mt-4">Error Loading Listing</h2>
            <p className="mt-2 text-muted-foreground">
              {error?.message || "An unknown error occurred."}
            </p>
            <button
              onClick={() => setShouldRefresh(true)}
              className="btn btn-primary mt-6"
            >
              Try Again
            </button>
          </div>
        </div>
      </Shell>
    );
  }
  
  // Format the timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp || !timestamp.toDate) {
      return "N/A";
    }
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Shell>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm rounded-full p-0 w-8 h-8"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </button>
            <h1 className="text-2xl font-bold">View Listing</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShouldRefresh(true)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1">Refresh</span>
            </button>
            <Link
              href={`/dashboard/listings/${listingId}/edit`}
              className="btn btn-outline btn-sm"
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Link>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="btn btn-destructive btn-sm"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </button>
          </div>
        </div>

        {/* Error message display */}
        {errorMessage && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <p>{errorMessage}</p>
            <button 
              className="ml-auto hover:text-destructive/80"
              onClick={() => setErrorMessage(null)}
            >
              &times;
            </button>
          </div>
        )}

        {/* Listing content */}
        {status === 'success' && listing && !loading && (
          <div className="space-y-6">
            {/* Main info card */}
            <div className="card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Image */}
                <div className="col-span-1">
                  <div className="aspect-video overflow-hidden rounded-lg relative bg-muted">
                    {listing.image_url || listing.thumbnail ? (
                      <Image 
                        src={listing.image_url || listing.thumbnail} 
                        alt={listing.title || listing.name_en}
                        fill 
                        className="object-cover" 
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Info className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Main details */}
                <div className="col-span-1 md:col-span-2">
                  <h2 className="text-2xl font-bold mb-2">
                    {listing.title || listing.name_en}
                  </h2>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="badge badge-primary">
                      {listing.category}
                    </span>
                    <span className={`badge ${listing.status === 'Published' ? 'badge-success' : 'badge-warning'}`}>
                      {listing.status}
                    </span>
                    {listing.featured && (
                      <span className="badge badge-secondary">
                        Featured
                      </span>
                    )}
                  </div>
                  
                  <div className="prose max-w-none mb-4">
                    <p>{listing.description_en}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{listing.location || "Location not specified"}</span>
                    </div>
                    
                    {listing.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{listing.phone}</span>
                      </div>
                    )}
                    
                    {listing.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={listing.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Website
                        </a>
                      </div>
                    )}
                    
                    {(listing.hours || listing.opening_hours) && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{listing.hours || listing.opening_hours}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {listing.price_range || listing.price || "Price not specified"}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span>{(listing.views || 0).toLocaleString()} views</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Metadata card */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Listing Metadata</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(listing.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatDate(listing.updated_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ID</p>
                  <p className="font-medium font-mono text-xs">{listingId}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1 mt-1">
                    {listing.status === "Published" ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-green-500">Published</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-amber-500" />
                        <span className="font-medium text-amber-500">Draft</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Featured</p>
                  <div className="flex items-center gap-1 mt-1">
                    {listing.featured ? (
                      <>
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-green-500">Yes</span>
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">No</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Images, if any */}
            {listing.images && listing.images.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {listing.images.map((image: string, index: number) => (
                    <div key={index} className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                      <Image 
                        src={image} 
                        alt={`Image ${index + 1}`}
                        fill 
                        className="object-cover" 
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card max-w-md w-full p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold mb-4">Delete Listing</h3>
            <p className="mb-6">
              Are you sure you want to delete this listing? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button 
                className="btn btn-outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-destructive"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
} 