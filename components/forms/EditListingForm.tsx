import { useState, useRef, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  MapPin,
  ImagePlus
} from "lucide-react";
import { useFirestoreDocument } from "@/hooks/use-firestore";
import { 
  DocumentData, 
  FirestoreError, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  Firestore,
  doc
} from "firebase/firestore";
import { ListingImageManager } from "@/components/ListingImageManager";
import { ListingImage } from "@/hooks/use-listing-images";
import { useCategories } from '@/hooks/use-categories';
import { db as firestoreDB } from '@/lib/firebase';

const db = firestoreDB as Firestore;

interface EditListingFormProps {
  listingId: string;
}

export function EditListingForm({ listingId }: EditListingFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [listingImages, setListingImages] = useState<ListingImage[]>([]);
  
  const [formData, setFormData] = useState({
    title: "",
    name_en: "",
    name_ar: "",
    description_en: "",
    description_ar: "",
    category: "",
    categories: [] as string[],
    address_en: "",
    address_ar: "",
    city_en: "",
    city_ar: "",
    latitude: "",
    longitude: "",
    featured: false,
    status: "Draft",
    contact_email: "",
    contact_phone: "",
    views: 0
  });
  
  // Use the Firestore hooks with proper typing
  const { 
    data: listing, 
    status, 
    error,
    refresh,
    update
  } = useFirestoreDocument('listings', listingId, {
    onSuccess: (data: DocumentData | null) => {
      console.log("Firestore data loaded successfully:", data ? "data exists" : "no data");
    },
    onError: (error: FirestoreError) => {
      console.error("Firestore error:", error);
      setErrorMessage(`Error loading listing: ${error.message}`);
    }
  });

  // Refresh listing when the shouldRefresh state changes
  useEffect(() => {
    if (shouldRefresh) {
      refresh();
      setShouldRefresh(false);
    }
  }, [shouldRefresh, refresh]);

  const loading = status === 'loading' || status === 'idle';
  
  // When listing data is loaded, update the form
  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title || "",
        name_en: listing.name_en || "",
        name_ar: listing.name_ar || "",
        description_en: listing.description_en || "",
        description_ar: listing.description_ar || "",
        category: listing.category || "",
        categories: listing.categories || (listing.category ? [listing.category] : []),
        address_en: listing.address_en || "",
        address_ar: listing.address_ar || "",
        city_en: listing.city_en || "",
        city_ar: listing.city_ar || "",
        latitude: listing.latitude ? String(listing.latitude) : "",
        longitude: listing.longitude ? String(listing.longitude) : "",
        featured: listing.featured || false,
        status: listing.status || "Draft",
        contact_email: listing.contact_email || "",
        contact_phone: listing.contact_phone || "",
        views: listing.views || 0
      });
    }
  }, [listing]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  const handleImagesChange = (images: ListingImage[]) => {
    setListingImages(images);
    // The image URL will be managed through the listing_images collection
    // No need to set image_url in the listing document anymore
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    
    // Update the categories array based on checkbox state
    setFormData(prev => {
      let newCategories = [...prev.categories];
      
      if (checked && !newCategories.includes(value)) {
        // Add category if checked and not already in the array
        newCategories.push(value);
      } else if (!checked && newCategories.includes(value)) {
        // Remove category if unchecked and in the array
        newCategories = newCategories.filter(cat => cat !== value);
      }
      
      // Always set the first category as the primary category for backward compatibility
      const primaryCategory = newCategories.length > 0 ? newCategories[0] : "";
      
      return {
        ...prev,
        category: primaryCategory,
        categories: newCategories
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    
    try {
      // Prepare data for Firestore
      const listingData = {
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        updated_at: new Date(),
      };
      
      // Update the listing in Firestore
      await update(listingData);

      // Update listing_categories
      // 1. Get current categories for this listing
      const listingCategoriesRef = collection(db, 'listing_categories');
      const q = query(listingCategoriesRef, where('listing_id', '==', listingId));
      const querySnapshot = await getDocs(q);
      
      // 2. Create a map of existing category relationships
      const existingCategories = new Map<string, string>();
      querySnapshot.forEach(doc => {
        existingCategories.set(doc.data().category_id, doc.id);
      });

      // 3. Process each selected category
      for (const categoryId of formData.categories) {
        if (!existingCategories.has(categoryId)) {
          // Add new category relationship
          await addDoc(listingCategoriesRef, {
            listing_id: listingId,
            category_id: categoryId,
          });
        }
        // Remove from map to track which ones need to be deleted
        existingCategories.delete(categoryId);
      }

      // 4. Delete relationships that are no longer selected
      const categoriesToDelete = Array.from(existingCategories.values());
      for (const docId of categoriesToDelete) {
        await deleteDoc(doc(db, 'listing_categories', docId));
      }
      
      // Redirect to listings page on success
      router.push("/dashboard/listings");
    } catch (err) {
      console.error("Error updating listing:", err);
      setErrorMessage(err instanceof Error ? err.message : "Failed to update listing. Please try again.");
      setSaving(false);
    }
  };

  const { categories, loading: categoriesLoading } = useCategories();

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <p>Error loading listing: {error.message}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading listing data...</span>
      </div>
    );
  }

  return (
    <>
      {/* Error message display */}
      {errorMessage && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2 mb-6">
          <AlertCircle className="h-5 w-5" />
          <p>{errorMessage}</p>
          <button 
            className="ml-auto hover:text-destructive/80"
            onClick={() => setErrorMessage(null)}
          >
            &times;
          </button>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        <div className="dashboard-grid md:grid-cols-2 gap-8">
          {/* Basic Information */}
          <div className="card">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter the essential details about this listing.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name_en" className="form-label">
                  English Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="name_en"
                  name="name_en"
                  type="text"
                  className="input-field w-full"
                  placeholder="e.g. Baghdad Museum"
                  required
                  value={formData.name_en}
                  onChange={handleChange}
                />
                <p className="form-hint">
                  Choose a clear, descriptive name that highlights the location.
                </p>
              </div>
              
              <div>
                <label htmlFor="name_ar" className="form-label">
                  Arabic Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="name_ar"
                  name="name_ar"
                  type="text"
                  className="input-field w-full"
                  placeholder="e.g. متحف بغداد"
                  required
                  value={formData.name_ar}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label className="form-label">
                  Categories <span className="text-destructive">*</span>
                </label>
                <div className="space-y-2 mt-2 border rounded-md p-3 bg-background">
                  {categoriesLoading ? (
                    <div className="py-4 text-center text-muted-foreground">
                      <span>Loading categories...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {categories.map((category) => (
                        <div key={category.docId} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`category-${category.docId}`}
                            value={category.docId}
                            checked={formData.categories.includes(category.docId)}
                            onChange={handleCategoryChange}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor={`category-${category.docId}`} className="text-sm font-medium">
                            {category.displayName || category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="form-hint mt-2">
                  Check all categories that apply to this listing.
                </p>
              </div>
              
              <div>
                <label htmlFor="description_en" className="form-label">
                  English Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="description_en"
                  name="description_en"
                  className="input-field w-full min-h-32"
                  placeholder="Describe this location..."
                  required
                  value={formData.description_en}
                  onChange={handleChange}
                ></textarea>
                <p className="form-hint">
                  Provide a detailed description of what visitors can expect.
                </p>
              </div>
              
              <div>
                <label htmlFor="description_ar" className="form-label">
                  Arabic Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  id="description_ar"
                  name="description_ar"
                  className="input-field w-full min-h-32"
                  placeholder="وصف هذا الموقع..."
                  required
                  value={formData.description_ar}
                  onChange={handleChange}
                ></textarea>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="featured"
                  name="featured"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={formData.featured}
                  onChange={handleChange}
                />
                <label htmlFor="featured" className="text-sm font-medium">
                  Featured Listing
                </label>
              </div>
              
              <div>
                <label htmlFor="status" className="form-label">Status</label>
                <select
                  id="status"
                  name="status"
                  className="input-select w-full"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Location Information */}
          <div className="card">
            <h2 className="text-xl font-semibold">Location Details</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Help visitors find this location.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="address_en" className="form-label">
                  English Address
                </label>
                <input
                  id="address_en"
                  name="address_en"
                  type="text"
                  className="input-field w-full"
                  placeholder="Street address"
                  value={formData.address_en}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="address_ar" className="form-label">
                  Arabic Address
                </label>
                <input
                  id="address_ar"
                  name="address_ar"
                  type="text"
                  className="input-field w-full"
                  placeholder="العنوان بالعربية"
                  value={formData.address_ar}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="city_en" className="form-label">
                  City (English)
                </label>
                <input
                  id="city_en"
                  name="city_en"
                  type="text"
                  className="input-field w-full"
                  placeholder="e.g. Baghdad"
                  value={formData.city_en}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="city_ar" className="form-label">
                  City (Arabic)
                </label>
                <input
                  id="city_ar"
                  name="city_ar"
                  type="text"
                  className="input-field w-full"
                  placeholder="e.g. بغداد"
                  value={formData.city_ar}
                  onChange={handleChange}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="latitude" className="form-label">
                    Latitude
                  </label>
                  <input
                    id="latitude"
                    name="latitude"
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g. 33.315241"
                    value={formData.latitude}
                    onChange={handleChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="longitude" className="form-label">
                    Longitude
                  </label>
                  <input
                    id="longitude"
                    name="longitude"
                    type="text"
                    className="input-field w-full"
                    placeholder="e.g. 44.366222"
                    value={formData.longitude}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="pt-3">
                <div className="h-40 bg-muted rounded-md flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="form-hint mt-2">
                  Location preview will be shown here.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact Information & Image Upload */}
        <div className="dashboard-grid md:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-xl font-semibold">Contact Information</h2>
            <p className="text-sm text-muted-foreground mb-6">
              How can visitors contact this location?
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="contact_email" className="form-label">
                  Email Address
                </label>
                <input
                  id="contact_email"
                  name="contact_email"
                  type="email"
                  className="input-field w-full"
                  placeholder="contact@example.com"
                  value={formData.contact_email}
                  onChange={handleChange}
                />
              </div>
              
              <div>
                <label htmlFor="contact_phone" className="form-label">
                  Phone Number
                </label>
                <input
                  id="contact_phone"
                  name="contact_phone"
                  type="text"
                  className="input-field w-full"
                  placeholder="+964 XXX XXX XXXX"
                  value={formData.contact_phone}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-semibold">Listing Images</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Manage images for this listing.
            </p>
            
            <ListingImageManager 
              listingId={listingId}
              onImagesChange={handleImagesChange}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Link
            href="/dashboard/listings"
            className="btn btn-outline"
          >
            Cancel
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setShouldRefresh(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
} 