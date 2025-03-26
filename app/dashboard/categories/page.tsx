"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/layout/shell";
import { useFirestoreCollection } from "@/hooks/use-firestore";
import { Edit, Trash2, Plus, Loader2, AlertCircle, RefreshCw, ImageIcon } from "lucide-react";
import { where, orderBy, DocumentData } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { ImageUpload } from "@/components/ImageUpload";
import Image from "next/image";

interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  imageUrl?: string;
  created_at: any;
  updated_at: any;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shouldRefresh, setShouldRefresh] = useState(false);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthChecking(false);
      if (user) {
        setIsAuthenticated(true);
      } else {
        console.log("No authenticated user, redirecting to login");
        router.push("/auth/login");
      }
    });
    
    return () => unsubscribe();
  }, [router]);

  const {
    data: categories,
    status,
    error,
    refresh,
    add: addCategory,
    update: updateCategory,
    remove: removeCategory,
  } = useFirestoreCollection("categories", [orderBy("created_at", "desc")], {
    onError: (error) => {
      console.error("Firestore error:", error);
      setErrorMessage(`Error loading categories: ${error.message}`);
      
      // If the error is authentication related, redirect to login
      if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
        router.push("/auth/login");
      }
    }
  });

  // Handle retries for loading if connection fails - using a separate state to trigger refresh
  useEffect(() => {
    if ((status === "error" || status === "connection-error") && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Retrying categories fetch (attempt ${retryCount + 1})...`);
        setRetryCount(prev => prev + 1);
        setShouldRefresh(true);
      }, 3000); // Retry after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [status, retryCount]); // Remove refresh from dependencies

  // Handle the actual refresh in a separate effect to avoid infinite loops
  useEffect(() => {
    if (shouldRefresh) {
      refresh();
      setShouldRefresh(false);
    }
  }, [shouldRefresh, refresh]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    try {
      if (nameEn.trim() && nameAr.trim()) {
        await addCategory({
          name_en: nameEn.trim(),
          name_ar: nameAr.trim(),
          imageUrl: imageUrl || null,
        });
        
        setNameEn("");
        setNameAr("");
        setImageUrl("");
        setIsAddModalOpen(false);
      }
    } catch (error) {
      setErrorMessage(`Failed to add category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    
    try {
      if (selectedCategory && nameEn.trim() && nameAr.trim()) {
        await updateCategory(selectedCategory.id, {
          name_en: nameEn.trim(),
          name_ar: nameAr.trim(),
          imageUrl: imageUrl || null,
        });
        
        setSelectedCategory(null);
        setNameEn("");
        setNameAr("");
        setImageUrl("");
        setIsEditModalOpen(false);
      }
    } catch (error) {
      setErrorMessage(`Failed to update category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteConfirm = async () => {
    setErrorMessage(null);
    
    try {
      if (selectedCategory) {
        await removeCategory(selectedCategory.id);
        setSelectedCategory(null);
        setIsDeleteModalOpen(false);
      }
    } catch (error) {
      setErrorMessage(`Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setRetryCount(0);
    refresh();
  };

  const openEditModal = (category: Category) => {
    setSelectedCategory(category);
    setNameEn(category.name_en);
    setNameAr(category.name_ar);
    setImageUrl(category.imageUrl || "");
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  // Display loading state while checking auth
  if (isAuthChecking) {
    return (
      <Shell>
        <div className="flex h-96 items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verifying your session...</p>
          </div>
        </div>
      </Shell>
    );
  }

  // Don't try to render the page content if not authenticated
  if (!isAuthenticated) {
    return null; // Return nothing while redirecting
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

        {status === "loading" ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading categories...</p>
            </div>
          </div>
        ) : status === "connection-error" ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-xl font-semibold">Connection Error</h3>
              <p className="text-muted-foreground">
                Could not connect to the database. Please check your connection.
              </p>
            </div>
            <button 
              onClick={handleRetry}
              className="btn btn-primary mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </button>
          </div>
        ) : status === "error" ? (
          <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-xl font-semibold">Error Loading Categories</h3>
              <p className="text-muted-foreground">
                {error?.message || "An unknown error occurred."}
              </p>
            </div>
            <button 
              onClick={handleRetry}
              className="btn btn-primary mt-2"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </button>
          </div>
        ) : (
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
                  {categories?.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-muted-foreground"
                      >
                        No categories found. Add a category to get started.
                      </td>
                    </tr>
                  ) : (
                    categories?.map((category: DocumentData) => {
                      // Safely extract values with null/undefined checks
                      const typedCategory: Category = {
                        id: category.id || '',
                        name_en: category.name_en || '',
                        name_ar: category.name_ar || '',
                        imageUrl: category.imageUrl || '',
                        created_at: category.created_at || null,
                        updated_at: category.updated_at || null
                      };
                      
                      return (
                        <tr key={typedCategory.id} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            {typedCategory.imageUrl ? (
                              <div className="relative h-12 w-12 overflow-hidden rounded-md">
                                <Image
                                  src={typedCategory.imageUrl}
                                  alt={typedCategory.name_en}
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
                          <td className="px-4 py-3">{typedCategory.name_en}</td>
                          <td className="px-4 py-3 text-right" dir="rtl">
                            {typedCategory.name_ar}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditModal(typedCategory)}
                                className="btn-icon btn-sm"
                              >
                                <Edit className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit</span>
                              </button>
                              <button
                                onClick={() => openDeleteModal(typedCategory)}
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
        )}
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
                onImageUploaded={setImageUrl}
                storagePath="categories"
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
                onImageUploaded={setImageUrl}
                storagePath="categories"
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