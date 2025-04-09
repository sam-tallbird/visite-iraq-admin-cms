"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  MoreHorizontal, 
  Search, 
  Sliders, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Loader2,
  MapPin,
  CheckCircle,
  AlertCircle,
  ArrowUpDown,
  RefreshCw,
  Image as ImageIcon
} from "lucide-react";
import Shell from "@/components/layout/shell";
import { useSupabaseTable } from "@/hooks/use-supabase";
import { useAuth } from "@/providers/auth-provider";
import Image from 'next/image';

// Define the Listing type - Include photos_videos
interface Listing {
  id: string;
  photos_videos?: string[] | null;
  listing_translations: Array<{ 
    name: string;
    language_code: string;
  }>;
  name_en?: string | null; // Processed field
  imageUrl?: string | null; // Processed field for public URL
}

// Define type for sorting fields - Simplified for debugging
type SortableListingField = 'name_en'; // Only name_en available for now

export default function ListingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  // Default sort by name_en now
  const [sortField, setSortField] = useState<SortableListingField>("name_en"); 
  const [sortDirection, setSortDirection] = useState("asc"); // Default asc for name
  // const [statusFilter, setStatusFilter] = useState("All"); // Removed status filter
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, id: string | null}>({show: false, id: null});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use the Supabase hook - UPDATED selectQuery
  const { 
    data: listingsData, 
    status, 
    error, 
    refresh, 
    remove: removeListing
  } = useSupabaseTable(
      'listings', 
      // Fetch id, translation name, and related media URL/is_primary
      { selectQuery: "id, listing_translations(name, language_code), media(url, is_primary)" } // UPDATED Query
    );

  // --- DEBUGGING LOGS --- 
  console.log(`[ListingsPage] useSupabaseTable status: ${status}`);
  if (error) {
    console.error("[ListingsPage] useSupabaseTable error:", error);
  }
  console.log("[ListingsPage] Raw listingsData:", listingsData);
  // --------------------

  // --- useMemo hook - Process Name and Image URL ---
  const listings = useMemo(() => {
    if (!listingsData) return []; 
    const processedListings = listingsData.map((listing: any) => {
        const enTranslation = listing.listing_translations?.find((t: any) => t.language_code === 'en');
        
        // --- UPDATED Image Logic: Find primary image from media ---
        let imageUrl = null;
        const primaryMedia = listing.media?.find((m: any) => m.is_primary === true);
        if (primaryMedia && primaryMedia.url) {
             imageUrl = primaryMedia.url;
        } else if (listing.media && listing.media.length > 0 && listing.media[0].url) {
             // Fallback to the first media item if no primary is found
             console.warn(`[ListingsPage] No primary image found for listing ${listing.id}. Falling back to first image.`);
             imageUrl = listing.media[0].url;
        }
        // --- END UPDATED Image Logic ---

        return {
            ...listing,
            name_en: enTranslation?.name || null, 
            imageUrl: imageUrl, // Use the URL found from media table
        };
    }).filter(l => l !== null) as Listing[]; 
    console.log("[ListingsPage] Processed listings (after useMemo):", processedListings);
    return processedListings; 
  }, [listingsData]); // REMOVED supabase dependency

  const loading = status === 'loading' || status === 'idle' || authLoading;

  // Handle sorting - Simplified
  const handleSort = (field: SortableListingField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle viewing a listing
  const handleView = (id: string) => {
    router.push(`/dashboard/listings/${id}`);
  };

  // Handle editing a listing
  const handleEdit = (id: string) => {
    router.push(`/dashboard/listings/${id}/edit`);
  };

  // Handle deleting a listing with confirmation
  const confirmDelete = (id: string) => {
    setShowDeleteConfirm({show: true, id});
  };

  const cancelDelete = () => {
    setShowDeleteConfirm({show: false, id: null});
  };

  const handleDelete = async (id: string) => {
    if (!removeListing) {
      alert("Delete function not ready.");
      return;
    }
    try {
      await removeListing(id);
      setShowDeleteConfirm({show: false, id: null});
    } catch (error: any) {
      console.error("Error deleting listing:", error);
      alert(`Failed to delete listing: ${error.message}`);
    }
  };

  // Format date - Keep function, but won't be used in table for now
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { 
        console.error("Error formatting date string:", dateString, e);
        return "Invalid Date"; 
    }
  };

  // Client-side filtering - Only search name_en
  let filteredListings: Listing[] = [];
  if (listings && listings.length > 0) { 
      filteredListings = listings.filter((listing) => {
          if (!listing) return false;
          const nameEn = listing.name_en || ""; 
          const matchesSearch = nameEn.toLowerCase().includes(searchTerm.toLowerCase());
          // const matchesStatus = statusFilter === "All" || listing.status === statusFilter; // Removed status match
          return matchesSearch; // Only match search term now
      });
  }
  
  // Client-side sorting - Simplified to only name_en
  const sortedListings = [...filteredListings].sort((a, b) => {
    const fieldA = a[sortField]; // Should only be name_en now
    const fieldB = b[sortField];
    
    if (fieldA == null && fieldB == null) return 0;
    if (fieldA == null) return sortDirection === "asc" ? -1 : 1;
    if (fieldB == null) return sortDirection === "asc" ? 1 : -1;
    
    // String comparison for name_en
    return sortDirection === "asc" ? String(fieldA).localeCompare(String(fieldB)) : String(fieldB).localeCompare(String(fieldA));
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header and buttons */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Listings</h1>
            <p className="text-muted-foreground">
              Manage tourism locations across Iraq.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-outline btn-sm inline-flex items-center gap-1" onClick={() => refresh()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="sr-only">Refresh</span>
            </button>
            <Link href="/dashboard/listings/new" className="btn btn-primary inline-flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Listing
            </Link>
          </div>
        </div>

        {/* Error message display */}
        {errorMessage && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> <p>{errorMessage}</p>
            <button className="ml-auto hover:text-destructive/80" onClick={() => setErrorMessage(null)}>&times;</button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading listings...</span>
          </div>
        )}

        {!loading && (
          <>
            {/* Search and Filters Card - Removed Status Filter */}
            <div className="card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search by name..."
                    className="input-search w-full py-2 pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Status Filter Removed */}
                  <button className="btn btn-outline inline-flex items-center gap-1 py-2">
                    <Sliders className="h-4 w-4" /> <span className="hidden sm:inline">Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Delete confirmation modal */}
            {showDeleteConfirm.show && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-card max-w-md w-full p-6 rounded-lg shadow-lg">
                  <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
                  <p className="mb-6">Are you sure you want to delete this listing? This action cannot be undone.</p>
                  <div className="flex justify-end gap-2">
                    <button className="btn btn-outline" onClick={cancelDelete}>Cancel</button>
                    <button className="btn btn-destructive" onClick={() => showDeleteConfirm.id && handleDelete(showDeleteConfirm.id)}>Delete</button>
                  </div>
                </div>
              </div>
            )}

            {/* Listings Table Card */}
            <div className="card overflow-hidden p-0">
              {sortedListings.length === 0 ? (
                 <div className="p-8 text-center">
                  <p className="text-muted-foreground">No listings found. Create your first listing!</p>
                  <Link 
                    href="/dashboard/listings/new" 
                    className="btn btn-primary mt-4 inline-flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    Add Listing
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] table-auto">
                    <thead>
                      <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                        <th className="px-4 py-3 font-medium">
                          <button
                            onClick={() => handleSort("name_en")} 
                            className="inline-flex items-center gap-1"
                          >
                            Name <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        {/* Status Header Removed */} 
                        {/* Last Updated Header Removed (for now) */}
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedListings.map((listing: any) => (
                        <tr key={listing.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {/* Display Image or Placeholder */}
                              <div className="h-10 w-10 flex-shrink-0 rounded-sm bg-muted flex items-center justify-center overflow-hidden">
                                {listing.imageUrl ? (
                                  <Image 
                                    src={listing.imageUrl} 
                                    alt={listing.name_en || 'Listing image'} 
                                    width={40} 
                                    height={40} 
                                    className="h-full w-full object-cover"
                                    unoptimized={listing.imageUrl.includes('blob:')}
                                  />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{listing.name_en || `Listing ${listing.id.substring(0,6)}`}</div> 
                              </div>
                            </div>
                          </td>
                          {/* Status Cell Removed */}
                          {/* Last Updated Cell Removed (for now) */}
                          <td className="px-4 py-3 text-right">
                             {/* Action buttons */}
                             <div className="flex justify-end gap-2">
                              <button 
                                className="btn-icon btn-sm" 
                                onClick={() => handleView(listing.id)}
                                title="View listing"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                className="btn-icon btn-sm"
                                onClick={() => handleEdit(listing.id)} 
                                title="Edit listing"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                className="btn-icon btn-sm text-destructive hover:bg-destructive/10"
                                onClick={() => confirmDelete(listing.id)}
                                title="Delete listing"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
} 