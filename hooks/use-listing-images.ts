import { useState, useCallback, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc,
  Timestamp,
  DocumentData,
  FirestoreError,
  Firestore
} from 'firebase/firestore';
import { db as firestoreDB, firebaseInitialized } from '@/lib/firebase';
import { useFirebaseStorage } from './use-firebase-storage';

// Set proper type for the variable to avoid TS errors
const db = firestoreDB as Firestore;

export interface ListingImage {
  id?: string;
  image_url: string;
  listing_id: string;
  caption_en: string;
  caption_ar: string;
  is_primary: boolean;
  created_at?: Timestamp;
}

interface UseListingImagesResult {
  images: ListingImage[];
  loading: boolean;
  error: FirestoreError | null;
  addImage: (imageData: Omit<ListingImage, 'id' | 'created_at'>) => Promise<string | null>;
  updateImage: (id: string, imageData: Partial<ListingImage>) => Promise<void>;
  deleteImage: (id: string) => Promise<void>;
  setPrimaryImage: (id: string) => Promise<void>;
  fetchImages: (listingId: string) => Promise<void>;
}

export function useListingImages(listingId?: string): UseListingImagesResult {
  const [images, setImages] = useState<ListingImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);
  const { deleteFile } = useFirebaseStorage();

  const fetchImages = useCallback(async (fetchListingId: string) => {
    if (!firebaseInitialized || !db) {
      console.error('Firestore not initialized');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'listing_images'),
        where('listing_id', '==', fetchListingId)
      );

      const querySnapshot = await getDocs(q);
      const fetchedImages: ListingImage[] = [];

      querySnapshot.forEach((doc) => {
        fetchedImages.push({
          id: doc.id,
          ...doc.data() as Omit<ListingImage, 'id'>
        });
      });

      // Sort images so primary is first
      fetchedImages.sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return 0;
      });

      setImages(fetchedImages);
    } catch (err) {
      console.error('Error fetching listing images:', err);
      setError(err as FirestoreError);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch if listingId is provided
  useEffect(() => {
    if (listingId) {
      fetchImages(listingId);
    }
  }, [listingId, fetchImages]);

  const addImage = useCallback(async (imageData: Omit<ListingImage, 'id' | 'created_at'>) => {
    if (!firebaseInitialized || !db) {
      console.error('Firestore not initialized');
      return null;
    }

    try {
      // If this is the first image or is_primary is true, 
      // ensure no other images are primary
      if (imageData.is_primary && images.length > 0) {
        await Promise.all(
          images
            .filter(img => img.is_primary && img.id)
            .map(img => updateDoc(doc(db, 'listing_images', img.id!), { is_primary: false }))
        );
      }

      // If this is the first image, make it primary
      if (images.length === 0) {
        imageData.is_primary = true;
      }

      const docRef = await addDoc(collection(db, 'listing_images'), {
        ...imageData,
        created_at: Timestamp.now()
      });

      const newImage: ListingImage = {
        id: docRef.id,
        ...imageData,
        created_at: Timestamp.now()
      };

      setImages(prev => {
        // If new image is primary, make sure others are not
        if (newImage.is_primary) {
          return [newImage, ...prev.map(img => ({ ...img, is_primary: false }))];
        }
        return [...prev, newImage];
      });

      return docRef.id;
    } catch (err) {
      console.error('Error adding image:', err);
      setError(err as FirestoreError);
      return null;
    }
  }, [images]);

  const updateImage = useCallback(async (id: string, imageData: Partial<ListingImage>) => {
    if (!firebaseInitialized || !db) {
      console.error('Firestore not initialized');
      return;
    }

    try {
      // If updating to primary, ensure no other images are primary
      if (imageData.is_primary) {
        await Promise.all(
          images
            .filter(img => img.is_primary && img.id !== id && img.id)
            .map(img => updateDoc(doc(db, 'listing_images', img.id!), { is_primary: false }))
        );
      }

      const docRef = doc(db, 'listing_images', id);
      await updateDoc(docRef, imageData);

      setImages(prev => {
        const updatedImages = prev.map(img => {
          if (img.id === id) {
            return { ...img, ...imageData };
          }
          // If setting a new primary, make sure others are not primary
          if (imageData.is_primary && img.id !== id) {
            return { ...img, is_primary: false };
          }
          return img;
        });

        // Sort images so primary is first
        updatedImages.sort((a, b) => {
          if (a.is_primary && !b.is_primary) return -1;
          if (!a.is_primary && b.is_primary) return 1;
          return 0;
        });

        return updatedImages;
      });
    } catch (err) {
      console.error('Error updating image:', err);
      setError(err as FirestoreError);
    }
  }, [images]);

  const deleteImage = useCallback(async (id: string) => {
    if (!firebaseInitialized || !db) {
      console.error('Firestore not initialized');
      return;
    }

    try {
      // Get the image before deleting to check if it's primary
      const imageToDelete = images.find(img => img.id === id);
      if (!imageToDelete) {
        console.error('Image not found');
        return;
      }

      // Delete from Firestore
      const docRef = doc(db, 'listing_images', id);
      await deleteDoc(docRef);

      // Try to delete the file from Storage if we can parse the URL
      try {
        // Extract the path from the image URL
        const url = new URL(imageToDelete.image_url);
        const pathMatch = url.pathname.match(/\/o\/(.+?)(?:\?|$)/);
        if (pathMatch && pathMatch[1]) {
          const path = decodeURIComponent(pathMatch[1]);
          await deleteFile(path);
        }
      } catch (storageErr) {
        console.error('Could not delete file from storage:', storageErr);
        // Continue even if storage delete fails
      }

      // Update local state
      const updatedImages = images.filter(img => img.id !== id);
      
      // If we deleted the primary image and there are other images,
      // make the first remaining image primary
      if (imageToDelete.is_primary && updatedImages.length > 0) {
        const newPrimaryId = updatedImages[0].id!;
        await updateDoc(doc(db, 'listing_images', newPrimaryId), { is_primary: true });
        updatedImages[0].is_primary = true;
      }

      setImages(updatedImages);
    } catch (err) {
      console.error('Error deleting image:', err);
      setError(err as FirestoreError);
    }
  }, [db, deleteFile, images]);

  const setPrimaryImage = useCallback(async (id: string) => {
    await updateImage(id, { is_primary: true });
  }, [updateImage]);

  return {
    images,
    loading,
    error,
    addImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    fetchImages
  };
} 