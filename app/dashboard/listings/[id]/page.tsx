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
  Eye,
  Image as ImageIcon
} from "lucide-react";
import Shell from "@/components/layout/shell";
import { useSupabaseRow, useSupabaseTable } from "@/hooks/use-supabase";
import { useCategories, Category } from "@/hooks/use-categories";
import { ListingMedia } from "@/hooks/use-listing-images";
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";

interface Listing {
  id: string;
  location?: string | null;
  google_maps_link?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface ListingTranslation {
  id?: string;
  listing_id: string;
  language_code: string;
  name?: string | null;
  description?: string | null;
  opening_hours?: string | null;
}

interface ListingCategoryLink {
    id?: string; 
    listing_id: string;
    category_id: string;
}

interface DisplayListing extends Listing {
    name_en?: string | null;
    name_ar?: string | null;
    description_en?: string | null;
    description_ar?: string | null;
    opening_hours_en?: string | null;
    opening_hours_ar?: string | null;
}

interface DisplayCategory extends Category {
    name_en?: string | null;
    name_ar?: string | null;
}

const CATEGORY_IMAGE_BUCKET = 'category-icons'; // From categories page - reuse?
const MEDIA_BUCKET_NAME = 'listing-media'; // From useListingMedia hook - reuse?

export default function ViewListingPage() {
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading, supabase } = useAuth();
  const listingId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : "";
  
  useEffect(() => {
    if (!listingId) {
      console.error("No Listing ID found, redirecting...");
      router.push("/dashboard/listings");
    } else if (listingId === 'all') {
      console.warn(`Invalid Listing ID '${listingId}' detected, redirecting...`);
      router.push("/dashboard/listings");
    }
  }, [listingId, router]);
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [translationEn, setTranslationEn] = useState<ListingTranslation | null>(null);
  const [translationAr, setTranslationAr] = useState<ListingTranslation | null>(null);
  const [linkedCategories, setLinkedCategories] = useState<DisplayCategory[]>([]);
  const [mediaItems, setMediaItems] = useState<ListingMedia[]>([]);

  const { 
    data: listing, 
    status: listingStatus,
    error: listingError,
    refresh: refreshListing,
    remove: removeListingRow 
  } = useSupabaseRow('listings', listingId);

  const { 
    data: allTranslations, 
    status: translationsStatus,
    error: translationsError,
    refresh: refreshTranslations 
  } = useSupabaseTable('listing_translations');
  
  const { 
    data: allCategoryLinks,
    status: linksStatus,
    error: linksError,
    refresh: refreshLinks
  } = useSupabaseTable('listing_categories');
  
  const { 
      categories: allCategories, 
      loading: categoriesLoading, 
      error: categoriesError 
  } = useCategories();

  const { 
      data: allCategoryTranslations, 
      status: categoryTranslationsStatus,
      error: categoryTranslationsError,
      refresh: refreshCategoryTranslations
  } = useSupabaseTable('category_translations');

  const { 
      data: allMedia, 
      status: mediaStatus, 
      error: mediaError, 
      refresh: refreshMedia 
  } = useSupabaseTable('media');

  const loading = authLoading || 
                  listingStatus !== 'success' || 
                  translationsStatus !== 'success' || 
                  linksStatus !== 'success' || 
                  categoriesLoading || 
                  categoryTranslationsStatus !== 'success' ||
                  mediaStatus !== 'success';
                  
  const combinedError = listingError || 
                        translationsError || 
                        linksError || 
                        categoriesError || 
                        categoryTranslationsError ||
                        mediaError;

  useEffect(() => {
    if (allTranslations && listingId) {
      const en = allTranslations.find(t => t.listing_id === listingId && t.language_code === 'en');
      const ar = allTranslations.find(t => t.listing_id === listingId && t.language_code === 'ar');
      setTranslationEn(en as ListingTranslation || null);
      setTranslationAr(ar as ListingTranslation || null);
    }
  }, [allTranslations, listingId]);

