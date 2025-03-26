import { useState, useRef, ChangeEvent } from 'react';
import { Upload, X, AlertCircle, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useFirebaseStorage, UploadStatus } from '@/hooks/use-firebase-storage';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  storagePath: string;
  existingImageUrl?: string;
  className?: string;
}

export function ImageUpload({
  onImageUploaded,
  storagePath,
  existingImageUrl,
  className = '',
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    uploadFile,
    status,
    progress,
    error,
    resetState
  } = useFirebaseStorage();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Create a preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setFileName(file.name);
    
    try {
      // Upload to Firebase Storage
      const filePath = `${storagePath}/${Date.now()}_${file.name}`;
      const downloadUrl = await uploadFile(file, filePath);
      
      // Pass the URL to the parent component
      onImageUploaded(downloadUrl);
    } catch (err) {
      console.error('Upload failed:', err);
      // Preview is still shown, but upload failed
    }
    
    // Reset the file input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setFileName(null);
    resetState();
    onImageUploaded(''); // Clear the image URL in the parent component
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="form-label">Image</label>
        {previewUrl && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="text-xs text-destructive hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      
      {/* Preview or Upload Area */}
      {previewUrl ? (
        <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-md border">
          <Image
            src={previewUrl}
            alt="Preview"
            fill
            className="object-cover"
            sizes="200px"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute right-2 top-2 rounded-full bg-destructive/90 p-1 text-white hover:bg-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex aspect-square w-full max-w-[200px] cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-muted-foreground/20 bg-muted/40 p-4 transition-colors hover:border-muted-foreground/30 hover:bg-muted/60"
        >
          <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground/50" />
          <div className="text-center text-sm text-muted-foreground">
            <p className="font-medium">Click to upload</p>
            <p className="text-xs">PNG, JPG or WEBP (max 5MB)</p>
          </div>
        </div>
      )}
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {/* File name and upload progress */}
      {fileName && status === 'uploading' && (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-xs">
            <Upload className="h-3 w-3" />
            <span className="flex-1 truncate">{fileName}</span>
            <span>{progress.percentage.toFixed(0)}%</span>
          </div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Success message */}
      {status === 'success' && (
        <p className="text-xs text-green-600">Upload successful</p>
      )}
      
      {/* Error message */}
      {status === 'error' && error && (
        <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" />
          <span>Upload failed: {error.message}</span>
        </div>
      )}
    </div>
  );
} 