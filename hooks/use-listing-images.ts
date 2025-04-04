import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import type { PostgrestError } from '@supabase/supabase-js';

// Interface based on assumed 'media' table structure
export interface ListingMedia {
  id?: string; // Supabase returns string UUIDs
  listing_id: string;
  url: string;
  file_path?: string | null; // Path within the bucket (NEW)
  is_primary?: boolean; // NEW
  order_index?: number; // NEW
  description?: string | null; // Optional description
  media_type?: string; // Optional: e.g., 'image', 'video'
  created_at?: string; // Supabase returns ISO string timestamps
}

// Result type using Supabase types
interface UseListingMediaResult {
  media: ListingMedia[];
  loading: boolean;
  error: PostgrestError | Error | null; // Can be Postgrest or other errors
  addMedia: (mediaData: Omit<ListingMedia, 'id' | 'created_at'>) => Promise<string | null>;
  updateMedia: (id: string, mediaData: Partial<Omit<ListingMedia, 'id' | 'listing_id' | 'created_at'>>) => Promise<void>;
  deleteMedia: (id: string) => Promise<void>;
  setPrimaryMedia: (id: string) => Promise<void>;
  fetchMedia: (listingId: string) => Promise<void>;
}

export const STORAGE_BUCKET_NAME = 'listing-media'; // <<<--- CHANGE THIS if your bucket name is different

/**
 * Hook to manage media items (images/videos) for a specific listing in Supabase.
 */
