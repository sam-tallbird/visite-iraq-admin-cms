"use client";

import { useState, useEffect } from "react";
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
  RefreshCw
} from "lucide-react";
import Shell from "@/components/layout/shell";
import { useSupabaseTable } from "@/hooks/use-supabase";
import { useAuth } from "@/providers/auth-provider";

// Define the Listing type based on Supabase 'listings' table
// TODO: Add translation fields later
interface Listing {
  id: string;
  location?: string | null;
  status?: "Published" | "Draft" | "Archived";
  created_at?: string | null; // ISO string
  updated_at?: string | null; // ISO string
  // Add other relevant fields from 'listings' table if needed for display
  // e.g., thumbnail_url if you create one
}

// Define type for sorting fields present in the basic Listing interface
type SortableListingField = 'status' | 'created_at' | 'updated_at' | 'location';

export default function ListingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortableListingField>("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, id: string | null}>({show: false, id: null});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use the Supabase hook to fetch listings
  // TODO: Add server-side filtering/sorting/pagination later
  const { 
    data: listings,
    status, 
    error, 
    refresh, 
    remove: removeListing
  } = useSupabaseTable('listings');

  // Combined loading state
  const loading = status === 'loading' || status === 'idle' || authLoading;

  // Handle sorting
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
    // This would typically navigate to a view page
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
      // TODO: Add deletion of related translations, categories, media
      await removeListing(id);
      setShowDeleteConfirm({show: false, id: null});
      // refresh(); // Refresh is implicitly handled by the hook after remove
    } catch (error: any) {
      console.error("Error deleting listing:", error);
      alert(`Failed to delete listing: ${error.message}`);
    }
  };

  // Format date for display (works with ISO strings)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) {
      return "N/A";
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      console.error("Error formatting date string:", dateString, e);
      return "Invalid Date";
    }
  };

  // Client-side filtering (Simplified)
  let filteredListings: Listing[] = [];
  if (listings != null) {
      filteredListings = (listings as Listing[]).filter((listing) => {
          if (!listing) return false;
          const location = listing.location || "";
          const matchesSearch = location.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesStatus = statusFilter === "All" || listing.status === statusFilter;
          return matchesSearch && matchesStatus;
      });
  }
  
  // Client-side sorting (Simplified)
  const sortedListings = [...filteredListings].sort((a, b) => {
    const fieldA = a[sortField];
    const fieldB = b[sortField];
    
    // Handle null/undefined comparisons
    if (fieldA == null && fieldB == null) return 0;
    if (fieldA == null) return sortDirection === "asc" ? -1 : 1;
    if (fieldB == null) return sortDirection === "asc" ? 1 : -1;
    
    // Sort strings (status, potentially location later)
    if (typeof fieldA === "string" && typeof fieldB === "string") {
      // Handle date strings separately for correct sorting
      if (sortField === 'created_at' || sortField === 'updated_at') {
        try {
          const dateA = new Date(fieldA).getTime();
          const dateB = new Date(fieldB).getTime();
          return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        } catch (e) {
          // Fallback to string compare if date parsing fails
          return sortDirection === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
        }
      } else {
        // Standard string compare for other fields (like status)
        return sortDirection === "asc" ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
      }
    }
    
    // Default case (shouldn't hit often with current fields)
    return 0; 
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Listings</h1>
            <p className="text-muted-foreground">
              Manage tourism locations across Iraq.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-outline btn-sm inline-flex items-center gap-1"
              onClick={() => refresh()}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="sr-only">Refresh</span>
            </button>
            <Link 
              href="/dashboard/listings/new" 
              className="btn btn-primary inline-flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Listing
            </Link>
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

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading listings...</span>
          </div>
        )}

        {!loading && (
          <>
            <div className="card">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative max-w-sm grow">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="search"
                    placeholder="Search by location..."
                    className="input-search w-full py-2 pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="input-select min-w-28"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                  <button className="btn btn-outline inline-flex items-center gap-1 py-2">
                    <Sliders className="h-4 w-4" />
                    <span className="hidden sm:inline">Filters</span>
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
                    <button 
                      className="btn btn-outline"
                      onClick={cancelDelete}
                    >
                      Cancel
                    </button>
                    <button 
                      className="btn btn-destructive"
                      onClick={() => showDeleteConfirm.id && handleDelete(showDeleteConfirm.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                            onClick={() => handleSort("location")}
                            className="inline-flex items-center gap-1"
                          >
                            Location <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">
                          <button
                            onClick={() => handleSort("status")}
                            className="inline-flex items-center gap-1"
                          >
                            Status <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">
                          <button
                            onClick={() => handleSort("updated_at")}
                            className="inline-flex items-center gap-1"
                          >
                            Last Updated <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedListings.map((listing: any) => (
                        <tr key={listing.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={listing.thumbnail || listing.image_url || "https://placehold.co/100x60/png"}
                                alt={listing.location || `Listing ${listing.id.substring(0,6)}`}
                                className="h-10 w-16 rounded object-cover"
                              />
                              <div>
                                <div className="font-medium">{listing.location || `Listing ${listing.id.substring(0,6)}`}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`badge ${listing.status === "Published" ? "badge-success" : "badge-secondary"}`}>
                              {listing.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(listing.updated_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
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