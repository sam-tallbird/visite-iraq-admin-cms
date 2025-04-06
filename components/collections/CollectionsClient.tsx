"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { PageTitle } from "@/components/PageTitle";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    PlusCircle,
    Loader2,
    AlertCircle,
    Edit,
    Trash2,
    ChevronLeft,
} from "lucide-react";

interface Collection {
  id: string;
  name_en: string;
  name_ar?: string | null;
  slug: string;
  created_at?: string;
}

export function CollectionsClient() {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch collections
  const fetchCollections = async () => {
    setLoading(true);
    setError(null);
    console.log("Fetching collections from API..."); // Log API call
    try {
      // --- Replace simulation with actual API call --- 
      const response = await fetch('/api/collections'); 
      if (!response.ok) { 
          const errorData = await response.json().catch(() => ({})); // Try to get error message
          throw new Error(errorData.message || `Failed to fetch collections (${response.status})`);
      }
      const data: Collection[] = await response.json();
      // --- Remove Simulation --- 
      /*
      await new Promise(resolve => setTimeout(resolve, 600));
      const data_sim: Collection[] = [
          { id: 'uuid-1', name_en: 'Must See Landmarks', name_ar: '(Arabic Must See)', slug: 'must-see-landmarks' },
          { id: 'uuid-2', name_en: 'Hidden Gems', name_ar: '(Arabic Gems)', slug: 'hidden-gems' },
          { id: 'uuid-3', name_en: 'Family Fun', name_ar: null, slug: 'family-fun' },
      ];
      */
      // --- End Remove Simulation ---
      console.log("Fetched collections from API:", data);
      setCollections(data);
    } catch (err: any) {
      console.error("Error fetching collections from API:", err);
      setError(err.message || "Failed to load collections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  // Delete collection handler
  const handleDelete = async (collectionId: string) => {
    if (!confirm("Are you sure you want to delete this collection? This may also remove associated items.")) return; // Updated confirmation

    console.log(`Attempting to delete collection ${collectionId} via API`);
    const originalCollections = [...collections]; // Store original state for potential revert
    setCollections(prev => prev.filter(c => c.id !== collectionId)); // Optimistic UI update
    setError(null); 

    try {
        // --- Replace simulation with actual API call --- 
        const response = await fetch(`/api/collections/${collectionId}`, { method: 'DELETE' });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Try get error
            throw new Error(errorData.message || `Failed to delete collection (${response.status})`);
        }
        // --- Remove Simulation ---
        // await new Promise(resolve => setTimeout(resolve, 700));
        // --- End Remove Simulation ---
        console.log(`Successfully deleted collection ${collectionId} via API`);
        // Optionally show success toast
        // No need to re-fetch if optimistic update is trusted on success
    } catch (error: any) {
        console.error("API Delete failed:", error);
        setError(`Failed to delete: ${error.message}.`);
        // Revert optimistic update on failure
        setCollections(originalCollections);
        // fetchCollections(); // Or force re-fetch
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Button 
        variant="outline" 
        size="sm" 
        className="mb-4" 
        onClick={() => router.back()}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <div className="flex items-center justify-between gap-4 mb-6">
        <PageTitle
          title="Curated Collections"
          description="Manage groups of listings featured throughout the site."
        />
        <Link href="/dashboard/collections/new">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Collection
            </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-center rounded border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name (English)</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No collections found.
                    </TableCell>
                </TableRow>
              ) : (
                collections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell className="font-medium">{collection.name_en}</TableCell>
                    <TableCell className="text-muted-foreground">{collection.slug}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/collections/${collection.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4"/> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(collection.id)}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          >
                             <Trash2 className="mr-2 h-4 w-4"/> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 