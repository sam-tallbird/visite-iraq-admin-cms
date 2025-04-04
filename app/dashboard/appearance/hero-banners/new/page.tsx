"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/PageTitle";
import {
  HeroBannerForm,
  HeroBannerFormData,
} from "@/components/forms/HeroBannerForm"; // Adjust path if needed
import { useAuth } from "@/providers/auth-provider";
import { createClient } from "@/lib/supabase/client"; // Adjust path if needed

// Helper function defined directly in this file
const generateUniqueFilename = (file: File): string => {
    const extension = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedOriginalName = file.name
      .substring(0, file.name.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    return `${sanitizedOriginalName}_${timestamp}_${randomString}.${extension}`;
};

export default function NewHeroBannerPage() {
  const router = useRouter();
  const { supabase: authSupabase } = useAuth();
  const supabase = authSupabase || createClient(); // Fallback
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFormSubmit = async (
    formData: HeroBannerFormData,
    imageFile: File | null
  ) => {
    setIsSaving(true);
    setErrorMessage(null);

    if (!supabase) {
        setErrorMessage("Supabase client not available.");
        setIsSaving(false);
        return;
    }

    let uploadedImagePath: string | null = null;

    try {
      // 1. Upload image if provided
      if (imageFile) {
        const uniqueFilename = generateUniqueFilename(imageFile);
        // console.log(`Uploading image with filename: ${uniqueFilename}`); // Debug log

        // Ensure 'banners' bucket exists and RLS allows uploads
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("banners") // Ensure correct bucket name
          .upload(uniqueFilename, imageFile, {
            cacheControl: "3600", // Optional: Cache control header
            upsert: false, // Don't overwrite existing files with the same name
          });

        if (uploadError) {
          console.error("Image upload error:", uploadError);
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }
        uploadedImagePath = uploadData?.path ?? null;
         if (!uploadedImagePath) {
            throw new Error("Image uploaded but path was not returned.");
        }
        // console.log(`Image uploaded successfully: ${uploadedImagePath}`); // Debug log
      } else {
         // If no image file is provided on create, it's an error or requires default
         // For now, let's require an image for new banners
         throw new Error("Banner image is required.");
         // Alternatively, set a default image_path or allow null if desired
      }


      // 2. Prepare banner data for DB insert
      const bannerInsertData = {
        image_path: uploadedImagePath, // Use the path returned by storage
        link_url: formData.link_url || null,
        display_order: Number(formData.display_order) || 0,
        is_active: formData.is_active ?? true,
      };

      // 3. Insert into hero_banners table
      // console.log("Inserting into hero_banners:", bannerInsertData); // Debug log
      const { data: bannerData, error: bannerError } = await supabase
        .from("hero_banners")
        .insert(bannerInsertData)
        .select("id") // Select the ID of the newly created banner
        .single(); // Expect only one row back

      if (bannerError) {
        console.error("Banner insert error:", bannerError);
        throw bannerError;
      }

      if (!bannerData?.id) {
        throw new Error("Failed to create banner or retrieve its ID.");
      }
      const newBannerId = bannerData.id;
      // console.log(`Banner created with ID: ${newBannerId}`); // Debug log

      // 4. Prepare translations data
      const translationsToInsert = [];
      if (formData.text_en) {
        translationsToInsert.push({
          banner_id: newBannerId,
          language_code: "en",
          text: formData.text_en,
        });
      }
      if (formData.text_ar) {
        translationsToInsert.push({
          banner_id: newBannerId,
          language_code: "ar",
          text: formData.text_ar,
        });
      }

      // 5. Insert translations if any exist
      if (translationsToInsert.length > 0) {
         // console.log("Inserting translations:", translationsToInsert); // Debug log
         const { error: translationError } = await supabase
             .from("hero_banner_translations")
             .insert(translationsToInsert);

         if (translationError) {
             console.error("Translation insert error:", translationError);
             // Note: Banner row was already created. Consider deletion/cleanup strategy?
             // For now, throw error and alert user.
             throw new Error(`Banner created, but failed to save translations: ${translationError.message}`);
         }
      }

      // 6. Success - Redirect back to the list page
      router.push("/dashboard/appearance/hero-banners");
      // Optionally add a success notification/toast here

    } catch (error: any) {
      console.error("Failed to create hero banner:", error);
      setErrorMessage(error.message || "An unexpected error occurred.");

      // Optional: Attempt to delete uploaded image if DB insert fails
      if (uploadedImagePath && supabase) {
         console.warn(`Attempting to delete orphaned image: ${uploadedImagePath}`);
         try {
             await supabase.storage.from("banners").remove([uploadedImagePath]);
         } catch (cleanupError) {
             console.error("Failed to delete orphaned image during cleanup:", cleanupError);
         }
      }

    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container py-8">
      <PageTitle
        title="Add New Hero Banner"
        description="Create a new banner for the website home page."
        backButtonUrl="/dashboard/appearance/hero-banners"
      />
      <div className="mt-6">
        <HeroBannerForm
          onSubmit={handleFormSubmit}
          isSaving={isSaving}
          errorMessage={errorMessage}
          // No initialData for the 'new' page
        />
      </div>
    </div>
  );
}
