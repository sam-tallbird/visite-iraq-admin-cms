"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageTitle } from "@/components/PageTitle";
import {
  HeroBannerForm,
  HeroBannerFormData,
  // generateUniqueFilename // Remove this import
} from "@/components/forms/HeroBannerForm";
import { useAuth } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

// Helper function defined directly in this file
const generateUniqueFilenameLocal = (file: File): string => {
    const extension = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedOriginalName = file.name
      .substring(0, file.name.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    return `${sanitizedOriginalName}_${timestamp}_${randomString}.${extension}`;
};


export default function EditHeroBannerPage() {
  const router = useRouter();
  const params = useParams();
  const { supabase: authSupabase } = useAuth();
  const supabase = authSupabase || createClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // For initial data load
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<HeroBannerFormData | null>(null);

  const bannerId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : null;

  // Fetch existing banner data
  useEffect(() => {
    if (!bannerId || !supabase) {
        setIsLoading(false);
        if(!bannerId) setErrorMessage("Banner ID not found in URL.");
        if(!supabase) setErrorMessage("Supabase client not available.");
        return;
    }

    const fetchBannerData = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        try {
            const { data: banner, error: bannerError } = await supabase
                .from("hero_banners")
                .select(`
                    id,
                    image_path,
                    link_url,
                    display_order,
                    is_active,
                    hero_banner_translations ( text, language_code )
                 `)
                .eq("id", bannerId)
                .single();

            if (bannerError) throw bannerError;
            if (!banner) throw new Error("Banner not found.");

            // Extract translations
            const translations = Array.isArray(banner.hero_banner_translations) ? banner.hero_banner_translations : [];
            const text_en = translations.find((t: any) => t.language_code === 'en')?.text;
            const text_ar = translations.find((t: any) => t.language_code === 'ar')?.text;

            setInitialData({
                id: banner.id,
                image_path: banner.image_path,
                link_url: banner.link_url,
                display_order: banner.display_order,
                is_active: banner.is_active,
                text_en: text_en,
                text_ar: text_ar,
            });

        } catch (error: any) {
            console.error("Failed to fetch banner data:", error);
            setErrorMessage(error.message || "Failed to load banner data.");
        } finally {
            setIsLoading(false);
        }
    };

    fetchBannerData();

  }, [bannerId, supabase]);

  // Handle form submission for updates
  const handleFormSubmit = async (
    formData: HeroBannerFormData,
    imageFile: File | null
  ) => {
    setIsSaving(true);
    setErrorMessage(null);

    if (!supabase || !bannerId) {
        setErrorMessage("Supabase client or Banner ID missing.");
        setIsSaving(false);
        return;
    }

    let uploadedImagePath: string | null = initialData?.image_path || null;
    const previousImagePath = initialData?.image_path; // Keep track of old image

    try {
      // 1. Upload *new* image if provided
      if (imageFile) {
        const uniqueFilename = generateUniqueFilenameLocal(imageFile);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("banners")
          .upload(uniqueFilename, imageFile, {
            upsert: false, // Don't overwrite randomly
          });

        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
        uploadedImagePath = uploadData?.path ?? null;
        if (!uploadedImagePath) throw new Error("Image uploaded but path was not returned.");
      } else if (formData.image_path === null && previousImagePath) {
        // Handle case where user explicitly removed image via form state
        uploadedImagePath = null;
      }

      // 2. Prepare banner data for DB update
      const bannerUpdateData = {
        image_path: uploadedImagePath, // New or null path
        link_url: formData.link_url || null,
        display_order: Number(formData.display_order) || 0,
        is_active: formData.is_active ?? true,
        updated_at: new Date().toISOString(), // Explicitly set updated_at
      };

      // 3. Update the hero_banners table
      const { error: bannerUpdateError } = await supabase
        .from("hero_banners")
        .update(bannerUpdateData)
        .eq("id", bannerId);

      if (bannerUpdateError) throw bannerUpdateError;

      // 4. Prepare and Upsert translations
      // Upsert allows inserting or updating based on unique constraint (banner_id, language_code)
      const translationsToUpsert = [];
      if (formData.text_en !== undefined) { // Check presence, even if empty string
        translationsToUpsert.push({
          banner_id: bannerId,
          language_code: "en",
          text: formData.text_en || null, // Ensure null if empty
        });
      }
      if (formData.text_ar !== undefined) {
        translationsToUpsert.push({
          banner_id: bannerId,
          language_code: "ar",
          text: formData.text_ar || null,
        });
      }

      if (translationsToUpsert.length > 0) {
          const { error: translationUpsertError } = await supabase
              .from("hero_banner_translations")
              .upsert(translationsToUpsert, { onConflict: 'banner_id, language_code' });

          if (translationUpsertError) throw translationUpsertError;
      }

      // 5. Delete old image from storage *after* successful DB updates
      if (imageFile && previousImagePath) {
          // If a new image was uploaded and there was a previous image path
          console.log(`Deleting old image: ${previousImagePath}`);
          const { error: deleteError } = await supabase.storage
              .from("banners")
              .remove([previousImagePath]);
          if (deleteError) console.warn(`Failed to delete old image ${previousImagePath}:`, deleteError);
      } else if (uploadedImagePath === null && previousImagePath) {
           // If image was explicitly removed (set to null) and there was a previous one
           console.log(`Deleting removed image: ${previousImagePath}`);
            const { error: deleteError } = await supabase.storage
              .from("banners")
              .remove([previousImagePath]);
          if (deleteError) console.warn(`Failed to delete removed image ${previousImagePath}:`, deleteError);
      }

      // 6. Success - Redirect back to the list page
      router.push("/dashboard/appearance/hero-banners");
      // Optionally add a success notification/toast here

    } catch (error: any) {
      console.error("Failed to update hero banner:", error);
      setErrorMessage(error.message || "An unexpected error occurred.");
      // Note: No automatic image cleanup here on UPDATE failure, 
      // as the original image might still be valid.
    } finally {
      setIsSaving(false);
    }
  };

  // Render loading state
  if (isLoading) {
     return (
       <div className="container py-8 flex justify-center items-center min-h-[calc(100vh-200px)]">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
  }

  // Render error state if loading finished but data couldn't be fetched
  if (errorMessage && !initialData) {
      return (
         <div className="container py-8">
             <PageTitle title="Edit Hero Banner" backButtonUrl="/dashboard/appearance/hero-banners" />
             <div className="mt-6 bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
                 <AlertCircle className="h-5 w-5" />
                 <p>{errorMessage}</p>
             </div>
         </div>
      );
  }

  // Render form if data loaded successfully
  return (
    <div className="container py-8">
      <PageTitle
        title="Edit Hero Banner"
        description={`Editing banner: ${initialData?.id}`}
        backButtonUrl="/dashboard/appearance/hero-banners"
      />
      <div className="mt-6">
        <HeroBannerForm
          initialData={initialData} // Pass fetched data to the form
          onSubmit={handleFormSubmit}
          isSaving={isSaving}
          errorMessage={errorMessage} // Display update errors within the form
        />
      </div>
    </div>
  );
}
