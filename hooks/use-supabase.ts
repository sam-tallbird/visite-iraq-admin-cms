import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/providers/auth-provider'; // Import useAuth to get Supabase client
import type { PostgrestError } from '@supabase/supabase-js';

// Define generic type for Supabase data rows
type SupabaseData = Record<string, any>;

// Simpler status type for Supabase
export type SupabaseStatus = 'idle' | 'loading' | 'success' | 'error';

// Timeout constant (e.g., 8 seconds)
const QUERY_TIMEOUT_MS = 8000;

// Define a type for our custom timeout error
type TimeoutError = {
    name: 'TimeoutError';
    message: string;
    details: string;
    hint: string;
    code: string;
};

interface UseSupabaseOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: PostgrestError | TimeoutError) => void; // Allow either error type
}

interface UseSupabaseTableResult {
  data: SupabaseData[] | null;
  status: SupabaseStatus;
  error: PostgrestError | TimeoutError | null; // Allow either error type
  refresh: () => Promise<void>;
  add: (data: SupabaseData) => Promise<SupabaseData | null>;
  update: (id: string | number, data: SupabaseData) => Promise<void>;
  remove: (id: string | number) => Promise<void>;
}

/**
 * Hook for interacting with a Supabase table (collection equivalent).
 * Fetches all data from the table by default.
 * Does not yet support complex queries or real-time subscriptions.
 */
