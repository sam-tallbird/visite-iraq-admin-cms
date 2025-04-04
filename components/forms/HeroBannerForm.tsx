"use client";

import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming you might want textarea for text later
import { Switch } from "@/components/ui/switch";
import { Loader2, UploadCloud, Trash2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client"; // Adjust path if needed

// Type for the form data state
export interface HeroBannerFormData {
  id?: string; // Present when editing
  image_path?: string | null;
  link_url?: string | null;
  display_order?: number;
  is_active?: boolean;
  text_en?: string | null;
  text_ar?: string | null;
  // Add alt_text fields later if needed
}

// Type for the props expected by the form component
interface HeroBannerFormProps {
  initialData?: HeroBannerFormData | null; // For editing existing banners
  onSubmit: (
    formData: HeroBannerFormData,
    imageFile: File | null
  ) => Promise<void>; // Function to handle actual save logic
  isSaving: boolean; // Passed from parent to show saving state
  errorMessage?: string | null; // Passed from parent to display errors
}

// Helper function to generate a unique filename
const generateUniqueFilename = (file: File): string => {
    const extension = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8); // Shorter random string
    // Sanitize original filename (remove special chars, limit length)
    const sanitizedOriginalName = file.name
      .substring(0, file.name.lastIndexOf('.')) // Remove extension
      .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace invalid chars with underscore
      .substring(0, 50); // Limit length
    
    return `${sanitizedOriginalName}_${timestamp}_${randomString}.${extension}`;
};


