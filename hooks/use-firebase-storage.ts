import { useState, useCallback } from 'react';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  StorageError,
} from 'firebase/storage';
import { storage, firebaseInitialized } from '@/lib/firebase';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

interface UseFirebaseStorageResult {
  uploadFile: (file: File, path: string) => Promise<string>;
  deleteFile: (path: string) => Promise<void>;
  downloadURL: string | null;
  status: UploadStatus;
  progress: UploadProgress;
  error: StorageError | Error | null;
  resetState: () => void;
}

export function useFirebaseStorage(): UseFirebaseStorageResult {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState<UploadProgress>({ 
    bytesTransferred: 0, 
    totalBytes: 0, 
    percentage: 0 
  });
  const [downloadURL, setDownloadURL] = useState<string | null>(null);
  const [error, setError] = useState<StorageError | Error | null>(null);

  const resetState = useCallback(() => {
    setStatus('idle');
    setProgress({ bytesTransferred: 0, totalBytes: 0, percentage: 0 });
    setDownloadURL(null);
    setError(null);
  }, []);

  const uploadFile = useCallback(async (file: File, path: string): Promise<string> => {
    if (!firebaseInitialized || !storage) {
      const error = new Error('Firebase Storage not initialized');
      setError(error);
      setStatus('error');
      throw error;
    }

    try {
      resetState();
      setStatus('uploading');
      
      // Simplify the path - use listing_images folder
      const uploadPath = `listing_images/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      console.log('Attempting to upload to path:', uploadPath);
      
      const storageRef = ref(storage, uploadPath);
      
      // Add custom metadata
      const metadata = {
        contentType: file.type,
        customMetadata: {
          'uploaded-by': 'admin-cms',
          'original-path': path,
          'timestamp': Date.now().toString()
        }
      };
      
      // Start the upload with metadata
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      
      // Create a promise that resolves with the download URL when complete
      const downloadURLPromise = new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Update progress
            const percentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              percentage
            });
            console.log(`Upload progress: ${percentage.toFixed(2)}%`);
          },
          (error) => {
            // Handle error
            console.error('Upload error:', error);
            setStatus('error');
            setError(error);
            reject(error);
          },
          async () => {
            // Upload completed, get the download URL
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('Upload succeeded, URL:', url);
              setDownloadURL(url);
              setStatus('success');
              resolve(url);
            } catch (error) {
              console.error('Failed to get download URL:', error);
              setStatus('error');
              setError(error as StorageError);
              reject(error);
            }
          }
        );
      });
      
      return downloadURLPromise;
    } catch (error) {
      console.error('Unexpected upload error:', error);
      setStatus('error');
      setError(error as Error);
      throw error;
    }
  }, [resetState]);

  const deleteFile = useCallback(async (path: string): Promise<void> => {
    if (!firebaseInitialized || !storage) {
      const error = new Error('Firebase Storage not initialized');
      setError(error);
      setStatus('error');
      throw error;
    }

    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      resetState();
    } catch (error) {
      setError(error as StorageError);
      setStatus('error');
      throw error;
    }
  }, [resetState]);

  return {
    uploadFile,
    deleteFile,
    downloadURL,
    status,
    progress,
    error,
    resetState
  };
} 