export function useSupabaseTable(
  tableName: string,
  options: UseSupabaseOptions = {}
): UseSupabaseTableResult {
  const { supabase } = useAuth(); // Get supabase client from context
  const [data, setData] = useState<SupabaseData[] | null>(null);
  const [status, setStatus] = useState<SupabaseStatus>('idle');
  const [error, setError] = useState<PostgrestError | TimeoutError | null>(null); // Update state type
  const shouldFetchOnMount = useRef(true);

  const refresh = useCallback(async () => {
    console.log(`[useSupabaseTable:${tableName}] refresh: START`);
    if (!supabase) {
        console.warn(`[useSupabaseTable:${tableName}] refresh: Supabase client not available yet. Setting status to IDLE.`);
        setStatus('idle'); // Explicitly set status if client not ready
        setData(null);    // Clear data if client not ready
        setError(null);
        return;
    }

    console.log(`[useSupabaseTable:${tableName}] refresh: Setting status to LOADING`);
    setStatus('loading');
    setError(null);

    try {
      console.log(`[useSupabaseTable:${tableName}] refresh: Calling supabase.from(${tableName}).select('*') with ${QUERY_TIMEOUT_MS}ms timeout`);
      
      // Create the query promise
      const queryPromise = supabase
        .from(tableName)
        .select('*');

      // Create the timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Query for table ${tableName} timed out after ${QUERY_TIMEOUT_MS}ms`)), QUERY_TIMEOUT_MS)
      );

      // Race the query against the timeout
      // Cast the result because Promise.race loses specific type info
      const result = await Promise.race([queryPromise, timeoutPromise]) as {
        data: SupabaseData[] | null;
        error: PostgrestError | null;
      };

      // Check for Supabase error after race completes
      if (result.error) throw result.error;

      setData(result.data || []);
      setStatus('success');
      console.log(`[useSupabaseTable:${tableName}] refresh: Fetch SUCCESS`);
      if (options.onSuccess) {
        options.onSuccess(result.data || []);
      }
    } catch (err: any) {
      // Check if it's our timeout error or a Supabase error
      if (err.message.includes('timed out')) {
          console.error(`[useSupabaseTable:${tableName}] refresh: Fetch TIMEOUT`, err);
      } else {
          console.error(`[useSupabaseTable:${tableName}] refresh: Fetch ERROR`, err);
      }
      // Ensure we always treat it as an error
      setStatus('error');
      // Store the error (could be PostgrestError or our custom timeout Error)
      // Create a correctly typed error object
      const errorToSet: PostgrestError | TimeoutError = err.message.includes('timed out') ? {
          name: 'TimeoutError', // Add name property
          message: err.message,
          details: err.stack || `Timeout occurred after ${QUERY_TIMEOUT_MS}ms`,
          hint: 'Query took too long',
          code: 'TIMEOUT'
      } : err as PostgrestError; // Assume it's PostgrestError otherwise
      
      setError(errorToSet);
      
      if (options.onError) {
        options.onError(errorToSet);
      }
    }
  }, [tableName, supabase]);

  const add = useCallback(async (insertData: SupabaseData) => {
    if (!supabase) return null; // Or throw error?
    setStatus('loading');
    setError(null);
    try {
      // Timestamps (created_at, updated_at) should be handled by DB defaults
      const { data: insertedData, error: insertError } = await supabase
        .from(tableName)
        .insert(insertData)
        .select() // Return the inserted row
        .single(); // Expecting a single row back

      if (insertError) throw insertError;

      await refresh(); // Refresh the list after adding
      setStatus('success');
      if (options.onSuccess) {
         options.onSuccess(insertedData); // Callback with the inserted item
      }
      return insertedData;
    } catch (err: any) {
      console.error(`Supabase error adding to table ${tableName}:`, err);
      const pgError = err as PostgrestError;
      setStatus('error');
      setError(pgError);
      if (options.onError) {
        options.onError(pgError);
      }
      return null;
    }
  }, [tableName, refresh, supabase]);

  const update = useCallback(async (id: string | number, updateData: SupabaseData) => {
     if (!supabase) return;
     setStatus('loading');
     setError(null);
    try {
      // updated_at should be handled by DB default/trigger
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id); // Assuming 'id' is the primary key

      if (updateError) throw updateError;

      await refresh(); // Refresh the list after updating
      setStatus('success');
       if (options.onSuccess) {
         // What data to pass here? Maybe just call refresh?
         options.onSuccess({ id, ...updateData });
      }
    } catch (err: any) {
      console.error(`Supabase error updating table ${tableName} ID ${id}:`, err);
      const pgError = err as PostgrestError;
      setStatus('error');
      setError(pgError);
      if (options.onError) {
        options.onError(pgError);
      }
    }
  }, [tableName, refresh, supabase]);

  const remove = useCallback(async (id: string | number) => {
    if (!supabase) return;
    setStatus('loading');
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id); // Assuming 'id' is the primary key

      if (deleteError) throw deleteError;

      await refresh(); // Refresh the list after deleting
      setStatus('success');
       if (options.onSuccess) {
         // Provide some indication of success
         options.onSuccess({ id });
      }
    } catch (err: any) {
      console.error(`Supabase error removing from table ${tableName} ID ${id}:`, err);
      const pgError = err as PostgrestError;
      setStatus('error');
      setError(pgError);
      if (options.onError) {
        options.onError(pgError);
      }
    }
  }, [tableName, refresh, supabase]);

  // Fetch data on initial mount
  useEffect(() => {
    if (shouldFetchOnMount.current && supabase) {
      refresh();
      shouldFetchOnMount.current = false;
    }
  }, [refresh, supabase]); // Depend on refresh and supabase client availability

  return {
    data,
    status,
    error,
    refresh,
    add,
    update,
    remove,
  };
}

// --- Document Hook (Simplified - Fetches single record by ID) ---

interface UseSupabaseRowResult {
  data: SupabaseData | null;
  status: SupabaseStatus;
  error: PostgrestError | TimeoutError | null; // Allow either error type
  refresh: () => Promise<void>;
  update: (data: SupabaseData) => Promise<void>;
  remove: () => Promise<void>;
}

/**
 * Hook for interacting with a single row in a Supabase table.
 */