export function useListingMedia(listingId?: string): UseListingMediaResult {
  const { supabase } = useAuth(); // Get Supabase client
  const [media, setMedia] = useState<ListingMedia[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<PostgrestError | Error | null>(null);

  const fetchMedia = useCallback(async (fetchListingId: string) => {
    if (!supabase) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('media')
        .select('*')
        .eq('listing_id', fetchListingId)
        .order('is_primary', { ascending: false }) // Primary first
        .order('order_index', { ascending: true, nullsFirst: false }) // Then by order_index
        .order('created_at', { ascending: true }); // Finally by creation time

      if (fetchError) throw fetchError;

      setMedia(data || []);
    } catch (err: any) {
      console.error('Error fetching listing media:', err);
      setError(err as PostgrestError | Error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Initial fetch if listingId is provided
  useEffect(() => {
    if (listingId && supabase) {
      fetchMedia(listingId);
    }
    // Clear media if listingId changes or supabase becomes unavailable
    if (!listingId || !supabase) {
        setMedia([]);
    }
  }, [listingId, supabase, fetchMedia]);

  // Helper to ensure only one primary media item per listing
  const ensureSinglePrimary = async (listingId: string, currentPrimaryId?: string) => {
    if (!supabase) return;
    const { error: updateError } = await supabase
        .from('media')
        .update({ is_primary: false })
        .eq('listing_id', listingId)
        .neq('id', currentPrimaryId || '00000000-0000-0000-0000-000000000000'); // Exclude the one being set (if any)

    if (updateError) {
        console.error("Error ensuring single primary media:", updateError);
        throw updateError;
    }
  };

  const addMedia = useCallback(async (mediaData: Omit<ListingMedia, 'id' | 'created_at'>) => {
    if (!supabase) return null;
    setLoading(true);
    setError(null);

    try {
      // Ensure only one primary if this one is set to primary
      if (mediaData.is_primary) {
        await ensureSinglePrimary(mediaData.listing_id);
      }
       // If it's the first media item, make it primary (optional - depends on desired UX)
      // We might rely on the UI calling setPrimaryMedia instead for clearer control.
      // if (media.length === 0) {
      //   mediaData.is_primary = true;
      // }

      // created_at is handled by DB default
      const { data: insertedData, error: insertError } = await supabase
        .from('media')
        .insert(mediaData)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchMedia(mediaData.listing_id); // Refresh the list
      return insertedData?.id || null;

    } catch (err: any) {
      console.error('Error adding media:', err);
      setError(err as PostgrestError | Error);
      setLoading(false);
      return null;
    }
  }, [supabase, fetchMedia]); // Removed media dependency to avoid potential stale state issues

  const updateMedia = useCallback(async (id: string, mediaData: Partial<Omit<ListingMedia, 'id' | 'listing_id' | 'created_at'>>) => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      // Find the listing_id for the item being updated
      const currentItem = media.find(m => m.id === id);
      if (!currentItem) throw new Error('Media item not found in current state');

      // Ensure only one primary if this one is being set to primary
      if (mediaData.is_primary) {
        await ensureSinglePrimary(currentItem.listing_id, id);
      }

      // updated_at should be handled by DB trigger/default
      const { error: updateError } = await supabase
        .from('media')
        .update(mediaData)
        .eq('id', id);

      if (updateError) throw updateError;

      await fetchMedia(currentItem.listing_id); // Refresh the list
    } catch (err: any) {
      console.error('Error updating media:', err);
      setError(err as PostgrestError | Error);
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchMedia, media]); // Added media dependency to find listing_id

  const deleteMedia = useCallback(async (id: string) => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    // Find the item to get URL and listing_id before deleting from DB
    const itemToDelete = media.find(m => m.id === id);
    if (!itemToDelete) {
      setError(new Error('Media item not found to delete.'));
      setLoading(false);
      return;
    }
    const listingIdToDeleteFrom = itemToDelete.listing_id;

    try {
      // 1. Delete DB record
      const { error: deleteDbError } = await supabase
        .from('media')
        .delete()
        .eq('id', id);

      if (deleteDbError) throw deleteDbError;

      // 2. Delete file from Storage
      try {
        // Extract path from Supabase URL (adjust if your URLs differ)
        // Example URL: https://<project_ref>.supabase.co/storage/v1/object/public/listing-media/listing_uuid/image.jpg
        const url = new URL(itemToDelete.url);
        // Path becomes: listing_uuid/image.jpg (after bucket name)
        const pathToRemove = url.pathname.split(`/${STORAGE_BUCKET_NAME}/`)[1];
        if (pathToRemove) {
          const { error: deleteStorageError } = await supabase
            .storage
            .from(STORAGE_BUCKET_NAME)
            .remove([pathToRemove]);
          if (deleteStorageError) {
            console.warn('Failed to delete file from storage:', deleteStorageError);
            // Optionally set a non-critical error state here
          }
        } else {
             console.warn('Could not extract path from URL to delete from storage:', itemToDelete.url);
        }
      } catch (storageErr) {
        console.warn('Error processing storage deletion:', storageErr);
         // Non-critical, continue after DB delete attempt
      }

      // 3. Check if primary was deleted and update if necessary
      const remainingMedia = media.filter(m => m.id !== id);
      if (itemToDelete.is_primary && remainingMedia.length > 0) {
          const nextPrimary = remainingMedia.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))[0]; // Pick first by order_index
          if (nextPrimary?.id) {
              const { error: updatePrimaryError } = await supabase
                .from('media')
                .update({ is_primary: true })
                .eq('id', nextPrimary.id);
              if (updatePrimaryError) {
                  console.warn('Failed to set new primary image after deletion:', updatePrimaryError);
              }
          }
      }

      await fetchMedia(listingIdToDeleteFrom); // Refresh the list

    } catch (err: any) {
      console.error('Error deleting media:', err);
      setError(err as PostgrestError | Error);
       setLoading(false);
    }
  }, [supabase, fetchMedia, media]);

  const setPrimaryMedia = useCallback(async (id: string) => {
      if (!id) return;
      // Update using the main update function which handles ensuring single primary
      await updateMedia(id, { is_primary: true });
  }, [updateMedia]);

  return {
    media,
    loading,
    error,
    addMedia,
    updateMedia,
    deleteMedia,
    setPrimaryMedia,
    fetchMedia,
  };
} 