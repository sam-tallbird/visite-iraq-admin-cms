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
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { where, orderBy, limit, query, Timestamp } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

// Define the Listing type
interface Listing {
  id: string;
  title: string;
  name_en: string;
  description_en: string;
  category: string;
  status: "Published" | "Draft";
  featured: boolean;
  views: number;
  updated_at: Timestamp;
  created_at: Timestamp;
  thumbnail?: string;
  image_url?: string;
}

export default function ListingsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("updated_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, id: string | null}>({show: false, id: null});
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  // Check authentication state
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

  // Use the Firestore hook to fetch listings
  const { 
    data: listings, 
    status, 
    error, 
    refresh, 
    remove
  } = useFirestoreCollection('listings', [orderBy("updated_at", "desc")], {
    onError: (error) => {
      console.error("Firestore error:", error);
      setErrorMessage(`Error loading listings: ${error.message}`);
      
      // If the error is authentication related, redirect to login
      if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
        router.push("/auth/login");
      }
    }
  });

  // Refresh listings when the shouldRefresh state changes
  useEffect(() => {
    if (shouldRefresh) {
      refresh();
      setShouldRefresh(false);
    }
  }, [shouldRefresh, refresh]);

  const loading = status === 'loading' || status === 'idle' || isAuthChecking;

  // Handle sorting
  const handleSort = (field: string) => {
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
    try {
      await remove(id);
      setShowDeleteConfirm({show: false, id: null});
      // Refresh not needed since the hook will update automatically
    } catch (error) {
      console.error("Error deleting listing:", error);
      alert("Failed to delete listing. Please try again.");
    }
  };

  // Format date for display
  const formatDate = (timestamp: Timestamp) => {
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

  // Filter listings based on search and filters
  const filteredListings = listings.filter((listing: any) => {
    const title = listing.title || listing.name_en || "";
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || listing.category === selectedCategory;
    const matchesStatus = statusFilter === "All" || listing.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort listings
  const sortedListings = [...filteredListings].sort((a: any, b: any) => {
    const fieldA = a[sortField as keyof typeof a];
    const fieldB = b[sortField as keyof typeof b];
    
    if (typeof fieldA === "string" && typeof fieldB === "string") {
      return sortDirection === "asc" 
        ? fieldA.localeCompare(fieldB) 
        : fieldB.localeCompare(fieldA);
    }
    
    if (typeof fieldA === "number" && typeof fieldB === "number") {
      return sortDirection === "asc" ? fieldA - fieldB : fieldB - fieldA;
    }
    
    // Handle timestamps
    if (fieldA && fieldB && fieldA.toDate && fieldB.toDate) {
      const dateA = fieldA.toDate();
      const dateB = fieldB.toDate();
      
      return sortDirection === "asc" 
        ? dateA.getTime() - dateB.getTime() 
        : dateB.getTime() - dateA.getTime();
    }
    
    // Default case (as strings)
    return sortDirection === "asc" 
      ? String(fieldA).localeCompare(String(fieldB))
      : String(fieldB).localeCompare(String(fieldA));
  });

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
              onClick={() => setShouldRefresh(true)}
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
                    placeholder="Search listings..."
                    className="input-search w-full py-2 pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="input-select min-w-32"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    <option value="museums">Museums</option>
                    <option value="historical_sites">Historical Sites</option>
                    <option value="parks_nature">Parks & Nature</option>
                    <option value="religious_sites">Religious Sites</option>
                    <option value="shopping">Shopping</option>
                    <option value="restaurants">Restaurants</option>
                    <option value="experiences">Experiences</option>
                  </select>
                  <select
                    className="input-select min-w-28"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Status</option>
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
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
              {listings.length === 0 ? (
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
                            onClick={() => handleSort("title")}
                            className="inline-flex items-center gap-1"
                          >
                            Listing <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">
                          <button
                            onClick={() => handleSort("category")}
                            className="inline-flex items-center gap-1"
                          >
                            Category <ArrowUpDown className="h-3 w-3" />
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
                            onClick={() => handleSort("featured")}
                            className="inline-flex items-center gap-1"
                          >
                            Featured <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-medium">
                          <button
                            onClick={() => handleSort("views")}
                            className="inline-flex items-center gap-1"
                          >
                            Views <ArrowUpDown className="h-3 w-3" />
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
                                alt={listing.title || listing.name_en}
                                className="h-10 w-16 rounded object-cover"
                              />
                              <div>
                                <div className="font-medium">{listing.title || listing.name_en}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                              {listing.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {listing.status === "Published" ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Draft
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {listing.featured ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {(listing.views || 0).toLocaleString()}
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