import { useState, useRef, FormEvent, useEffect, useCallback, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  MapPin,
  ImagePlus,
} from "lucide-react";
import { useSupabaseRow, useSupabaseTable } from "@/hooks/use-supabase";
import { ListingImageManager } from "@/components/ListingImageManager";
import { ListingMedia } from "@/hooks/use-listing-images";
import { useCategories, Category } from "@/hooks/use-categories";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// --- NEW Interfaces based on Schema Dump ---
interface Listing {
  id?: string;
  location: string;
  google_maps_link?: string | null;
  tags?: string[] | null;
  photos_videos?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  location_id?: string | null;
  created_at?: string;
  updated_at?: string;
  listing_type: string;
}

interface ListingTranslation {
  id?: string;
  listing_id: string;
  language_code: string;
  name: string;
  description?: string | null;
  opening_hours?: string | null;
  popular_stores?: string[] | null;
  entertainment?: string[] | null;
  dining_options?: string[] | null;
  special_services?: string[] | null;
  nearby_attractions?: string[] | null;
  parking_info?: string | null;
  cuisine_type?: string | null;
  story_behind?: string | null;
  menu_highlights?: string[] | null;
  price_range?: string | null;
  dietary_options?: string[] | null;
  reservation_info?: string | null;
  seating_options?: string[] | null;
  special_features?: string[] | null;
  historical_significance?: string | null;
  entry_fee?: string | null;
  best_time_to_visit?: string | null;
  tour_guide_availability?: string | null;
  tips?: string | null;
  activities?: string[] | null;
  facilities?: string[] | null;
  safety_tips?: string | null;
  duration?: string | null;
  highlights?: string[] | null;
  religious_significance?: string | null;
  entry_rules?: string | null;
  slug?: string | null;
}

// Keep DisplayCategory for checkbox mapping
interface DisplayCategory extends Category {
  name_en?: string;
  name_ar?: string;
}
// --- End of Interfaces ---

interface ListingCategoryLink {
  id?: string;
  listing_id: string;
  category_id: string;
}

interface EditListingFormProps {
  listingId: string;
}

// --- Define Listing Types (Copy from NewListingForm if needed) ---
const LISTING_TYPES = [
  // { value: "", label: "-- Select Listing Type --" }, // No empty value SelectItem
  { value: "Shop/Mall", label: "Shop / Mall" },
  { value: "Restaurant/Café", label: "Restaurant / Café" },
  { value: "Historical Site", label: "Historical Site" },
  { value: "Park/Nature", label: "Park / Nature" },
  { value: "Experience", label: "Experience" },
  { value: "Museum", label: "Museum" },
  { value: "Religious Site", label: "Religious Site" },
  { value: "Other", label: "Other" },
];

