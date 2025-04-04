import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { Upload, X, AlertCircle, ImageIcon, Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

// Simplified status for overall multi-upload state
type MultiUploadStatus = 'idle' | 'uploading' | 'partial_error' | 'error' | 'success';

interface ImageUploadProps {
  onImageUploaded: (imageData: { url: string; filePath: string } | null) => void;
  storagePathPrefix: string;
  bucketName: string;
  className?: string;
}

export function ImageUpload({
  onImageUploaded,
  storagePathPrefix,
  bucketName,
  className = '',
}: ImageUploadProps) {
  const { supabase } = useAuth();
  const [status, setStatus] = useState<MultiUploadStatus>('idle');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const resetState = () => {
    setStatus('idle');
    setUploadingCount(0);
    setUploadErrors([]);
  };

  const uploadFile = async (file: File): Promise<void> => {
    if (!supabase) {
      throw new Error("Supabase client not available for upload.");
    }

    if (!file.type.startsWith('image/')) {
      throw new Error(`'${file.name}' is not an image file.`);
    }
    if (file.size > 5 * 1024 * 1024) { // Example: 5MB limit
      throw new Error(`'${file.name}' exceeds 5MB limit.`);
    }

    let filePath = '';
    try {
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
      filePath = `${storagePathPrefix.replace(/\/$/, '')}/${uniqueFileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600', 
          upsert: false 
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        throw new Error(`Could not get public URL for ${file.name} after upload.`);
      }
      
      onImageUploaded({ url: urlData.publicUrl, filePath: filePath });
      
    } catch (err: any) {
      console.error(`Upload failed for ${file.name}:`, err);
      throw new Error(`Failed to upload ${file.name}: ${err.message}`); 
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!supabase) {
      console.error("Supabase client not available for upload.");
      setUploadErrors(["Upload service not ready."]);
      setStatus('error');
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    resetState(); 
    setStatus('uploading');
    setUploadingCount(files.length);

    const currentErrors: string[] = [];
    let successCount = 0;

    for (const file of Array.from(files)) {
      try {
        await uploadFile(file);
        successCount++;
      } catch (err: any) {
        currentErrors.push(err.message);
      } finally {
        setUploadingCount(prev => Math.max(0, prev - 1)); 
      }
    }

    setUploadErrors(currentErrors);

    if (currentErrors.length === files.length) {
        setStatus('error');
    } else if (currentErrors.length > 0) {
        setStatus('partial_error');
    } else {
        setStatus('success');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setTimeout(() => {
        if (status !== 'uploading') {
           resetState();
        }
    }, 5000);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/20 bg-muted/40 p-6 transition-colors hover:border-muted-foreground/30 hover:bg-muted/60 ${status === 'uploading' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      >
        <Upload className="mb-2 h-8 w-8 text-muted-foreground/50" />
        <div className="text-center text-sm text-muted-foreground">
          <p className="font-medium">Click or Drop to Upload</p>
          <p className="text-xs">PNG, JPG or WEBP (max 5MB per file)</p>
          <p className="text-xs mt-1">You can select multiple files.</p>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        onChange={handleFileChange}
        className="hidden"
        multiple
        disabled={status === 'uploading'}
      />
      
      {status === 'uploading' && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading {uploadingCount} file(s)...</span> 
        </div>
      )}
      
      {status === 'success' && (
         <p className="text-sm text-center text-green-600">All files uploaded successfully.</p>
      )}

      {(status === 'error' || status === 'partial_error') && uploadErrors.length > 0 && (
        <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-destructive text-center">
                {status === 'error' ? 'Upload failed for all files.' : 'Some files failed to upload:'}
            </p>
          <ul className="list-disc list-inside space-y-1 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            {uploadErrors.map((errMsg, index) => (
              <li key={index} className="flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" /> 
                  <span>{errMsg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 