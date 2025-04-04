import { useState, useEffect } from 'react';
import { useSupabaseTable, SupabaseStatus } from './use-supabase'; // Use the refactored Supabase hook
import type { PostgrestError } from '@supabase/supabase-js';

// Interface matching the 'categories' and 'category_translations' tables
// We'll need to join these in the component or fetch translations separately for now
export interface Category {
  id: string; // From categories table (UUID)
  created_at?: string;
  updated_at?: string;
  // Fields from category_translations (will need fetching/joining)
  name?: string; // e.g., from translation in default language
  description?: string;
  icon_url?: string;
  slug?: string;
  // How to handle order? Assuming it's on the main categories table if needed
  order?: number;
}

// Define the result type
interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: PostgrestError | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch category data from Supabase.
 * Currently fetches from the main 'categories' table.
 * Does NOT yet handle fetching related translations.
 */
export function useCategories(): UseCategoriesResult {
  // Use the Supabase table hook to fetch from the 'categories' table
  const { 
    data,
    status,
    error,
    refresh
  } = useSupabaseTable('categories'); // Specify the table name

  // Adapt the status to a simple boolean loading state
  const loading = status === 'loading';

  // The data returned by useSupabaseTable is generic SupabaseData[]
  // We cast it to Category[] here, assuming the structure matches.
  // TODO: Implement proper fetching/joining of category_translations
  const categories = (data as Category[] | null) || [];

  // Example of how you might sort if needed (assuming an 'order' column exists)
  // useEffect(() => {
  //   if (categories) {
  //     categories.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  //   }
  // }, [categories]);

  return { 
    categories, 
    loading, 
    error, // Pass through the error from useSupabaseTable
    refresh // Pass through the refresh function
  };
} 