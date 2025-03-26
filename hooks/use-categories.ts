import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  DocumentData,
  Firestore
} from 'firebase/firestore';
import { db as firestoreDB, firebaseInitialized } from '@/lib/firebase';

const db = firestoreDB as Firestore;

export interface Category {
  id: string;
  docId: string;
  name: string;
  displayName?: string;
  order?: number;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      if (!firebaseInitialized || !db) {
        console.error('Firebase not initialized');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Query categories collection ordered by the order field if it exists, otherwise by name_en
        const categoriesQuery = query(
          collection(db, 'categories'),
          orderBy('name_en', 'asc')
        );

        const querySnapshot = await getDocs(categoriesQuery);
        const fetchedCategories: Category[] = [];

        // Process the fetched categories - no default/fallback categories
        if (!querySnapshot.empty) {
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            fetchedCategories.push({
              id: doc.id,
              docId: doc.id,
              name: data.name_en || doc.id,
              displayName: data.name_en || doc.id,
              order: data.order || 999
            });
          });
          
          // Sort categories by order
          fetchedCategories.sort((a, b) => (a.order || 999) - (b.order || 999));
          setCategories(fetchedCategories);
        } else {
          // Remove fallback categories as they should come from Firestore
          setCategories([]);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch categories'));
        
        // Fallback to default categories if there's an error
        const defaultCategories: Category[] = [
          { id: 'museums', docId: 'museums', name: 'Museums', displayName: 'Museums', order: 1 },
          { id: 'historical_sites', docId: 'historical_sites', name: 'Historical Sites', displayName: 'Historical Sites', order: 2 },
          { id: 'parks_nature', docId: 'parks_nature', name: 'Parks & Nature', displayName: 'Parks & Nature', order: 3 },
          { id: 'religious_sites', docId: 'religious_sites', name: 'Religious Sites', displayName: 'Religious Sites', order: 4 },
          { id: 'shopping', docId: 'shopping', name: 'Shopping', displayName: 'Shopping', order: 5 },
          { id: 'restaurants', docId: 'restaurants', name: 'Restaurants', displayName: 'Restaurants', order: 6 },
          { id: 'experiences', docId: 'experiences', name: 'Experiences', displayName: 'Experiences', order: 7 }
        ];
        
        setCategories(defaultCategories);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  return { categories, loading, error };
} 