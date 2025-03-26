import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  DocumentData, 
  FirestoreError, 
  QueryConstraint,
  Timestamp,
  Firestore
} from 'firebase/firestore';
import { 
  db as firestoreDB, 
  firebaseInitialized, 
  connectionError 
} from '@/lib/firebase';

export type FirestoreStatus = 'idle' | 'loading' | 'success' | 'error' | 'connection-error';

interface UseFirestoreOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: FirestoreError) => void;
}

interface UseFirestoreCollectionResult {
  data: DocumentData[];
  status: FirestoreStatus;
  error: FirestoreError | null;
  refresh: () => Promise<void>;
  add: (data: DocumentData) => Promise<string | null>;
  update: (id: string, data: DocumentData) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

// Set proper type for the variable to avoid TS errors
const typedFirestoreDB: Firestore | null = firestoreDB as Firestore | null;

export function useFirestoreCollection(
  collectionPath: string,
  constraints: QueryConstraint[] = [],
  options: UseFirestoreOptions = {}
): UseFirestoreCollectionResult {
  const [data, setData] = useState<DocumentData[]>([]);
  const [status, setStatus] = useState<FirestoreStatus>('idle');
  const [error, setError] = useState<FirestoreError | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  // Use a ref to track if we should fetch on mount
  const shouldFetchOnMount = useRef(true);
  
  // Check Firebase connection first
  useEffect(() => {
    if (!firebaseInitialized) {
      setStatus('connection-error');
      setError(connectionError as FirestoreError);
      
      if (options.onError && connectionError) {
        options.onError(connectionError as FirestoreError);
      }
    }
  }, [options]);

  const refresh = useCallback(async () => {
    // Skip if Firebase is not initialized
    if (!firebaseInitialized || !typedFirestoreDB) {
      setStatus('connection-error');
      const connError = connectionError || new Error("Firebase not initialized");
      setError(connError as FirestoreError);
      
      if (options.onError) {
        options.onError(connError as FirestoreError);
      }
      return;
    }
    
    setStatus('loading');
    setAttemptCount(prev => prev + 1);
    
    try {
      const collectionRef = collection(typedFirestoreDB, collectionPath);
      const q = constraints.length > 0 
        ? query(collectionRef, ...constraints) 
        : query(collectionRef);
      
      const querySnapshot = await getDocs(q);
      const results: DocumentData[] = [];
      
      querySnapshot.forEach((doc) => {
        results.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setData(results);
      setStatus('success');
      
      if (options.onSuccess) {
        options.onSuccess(results);
      }
    } catch (error) {
      console.error(`Firestore error (attempt ${attemptCount}):`, error);
      setStatus('error');
      setError(error as FirestoreError);
      
      if (options.onError) {
        options.onError(error as FirestoreError);
      }
    }
  }, [collectionPath, constraints, options, attemptCount, typedFirestoreDB]);

  const add = useCallback(async (data: DocumentData) => {
    if (!typedFirestoreDB) {
      const error = new Error("Firebase not initialized") as FirestoreError;
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
      return null;
    }
    
    try {
      const collectionRef = collection(typedFirestoreDB, collectionPath);
      
      // Add timestamps
      const dataWithTimestamps = {
        ...data,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };
      
      const docRef = await addDoc(collectionRef, dataWithTimestamps);
      await refresh();
      return docRef.id;
    } catch (error) {
      setError(error as FirestoreError);
      
      if (options.onError) {
        options.onError(error as FirestoreError);
      }
      return null;
    }
  }, [collectionPath, options, refresh, typedFirestoreDB]);

  const update = useCallback(async (id: string, data: DocumentData) => {
    if (!typedFirestoreDB) {
      const error = new Error("Firebase not initialized") as FirestoreError;
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
      return;
    }
    
    try {
      const docRef = doc(typedFirestoreDB, collectionPath, id);
      
      // Add updated timestamp
      const dataWithTimestamp = {
        ...data,
        updated_at: Timestamp.now()
      };
      
      await updateDoc(docRef, dataWithTimestamp);
      await refresh();
    } catch (error) {
      setError(error as FirestoreError);
      
      if (options.onError) {
        options.onError(error as FirestoreError);
      }
    }
  }, [collectionPath, options, refresh, typedFirestoreDB]);

  const remove = useCallback(async (id: string) => {
    if (!typedFirestoreDB) {
      const error = new Error("Firebase not initialized") as FirestoreError;
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
      return;
    }
    
    try {
      const docRef = doc(typedFirestoreDB, collectionPath, id);
      await deleteDoc(docRef);
      await refresh();
    } catch (error) {
      setError(error as FirestoreError);
      
      if (options.onError) {
        options.onError(error as FirestoreError);
      }
    }
  }, [collectionPath, options, refresh, typedFirestoreDB]);

  // Use useEffect with a ref to control initial fetch and avoid dependency on refresh
  useEffect(() => {
    // Only fetch on initial mount and if Firebase is initialized
    if (shouldFetchOnMount.current && firebaseInitialized) {
      refresh();
      shouldFetchOnMount.current = false; // Prevent fetching again on re-renders
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath, constraints]); // Deliberately omit refresh to avoid infinite loops

  return {
    data,
    status,
    error,
    refresh,
    add,
    update,
    remove
  };
}

interface UseFirestoreDocumentResult {
  data: DocumentData | null;
  status: FirestoreStatus;
  error: FirestoreError | null;
  refresh: () => Promise<void>;
  update: (data: DocumentData) => Promise<void>;
  remove: () => Promise<void>;
}

export function useFirestoreDocument(
  collectionPath: string,
  documentId: string,
  options: UseFirestoreOptions = {}
): UseFirestoreDocumentResult {
  const [data, setData] = useState<DocumentData | null>(null);
  const [status, setStatus] = useState<FirestoreStatus>('idle');
  const [error, setError] = useState<FirestoreError | null>(null);
  // Use a ref to track if we should fetch on mount
  const shouldFetchOnMount = useRef(true);

  const refresh = useCallback(async () => {
    if (!documentId || !typedFirestoreDB) {
      setStatus('connection-error');
      const connError = connectionError || new Error("Firebase not initialized or document ID missing");
      setError(connError as FirestoreError);
      
      if (options.onError) {
        options.onError(connError as FirestoreError);
      }
      return;
    }
    
    setStatus('loading');
    
    try {
      const docRef = doc(typedFirestoreDB, collectionPath, documentId);
      const docSnapshot = await getDoc(docRef);
      
      if (docSnapshot.exists()) {
        const result = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        };
        
        setData(result);
        setStatus('success');
        
        if (options.onSuccess) {
          options.onSuccess(result);
        }
      } else {
        setData(null);
        setStatus('success');
        
        if (options.onSuccess) {
          options.onSuccess(null);
        }
      }
    } catch (error) {
      setStatus('error');
      setError(error as FirestoreError);
      
      if (options.onError) {
        options.onError(error as FirestoreError);
      }
    }
  }, [collectionPath, documentId, options, typedFirestoreDB]);

  const update = useCallback(async (data: DocumentData) => {
    if (!documentId || !typedFirestoreDB) {
      const error = new Error("Firebase not initialized or document ID missing") as FirestoreError;
      setError(error);
      
      if (options.onError) {
        options.onError(error);
      }
      return;
    }
    
    try {
      const docRef = doc(typedFirestoreDB, collectionPath, documentId);
      
      // Add updated timestamp
      const dataWithTimestamp = {
        ...data,
        updated_at: Timestamp.now()
      };
      
      await updateDoc(docRef, dataWithTimestamp);
      await refresh();
    } catch (error) {
      setError(error as FirestoreError);
      
      if (options.onError) {
        options.onError(error as FirestoreError);
      }
    }
  }, [collectionPath, documentId, options, refresh, typedFirestoreDB]);

  const remove = useCallback(async () => {
    if (!documentId || !typedFirestoreDB) {
      const error = new Error("Firebase not initialized or document ID missing") as FirestoreError;
      setError(error);
      
      if (options.onError) {
        options.onError(error);
      }
      return;
    }
    
    try {
      const docRef = doc(typedFirestoreDB, collectionPath, documentId);
      await deleteDoc(docRef);
      setData(null);
      
      if (options.onSuccess) {
        options.onSuccess(null);
      }
    } catch (error) {
      setError(error as FirestoreError);
      
      if (options.onError) {
        options.onError(error as FirestoreError);
      }
    }
  }, [collectionPath, documentId, options, typedFirestoreDB]);

  // Use useEffect with a ref to control initial fetch
  useEffect(() => {
    // Only fetch on initial mount and if Firebase is initialized
    if (shouldFetchOnMount.current && firebaseInitialized && documentId) {
      refresh();
      shouldFetchOnMount.current = false; // Prevent fetching again on re-renders
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionPath, documentId]); // Deliberately omit refresh to avoid infinite loops

  return {
    data,
    status,
    error,
    refresh,
    update,
    remove
  };
} 