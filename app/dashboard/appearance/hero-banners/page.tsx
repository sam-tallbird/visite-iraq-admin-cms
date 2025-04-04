"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/providers/auth-provider";
// Make sure the path to client helper is correct if it differs
import { createClient } from "@/lib/supabase/client"; 
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
    ArrowUp,    // Using separate Up/Down arrows
    ArrowDown,
    ChevronLeft,
} from "lucide-react";
import Image from 'next/image';

// Define the type for our fetched banner data, including translation
interface HeroBannerWithTranslation {
  id: string;
  image_path: string;
  link_url?: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  // Assuming we fetch only English text for the table view
  text_en?: string | null;
  image_public_url?: string; // To store the public URL
}

export default function HeroBannersPage() {
  // Use client from AuthProvider if it exposes it, otherwise create one
  const { supabase: authSupabase } = useAuth(); 
  const supabase = authSupabase || createClient(); // Fallback if not from context
  const router = useRouter();

  const [banners, setBanners] = useState<HeroBannerWithTranslation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch banners (can be reused for refresh)
  const fetchBanners = async () => {
    if (!supabase) {
        console.error("Supabase client not available");
        setError("Supabase client not available");
        setLoading(false);
        return;
    }

    // console.log("Fetching banners..."); // Debug log
    setLoading(true);
    setError(null);

    try {
      // Fetch banners and their English translation text
      // Adjust the join/select syntax based on actual testing if needed
      const { data, error: fetchError } = await supabase
        .from("hero_banners")
        .select(`
          id,
          image_path,
          link_url,
          display_order,
          is_active,
          created_at,
          hero_banner_translations ( text, language_code )
        `)
        .order("display_order", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // console.log("Fetched data:", data); // Debug log

      // Process data to get public URLs and extract English text
      const processedData = data?.map(banner => {
          // Ensure hero_banner_translations is an array before filtering
          const translations = Array.isArray(banner.hero_banner_translations) ? banner.hero_banner_translations : [];
          const englishTranslation = translations.find((t: any) => t.language_code === 'en');
          let publicUrl = '';
          if (banner.image_path) {
              // Assuming 'banners' bucket - MAKE SURE THIS BUCKET EXISTS or adjust name
              const { data: urlData } = supabase.storage.from('banners').getPublicUrl(banner.image_path);
              publicUrl = urlData?.publicUrl || '';
              if(!publicUrl){
                  console.warn(`Could not get public URL for image path: ${banner.image_path}. Check bucket policies and path.`);
              }
          } else {
              console.warn(`Banner ID ${banner.id} has no image_path.`);
          }
          return {
              ...banner,
              text_en: englishTranslation?.text,
              image_public_url: publicUrl,
              // Remove nested array from final object
              hero_banner_translations: undefined,
          };
      }) || [];

      // console.log("Processed data:", processedData); // Debug log

      setBanners(processedData as HeroBannerWithTranslation[]);

    } catch (err: any) {
      console.error("Error fetching hero banners:", err);
      setError(err.message || "Failed to load banners.");
    } finally {
      setLoading(false);
      // console.log("Fetching complete."); // Debug log
    }
  };


  // Fetch banners on component mount
  useEffect(() => {
    fetchBanners();
  }, [supabase]); // Re-fetch if supabase client changes

  // Handle banner reordering
  const handleReorder = async (bannerId: string, direction: 'up' | 'down') => {
    if (!supabase) return;

    const currentIndex = banners.findIndex(b => b.id === bannerId);
    if (currentIndex === -1) return; // Banner not found

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= banners.length) return; // Out of bounds

    const bannerToMove = banners[currentIndex];
    const bannerToSwapWith = banners[targetIndex];

    // Get the current display_order values
    const orderToMove = bannerToMove.display_order;
    const orderToSwap = bannerToSwapWith.display_order;

    // Optimistic UI Update (optional but recommended for responsiveness)
    // Create a new array with swapped orders for immediate feedback
    const optimisticBanners = banners.map(b => {
        if (b.id === bannerToMove.id) return { ...b, display_order: orderToSwap };
        if (b.id === bannerToSwapWith.id) return { ...b, display_order: orderToMove };
        return b;
    }).sort((a, b) => a.display_order - b.display_order); // Re-sort based on new optimistic order
    setBanners(optimisticBanners);
    setLoading(true); // Show loading indicator during DB update
    setError(null);

    try {
        // Update the database - perform updates concurrently
        const updates = [
            supabase.from('hero_banners').update({ display_order: orderToSwap }).eq('id', bannerToMove.id),
            supabase.from('hero_banners').update({ display_order: orderToMove }).eq('id', bannerToSwapWith.id)
        ];
        
        const results = await Promise.all(updates);
        const errors = results.map(res => res.error).filter(Boolean);

        if (errors.length > 0) {
            console.error("Error updating display order:", errors);
            throw new Error(`Failed to update order: ${errors.map(e => e?.message).join(', ')}`);
        }

        // Refresh data from DB to confirm changes
        await fetchBanners();

    } catch (error: any) {
        console.error("Failed to reorder banners:", error);
        setError(error.message || "Failed to reorder banners.");
        // Revert optimistic update on failure
        // Fetching again will also revert, but this is quicker if fetch fails
        await fetchBanners(); // Fetch again to get the original state
    } finally {
       // setLoading(false); // Let fetchBanners handle final loading state
    }
  };

  const handleDelete = async (bannerId: string, imagePath: string | null) => {
      console.log(`Delete banner ${bannerId} with image ${imagePath}`);
      if (!supabase) return;

      if (confirm("Are you sure you want to delete this banner? This cannot be undone.")) {
          try {
              setLoading(true); // Indicate activity

              // 1. Delete the database row (translations will cascade delete)
              const { error: dbError } = await supabase
                  .from('hero_banners')
                  .delete()
                  .eq('id', bannerId);

              if (dbError) throw dbError;

              // 2. Delete the image from storage if path exists
              if (imagePath) {
                  const { error: storageError } = await supabase
                      .storage
                      .from('banners') // Ensure correct bucket name
                      .remove([imagePath]);

                  if (storageError) {
                      // Log storage error but proceed, DB entry is already gone
                      console.warn(`Failed to delete image ${imagePath} from storage:`, storageError);
                  }
              } else {
                  console.log(`No image path provided for banner ${bannerId}, skipping storage delete.`);
              }

              // 3. Refresh the list
              await fetchBanners();

          } catch (error: any) {
              console.error("Failed to delete banner:", error);
              setError(`Failed to delete banner: ${error.message}`);
              setLoading(false); // Stop loading indicator on error
          }
          // setLoading(false); // Should be set by fetchBanners in finally block
      }
  };


  return (
    <div className="p-4 md:p-6">
      {/* Add Back Button */}
      <Button 
        variant="outline" 
        size="sm" 
        className="mb-4" 
        onClick={() => router.back()}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      {/* Restructure Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <PageTitle
          title="Hero Banners"
          description="Manage the main banner images and text shown on the home page."
          // No back button needed here
        />
        {/* Move Button Here */}
        <Link href="/dashboard/appearance/hero-banners/new">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Banner
            </Button>
        </Link>
      </div>

      <div className="mt-6">
        {loading && !error && ( // Show loader only if loading and no error
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && ( // Show error message if error exists
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
            {/* Optional: Add a retry button */}
            <Button onClick={fetchBanners} variant="ghost" size="sm" className="ml-auto">Retry</Button>
          </div>
        )}

        {!loading && !error && ( // Show table only if not loading and no error
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Image</TableHead>
                  <TableHead>Text (English)</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[100px] text-center">Order</TableHead> {/* Centered order */}
                  <TableHead className="w-[50px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No banners created yet. Click 'Add New Banner' to start.
                        </TableCell>
                    </TableRow>
                ) : (
                    banners.map((banner, index) => (
                      <TableRow key={banner.id}>
                        <TableCell>
                          {banner.image_public_url ? (
                             <Image
                               src={banner.image_public_url}
                               alt={banner.text_en || 'Hero Banner'}
                               width={64}
                               height={36}
                               className="object-cover rounded"
                               // Add error handling for broken images if needed
                               onError={(e) => {
                                   // Cast target to HTMLImageElement after checking
                                   const imgTarget = e.currentTarget as HTMLImageElement;
                                   if (imgTarget) {
                                       imgTarget.src = '/placeholder-image.png'; /* Provide a fallback */
                                   }
                               }}
                               unoptimized // Add if using Supabase free tier storage
                             />
                          ) : (
                            <div className="w-16 h-9 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                              No Image
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium max-w-[400px] truncate">
                          {banner.text_en || <span className="text-muted-foreground italic">No English text</span>}
                        </TableCell>
                        <TableCell>
                          {/* Consider making status editable via toggle switch later */}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              banner.is_active
                               ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                               : 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-400'
                           }`}>
                            {banner.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center"> {/* Centered order */}
                            <div className="flex items-center justify-center gap-1"> {/* Centered buttons */}
                               <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Move Up"
                                  onClick={() => handleReorder(banner.id, 'up')}
                                  disabled={index === 0} // Disable 'Up' for the first item
                               >
                                   <ArrowUp className="h-4 w-4"/>
                               </Button>
                               <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Move Down"
                                  onClick={() => handleReorder(banner.id, 'down')}
                                  disabled={index === banners.length - 1} // Disable 'Down' for the last item
                                >
                                   <ArrowDown className="h-4 w-4"/>
                               </Button>
                                <span className="ml-1 font-mono text-sm">{banner.display_order}</span> {/* Display order number */}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {/* Ensure edit link path is correct */}
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/appearance/hero-banners/${banner.id}/edit`}>
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => handleDelete(banner.id, banner.image_path)}
                              >
                                Delete
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
    </div>
  );
}