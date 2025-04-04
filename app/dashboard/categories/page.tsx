"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/shell";
import { useCategories, Category } from "@/hooks/use-categories";
import { useSupabaseTable } from "@/hooks/use-supabase";
import { Edit, Trash2, Plus, Loader2, AlertCircle, RefreshCw, ImageIcon } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";

// Interface for combined Category + Translation data
interface DisplayCategory extends Category {
  name_en?: string;
  name_ar?: string;
  description_en?: string;
  description_ar?: string;
  icon_url?: string; // Consistent name
  translation_en_id?: string;
  translation_ar_id?: string;
}

// Interface for translation table data
interface CategoryTranslation {
    id?: string;
    category_id: string;
    language_code: string;
    name?: string;
    description?: string;
    icon_url?: string;
    slug?: string;
}

const CATEGORY_IMAGE_BUCKET = 'category-icons'; // <<<--- Adjust if needed

export default function CategoriesPage() {
  const router = useRouter();
  const { user, loading: authLoading, supabase } = useAuth();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DisplayCategory | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch base categories
  const { 
      categories: baseCategories, 
      loading: categoriesLoading, 
      error: categoriesError,
      refresh: refreshCategories
  } = useCategories();

  // Fetch all translations (filter/join in useEffect)
  const { 
      data: allTranslations, 
      status: translationsStatus,  
      error: translationsError,
      refresh: refreshTranslations,
      add: addTranslation,
      update: updateTranslationRow, 
      remove: removeTranslation 
  } = useSupabaseTable('category_translations');
  
  // Get functions for the base 'categories' table for add/delete
  const { 
      add: addBaseCategory,
      remove: removeBaseCategory 
  } = useSupabaseTable('categories');

  // State to hold the combined/display categories
  const [displayCategories, setDisplayCategories] = useState<DisplayCategory[]>([]);

  // Combine base categories with translations
  useEffect(() => {
      if (baseCategories && allTranslations) {
          const combined = baseCategories.map(cat => {
              const en = allTranslations.find(t => t.category_id === cat.id && t.language_code === 'en');
              const ar = allTranslations.find(t => t.category_id === cat.id && t.language_code === 'ar');
              return {
                  ...cat,
                  name_en: en?.name,
                  name_ar: ar?.name,
                  description_en: en?.description,
                  description_ar: ar?.description,
                  icon_url: en?.icon_url || ar?.icon_url, // Prefer EN icon?
                  translation_en_id: en?.id,
                  translation_ar_id: ar?.id,
              } as DisplayCategory;
          });
          // Sort combined categories if needed (e.g., by order or name)
          combined.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a.name_en ?? '').localeCompare(b.name_en ?? ''));
          setDisplayCategories(combined);
      }
  }, [baseCategories, allTranslations]);

  // Derive loading state from hooks
  const loading = authLoading || categoriesLoading || translationsStatus === 'loading';
  const combinedError = categoriesError || translationsError;

  // DEBUG LOG
  console.log(`[CategoriesPage] Loading States:`, {
      authLoading,
      categoriesLoading,
      translationsStatus,
      calculatedLoading: loading,
      combinedError
  });

  // Redirect if not authenticated (after auth check is complete)
  useEffect(() => {
      if (!authLoading && !user) {
          router.push("/auth/login");
      }
  }, [authLoading, user, router]);

  // Refresh all data
  const refreshAll = useCallback(() => {
      refreshCategories();
      refreshTranslations();
  }, [refreshCategories, refreshTranslations]);

  // Handler for ImageUpload component
  const handleImageUpload = (uploadResult: { url: string; filePath: string } | string | null) => {
      if (typeof uploadResult === 'object' && uploadResult !== null) {
          setImageUrl(uploadResult.url || ""); // Extract URL if it's an object
      } else if (typeof uploadResult === 'string') {
          setImageUrl(uploadResult); // Use directly if it's a string
      } else {
          setImageUrl(""); // Handle null case
      }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !addBaseCategory || !addTranslation) {
        setErrorMessage("Database functions not ready.");
        return;
    }
    if (!nameEn.trim() || !nameAr.trim()) {
        setErrorMessage("English and Arabic names are required.");
        return;
    }
    
    setIsSubmitting(true);
    setErrorMessage(null);
    let newCategoryId: string | null = null;

    try {
        // 1. Add base category (can be minimal if most data is in translations)
        // Add fields like 'order' here if they exist on the base table
        const baseCategoryData = { 
            // order: someOrderValue // Example
        };
        const insertedBaseCategory = await addBaseCategory(baseCategoryData);
        
        if (!insertedBaseCategory || !insertedBaseCategory.id) {
            throw new Error("Failed to create base category entry.");
        }
        newCategoryId = insertedBaseCategory.id as string;

        // 2. Add English translation
        const translationEnData = {
            category_id: newCategoryId,
            language_code: 'en',
            name: nameEn.trim(),
            // description: descriptionEn, // Add if you have description inputs
            icon_url: imageUrl || null, // Save the uploaded image URL
            // slug: generateSlug(nameEn.trim()) // Add slug generation if needed
        };
        const insertedEn = await addTranslation(translationEnData);
        if (!insertedEn) throw new Error("Failed to add English translation.");
        
        // 3. Add Arabic translation
        const translationArData = {
            category_id: newCategoryId,
            language_code: 'ar',
            name: nameAr.trim(),
            // description: descriptionAr, 
            icon_url: imageUrl || null, // Typically store icon once, maybe only on EN?
            // slug: generateSlug(nameAr.trim()) 
        };
        const insertedAr = await addTranslation(translationArData);
         if (!insertedAr) throw new Error("Failed to add Arabic translation.");

        // 4. Success
        refreshAll(); // Refresh data
        setNameEn(""); // Clear form
        setNameAr("");
        setImageUrl("");
        setIsAddModalOpen(false); // Close modal

    } catch (error: any) {
        console.error("Error adding category:", error);
        setErrorMessage(`Failed to add category: ${error.message}`);
        // Optional: Add rollback logic here if needed (delete base category if translations failed)
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !selectedCategory.id) {
        setErrorMessage("No category selected for editing.");
        return;
    }
    if (!supabase || !updateTranslationRow) {
        setErrorMessage("Database functions not ready.");
        return;
    }
    if (!nameEn.trim() || !nameAr.trim()) {
        setErrorMessage("English and Arabic names are required.");
        return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
        let updateEnPromise: Promise<any> | null = null;
        let updateArPromise: Promise<any> | null = null;

        // Update English translation
        if (selectedCategory.translation_en_id) {
            const updateEnData = {
                name: nameEn.trim(),
                icon_url: imageUrl || null // Update icon URL on EN translation
                // Add description, slug updates if needed
            };
            updateEnPromise = updateTranslationRow(selectedCategory.translation_en_id, updateEnData);
        } else {
            // Handle case where EN translation doesn't exist (e.g., add it?)
            console.warn("English translation ID missing for category:", selectedCategory.id);
            // Optionally, could call addTranslation here
        }

        // Update Arabic translation
        if (selectedCategory.translation_ar_id) {
            const updateArData = {
                name: nameAr.trim()
                 // Add description, slug updates if needed
                // Typically icon is not updated on AR if primarily stored on EN
            };
            updateArPromise = updateTranslationRow(selectedCategory.translation_ar_id, updateArData);
        } else {
            // Handle case where AR translation doesn't exist
             console.warn("Arabic translation ID missing for category:", selectedCategory.id);
             // Optionally, could call addTranslation here
        }
        
        // Wait for both updates to complete
        await Promise.all([updateEnPromise, updateArPromise].filter(p => p !== null));

        // Success
        refreshAll();
        setSelectedCategory(null);
        setNameEn("");
        setNameAr("");
        setImageUrl("");
        setIsEditModalOpen(false);

    } catch (error: any) {
        console.error("Error updating category:", error);
        setErrorMessage(`Failed to update category: ${error.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCategory || !selectedCategory.id) {
        setErrorMessage("No category selected for deletion.");
        return;
    }
    if (!supabase || !removeBaseCategory) {
        setErrorMessage("Database functions not ready for deletion.");
        return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
        // 1. Delete Icon from Storage (if exists)
        if (selectedCategory.icon_url) {
            try {
                const url = new URL(selectedCategory.icon_url);
                // Assuming URL structure like: .../storage/v1/object/public/category-icons/image.png
                const path = url.pathname.split(`/${CATEGORY_IMAGE_BUCKET}/`)[1];
                if (path) {
                    const { error: storageError } = await supabase.storage
                        .from(CATEGORY_IMAGE_BUCKET)
                        .remove([path]);
                    if (storageError) {
                        console.warn("Could not delete category icon from storage:", storageError);
                        // Optionally: set a non-blocking warning message
                    }
                } else {
                     console.warn("Could not extract path from icon URL:", selectedCategory.icon_url);
                }
            } catch (e) {
                console.warn("Error processing icon URL for deletion:", selectedCategory.icon_url, e);
            }
        }

        // 2. Delete Translations (using supabase client directly for batch delete)
        const { error: deleteTransError } = await supabase
            .from('category_translations')
            .delete()
            .eq('category_id', selectedCategory.id);
        
        if (deleteTransError) {
            console.warn("Error deleting category translations:", deleteTransError);
            // Decide if this should block the base category deletion or just warn
            // Throwing error here would stop the process if desired:
            // throw new Error(`Failed to delete translations: ${deleteTransError.message}`);
        }

        // 3. Delete Base Category Row
        await removeBaseCategory(selectedCategory.id);

        // 4. Success
        refreshAll();
        setSelectedCategory(null);
        setIsDeleteModalOpen(false);

    } catch (error: any) {
        console.error("Error deleting category:", error);
        setErrorMessage(`Failed to delete category: ${error.message}`);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    refreshAll();
  };

  const openEditModal = (category: DisplayCategory) => {
    setSelectedCategory(category);
    setNameEn(category.name_en || "");
    setNameAr(category.name_ar || "");
    setImageUrl(category.icon_url || "");
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (category: DisplayCategory) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  // Show loading skeleton or spinner
  if (loading) {
    return (
      <Shell>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading categories...</p>
          </div>
        </div>
      </Shell>
    );
  }
  
  // Don't render further if auth check hasn't finished or user is null
  if (authLoading || !user) {
      return null; 
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-muted-foreground">
              Manage the categories for listings in the Iraq Tourism app.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary inline-flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        </div>

        {errorMessage && (
          <div className="card bg-destructive/10 text-destructive p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p>{errorMessage}</p>
            </div>
            <button 
              onClick={handleRetry} 
              className="btn btn-outline btn-sm mt-2"
            >
              Retry
            </button>
          </div>
        )}

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3 font-medium w-20">
                    Image
                  </th>
                  <th className="px-4 py-3 font-medium">
                    English Name
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Arabic Name
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {displayCategories.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No categories found. Add a category to get started.
                    </td>
                  </tr>
                ) : (
                  displayCategories.map((category: DisplayCategory) => {
                    return (
                      <tr key={category.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          {category.icon_url ? (
                            <div className="relative h-12 w-12 overflow-hidden rounded-md">
                              <Image
                                src={category.icon_url || '/placeholder-image.png'}
                                alt={category.name_en || 'Category icon'}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted">
                              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">{category.name_en}</td>
                        <td className="px-4 py-3 text-right" dir="rtl">
                          {category.name_ar}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(category)}
                              className="btn-icon btn-sm"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit</span>
                            </button>
                            <button
                              onClick={() => openDeleteModal(category)}
                              className="btn-icon btn-sm text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-semibold">Add Category</h2>
            <form onSubmit={handleAddSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="name_en" className="form-label">
                  English Name
                </label>
                <input
                  id="name_en"
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="input-field w-full"
                  placeholder="e.g. Museums"
                  required
                />
              </div>
              <div>
                <label htmlFor="name_ar" className="form-label">
                  Arabic Name
                </label>
                <input
                  id="name_ar"
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="input-field w-full text-right"
                  placeholder="e.g. متاحف"
                  required
                  dir="rtl"
                />
              </div>
              
              <ImageUpload
                bucketName={CATEGORY_IMAGE_BUCKET}
                storagePathPrefix="categories"
                onImageUploaded={handleImageUpload}
                existingImageUrl={imageUrl}
                className="pt-2"
              />
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setNameEn("");
                    setNameAr("");
                    setImageUrl("");
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-semibold">Edit Category</h2>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="edit_name_en" className="form-label">
                  English Name
                </label>
                <input
                  id="edit_name_en"
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit_name_ar" className="form-label">
                  Arabic Name
                </label>
                <input
                  id="edit_name_ar"
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  className="input-field w-full text-right"
                  required
                  dir="rtl"
                />
              </div>
              
              <ImageUpload
                bucketName={CATEGORY_IMAGE_BUCKET}
                storagePathPrefix="categories"
                onImageUploaded={handleImageUpload}
                existingImageUrl={imageUrl}
                className="pt-2"
              />
              
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedCategory(null);
                    setNameEn("");
                    setNameAr("");
                    setImageUrl("");
                  }}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Update Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="card w-full max-w-md">
            <h2 className="text-xl font-semibold text-destructive">Delete Category</h2>
            <p className="mt-2 text-muted-foreground">
              Are you sure you want to delete the category "{selectedCategory?.name_en}"? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedCategory(null);
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="btn btn-destructive"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
} 