  useEffect(() => {
    if (allCategoryLinks && allCategories && allCategoryTranslations && listingId) {
        const links = allCategoryLinks.filter(link => link.listing_id === listingId);
        const categoryIds = links.map(link => link.category_id);
        const resolvedBaseCategories = allCategories.filter(cat => categoryIds.includes(cat.id));
        
        const combinedDisplayCategories = resolvedBaseCategories.map(baseCat => {
             const en = allCategoryTranslations.find(t => t.category_id === baseCat.id && t.language_code === 'en');
             const ar = allCategoryTranslations.find(t => t.category_id === baseCat.id && t.language_code === 'ar');
             return {
                 ...baseCat,
                 name_en: en?.name,
                 name_ar: ar?.name,
                 // Add other translation fields if needed (like icon_url, description)
             } as DisplayCategory;
        });
        
        setLinkedCategories(combinedDisplayCategories);
    }
  }, [allCategoryLinks, allCategories, allCategoryTranslations, listingId]);
  
  useEffect(() => {
      if (allMedia && listingId) {
          const items = allMedia.filter(item => item.listing_id === listingId);
          items.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || (a.order_index ?? 999) - (b.order_index ?? 999));
          setMediaItems(items as ListingMedia[]);
      }
  }, [allMedia, listingId]);

  const refreshAll = () => {
      refreshListing();
      refreshTranslations();
      refreshLinks();
      refreshCategoryTranslations();
      refreshMedia();
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  const handleDelete = async () => {
    if (!supabase || !listingId || !removeListingRow) {
        setErrorMessage("Cannot delete: Missing client, ID, or delete function.");
        return;
    }
    setShowDeleteConfirm(false); // Close modal immediately
    setErrorMessage(null);
    // Indicate loading/deleting state if desired

    try {
        // --- Delete Related Data --- 

        // 1. Delete Category Links
        const { error: deleteLinksError } = await supabase
            .from('listing_categories')
            .delete()
            .eq('listing_id', listingId);
        if (deleteLinksError) console.warn("Error deleting category links:", deleteLinksError); // Log but continue
        
        // 2. Delete Translations
        const { error: deleteTransError } = await supabase
            .from('listing_translations')
            .delete()
            .eq('listing_id', listingId);
         if (deleteTransError) console.warn("Error deleting translations:", deleteTransError); // Log but continue

        // 3. Delete Media (Storage and DB)
        if (mediaItems && mediaItems.length > 0) {
            // 3a. Delete files from Storage
            const filesToRemove = mediaItems.map(item => {
                 try {
                    const url = new URL(item.url);
                    const path = url.pathname.split(`/${MEDIA_BUCKET_NAME}/`)[1];
                    return path;
                 } catch (e) {
                     console.warn("Could not parse URL for storage deletion:", item.url, e);
                     return null;
                 }
            }).filter(path => path != null) as string[];

            if (filesToRemove.length > 0) {
                const { error: storageError } = await supabase.storage
                    .from(MEDIA_BUCKET_NAME)
                    .remove(filesToRemove);
                 if (storageError) console.warn("Error deleting files from storage:", storageError); // Log but continue
            }

            // 3b. Delete media records from DB
            const { error: deleteMediaDbError } = await supabase
                .from('media')
                .delete()
                .eq('listing_id', listingId);
            if (deleteMediaDbError) console.warn("Error deleting media records:", deleteMediaDbError); // Log but continue
        }
        
        // 4. Delete Favorites (if applicable)
        // const { error: deleteFavError } = await supabase
        //     .from('favorites')
        //     .delete()
        //     .eq('listing_id', listingId);
        // if (deleteFavError) console.warn("Error deleting favorites:", deleteFavError);

        // --- Delete Main Listing --- 
        await removeListingRow(); 

        console.log("Listing and related data deleted successfully");
        router.push("/dashboard/listings"); // Redirect after successful deletion

    } catch (error: any) {
      console.error("Error during full listing deletion process:", error);
      // Use the error from the removeListingRow call if possible, or a generic message
      setErrorMessage(`Failed to delete listing: ${error?.message || 'Unknown error'}`);
      // Consider adding a manual refresh button here if redirect fails
    } finally {
         // Reset loading/deleting state if using one
    }
  };
  
  const formatDate = (isoString: string | null | undefined) => {
    if (!isoString) {
      return "N/A";
    }
    try {
      const date = new Date(isoString);
      // Optional: Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      // Format the date as needed, e.g., LocaleString
      return date.toLocaleString(undefined, { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Error";
    }
  };

  if (!loading && !combinedError && !listing) {
       return (
         <Shell>
           <div className="text-center py-10"><AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 text-muted-foreground">Listing not found.</p><Link href="/dashboard/listings" className="btn btn-primary mt-4">Back to Listings</Link></div>
         </Shell>
       );
   }

  let displayListing: DisplayListing | null = null;
  if (listing) {
      const baseListingData = listing as Listing;
      displayListing = { 
          ...baseListingData,
          name_en: translationEn?.name,
          name_ar: translationAr?.name,
          description_en: translationEn?.description,
          description_ar: translationAr?.description,
          opening_hours_en: translationEn?.opening_hours,
          opening_hours_ar: translationAr?.opening_hours,
      };
  }

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
              onClick={() => refreshAll()}
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

        {displayListing && (
          <div className="space-y-6">
            <div className="card">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1">
                  <div className="aspect-video overflow-hidden rounded-lg relative bg-muted">
                    {mediaItems.length > 0 ? (
                      <Image 
                        src={mediaItems[0].url} 
                        alt={displayListing.name_en || 'Listing image'}
                        fill 
                        className="object-cover" 
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="col-span-1 md:col-span-2">
                  <h2 className="text-2xl font-bold mb-2">
                    {displayListing.name_en || '(No English Name)'}
                  </h2>
                  <p className="text-lg text-muted-foreground mb-4 text-right" dir="rtl">
                    {displayListing.name_ar || '(No Arabic Name)'}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {linkedCategories.map((category) => (
                      <span key={category.id} className="badge badge-primary">
                        {category.name_en ?? category.id}
                      </span>
                    ))}
                    <span className={`badge ${displayListing.status === 'Published' ? 'badge-success' : 'badge-warning'}`}>
                      {displayListing.status}
                    </span>
                  </div>
                  
                  <div className="prose max-w-none mb-4">
                    <p>{displayListing.description_en || '(No English description)'}</p>
                  </div>
                  
                  <div className="prose max-w-none mb-4">
                    <p>{displayListing.description_ar || '(No Arabic description)'}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{displayListing.location || "Location not specified"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Details</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex">
                  <dt className="w-24 font-medium text-muted-foreground">
                    <MapPin className="inline-block h-4 w-4 mr-1" /> Location
                  </dt>
                  <dd>{displayListing.location || '-'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 font-medium text-muted-foreground">
                    <Globe className="inline-block h-4 w-4 mr-1" /> Map Link
                  </dt>
                  <dd>{displayListing.google_maps_link ? <a href={displayListing.google_maps_link} target="_blank" rel="noopener noreferrer" className="link">View on Map</a> : '-'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 font-medium text-muted-foreground">
                    <Clock className="inline-block h-4 w-4 mr-1" /> Hours (EN)
                  </dt>
                  <dd>{displayListing.opening_hours_en || '-'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 font-medium text-muted-foreground">
                    <Clock className="inline-block h-4 w-4 mr-1" /> Hours (AR)
                  </dt>
                  <dd>{displayListing.opening_hours_ar || '-'}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 font-medium text-muted-foreground">Created</dt>
                  <dd>{formatDate(displayListing.created_at)}</dd>
                </div>
                <div className="flex">
                  <dt className="w-24 font-medium text-muted-foreground">Updated</dt>
                  <dd>{formatDate(displayListing.updated_at)}</dd>
                </div>
              </dl>
            </div>
            
            {mediaItems.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaItems.map((item, index) => (
                    <div key={index} className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                      <Image 
                        src={item.url} 
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