export function useSupabaseRow(
  tableName: string,
  rowId: string | number | null | undefined,
  options: UseSupabaseOptions = {}
): UseSupabaseRowResult {
  const { supabase } = useAuth();
  const [data, setData] = useState<SupabaseData | null>(null);
  const [status, setStatus] = useState<SupabaseStatus>('idle');
  const [error, setError] = useState<PostgrestError | TimeoutError | null>(null); // Update state type
  const shouldFetchOnMount = useRef(true);

  const refresh = useCallback(async () => {
    console.log(`[useSupabaseRow:${tableName}:${rowId}] refresh: START`);
    if (!rowId || !supabase) {
      setStatus(rowId ? 'idle' : 'error'); // Error if ID missing, idle if supabase missing
      if (!rowId) {
          // Create an error object that conforms to PostgrestError structure
          const missingIdError: PostgrestError = {
              name: 'CustomHookError',
              message: 'Row ID is required',
              details: 'Cannot fetch row without an ID.',
              hint: 'Ensure a valid rowId is passed to useSupabaseRow.',
              code: 'HOOK_ID_MISSING'
          };
          setError(missingIdError);
      }
      return;
    }

    console.log(`[useSupabaseRow:${tableName}:${rowId}] refresh: Setting status to LOADING`);
    setStatus('loading');
    setError(null);
    try {
      console.log(`[useSupabaseRow:${tableName}:${rowId}] refresh: Calling select() with ${QUERY_TIMEOUT_MS}ms timeout`);

      // Create the query promise
      const queryPromise = supabase
        .from(tableName)
        .select('*')
        .eq('id', rowId)
        .maybeSingle();

      // Create the timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Query for row ${tableName}:${rowId} timed out after ${QUERY_TIMEOUT_MS}ms`)), QUERY_TIMEOUT_MS)
      );

      // Race the query against the timeout
      // Cast the result
      const result = await Promise.race([queryPromise, timeoutPromise]) as {
        data: SupabaseData | null;
        error: PostgrestError | null;
      };

      // Check for Supabase error after race completes
      if (result.error) throw result.error;

      setData(result.data);
      setStatus('success');
       console.log(`[useSupabaseRow:${tableName}:${rowId}] refresh: Fetch SUCCESS`);
      if (options.onSuccess) {
        options.onSuccess(result.data);
      }
    } catch (err: any) {
       // Check if it's our timeout error or a Supabase error
      if (err.message.includes('timed out')) {
          console.error(`[useSupabaseRow:${tableName}:${rowId}] refresh: Fetch TIMEOUT`, err);
      } else {
          console.error(`[useSupabaseRow:${tableName}:${rowId}] refresh: Fetch ERROR`, err);
      }
      // Ensure we always treat it as an error
      setStatus('error');
      // Store the error
       const errorToSet: PostgrestError | TimeoutError = err.message.includes('timed out') ? {
          name: 'TimeoutError',
          message: err.message,
          details: err.stack || `Timeout occurred after ${QUERY_TIMEOUT_MS}ms`,
          hint: 'Query took too long',
          code: 'TIMEOUT'
      } : err as PostgrestError;
      
      setError(errorToSet);
      
      if (options.onError) {
        options.onError(errorToSet);
      }
    }
  }, [tableName, rowId, supabase]);

  const update = useCallback(async (updateData: SupabaseData) => {
    if (!rowId || !supabase) return;
    setStatus('loading');
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', rowId);

      if (updateError) throw updateError;

      await refresh(); // Refresh the data after updating
      setStatus('success');
      if (options.onSuccess) {
         options.onSuccess({ id: rowId, ...updateData });
      }
    } catch (err: any) {
      console.error(`Supabase error updating row ${tableName} ID ${rowId}:`, err);
       const pgError = err as PostgrestError;
      setStatus('error');
      setError(pgError);
      if (options.onError) {
        options.onError(pgError);
      }
    }
  }, [tableName, rowId, refresh, supabase]);

  const remove = useCallback(async () => {
     if (!rowId || !supabase) return;
     setStatus('loading');
     setError(null);
    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', rowId);

      if (deleteError) throw deleteError;

      // Don't refresh, set data to null as it's gone
      setData(null);
      setStatus('success');
      if (options.onSuccess) {
         options.onSuccess({ id: rowId }); // Indicate success
      }
    } catch (err: any) {
      console.error(`Supabase error removing row ${tableName} ID ${rowId}:`, err);
       const pgError = err as PostgrestError;
      setStatus('error');
      setError(pgError);
      if (options.onError) {
        options.onError(pgError);
      }
    }
  }, [tableName, rowId, refresh, supabase]);

  // Fetch data on initial mount or when rowId changes
  useEffect(() => {
    if (shouldFetchOnMount.current && rowId && supabase) {
      refresh();
      shouldFetchOnMount.current = false;
    }
    // Refetch if rowId changes after mount
    if (!shouldFetchOnMount.current && rowId && supabase) {
        refresh();
    }
  }, [refresh, rowId, supabase]);

  return {
    data,
    status,
    error,
    refresh,
    update,
    remove,
  };
} 