export function EditListingForm({ listingId }: EditListingFormProps) {
  console.log(`%c[EditListingForm] Rendering/Mounting - ID: ${listingId}`, 'color: blue; font-weight: bold;'); 
  // --- Log listingId prop on render ---
  console.log("[EditListingForm] listingId prop:", listingId);
  // -----------------------------------

  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { supabase, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [translationEn, setTranslationEn] = useState<ListingTranslation | null>(
    null
  );
  const [translationAr, setTranslationAr] = useState<ListingTranslation | null>(
    null
  );
  const [existingCategoryLinks, setExistingCategoryLinks] = useState<
    ListingCategoryLink[]
  >([]);
  const [displayCategories, setDisplayCategories] = useState<DisplayCategory[]>(
    []
  );
  
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);
  
  const [formData, setFormData] = useState({
    // Listings Table Fields
    location: "",
    google_maps_link: "",
    latitude: "",
    longitude: "",
    location_id: null as string | null,
    tags: "", // Array represented as comma-separated string
    listing_type: "",

    // Listing Translations Fields (EN)
    name_en: "",
    description_en: "",
    opening_hours_en: "",
    popular_stores_en: "",
    entertainment_en: "",
    dining_options_en: "",
    special_services_en: "",
    nearby_attractions_en: "",
    parking_info_en: "",
    cuisine_type_en: "",
    story_behind_en: "",
    menu_highlights_en: "",
    price_range_en: "",
    dietary_options_en: "",
    reservation_info_en: "",
    seating_options_en: "",
    special_features_en: "",
    historical_significance_en: "",
    entry_fee_en: "",
    best_time_to_visit_en: "",
    tour_guide_availability_en: "",
    tips_en: "",
    activities_en: "",
    facilities_en: "",
    safety_tips_en: "",
    duration_en: "",
    highlights_en: "",
    religious_significance_en: "",
    entry_rules_en: "",
    slug_en: "",

    // Listing Translations Fields (AR)
    name_ar: "",
    description_ar: "",
    opening_hours_ar: "",
    popular_stores_ar: "",
    entertainment_ar: "",
    dining_options_ar: "",
    special_services_ar: "",
    nearby_attractions_ar: "",
    parking_info_ar: "",
    cuisine_type_ar: "",
    story_behind_ar: "",
    menu_highlights_ar: "",
    price_range_ar: "",
    dietary_options_ar: "",
    reservation_info_ar: "",
    seating_options_ar: "",
    special_features_ar: "",
    historical_significance_ar: "",
    entry_fee_ar: "",
    best_time_to_visit_ar: "",
    tour_guide_availability_ar: "",
    tips_ar: "",
    activities_ar: "",
    facilities_ar: "",
    safety_tips_ar: "",
    duration_ar: "",
    highlights_ar: "",
    religious_significance_ar: "",
    entry_rules_ar: "",
    slug_ar: "",

    // Other Fields
    categoryIds: [] as string[],
  });

  // --- Log formData right after useState ---
  console.log("[EditListingForm] formData state immediately after useState:", JSON.stringify(formData).substring(0, 100) + "...");
  // ----------------------------------------

  // --- Log formData on every render --- 
  // console.log("[EditListingForm] Current formData.name_en on render:", formData.name_en);
  // console.log("[EditListingForm] Current formData.listing_type on render:", formData.listing_type);
  // ------------------------------------

  const { 
    data: listing, 
    status: listingStatus,
    error: listingError,
    refresh: refreshListing,
    update: updateListingRow,
  } = useSupabaseRow("listings", listingId);

  const {
    data: allTranslations,
    status: translationsStatus,
    error: translationsError,
  } = useSupabaseTable("listing_translations");

  const {
    data: allCategoryLinks,
    status: linksStatus,
    error: linksError,
    add: addListingCategoryLink,
    remove: removeListingCategoryLink,
  } = useSupabaseTable("listing_categories");

  const {
    categories: baseCategories,
    loading: categoriesLoading,
    error: categoriesError,
  } = useCategories();

  const {
    data: allCategoryTranslations,
    status: categoryTranslationsStatus,
    error: categoryTranslationsError,
  } = useSupabaseTable("category_translations");

  const loading =
    authLoading ||
    listingStatus === "loading" ||
    listingStatus === "idle" ||
    translationsStatus === "loading" ||
    translationsStatus === "idle" ||
    linksStatus === "loading" ||
    linksStatus === "idle" ||
    categoriesLoading ||
    categoryTranslationsStatus === "loading" ||
    categoryTranslationsStatus === "idle";
  const combinedError =
    listingError ||
    translationsError ||
    linksError ||
    categoriesError ||
    categoryTranslationsError;

  // --- Effect to find specific translations and category links for this listing ---
  // This effect now ONLY sets the intermediate state. 
  // The form population effect will use the raw data.
  useEffect(() => {
    // ... (existing logic to find en, ar, links and call setTranslationEn/Ar/ExistingCategoryLinks) ...
    // This part remains the same
    console.log(`%c[EditListingForm] Running effect to find translations/links - Listing ID: ${listingId}`, 'color: teal');
    if (allTranslations && listingId) {
      console.log("[EditListingForm] All translations available, finding specific ones...");
      const en = allTranslations.find(
        (t) => t.listing_id === listingId && t.language_code === "en"
      ) as ListingTranslation | null;
      const ar = allTranslations.find(
        (t) => t.listing_id === listingId && t.language_code === "ar"
      ) as ListingTranslation | null;
      console.log("[EditListingForm] Found EN:", en ? 'Yes' : 'No', "Found AR:", ar ? 'Yes' : 'No');
      setTranslationEn(en);
      setTranslationAr(ar);
    } else {
      console.log("[EditListingForm] All translations not yet available or no listingId.");
      setTranslationEn(null); // Reset if listingId changes or translations disappear
      setTranslationAr(null);
    }

    if (allCategoryLinks && listingId) {
      console.log("[EditListingForm] All category links available, finding specific ones...");
      const links = allCategoryLinks.filter(
        (link) => link.listing_id === listingId
      ) as ListingCategoryLink[];
       console.log(`[EditListingForm] Found ${links.length} category links for this listing.`);
      setExistingCategoryLinks(links);
    } else {
       console.log("[EditListingForm] All category links not yet available or no listingId.");
      setExistingCategoryLinks([]); // Reset
    }
  }, [allTranslations, allCategoryLinks, listingId]);

  // --- Effect to Populate Form Data on Initial Load (REVISED) ---
  useEffect(() => {
    console.log(`%c[EditListingForm] Running REVISED effect to populate form data`, 'color: green');
    console.log("[EditListingForm] Dependencies for REVISED populate effect:", {
        listingExists: !!listing,
        allTranslationsExist: !!allTranslations,
        allCategoryLinksExist: !!allCategoryLinks,
        isInitialDataLoaded
    });

    // Populate only if base listing data exists AND initial load hasn't happened
    if (listing && !isInitialDataLoaded && allTranslations && allCategoryLinks) {
       console.log('[EditListingForm] REVISED: Dependencies met, attempting to populate...');

       // Re-find translations and links directly within this effect
       const en = allTranslations.find(t => t.listing_id === listingId && t.language_code === 'en');
       const ar = allTranslations.find(t => t.listing_id === listingId && t.language_code === 'ar');
       const links = allCategoryLinks.filter(link => link.listing_id === listingId);
       const currentCategoryIds = links.map(link => link.category_id);

       // Only proceed if all pieces are found
       if (en && ar && links) {
          console.log('[EditListingForm] REVISED: Found en, ar, links. Preparing initialFormData...');
          const joinArray = (arr: string[] | null | undefined): string => arr ? arr.join(', ') : '';

          // --- Reconstruct initialFormData using en, ar, listing --- 
          // (Ensure ALL fields from the original state are populated here)
          const initialFormData = {
            // Listing fields
            location: listing.location || "",
            google_maps_link: listing.google_maps_link || "",
            latitude: listing.latitude?.toString() || "",
            longitude: listing.longitude?.toString() || "",
            location_id: listing.location_id || null,
            tags: joinArray(listing.tags),
            listing_type: (listing as Listing).listing_type || "",
            
            // English Translation fields (using 'en')
            name_en: en.name || "",
            description_en: en.description || "",
            opening_hours_en: en.opening_hours || "",
            popular_stores_en: joinArray(en.popular_stores),
            entertainment_en: joinArray(en.entertainment),
            dining_options_en: joinArray(en.dining_options),
            special_services_en: joinArray(en.special_services),
            nearby_attractions_en: joinArray(en.nearby_attractions),
            parking_info_en: en.parking_info || "",
            cuisine_type_en: en.cuisine_type || "",
            story_behind_en: en.story_behind || "",
            menu_highlights_en: joinArray(en.menu_highlights),
            price_range_en: en.price_range || "",
            dietary_options_en: joinArray(en.dietary_options),
            reservation_info_en: en.reservation_info || "",
            seating_options_en: joinArray(en.seating_options),
            special_features_en: joinArray(en.special_features),
            historical_significance_en: en.historical_significance || "",
            entry_fee_en: en.entry_fee || "",
            best_time_to_visit_en: en.best_time_to_visit || "",
            tour_guide_availability_en: en.tour_guide_availability || "",
            tips_en: en.tips || "",
            activities_en: joinArray(en.activities),
            facilities_en: joinArray(en.facilities),
            safety_tips_en: en.safety_tips || "",
            duration_en: en.duration || "",
            highlights_en: joinArray(en.highlights),
            religious_significance_en: en.religious_significance || "",
            entry_rules_en: en.entry_rules || "",
            slug_en: en.slug || "",

            // Arabic Translation fields (using 'ar')
            name_ar: ar.name || "",
            description_ar: ar.description || "",
            opening_hours_ar: ar.opening_hours || "",
            popular_stores_ar: joinArray(ar.popular_stores),
            entertainment_ar: joinArray(ar.entertainment),
            dining_options_ar: joinArray(ar.dining_options),
            special_services_ar: joinArray(ar.special_services),
            nearby_attractions_ar: joinArray(ar.nearby_attractions),
            parking_info_ar: ar.parking_info || "",
            cuisine_type_ar: ar.cuisine_type || "",
            story_behind_ar: ar.story_behind || "",
            menu_highlights_ar: joinArray(ar.menu_highlights),
            price_range_ar: ar.price_range || "",
            dietary_options_ar: joinArray(ar.dietary_options),
            reservation_info_ar: ar.reservation_info || "",
            seating_options_ar: joinArray(ar.seating_options),
            special_features_ar: joinArray(ar.special_features),
            historical_significance_ar: ar.historical_significance || "",
            entry_fee_ar: ar.entry_fee || "",
            best_time_to_visit_ar: ar.best_time_to_visit || "",
            tour_guide_availability_ar: ar.tour_guide_availability || "",
            tips_ar: ar.tips || "",
            activities_ar: joinArray(ar.activities),
            facilities_ar: joinArray(ar.facilities),
            safety_tips_ar: ar.safety_tips || "",
            duration_ar: ar.duration || "",
            highlights_ar: joinArray(ar.highlights),
            religious_significance_ar: ar.religious_significance || "",
            entry_rules_ar: ar.entry_rules || "",
            slug_ar: ar.slug || "",

            // Category IDs
            categoryIds: currentCategoryIds,
          };
          // --- End Reconstruction ---

          console.log(`%c[EditListingForm] REVISED: Setting initial formData.listing_type to: ${initialFormData.listing_type}`, "color: blue; background: #eee;");
          console.log("%c[EditListingForm] REVISED: Calling setFormData from initial population useEffect", "color: orange");
          setFormData(initialFormData);
          setIsInitialDataLoaded(true); // Set flag after initial population
       } else {
          console.warn('[EditListingForm] REVISED: Could not find required translations or links even though base data is present. Form data not set.');
       }
    } else {
       console.log('[EditListingForm] REVISED: Conditions not met for population (missing listing, already loaded, or missing raw translation/link data)');
    }
  // Depend only on raw data sources, the flag, and listingId
  }, [listing, allTranslations, allCategoryLinks, isInitialDataLoaded, listingId]);

  // Effect to combine categories and translations
  useEffect(() => {
    if (baseCategories && allCategoryTranslations) {
      const combined = baseCategories.map((cat) => {
        const en = allCategoryTranslations.find(
          (t) => t.category_id === cat.id && t.language_code === "en"
        );
        const ar = allCategoryTranslations.find(
          (t) => t.category_id === cat.id && t.language_code === "ar"
        );
        return {
          ...cat,
          name_en: en?.name,
          name_ar: ar?.name,
        } as DisplayCategory;
      });
      combined.sort((a, b) => (a.name_en ?? "").localeCompare(b.name_en ?? ""));
      setDisplayCategories(combined);
    }
  }, [baseCategories, allCategoryTranslations]);

  // Wrap handleChange with useCallback
  const handleChange = useCallback((
    e: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    
    console.log(`%c[EditListingForm] Calling setFormData from handleChange for field: ${name}`, "color: orange");
    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  }, []);

  // Wrap handleCategoryChange with useCallback
  const handleCategoryChange = useCallback((categoryId: string, checked: boolean) => {
    console.log(`%c[EditListingForm] Calling setFormData from handleCategoryChange for categoryId: ${categoryId}`, "color: orange");
    setFormData((prev) => {
      let newCategoryIds = [...prev.categoryIds];

      if (checked && !newCategoryIds.includes(categoryId)) {
        newCategoryIds.push(categoryId);
      } else if (!checked && newCategoryIds.includes(categoryId)) {
        newCategoryIds = newCategoryIds.filter((catId) => catId !== categoryId);
      }
      
      return {
        ...prev,
        categoryIds: newCategoryIds,
      };
    });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !supabase ||
      !updateListingRow ||
      !addListingCategoryLink ||
      !removeListingCategoryLink ||
      !translationEn?.id ||
      !translationAr?.id
    ) {
      setErrorMessage(
        "Data update functions, client, or translation IDs not ready."
      );
      return;
    }
    setSaving(true);
    setErrorMessage(null);

    // Helper function to parse comma-separated string to array or null
    const parseArray = (input: string): string[] | null => {
      const trimmed = input.trim();
      return trimmed ? trimmed.split(",").map((s) => s.trim()) : null;
    };

    try {
      // 1. Prepare data for the 'listings' table update
      const listingUpdateData: Partial<
        Omit<Listing, "id" | "created_at" | "updated_at">
      > = {
        location: formData.location, // Required field
        google_maps_link: formData.google_maps_link || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        location_id: formData.location_id || null,
        tags: parseArray(formData.tags), // Parse array
        listing_type: formData.listing_type,
      };
      // Add validation
      if (!listingUpdateData.location) {
        throw new Error("Location field is required.");
      }

      // 2. Update the base listing
      await updateListingRow(listingUpdateData);

      // 3. Prepare English translation update data
      const translationEnUpdateData: Partial<
        Omit<ListingTranslation, "id" | "listing_id" | "language_code">
      > = {
        name: formData.name_en, // Required field
        description: formData.description_en || null,
        opening_hours: formData.opening_hours_en || null,
        popular_stores: parseArray(formData.popular_stores_en),
        entertainment: parseArray(formData.entertainment_en),
        dining_options: parseArray(formData.dining_options_en),
        special_services: parseArray(formData.special_services_en),
        nearby_attractions: parseArray(formData.nearby_attractions_en),
        parking_info: formData.parking_info_en || null,
        cuisine_type: formData.cuisine_type_en || null,
        story_behind: formData.story_behind_en || null,
        menu_highlights: parseArray(formData.menu_highlights_en),
        price_range: formData.price_range_en || null,
        dietary_options: parseArray(formData.dietary_options_en),
        reservation_info: formData.reservation_info_en || null,
        seating_options: parseArray(formData.seating_options_en),
        special_features: parseArray(formData.special_features_en),
        historical_significance: formData.historical_significance_en || null,
        entry_fee: formData.entry_fee_en || null,
        best_time_to_visit: formData.best_time_to_visit_en || null,
        tour_guide_availability: formData.tour_guide_availability_en || null,
        tips: formData.tips_en || null,
        activities: parseArray(formData.activities_en),
        facilities: parseArray(formData.facilities_en),
        safety_tips: formData.safety_tips_en || null,
        duration: formData.duration_en || null,
        highlights: parseArray(formData.highlights_en),
        religious_significance: formData.religious_significance_en || null,
        entry_rules: formData.entry_rules_en || null,
        slug: formData.slug_en || null,
      };
      // Add validation
      if (!translationEnUpdateData.name) {
        throw new Error("English Name field is required.");
      }

      // Update English Translation Row
      const { error: updateEnError } = await supabase
        .from("listing_translations")
        .update(translationEnUpdateData)
        .eq("id", translationEn.id);
      if (updateEnError)
        console.warn("Failed to update EN translation:", updateEnError);

      // 4. Prepare Arabic translation update data
      const translationArUpdateData: Partial<
        Omit<ListingTranslation, "id" | "listing_id" | "language_code">
      > = {
        name: formData.name_ar, // Required field
        description: formData.description_ar || null,
        opening_hours: formData.opening_hours_ar || null,
        popular_stores: parseArray(formData.popular_stores_ar),
        entertainment: parseArray(formData.entertainment_ar),
        dining_options: parseArray(formData.dining_options_ar),
        special_services: parseArray(formData.special_services_ar),
        nearby_attractions: parseArray(formData.nearby_attractions_ar),
        parking_info: formData.parking_info_ar || null,
        cuisine_type: formData.cuisine_type_ar || null,
        story_behind: formData.story_behind_ar || null,
        menu_highlights: parseArray(formData.menu_highlights_ar),
        price_range: formData.price_range_ar || null,
        dietary_options: parseArray(formData.dietary_options_ar),
        reservation_info: formData.reservation_info_ar || null,
        seating_options: parseArray(formData.seating_options_ar),
        special_features: parseArray(formData.special_features_ar),
        historical_significance: formData.historical_significance_ar || null,
        entry_fee: formData.entry_fee_ar || null,
        best_time_to_visit: formData.best_time_to_visit_ar || null,
        tour_guide_availability: formData.tour_guide_availability_ar || null,
        tips: formData.tips_ar || null,
        activities: parseArray(formData.activities_ar),
        facilities: parseArray(formData.facilities_ar),
        safety_tips: formData.safety_tips_ar || null,
        duration: formData.duration_ar || null,
        highlights: parseArray(formData.highlights_ar),
        religious_significance: formData.religious_significance_ar || null,
        entry_rules: formData.entry_rules_ar || null,
        slug: formData.slug_ar || null,
      };
      // Add validation
      if (!translationArUpdateData.name) {
        throw new Error("Arabic Name field is required.");
      }

      // Update Arabic Translation Row
      const { error: updateArError } = await supabase
        .from("listing_translations")
        .update(translationArUpdateData)
        .eq("id", translationAr.id);
      if (updateArError)
        console.warn("Failed to update AR translation:", updateArError);

      // 5. Update 'listing_categories' join table
      const currentCategoryIds = new Set(
        existingCategoryLinks.map((link) => link.category_id)
      );
      const selectedCategoryIds = new Set(formData.categoryIds);

      const categoriesToAdd = formData.categoryIds.filter(
        (id) => !currentCategoryIds.has(id)
      );
      const linksToRemove = existingCategoryLinks.filter(
        (link) => !selectedCategoryIds.has(link.category_id)
      );

      // Add new links
      if (categoriesToAdd.length > 0) {
        const addPromises = categoriesToAdd.map((catId) =>
          addListingCategoryLink({ listing_id: listingId, category_id: catId })
        );
        await Promise.all(addPromises);
        // Consider adding error handling for individual additions if needed
      }

      // Remove old links (using the ID of the join table row)
      if (linksToRemove.length > 0) {
        const removePromises = linksToRemove.map((link) =>
          link.id ? removeListingCategoryLink(link.id) : Promise.resolve() // Check if link.id exists
        );
        await Promise.all(removePromises);
        // Consider adding error handling for individual removals if needed
      }

      console.log("Listing update successful, redirecting...");
      router.push("/dashboard/listings"); // Redirect on success
    } catch (err: any) {
      console.error("Error updating listing:", err);
      const message =
        err.message || "Failed to update listing. Please try again.";
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Mount/Unmount Effect ---
  useEffect(() => {
    console.log(`%c[EditListingForm] MOUNTED - ID: ${listingId}`, 'color: green; font-weight: bold;');
    
    // Cleanup function
    return () => {
      console.log(`%c[EditListingForm] UNMOUNTING - ID: ${listingId}`, 'color: red; font-weight: bold;');
    };
  }, [listingId]); // Re-run if listingId changes (shouldn't normally happen on edit page)
  // --- End Mount/Unmount Effect ---

  // --- Log errors before check ---
  console.log("[EditListingForm] Checking errors before render:", { 
      combinedError: !!combinedError, // Log if combinedError is truthy
      listingError: !!listingError, 
      translationsError: !!translationsError, 
      linksError: !!linksError, 
      categoriesError: !!categoriesError, 
      categoryTranslationsError: !!categoryTranslationsError 
  });
  // -----------------------------

  if (combinedError) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <p>Error loading listing data: {combinedError.message}</p>
      </div>
    );
  }

  // Only show full-page loader during *initial* data load
  if (loading && !isInitialDataLoaded) { 
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading listing data...</span>
      </div>
    );
  }

  console.log(`%c[EditListingForm] Rendering with formData.listing_type: ${formData.listing_type}`, "color: purple"); // <-- Log current value on render

  return (
    <>
      {/* Error message display */}
      {errorMessage && (
         <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg flex items-center gap-2 mb-6">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{errorMessage}</p>
          <button 
            className="ml-auto hover:text-destructive/80"
            onClick={() => setErrorMessage(null)}
            aria-label="Close error message"
          >
            &times;
          </button>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
        
         {/* --- Core Listing Details Card --- */}
          <Card>
            <CardHeader><CardTitle>Core Listing Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Listing Type */}
                 <div className="space-y-2">
                    <Label htmlFor="listing_type">Listing Type *</Label>
                    <Select 
                        name="listing_type" 
                        onValueChange={(value: string) => handleChange({ target: { name: 'listing_type', value } } as any)} 
                        value={formData.listing_type}
                    >
                        <SelectTrigger id="listing_type">
                            <SelectValue placeholder="Select Listing Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {LISTING_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                 {/* Location Name */}
                <div className="space-y-2">
                    <Label htmlFor="location">Location Name *</Label>
                    <Input id="location" name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Central Park Mall" required />
                </div>

                 {/* Google Maps Link */}
                 <div className="space-y-2">
                    <Label htmlFor="google_maps_link">Google Maps Link</Label>
                    <Input id="google_maps_link" name="google_maps_link" type="url" value={formData.google_maps_link} onChange={handleChange} placeholder="https://maps.app.goo.gl/..." />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., family-friendly, outdoor, shopping" />
                </div>

                {/* Latitude */}
                 <div className="space-y-2">
                    <Label htmlFor="latitude">Latitude</Label>
                    <Input id="latitude" name="latitude" type="number" step="any" value={formData.latitude} onChange={handleChange} placeholder="e.g., 24.7136" />
                </div>

                {/* Longitude */}
                 <div className="space-y-2">
                    <Label htmlFor="longitude">Longitude</Label>
                    <Input id="longitude" name="longitude" type="number" step="any" value={formData.longitude} onChange={handleChange} placeholder="e.g., 46.6753" />
                </div>
            </CardContent>
          </Card>

         {/* Images Card */}
          <Card>
            <CardHeader><CardTitle>Listing Images</CardTitle></CardHeader>
            <CardContent>
               <p className="text-sm text-muted-foreground mb-4">
                 Manage existing images or upload new ones for this listing.
               </p>
              <ListingImageManager listingId={listingId} />
            </CardContent>
          </Card>
          
        {/* --- Side-by-Side Language Container --- */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* --- English Content Card --- */}
             <Card>
               <CardHeader><CardTitle>English Content</CardTitle></CardHeader>
               <CardContent className="grid grid-cols-1 gap-6">
                   {/* === Always Shown Fields === */}
                   <div className="space-y-2">
                       <Label htmlFor="name_en">Name (English) *</Label>
                       <Input id="name_en" name="name_en" value={formData.name_en} onChange={handleChange} required />
                   </div>
                   <div className="space-y-2">
                       <Label htmlFor="slug_en">Slug (English)</Label>
                       <Input id="slug_en" name="slug_en" value={formData.slug_en} onChange={handleChange} />
                   </div>
                   <div className="space-y-2">
                       <Label htmlFor="description_en">Description (English)</Label>
                       <Textarea id="description_en" name="description_en" value={formData.description_en} onChange={handleChange} />
                   </div>
                    <div className="space-y-2">
                       <Label htmlFor="opening_hours_en">Opening Hours (English)</Label>
                       <Input id="opening_hours_en" name="opening_hours_en" value={formData.opening_hours_en} onChange={handleChange} />
                   </div>

                    {/* === Shop/Mall Specific Fields === */}
                    {formData.listing_type === 'Shop/Mall' && (
                        <>
                           <div className="space-y-2"><Label htmlFor="popular_stores_en">Popular Stores (English, comma-separated)</Label><Input id="popular_stores_en" name="popular_stores_en" value={formData.popular_stores_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entertainment_en">Entertainment (English, comma-separated)</Label><Input id="entertainment_en" name="entertainment_en" value={formData.entertainment_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="dining_options_en">Dining Options (English, comma-separated)</Label><Input id="dining_options_en" name="dining_options_en" value={formData.dining_options_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="special_services_en">Special Services (English, comma-separated)</Label><Input id="special_services_en" name="special_services_en" value={formData.special_services_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English, comma-separated)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                       </>
                    )}

                    {/* === Restaurant/Café Specific Fields === */}
                   {formData.listing_type === 'Restaurant/Café' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="cuisine_type_en">Cuisine Type (English)</Label><Input id="cuisine_type_en" name="cuisine_type_en" value={formData.cuisine_type_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="story_behind_en">Story Behind (English)</Label><Textarea id="story_behind_en" name="story_behind_en" value={formData.story_behind_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="menu_highlights_en">Menu Highlights (English, comma-separated)</Label><Input id="menu_highlights_en" name="menu_highlights_en" value={formData.menu_highlights_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="price_range_en">Price Range (English)</Label><Input id="price_range_en" name="price_range_en" value={formData.price_range_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="dietary_options_en">Dietary Options (English, comma-separated)</Label><Input id="dietary_options_en" name="dietary_options_en" value={formData.dietary_options_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="reservation_info_en">Reservation Info (English)</Label><Input id="reservation_info_en" name="reservation_info_en" value={formData.reservation_info_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="seating_options_en">Seating Options (English, comma-separated)</Label><Input id="seating_options_en" name="seating_options_en" value={formData.seating_options_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="special_features_en">Special Features (English, comma-separated)</Label><Input id="special_features_en" name="special_features_en" value={formData.special_features_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English, comma-separated)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Historical Site Specific Fields === */}
                   {formData.listing_type === 'Historical Site' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="historical_significance_en">Historical Significance (English)</Label><Textarea id="historical_significance_en" name="historical_significance_en" value={formData.historical_significance_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_fee_en">Entry Fee (English)</Label><Input id="entry_fee_en" name="entry_fee_en" value={formData.entry_fee_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_en">Best Time to Visit (English)</Label><Input id="best_time_to_visit_en" name="best_time_to_visit_en" value={formData.best_time_to_visit_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tour_guide_availability_en">Tour Guide Availability (English)</Label><Input id="tour_guide_availability_en" name="tour_guide_availability_en" value={formData.tour_guide_availability_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_en">Tips (English)</Label><Textarea id="tips_en" name="tips_en" value={formData.tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_en">Facilities (English, comma-separated)</Label><Input id="facilities_en" name="facilities_en" value={formData.facilities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English, comma-separated)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Park/Nature Specific Fields === */}
                   {formData.listing_type === 'Park/Nature' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="activities_en">Activities (English, comma-separated)</Label><Input id="activities_en" name="activities_en" value={formData.activities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_en">Facilities (English, comma-separated)</Label><Input id="facilities_en" name="facilities_en" value={formData.facilities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="safety_tips_en">Safety Tips (English)</Label><Textarea id="safety_tips_en" name="safety_tips_en" value={formData.safety_tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_en">Best Time to Visit (English)</Label><Input id="best_time_to_visit_en" name="best_time_to_visit_en" value={formData.best_time_to_visit_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_fee_en">Entry Fee (English)</Label><Input id="entry_fee_en" name="entry_fee_en" value={formData.entry_fee_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English, comma-separated)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Experience Specific Fields === */}
                   {formData.listing_type === 'Experience' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="duration_en">Duration (English)</Label><Input id="duration_en" name="duration_en" value={formData.duration_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="highlights_en">Highlights (English, comma-separated)</Label><Input id="highlights_en" name="highlights_en" value={formData.highlights_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="price_range_en">Price Range (English)</Label><Input id="price_range_en" name="price_range_en" value={formData.price_range_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_en">Tips (English)</Label><Textarea id="tips_en" name="tips_en" value={formData.tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="safety_tips_en">Safety Tips (English)</Label><Textarea id="safety_tips_en" name="safety_tips_en" value={formData.safety_tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English, comma-separated)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Museum Specific Fields === */}
                   {formData.listing_type === 'Museum' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="entry_fee_en">Entry Fee (English)</Label><Input id="entry_fee_en" name="entry_fee_en" value={formData.entry_fee_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_en">Best Time to Visit (English)</Label><Input id="best_time_to_visit_en" name="best_time_to_visit_en" value={formData.best_time_to_visit_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tour_guide_availability_en">Tour Guide Availability (English)</Label><Input id="tour_guide_availability_en" name="tour_guide_availability_en" value={formData.tour_guide_availability_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_en">Tips (English)</Label><Textarea id="tips_en" name="tips_en" value={formData.tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_en">Facilities (English, comma-separated)</Label><Input id="facilities_en" name="facilities_en" value={formData.facilities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English, comma-separated)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="highlights_en">Highlights (English, comma-separated)</Label><Input id="highlights_en" name="highlights_en" value={formData.highlights_en} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Religious Site Specific Fields === */}
                   {formData.listing_type === 'Religious Site' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="religious_significance_en">Religious Significance (English)</Label><Textarea id="religious_significance_en" name="religious_significance_en" value={formData.religious_significance_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_rules_en">Entry Rules (English)</Label><Textarea id="entry_rules_en" name="entry_rules_en" value={formData.entry_rules_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_en">Best Time to Visit (English)</Label><Input id="best_time_to_visit_en" name="best_time_to_visit_en" value={formData.best_time_to_visit_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_en">Tips (English)</Label><Textarea id="tips_en" name="tips_en" value={formData.tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_en">Facilities (English, comma-separated)</Label><Input id="facilities_en" name="facilities_en" value={formData.facilities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English, comma-separated)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                       </>
                   )}
               </CardContent>
             </Card>

             {/* --- Arabic Content Card --- */}
             <Card>
               <CardHeader><CardTitle>Arabic Content</CardTitle></CardHeader>
               <CardContent className="grid grid-cols-1 gap-6">
                  {/* === Always Shown Fields === */}
                  <div className="space-y-2"><Label htmlFor="name_ar">Name (Arabic) *</Label><Input dir="rtl" id="name_ar" name="name_ar" value={formData.name_ar} onChange={handleChange} required /></div>
                  <div className="space-y-2"><Label htmlFor="slug_ar">Slug (Arabic)</Label><Input dir="rtl" id="slug_ar" name="slug_ar" value={formData.slug_ar} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label htmlFor="description_ar">Description (Arabic)</Label><Textarea dir="rtl" id="description_ar" name="description_ar" value={formData.description_ar} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label htmlFor="opening_hours_ar">Opening Hours (Arabic)</Label><Input dir="rtl" id="opening_hours_ar" name="opening_hours_ar" value={formData.opening_hours_ar} onChange={handleChange} /></div>

                  {/* === Shop/Mall Specific Fields === */}
                   {formData.listing_type === 'Shop/Mall' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="popular_stores_ar">Popular Stores (Arabic, comma-separated)</Label><Input dir="rtl" id="popular_stores_ar" name="popular_stores_ar" value={formData.popular_stores_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entertainment_ar">Entertainment (Arabic, comma-separated)</Label><Input dir="rtl" id="entertainment_ar" name="entertainment_ar" value={formData.entertainment_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="dining_options_ar">Dining Options (Arabic, comma-separated)</Label><Input dir="rtl" id="dining_options_ar" name="dining_options_ar" value={formData.dining_options_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="special_services_ar">Special Services (Arabic, comma-separated)</Label><Input dir="rtl" id="special_services_ar" name="special_services_ar" value={formData.special_services_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic, comma-separated)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                       </>
                   )}

                  {/* === Restaurant/Café Specific Fields === */}
                   {formData.listing_type === 'Restaurant/Café' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="cuisine_type_ar">Cuisine Type (Arabic)</Label><Input dir="rtl" id="cuisine_type_ar" name="cuisine_type_ar" value={formData.cuisine_type_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="story_behind_ar">Story Behind (Arabic)</Label><Textarea dir="rtl" id="story_behind_ar" name="story_behind_ar" value={formData.story_behind_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="menu_highlights_ar">Menu Highlights (Arabic, comma-separated)</Label><Input dir="rtl" id="menu_highlights_ar" name="menu_highlights_ar" value={formData.menu_highlights_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="price_range_ar">Price Range (Arabic)</Label><Input dir="rtl" id="price_range_ar" name="price_range_ar" value={formData.price_range_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="dietary_options_ar">Dietary Options (Arabic, comma-separated)</Label><Input dir="rtl" id="dietary_options_ar" name="dietary_options_ar" value={formData.dietary_options_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="reservation_info_ar">Reservation Info (Arabic)</Label><Input dir="rtl" id="reservation_info_ar" name="reservation_info_ar" value={formData.reservation_info_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="seating_options_ar">Seating Options (Arabic, comma-separated)</Label><Input dir="rtl" id="seating_options_ar" name="seating_options_ar" value={formData.seating_options_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="special_features_ar">Special Features (Arabic, comma-separated)</Label><Input dir="rtl" id="special_features_ar" name="special_features_ar" value={formData.special_features_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic, comma-separated)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Historical Site Specific Fields === */}
                   {formData.listing_type === 'Historical Site' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="historical_significance_ar">Historical Significance (Arabic)</Label><Textarea dir="rtl" id="historical_significance_ar" name="historical_significance_ar" value={formData.historical_significance_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_fee_ar">Entry Fee (Arabic)</Label><Input dir="rtl" id="entry_fee_ar" name="entry_fee_ar" value={formData.entry_fee_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_ar">Best Time to Visit (Arabic)</Label><Input dir="rtl" id="best_time_to_visit_ar" name="best_time_to_visit_ar" value={formData.best_time_to_visit_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tour_guide_availability_ar">Tour Guide Availability (Arabic)</Label><Input dir="rtl" id="tour_guide_availability_ar" name="tour_guide_availability_ar" value={formData.tour_guide_availability_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_ar">Tips (Arabic)</Label><Textarea dir="rtl" id="tips_ar" name="tips_ar" value={formData.tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_ar">Facilities (Arabic, comma-separated)</Label><Input dir="rtl" id="facilities_ar" name="facilities_ar" value={formData.facilities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic, comma-separated)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Park/Nature Specific Fields === */}
                   {formData.listing_type === 'Park/Nature' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="activities_ar">Activities (Arabic, comma-separated)</Label><Input dir="rtl" id="activities_ar" name="activities_ar" value={formData.activities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_ar">Facilities (Arabic, comma-separated)</Label><Input dir="rtl" id="facilities_ar" name="facilities_ar" value={formData.facilities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="safety_tips_ar">Safety Tips (Arabic)</Label><Textarea dir="rtl" id="safety_tips_ar" name="safety_tips_ar" value={formData.safety_tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_ar">Best Time to Visit (Arabic)</Label><Input dir="rtl" id="best_time_to_visit_ar" name="best_time_to_visit_ar" value={formData.best_time_to_visit_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_fee_ar">Entry Fee (Arabic)</Label><Input dir="rtl" id="entry_fee_ar" name="entry_fee_ar" value={formData.entry_fee_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic, comma-separated)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Experience Specific Fields === */}
                   {formData.listing_type === 'Experience' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="duration_ar">Duration (Arabic)</Label><Input dir="rtl" id="duration_ar" name="duration_ar" value={formData.duration_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="highlights_ar">Highlights (Arabic, comma-separated)</Label><Input dir="rtl" id="highlights_ar" name="highlights_ar" value={formData.highlights_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="price_range_ar">Price Range (Arabic)</Label><Input dir="rtl" id="price_range_ar" name="price_range_ar" value={formData.price_range_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_ar">Tips (Arabic)</Label><Textarea dir="rtl" id="tips_ar" name="tips_ar" value={formData.tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="safety_tips_ar">Safety Tips (Arabic)</Label><Textarea dir="rtl" id="safety_tips_ar" name="safety_tips_ar" value={formData.safety_tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic, comma-separated)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Museum Specific Fields === */}
                   {formData.listing_type === 'Museum' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="entry_fee_ar">Entry Fee (Arabic)</Label><Input dir="rtl" id="entry_fee_ar" name="entry_fee_ar" value={formData.entry_fee_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_ar">Best Time to Visit (Arabic)</Label><Input dir="rtl" id="best_time_to_visit_ar" name="best_time_to_visit_ar" value={formData.best_time_to_visit_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tour_guide_availability_ar">Tour Guide Availability (Arabic)</Label><Input dir="rtl" id="tour_guide_availability_ar" name="tour_guide_availability_ar" value={formData.tour_guide_availability_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_ar">Tips (Arabic)</Label><Textarea dir="rtl" id="tips_ar" name="tips_ar" value={formData.tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_ar">Facilities (Arabic, comma-separated)</Label><Input dir="rtl" id="facilities_ar" name="facilities_ar" value={formData.facilities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic, comma-separated)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="highlights_ar">Highlights (Arabic, comma-separated)</Label><Input dir="rtl" id="highlights_ar" name="highlights_ar" value={formData.highlights_ar} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Religious Site Specific Fields === */}
                   {formData.listing_type === 'Religious Site' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="religious_significance_ar">Religious Significance (Arabic)</Label><Textarea dir="rtl" id="religious_significance_ar" name="religious_significance_ar" value={formData.religious_significance_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_rules_ar">Entry Rules (Arabic)</Label><Textarea dir="rtl" id="entry_rules_ar" name="entry_rules_ar" value={formData.entry_rules_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_ar">Best Time to Visit (Arabic)</Label><Input dir="rtl" id="best_time_to_visit_ar" name="best_time_to_visit_ar" value={formData.best_time_to_visit_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_ar">Tips (Arabic)</Label><Textarea dir="rtl" id="tips_ar" name="tips_ar" value={formData.tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_ar">Facilities (Arabic, comma-separated)</Label><Input dir="rtl" id="facilities_ar" name="facilities_ar" value={formData.facilities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic, comma-separated)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                       </>
                   )}
               </CardContent>
             </Card>
         </div> {/* End Side-by-Side Container */}

        {/* --- Categories Card --- */}
         <Card>
           <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
           <CardContent>
               {categoriesLoading || categoryTranslationsStatus !== "success" ? (
                   <p>Loading categories...</p>
               ) : displayCategories.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {displayCategories.map(category => (
                          <div key={category.id} className="flex items-center space-x-2">
                              <Checkbox 
                                  id={`category-${category.id}`}
                                  checked={formData.categoryIds.includes(category.id)}
                                  onCheckedChange={(checked: boolean | 'indeterminate') => handleCategoryChange(category.id, !!checked)}
                              />
                              <Label
                                  htmlFor={`category-${category.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                  {category.name_en || '(No English Name)'} / {category.name_ar || '(No Arabic Name)'}
                              </Label>
                          </div>
                      ))}
                  </div>
               ) : (
                   <p>No categories found.</p>
               )}
           </CardContent>
         </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <Link href="/dashboard/listings">
             <Button type="button" variant="outline" disabled={saving}>Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </>
  );
} 