export function HeroBannerForm({
  initialData,
  onSubmit,
  isSaving,
  errorMessage,
}: HeroBannerFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<HeroBannerFormData>({
    image_path: null,
    link_url: "",
    display_order: 0,
    is_active: true,
    text_en: "",
    text_ar: "",
    ...initialData, // Spread initial data if provided (for editing)
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.image_path ? null : null // Start with no preview; fetch if editing
  );
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient(); // Create client instance

  // Fetch image preview URL if editing an existing banner with an image path
  useEffect(() => {
    if (initialData?.image_path && supabase) {
      setIsFetchingPreview(true);
      const { data: urlData } = supabase.storage
        .from("banners") // Ensure correct bucket name
        .getPublicUrl(initialData.image_path);
      
      if (urlData?.publicUrl) {
          // Simple cache bust by adding timestamp - adjust if needed
          setImagePreview(urlData.publicUrl + '?t=' + new Date().getTime());
      } else {
          console.warn("Could not get public URL for initial image path:", initialData.image_path);
      }
      setIsFetchingPreview(false);
    }
  }, [initialData?.image_path, supabase]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const handleToggleChange = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      is_active: checked,
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Update form data to indicate a new image is staged (optional)
      // setFormData(prev => ({ ...prev, image_path: 'new_image_selected' }));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    // If editing, you might want to clear the existing image_path too
    // or handle removal logic during submission
    setFormData(prev => ({ ...prev, image_path: null })); 
    if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset file input
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Prepare form data, ensuring display_order is a number
     const dataToSubmit: HeroBannerFormData = {
        ...formData,
        display_order: Number(formData.display_order) || 0, // Ensure it's a number
    };
    await onSubmit(dataToSubmit, imageFile);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
        {errorMessage && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg flex items-center gap-2 mb-6">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{errorMessage}</p>
            </div>
        )}

        {/* Image Upload Section */}
        <div className="card p-6">
            <Label htmlFor="banner-image" className="text-lg font-semibold">Banner Image</Label>
            <p className="text-sm text-muted-foreground mb-4">Upload the main image for this banner (e.g., 1920x600px recommended).</p>
            <div className="mt-2 flex items-center gap-4">
                <div className="w-32 h-20 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                    {isFetchingPreview ? (
                       <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : imagePreview ? (
                        <Image 
                           src={imagePreview} 
                           alt="Banner preview" 
                           width={128} 
                           height={80} 
                           className="object-contain" 
                        />
                    ) : (
                        <span className="text-xs text-muted-foreground">No image</span>
                    )}
                </div>
                <div className="flex-1">
                    <Input
                        id="banner-image"
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg, image/png, image/webp, image/gif" // Adjust accepted types if needed
                        onChange={handleImageChange}
                        className="hidden" // Hide default input
                        disabled={isSaving}
                    />
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()} // Trigger hidden input
                        disabled={isSaving}
                        className="mb-2"
                    >
                        <UploadCloud className="mr-2 h-4 w-4" /> Choose Image
                    </Button>
                    {imagePreview && (
                         <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/90"
                            onClick={handleRemoveImage}
                            disabled={isSaving}
                         >
                             <Trash2 className="mr-1 h-4 w-4" /> Remove Image
                         </Button>
                    )}
                     <p className="text-xs text-muted-foreground mt-1">Max file size: 5MB (Adjust as needed). Allowed types: JPG, PNG, WEBP, GIF.</p>
                </div>
            </div>
            {/* Display existing image path if editing and no new image is selected */}
            {!imageFile && formData.image_path && (
                 <p className="text-xs text-muted-foreground mt-2">Current image path: <code className="bg-muted px-1 rounded">{formData.image_path}</code></p>
            )}
        </div>

        {/* Text and Details Section */}
        <div className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* English Text */}
            <div className="space-y-2">
                <Label htmlFor="text_en">Text (English)</Label>
                 {/* Using Input for now, change to Textarea if needed */}
                 <Input
                    id="text_en"
                    name="text_en"
                    value={formData.text_en || ""}
                    onChange={handleChange}
                    placeholder="Enter English text overlay"
                    className="input-field"
                    disabled={isSaving}
                 />
                 {/* <Textarea id="text_en" name="text_en" ... /> */}
                 <p className="text-xs text-muted-foreground">The main text displayed on the banner in English.</p>
            </div>

            {/* Arabic Text */}
            <div className="space-y-2">
                <Label htmlFor="text_ar">Text (Arabic)</Label>
                <Input
                    id="text_ar"
                    name="text_ar"
                    dir="rtl" // Right-to-left for Arabic
                    value={formData.text_ar || ""}
                    onChange={handleChange}
                    placeholder="أدخل النص العربي"
                    className="input-field"
                    disabled={isSaving}
                />
                 <p className="text-xs text-muted-foreground">النص الرئيسي المعروض على البانر باللغة العربية.</p>
            </div>

            {/* Link URL */}
             <div className="space-y-2">
                <Label htmlFor="link_url">Link URL (Optional)</Label>
                <Input
                    id="link_url"
                    name="link_url"
                    type="url"
                    value={formData.link_url || ""}
                    onChange={handleChange}
                    placeholder="e.g., /listings/some-listing or https://..."
                    className="input-field"
                    disabled={isSaving}
                />
                 <p className="text-xs text-muted-foreground">If provided, the banner will link to this web address.</p>
            </div>

             {/* Display Order */}
             <div className="space-y-2">
                <Label htmlFor="display_order">Display Order</Label>
                <Input
                    id="display_order"
                    name="display_order"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.display_order === undefined ? "" : formData.display_order}
                    onChange={handleChange}
                    placeholder="0"
                    className="input-field w-24" // Smaller width
                    disabled={isSaving}
                />
                 <p className="text-xs text-muted-foreground">Determines order (lower numbers appear first).</p>
            </div>

             {/* Active Status */}
             <div className="space-y-2 flex items-center gap-3 pt-4 md:col-span-2">
                 <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={handleToggleChange}
                    disabled={isSaving}
                 />
                 <Label htmlFor="is_active" className="cursor-pointer">
                    Active
                 </Label>
                 <p className="text-xs text-muted-foreground">(Controls whether the banner is displayed on the website)</p>
             </div>
        </div>


      {/* Submit Buttons */}
      <div className="flex justify-end gap-4 mt-8">
        <Button
            type="button"
            variant="outline"
            onClick={() => router.back()} // Go back to previous page
            disabled={isSaving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            initialData ? "Save Changes" : "Create Banner" // Different text for edit/create
          )}
        </Button>
      </div>
    </form>
  );
}