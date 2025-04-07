import { useState, useRef, FormEvent, useEffect, useCallback, ChangeEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Save,
  Loader2,
  RefreshCw,
  AlertCircle,
  MapPin,
  ImagePlus,
  ArrowLeft,
  DownloadCloud,
} from "lucide-react";
import { useSupabaseRow, useSupabaseTable } from "@/hooks/use-supabase";
import { ListingImageManager } from "@/components/ListingImageManager";
import { ListingMedia } from "@/hooks/use-listing-images";
import { useCategories, Category } from "@/hooks/use-categories";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MapDisplay } from "@/components/maps/MapDisplay";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/database.types";

// --- Add IRAQ_PROVINCES Constant ---
const IRAQ_PROVINCES = [
  { en: "Al Anbar", ar: "الأنبار" },
  { en: "Babylon", ar: "بابل" },
  { en: "Baghdad", ar: "بغداد" },
  { en: "Basra", ar: "البصرة" },
  { en: "Dhi Qar", ar: "ذي قار" },
  { en: "Diyala", ar: "ديالى" },
  { en: "Dohuk", ar: "دهوك" },
  { en: "Erbil", ar: "أربيل" },
  { en: "Karbala", ar: "كربلاء" },
  { en: "Kirkuk", ar: "كركوك" },
  { en: "Maysan", ar: "ميسان" },
  { en: "Muthanna", ar: "المثنى" },
  { en: "Najaf", ar: "النجف" },
  { en: "Nineveh", ar: "نينوى" },
  { en: "Qadisiyyah", ar: "القادسية" },
  { en: "Saladin", ar: "صلاح الدين" },
  { en: "Sulaymaniyah", ar: "السليمانية" },
  { en: "Wasit", ar: "واسط" },
];
// --- End IRAQ_PROVINCES ---

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

interface CuratedCollection {
  id: string;
  name_en: string;
}

interface CollectionItemLink {
  collection_id: string;
  feature_on_home: boolean;
}

interface CollectionSelectionState {
  [collectionId: string]: {
    selected: boolean;
    featured: boolean;
  };
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
  const [isFetchingLocation, setIsFetchingLocation] = useState(false); // <-- Add this line
  const [translationEn, setTranslationEn] = useState<ListingTranslation | null>(
    null
  );
  const [translationAr, setTranslationAr] = useState<ListingTranslation | null>(
    null
  );
  const [existingCategoryLinks, setExistingCategoryLinks] = useState<
    ListingCategoryLink[]
  >([]);
  // REMOVED: const [displayCategories, setDisplayCategories] = useState<DisplayCategory[]>([])
  
  // const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false); // REMOVE OLD FLAG
  const [isLoadingCoreData, setIsLoadingCoreData] = useState(true); // NEW: Tracks core data loading
  const [hasPopulatedForm, setHasPopulatedForm] = useState(false);    // NEW: Tracks if form has been populated once
  
  const [availableCollections, setAvailableCollections] = useState<CuratedCollection[]>([]);
  const [collectionSelections, setCollectionSelections] = useState<CollectionSelectionState>({});
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    // Listings Table Fields
    location: "",
    location_ar: "",
    google_maps_link: "",
    latitude: "",
    longitude: "",
    location_id: null as string | null,
    google_place_id: null as string | null, // <-- Add state for place_id
    tags: "", // Array represented as comma-separated string
    listing_type: "",
    // --- Add City fields ---
    city_en: "",
    city_ar: "",
    // ---------------------

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

  // --- ADDED: Memoize the combined categories (mirrors NewListingForm) ---
  const combinedDisplayCategories = useMemo(() => {
    if (baseCategories && allCategoryTranslations) {
      console.log("[EditListingForm] Memoizing combined categories...");
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
      console.log("[EditListingForm] Combined categories memoized.");
      return combined;
    }
    return []; // Return empty array if data not ready
  }, [baseCategories, allCategoryTranslations]); // Depend only on direct data sources

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

  // --- NEW: State for fetched location addresses ---
  // const [fetchedLocationNameEn, setFetchedLocationNameEn] = useState<string | null>(null);
  // const [fetchedLocationNameAr, setFetchedLocationNameAr] = useState<string | null>(null);
  // const [locationTranslationsLoading, setLocationTranslationsLoading] = useState(false);
  // -----------------------------------------------

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

  // --- NEW Effect to track core data loading status --- 
  useEffect(() => {
      const coreDataIsLoading = 
          listingStatus === "loading" ||
          listingStatus === "idle" ||
          translationsStatus === "loading" ||
          translationsStatus === "idle" ||
          linksStatus === "loading" ||
          linksStatus === "idle";
          
      if (!coreDataIsLoading) {
          console.log("%c[EditListingForm] Core data (listing, translations, links) has finished loading.", "color: #999;");
          setIsLoadingCoreData(false);
      } else {
           console.log("%c[EditListingForm] Core data is still loading...", "color: #999;");
          // Ensure it's true if any dependency is still loading
          setIsLoadingCoreData(true); 
      }
  }, [listingStatus, translationsStatus, linksStatus]);
  // ----------------------------------------------------

  // --- REVISED: Effect to Populate Form Data on Initial Load --- 
  useEffect(() => {
    console.log(`%c[FormPopulationEffect] Running`, 'color: green');
    console.log("[FormPopulationEffect] Dependencies:", {
        isLoadingCoreData,
        hasPopulatedForm,
        listingExists: !!listing,
        allTranslationsExist: !!allTranslations,
        allCategoryLinksExist: !!allCategoryLinks
    });

    // --- Fetch Location Translations within this effect ---
    const fetchLocationDataAndPopulate = async (locId: string) => {
      console.log(`[FormPopulationEffect] Fetching location translations for location_id: ${locId}`);
      let locationDataEn: any = null;
      let locationDataAr: any = null;
      try {
        // Ensure supabase client is available
        if (!supabase) throw new Error("Supabase client not available for fetching location.");

        const { data: locTransData, error: locTransError } = await supabase
          .from('location_translations')
          .select('language_code, name, address, city') // Fetch city and address
          .eq('location_id', locId);
        
        if (locTransError) throw locTransError;

        locationDataEn = locTransData?.find(t => t.language_code === 'en');
        locationDataAr = locTransData?.find(t => t.language_code === 'ar');
        console.log('[FormPopulationEffect] Fetched location data:', { locationDataEn, locationDataAr });

      } catch (err) {
        console.error("Error fetching location translations within population effect:", err);
        // Decide if you want to proceed without location data or show error
      }
      
      // --- Now Populate the form using listing, listing translations, and fetched location data ---
      if (listing && allTranslations && allCategoryLinks) {
          const en = allTranslations.find(t => t.listing_id === listingId && t.language_code === 'en');
          const ar = allTranslations.find(t => t.listing_id === listingId && t.language_code === 'ar');
          const links = allCategoryLinks.filter(link => link.listing_id === listingId);
          // Ensure category IDs are strings to match the state type
          const currentCategoryIds = links.map(link => String(link.category_id)); 
          
           if (en && ar && links) {
                console.log('[FormPopulationEffect] Found en, ar, links. Preparing initialFormData...');
                const joinArray = (arr: string[] | null | undefined): string => arr ? arr.join(', ') : '';
      
                const initialFormData = {
                    // Core Listing Fields
                    location: locationDataEn?.address || listing.location || "", // Use fetched EN address, fallback to listing.location
                    location_ar: locationDataAr?.address || "", // Use fetched AR address
                    google_maps_link: listing.google_maps_link || "",
                    latitude: listing.latitude?.toString() || "",
                    longitude: listing.longitude?.toString() || "",
                    location_id: listing.location_id || null,
                    google_place_id: (listing as any).google_place_id || null,
                    tags: joinArray(listing.tags),
                    listing_type: (listing as Listing).listing_type || "",
                    city_en: locationDataEn?.city || "", // <<< Use fetched EN city
                    city_ar: locationDataAr?.city || "", // <<< Use fetched AR city
                    
                    // English Listing Translation fields
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

                    // Arabic Listing Translation fields
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
                console.log(`%c[FormPopulationEffect] Calling setFormData with populated data (including location details)`, "color: orange");
                setFormData(initialFormData); 
                setHasPopulatedForm(true); // Set flag after successful population
           } else {
              console.warn('[FormPopulationEffect] Could not find required EN/AR translations or links. Form data not set.');
           }
      } else {
           console.log('[FormPopulationEffect] Base listing/translations/links not ready yet.');
      }
    };
    // --- End of inner function fetchLocationDataAndPopulate ---

    // Populate only if form hasn't been populated AND core listing data exists AND listing has a location_id
    if (!isLoadingCoreData && !hasPopulatedForm && listing && listing.location_id) {
       console.log('[FormPopulationEffect] Conditions met, calling fetchLocationDataAndPopulate...');
       fetchLocationDataAndPopulate(listing.location_id);
    } else {
       console.log('[FormPopulationEffect] Conditions not met for population (core data loading, already populated, no listing, or no location_id)');
       // If core data is loaded, listing exists, but there's no location_id, still mark as populated to avoid loops
       if(!isLoadingCoreData && !hasPopulatedForm && listing && !listing.location_id){ 
           console.warn('[FormPopulationEffect] Listing loaded but has no location_id. Marking as populated.');
           // We still need to populate the form with whatever data we *do* have
           const en = allTranslations?.find(t => t.listing_id === listingId && t.language_code === 'en');
           const ar = allTranslations?.find(t => t.listing_id === listingId && t.language_code === 'ar');
           const links = allCategoryLinks?.filter(link => link.listing_id === listingId);
           const currentCategoryIds = links?.map(link => String(link.category_id)) || [];
           if (en && ar && links) {
                console.log('[FormPopulationEffect] Populating form WITHOUT location details...');
                const joinArray = (arr: string[] | null | undefined): string => arr ? arr.join(', ') : '';
                const initialFormData = { /* ... (construct object like above but without city/address or using fallbacks) ... */ 
                    location: listing.location || "",
                    location_ar: "", 
                    google_maps_link: listing.google_maps_link || "",
                    latitude: listing.latitude?.toString() || "",
                    longitude: listing.longitude?.toString() || "",
                    location_id: null, // No location_id
                    google_place_id: null, // No google_place_id
                    tags: joinArray(listing.tags),
                    listing_type: (listing as Listing).listing_type || "",
                    city_en: "", // No city data
                    city_ar: "", // No city data
                    // --- Fill remaining fields from en/ar translations and links ---
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
                    categoryIds: currentCategoryIds,
                };
                setFormData(initialFormData);
                setHasPopulatedForm(true); // Still mark as populated
           } else {
               console.warn('[FormPopulationEffect] Could not find EN/AR translations or links even when listing exists without location_id.');
           }
       }
    }
  // Depend on core data loading state, populated flag, and the data itself
  }, [isLoadingCoreData, hasPopulatedForm, listing, allTranslations, allCategoryLinks, listingId, supabase]); 
  // --------------------------------------------------------------------------

  // --- Fetch Available Collections & Existing Associations ---
  useEffect(() => {
    const fetchCollections = async () => {
      if (!supabase) return;
      console.log("%c[EditListingForm] Fetching available collections & existing associations...", "color: purple");
      setCollectionsLoading(true);

      try {
        // 1. Fetch all available collections
        const { data: collectionsData, error: collectionsError } = await supabase
          .from("curated_collections")
          .select("id, name_en:name") // Changed: Select 'name' but alias it as 'name_en'
          .order("name"); // Keep order by the actual column name 'name'

        if (collectionsError) throw collectionsError;
        console.log("[EditListingForm] Available collections fetched:", collectionsData);
        setAvailableCollections(collectionsData || []);

        // 2. Fetch existing collection links for this specific listing
        const { data: linksData, error: linksError } = await supabase
          .from("curated_collection_items")
          .select("collection_id, feature_on_home")
          .eq("listing_id", listingId);

        if (linksError) throw linksError;
        console.log("[EditListingForm] Existing collection links fetched:", linksData);

        // 3. Initialize selection state based on existing links
        const initialSelections: CollectionSelectionState = {};
        (collectionsData || []).forEach(collection => {
          const existingLink = linksData?.find(link => link.collection_id === collection.id);
          initialSelections[collection.id] = {
            selected: !!existingLink,
            featured: existingLink?.feature_on_home || false
          };
        });
         console.log("[EditListingForm] Initialized collection selections:", initialSelections);
        setCollectionSelections(initialSelections);

      } catch (error: any) {
        console.error("Error fetching collections or links:", error);
        setErrorMessage(`Failed to load collection data: ${error.message}`);
        setAvailableCollections([]); // Reset on error
        setCollectionSelections({}); // Reset on error
      } finally {
        setCollectionsLoading(false);
      }
    };

    fetchCollections();
  }, [supabase, listingId]); // Depend on supabase client and listingId

  // --- NEW: Handle Form Input Change ---
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log(`[EditListingForm] handleChange: name=${name}, value=${value.substring(0, 50)}...`);
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // --- NEW: Handle Category Checkbox Change ---
  const handleCategoryChange = useCallback((categoryId: string, checked: boolean) => {
    console.log(`[EditListingForm] handleCategoryChange: categoryId=${categoryId}, checked=${checked}`);
    setFormData(prev => {
        const currentCategoryIds = prev.categoryIds || [];
        if (checked) {
            // Add categoryId if it's not already there
            return { ...prev, categoryIds: Array.from(new Set([...currentCategoryIds, categoryId])) };
        } else {
            // Remove categoryId
            return { ...prev, categoryIds: currentCategoryIds.filter(id => id !== categoryId) };
        }
    });
  }, []);

   // --- NEW: Handle Collection Checkbox Change ---
   const handleCollectionChange = useCallback((collectionId: string, selected: boolean) => {
    console.log(`[EditListingForm] handleCollectionChange: collectionId=${collectionId}, selected=${selected}`);
    setCollectionSelections(prev => ({
      ...prev,
      [collectionId]: {
        ...prev[collectionId], // Keep existing 'featured' state if possible
        selected: selected,
        // Reset 'featured' to false if unselected
        featured: selected ? (prev[collectionId]?.featured || false) : false 
      }
    }));
  }, []);

  // --- NEW: Handle Collection Feature Switch Change ---
  const handleFeatureChange = useCallback((collectionId: string, featured: boolean) => {
      console.log(`[EditListingForm] handleFeatureChange: collectionId=${collectionId}, featured=${featured}`);
      setCollectionSelections(prev => {
          // Ensure the collection exists in the state before updating feature flag
          if (prev[collectionId]) {
              return {
                  ...prev,
                  [collectionId]: {
                      ...prev[collectionId],
                      featured: featured
                  }
              };
          }
          // Log a warning or handle if the collection somehow isn't in the state
          console.warn(`[EditListingForm] Tried to update feature for collection ${collectionId} which is not in selection state.`);
          return prev; 
      });
  }, []);


  // --- NEW: Fetch Location Details Handler ---
  const handleFetchLocationDetails = async () => {
      const url = formData.google_maps_link;
      if (!url || !url.trim()) {
          setErrorMessage("Please enter a Google Maps link first.");
          return;
      }
      
      setIsFetchingLocation(true); // <-- Set true before fetch
      setErrorMessage(null); // Clear previous errors
      console.log("[EditListingForm] Fetching location details for URL:", url);

      try {
          const response = await fetch('/api/location-lookup', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
          });

          const data = await response.json();

          if (!response.ok) {
              console.error("Location Lookup API Error:", data);
              throw new Error(data.message || `Failed to fetch location details (${response.status})`);
          }

          console.log("[EditListingForm] Location details received:", data);
          
          // Update form state with fetched data
          setFormData(prev => ({
              ...prev,
              location: data.name_en || prev.location, // Use fetched EN address, keep old if null
              location_ar: data.name_ar || '', // Use fetched AR address, default to empty if null
              latitude: data.latitude?.toString() || prev.latitude,
              longitude: data.longitude?.toString() || prev.longitude,
              google_place_id: data.google_place_id || null, // <-- Save fetched place_id
          }));
          // Maybe show a success toast/message here

      } catch (error: any) {
          console.error("Failed to fetch location details:", error);
          setErrorMessage(error.message || "An unexpected error occurred while fetching location details.");
      } finally {
          setIsFetchingLocation(false); // <-- Set false after fetch (success or error)
      }
  };
  // -----------------------------------------

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("%c[EditListingForm] handleSubmit triggered!", "color: green; font-weight: bold;"); // <-- Add log here
    setSaving(true);
    setErrorMessage(null);

    // --- Prepare data ---
    const parseArray = (str: string) => str ? str.split(',').map(t => t.trim()).filter(t => t) : [];
    
    // 1. Direct Listing Table Fields
    const listingPayload = {
      listing_type: formData.listing_type,
      google_maps_link: formData.google_maps_link || null,
      tags: parseArray(formData.tags),
      latitude: parseFloat(formData.latitude) || null,
      longitude: parseFloat(formData.longitude) || null,
      google_place_id: formData.google_place_id || null, 
      // Note: Location name/address fields are separate for location_translations update
      // location: formData.location, // We probably don't need this if using location_translations
    };

    // 2. Location Translation Fields (for the separate location entry)
    // UPDATED to match backend API expectations
    const locationTranslationPayload = {
        address_en: formData.location,       // Use address_en key for English Address
        address_ar: formData.location_ar,    // Use address_ar key for Arabic Address
        city_en: formData.city_en,          // Add English City
        city_ar: formData.city_ar,          // Add Arabic City
        location_id: formData.location_id // Pass existing location_id if available
    };

    // 3. Listing Translation Fields (for this specific listing's translatable content)
    const listingTranslationsPayload = [
      {
        language_code: 'en',
        name: formData.name_en, // Listing Name EN
        description: formData.description_en, // Listing Desc EN
        opening_hours: formData.opening_hours_en,
        popular_stores: parseArray(formData.popular_stores_en),
        entertainment: parseArray(formData.entertainment_en),
        dining_options: parseArray(formData.dining_options_en),
        special_services: parseArray(formData.special_services_en),
        nearby_attractions: parseArray(formData.nearby_attractions_en),
        parking_info: formData.parking_info_en,
        cuisine_type: formData.cuisine_type_en,
        story_behind: formData.story_behind_en,
        menu_highlights: parseArray(formData.menu_highlights_en),
        price_range: formData.price_range_en,
        dietary_options: parseArray(formData.dietary_options_en),
        reservation_info: formData.reservation_info_en,
        seating_options: parseArray(formData.seating_options_en),
        special_features: parseArray(formData.special_features_en),
        historical_significance: formData.historical_significance_en,
        entry_fee: formData.entry_fee_en,
        best_time_to_visit: formData.best_time_to_visit_en,
        tour_guide_availability: formData.tour_guide_availability_en,
        tips: formData.tips_en,
        activities: parseArray(formData.activities_en),
        facilities: parseArray(formData.facilities_en),
        safety_tips: formData.safety_tips_en,
        duration: formData.duration_en,
        highlights: parseArray(formData.highlights_en),
        religious_significance: formData.religious_significance_en,
        entry_rules: formData.entry_rules_en,
        slug: formData.slug_en,
      },
      {
        language_code: 'ar',
        name: formData.name_ar, // Listing Name AR
        description: formData.description_ar, // Listing Desc AR
        opening_hours: formData.opening_hours_ar,
        popular_stores: parseArray(formData.popular_stores_ar),
        entertainment: parseArray(formData.entertainment_ar),
        dining_options: parseArray(formData.dining_options_ar),
        special_services: parseArray(formData.special_services_ar),
        nearby_attractions: parseArray(formData.nearby_attractions_ar),
        parking_info: formData.parking_info_ar,
        cuisine_type: formData.cuisine_type_ar,
        story_behind: formData.story_behind_ar,
        menu_highlights: parseArray(formData.menu_highlights_ar),
        price_range: formData.price_range_ar,
        dietary_options: parseArray(formData.dietary_options_ar),
        reservation_info: formData.reservation_info_ar,
        seating_options: parseArray(formData.seating_options_ar),
        special_features: parseArray(formData.special_features_ar),
        historical_significance: formData.historical_significance_ar,
        entry_fee: formData.entry_fee_ar,
        best_time_to_visit: formData.best_time_to_visit_ar,
        tour_guide_availability: formData.tour_guide_availability_ar,
        tips: formData.tips_ar,
        activities: parseArray(formData.activities_ar),
        facilities: parseArray(formData.facilities_ar),
        safety_tips: formData.safety_tips_ar,
        duration: formData.duration_ar,
        highlights: parseArray(formData.highlights_ar),
        religious_significance: formData.religious_significance_ar,
        entry_rules: formData.entry_rules_ar,
        slug: formData.slug_ar,
      },
    ];

    // 4. Category Links
    const categoryIdsPayload = formData.categoryIds;

    // 5. Collection Links
    const collectionLinksPayload = Object.entries(collectionSelections)
        .filter(([_, state]) => state.selected) // Only include selected collections
        .map(([collectionId, state]) => ({
            collection_id: collectionId,
            feature_on_home: state.featured
        }));

    // Combine into final payload for the API
    const finalPayload = {
        listingData: listingPayload,
        locationTranslations: locationTranslationPayload, // Use clearer key
        listingTranslations: listingTranslationsPayload, // Use clearer key
        categoryIds: categoryIdsPayload,
        collectionLinks: collectionLinksPayload
    };

    console.log("Submitting Final Payload:", JSON.stringify(finalPayload, null, 2));

    try {
        const response = await fetch(`/api/listings/${listingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload) // Send the refined payload
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Try to parse error JSON
            // Log the detailed error for debugging
            console.error("API Error Response:", { 
                status: response.status, 
                statusText: response.statusText, 
                body: errorData 
            });
            throw new Error(errorData.message || `Failed to update listing (${response.status})`);
        }
        // --- Simulation (Remove this) ---
        // await new Promise(resolve => setTimeout(resolve, 1500));
        // console.log("Simulated listing update successful.");
        // --- End Simulation ---
        
        console.log("Listing update successful via API.");

        // router.push('/dashboard/listings'); // Or maybe back to the specific listing view?
        router.refresh(); // Refresh server components on the current route
        router.back(); // Go back after save for now
        // Add success toast/notification here (e.g., using react-hot-toast)
        // Example: toast.success('Listing updated successfully!');

    } catch (error: any) {
      console.error("Failed to save listing:", error);
      setErrorMessage(error.message || "An unexpected error occurred while saving.");
      // Maybe add a toast error notification here too
      // Example: toast.error(`Save failed: ${error.message}`);
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

  // --- Memoize parsed coordinates --- 
  const parsedLatitude = useMemo(() => {
    const lat = parseFloat(formData.latitude);
    return isNaN(lat) ? null : lat;
  }, [formData.latitude]);

  const parsedLongitude = useMemo(() => {
    const lng = parseFloat(formData.longitude);
    return isNaN(lng) ? null : lng;
  }, [formData.longitude]);
  // --------------------------------

  if (combinedError) {
    return (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <p>Error loading listing data: {combinedError.message}</p>
      </div>
    );
  }

  // Only show full-page loader during *initial* data load (use NEW flag)
  if (isLoadingCoreData) { 
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading listing data...</span>
      </div>
    );
  }

  console.log(`%c[EditListingForm] Rendering with formData.listing_type: ${formData.listing_type}`, "color: purple"); // <-- Log current value on render
  console.log(`%c[EditListingForm] Button State Check: saving=${saving}, isLoadingCoreData=${isLoadingCoreData}`, "color: orange"); // <-- ADDED LOG

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
                        onValueChange={(value) => {
                            console.log(`[EditListingForm] Listing Type onValueChange triggered with:`, value);
                            // Removed the `if (value !== "")` check to always update state
                            setFormData((prev) => ({ ...prev, listing_type: value }));
                        }} 
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
                
                 {/* Location Name (English Address) */}
                <div className="space-y-2">
                    <Label htmlFor="location">Location Name / Address (English)</Label>
                    <Textarea id="location" name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Main Street, Downtown" />
                </div>

                 {/* --- START: City Dropdowns --- */}
                 {/* City (English) */}
                 <div className="space-y-2">
                    <Label htmlFor="city_en">City (English) *</Label>
                    <Select
                        name="city_en"
                        required
                        value={formData.city_en}
                        // === START Linked Logic ===
                        onValueChange={(value) => {
                            const matchingProvince = IRAQ_PROVINCES.find(p => p.en === value);
                            setFormData((prev) => ({ 
                                ...prev, 
                                city_en: value, 
                                city_ar: matchingProvince ? matchingProvince.ar : '' // Update Arabic city too
                            }));
                        }}
                        // === END Linked Logic ===
                    >
                        <SelectTrigger id="city_en">
                            <SelectValue placeholder="Select City (English)" />
                        </SelectTrigger>
                        <SelectContent>
                            {IRAQ_PROVINCES.map((province) => (
                                <SelectItem key={province.en} value={province.en}>
                                    {province.en}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>

                 {/* City (Arabic) */}
                 <div className="space-y-2">
                     <Label htmlFor="city_ar">City (Arabic) *</Label>
                     <Select
                         name="city_ar"
                         required
                         value={formData.city_ar}
                         // === START Linked Logic ===
                         onValueChange={(value) => {
                             const matchingProvince = IRAQ_PROVINCES.find(p => p.ar === value);
                             setFormData((prev) => ({ 
                                 ...prev, 
                                 city_ar: value, 
                                 city_en: matchingProvince ? matchingProvince.en : '' // Update English city too
                             }));
                         }}
                         // === END Linked Logic ===
                         dir="rtl"
                     >
                         <SelectTrigger id="city_ar">
                             <SelectValue placeholder="اختر المدينة (عربي)" />
                         </SelectTrigger>
                         <SelectContent dir="rtl">
                             {IRAQ_PROVINCES.map((province) => (
                                 <SelectItem key={province.ar} value={province.ar}>
                                     {province.ar}
                                 </SelectItem>
                             ))}
                         </SelectContent>
                     </Select>
                 </div>
                 {/* --- END: City Dropdowns --- */}

                 {/* Google Maps Link + Fetch Button */}
                 <div className="space-y-2">
                    <Label htmlFor="google_maps_link">Google Maps Link</Label>
                    <div className="flex items-center gap-2">
                        <Input 
                            id="google_maps_link" 
                            name="google_maps_link" 
                            type="url" 
                            value={formData.google_maps_link} 
                            onChange={handleChange} 
                            placeholder="Paste Google Maps URL here"
                        />
                        <Button 
                            type="button" 
                            onClick={handleFetchLocationDetails} 
                            disabled={isFetchingLocation} 
                            variant="outline" 
                            size="icon"
                            aria-label="Fetch Location Details"
                        >
                            {isFetchingLocation ? 
                                <Loader2 className="h-4 w-4 animate-spin" /> : 
                                <DownloadCloud className="h-4 w-4" />
                            }
                        </Button>
                    </div>
                </div>

                {/* Location Name (Arabic Address) */}
                <div className="space-y-2">
                    <Label htmlFor="location_ar">Location Name / Address (Arabic)</Label>
                    <Textarea 
                        id="location_ar" 
                        name="location_ar" 
                        value={formData.location_ar} 
                        onChange={handleChange} 
                        placeholder="مثال: الشارع الرئيسي، وسط البلد" 
                        dir="rtl" // Set text direction to right-to-left
                    />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input id="tags" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., family-friendly, outdoor, shopping" />
                </div>

                {/* Latitude & Longitude */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                {/* --- Add Map Display Here (Moved Inside CardContent) --- */}
                {/* Spanning 2 columns on medium screens and up */}
                <div className="mt-4 md:col-span-2">
                  <Label>Map Preview</Label>
                  <div className="mt-2">
                      <MapDisplay 
                          latitude={parsedLatitude}   // <-- Use memoized value
                          longitude={parsedLongitude} // <-- Use memoized value
                      />
                  </div>
                </div>
                {/* -------------------------------------------------------- */}

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
                           <div className="space-y-2"><Label htmlFor="popular_stores_en">Popular Stores (English)</Label><Input id="popular_stores_en" name="popular_stores_en" value={formData.popular_stores_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entertainment_en">Entertainment (English)</Label><Input id="entertainment_en" name="entertainment_en" value={formData.entertainment_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="dining_options_en">Dining Options (English)</Label><Input id="dining_options_en" name="dining_options_en" value={formData.dining_options_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="special_services_en">Special Services (English)</Label><Input id="special_services_en" name="special_services_en" value={formData.special_services_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                       </>
                    )}

                    {/* === Restaurant/Café Specific Fields === */}
                   {formData.listing_type === 'Restaurant/Café' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="cuisine_type_en">Cuisine Type (English)</Label><Input id="cuisine_type_en" name="cuisine_type_en" value={formData.cuisine_type_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="story_behind_en">Story Behind (English)</Label><Textarea id="story_behind_en" name="story_behind_en" value={formData.story_behind_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="menu_highlights_en">Menu Highlights (English)</Label><Input id="menu_highlights_en" name="menu_highlights_en" value={formData.menu_highlights_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="price_range_en">Price Range (English)</Label><Input id="price_range_en" name="price_range_en" value={formData.price_range_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="dietary_options_en">Dietary Options (English)</Label><Input id="dietary_options_en" name="dietary_options_en" value={formData.dietary_options_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="reservation_info_en">Reservation Info (English)</Label><Input id="reservation_info_en" name="reservation_info_en" value={formData.reservation_info_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="seating_options_en">Seating Options (English)</Label><Input id="seating_options_en" name="seating_options_en" value={formData.seating_options_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="special_features_en">Special Features (English)</Label><Input id="special_features_en" name="special_features_en" value={formData.special_features_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
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
                           <div className="space-y-2"><Label htmlFor="facilities_en">Facilities (English)</Label><Input id="facilities_en" name="facilities_en" value={formData.facilities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Park/Nature Specific Fields === */}
                   {formData.listing_type === 'Park/Nature' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="activities_en">Activities (English)</Label><Input id="activities_en" name="activities_en" value={formData.activities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_en">Facilities (English)</Label><Input id="facilities_en" name="facilities_en" value={formData.facilities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="safety_tips_en">Safety Tips (English)</Label><Textarea id="safety_tips_en" name="safety_tips_en" value={formData.safety_tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_en">Best Time to Visit (English)</Label><Input id="best_time_to_visit_en" name="best_time_to_visit_en" value={formData.best_time_to_visit_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_fee_en">Entry Fee (English)</Label><Input id="entry_fee_en" name="entry_fee_en" value={formData.entry_fee_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Experience Specific Fields === */}
                   {formData.listing_type === 'Experience' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="duration_en">Duration (English)</Label><Input id="duration_en" name="duration_en" value={formData.duration_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="highlights_en">Highlights (English)</Label><Input id="highlights_en" name="highlights_en" value={formData.highlights_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="price_range_en">Price Range (English)</Label><Input id="price_range_en" name="price_range_en" value={formData.price_range_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_en">Tips (English)</Label><Textarea id="tips_en" name="tips_en" value={formData.tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="safety_tips_en">Safety Tips (English)</Label><Textarea id="safety_tips_en" name="safety_tips_en" value={formData.safety_tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
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
                           <div className="space-y-2"><Label htmlFor="facilities_en">Facilities (English)</Label><Input id="facilities_en" name="facilities_en" value={formData.facilities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_en">Parking Info (English)</Label><Input id="parking_info_en" name="parking_info_en" value={formData.parking_info_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="highlights_en">Highlights (English)</Label><Input id="highlights_en" name="highlights_en" value={formData.highlights_en} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Religious Site Specific Fields === */}
                   {formData.listing_type === 'Religious Site' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="religious_significance_en">Religious Significance (English)</Label><Textarea id="religious_significance_en" name="religious_significance_en" value={formData.religious_significance_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_rules_en">Entry Rules (English)</Label><Textarea id="entry_rules_en" name="entry_rules_en" value={formData.entry_rules_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_en">Best Time to Visit (English)</Label><Input id="best_time_to_visit_en" name="best_time_to_visit_en" value={formData.best_time_to_visit_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_en">Tips (English)</Label><Textarea id="tips_en" name="tips_en" value={formData.tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_en">Facilities (English)</Label><Input id="facilities_en" name="facilities_en" value={formData.facilities_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_en">Nearby Attractions (English)</Label><Input id="nearby_attractions_en" name="nearby_attractions_en" value={formData.nearby_attractions_en} onChange={handleChange} /></div>
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
                           <div className="space-y-2"><Label htmlFor="popular_stores_ar">Popular Stores (Arabic)</Label><Input dir="rtl" id="popular_stores_ar" name="popular_stores_ar" value={formData.popular_stores_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entertainment_ar">Entertainment (Arabic)</Label><Input dir="rtl" id="entertainment_ar" name="entertainment_ar" value={formData.entertainment_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="dining_options_ar">Dining Options (Arabic)</Label><Input dir="rtl" id="dining_options_ar" name="dining_options_ar" value={formData.dining_options_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="special_services_ar">Special Services (Arabic)</Label><Input dir="rtl" id="special_services_ar" name="special_services_ar" value={formData.special_services_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                       </>
                   )}

                  {/* === Restaurant/Café Specific Fields === */}
                   {formData.listing_type === 'Restaurant/Café' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="cuisine_type_ar">Cuisine Type (Arabic)</Label><Input dir="rtl" id="cuisine_type_ar" name="cuisine_type_ar" value={formData.cuisine_type_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="story_behind_ar">Story Behind (Arabic)</Label><Textarea dir="rtl" id="story_behind_ar" name="story_behind_ar" value={formData.story_behind_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="menu_highlights_ar">Menu Highlights (Arabic)</Label><Input dir="rtl" id="menu_highlights_ar" name="menu_highlights_ar" value={formData.menu_highlights_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="price_range_ar">Price Range (Arabic)</Label><Input dir="rtl" id="price_range_ar" name="price_range_ar" value={formData.price_range_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="dietary_options_ar">Dietary Options (Arabic)</Label><Input dir="rtl" id="dietary_options_ar" name="dietary_options_ar" value={formData.dietary_options_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="reservation_info_ar">Reservation Info (Arabic)</Label><Input dir="rtl" id="reservation_info_ar" name="reservation_info_ar" value={formData.reservation_info_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="seating_options_ar">Seating Options (Arabic)</Label><Input dir="rtl" id="seating_options_ar" name="seating_options_ar" value={formData.seating_options_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="special_features_ar">Special Features (Arabic)</Label><Input dir="rtl" id="special_features_ar" name="special_features_ar" value={formData.special_features_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
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
                           <div className="space-y-2"><Label htmlFor="facilities_ar">Facilities (Arabic)</Label><Input dir="rtl" id="facilities_ar" name="facilities_ar" value={formData.facilities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Park/Nature Specific Fields === */}
                   {formData.listing_type === 'Park/Nature' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="activities_ar">Activities (Arabic)</Label><Input dir="rtl" id="activities_ar" name="activities_ar" value={formData.activities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_ar">Facilities (Arabic)</Label><Input dir="rtl" id="facilities_ar" name="facilities_ar" value={formData.facilities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="safety_tips_ar">Safety Tips (Arabic)</Label><Textarea dir="rtl" id="safety_tips_ar" name="safety_tips_ar" value={formData.safety_tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_ar">Best Time to Visit (Arabic)</Label><Input dir="rtl" id="best_time_to_visit_ar" name="best_time_to_visit_ar" value={formData.best_time_to_visit_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_fee_ar">Entry Fee (Arabic)</Label><Input dir="rtl" id="entry_fee_ar" name="entry_fee_ar" value={formData.entry_fee_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Experience Specific Fields === */}
                   {formData.listing_type === 'Experience' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="duration_ar">Duration (Arabic)</Label><Input dir="rtl" id="duration_ar" name="duration_ar" value={formData.duration_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="highlights_ar">Highlights (Arabic)</Label><Input dir="rtl" id="highlights_ar" name="highlights_ar" value={formData.highlights_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="price_range_ar">Price Range (Arabic)</Label><Input dir="rtl" id="price_range_ar" name="price_range_ar" value={formData.price_range_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_ar">Tips (Arabic)</Label><Textarea dir="rtl" id="tips_ar" name="tips_ar" value={formData.tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="safety_tips_ar">Safety Tips (Arabic)</Label><Textarea dir="rtl" id="safety_tips_ar" name="safety_tips_ar" value={formData.safety_tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
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
                           <div className="space-y-2"><Label htmlFor="facilities_ar">Facilities (Arabic)</Label><Input dir="rtl" id="facilities_ar" name="facilities_ar" value={formData.facilities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label><Input dir="rtl" id="parking_info_ar" name="parking_info_ar" value={formData.parking_info_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="highlights_ar">Highlights (Arabic)</Label><Input dir="rtl" id="highlights_ar" name="highlights_ar" value={formData.highlights_ar} onChange={handleChange} /></div>
                       </>
                   )}

                   {/* === Religious Site Specific Fields === */}
                   {formData.listing_type === 'Religious Site' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="religious_significance_ar">Religious Significance (Arabic)</Label><Textarea dir="rtl" id="religious_significance_ar" name="religious_significance_ar" value={formData.religious_significance_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_rules_ar">Entry Rules (Arabic)</Label><Textarea dir="rtl" id="entry_rules_ar" name="entry_rules_ar" value={formData.entry_rules_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_ar">Best Time to Visit (Arabic)</Label><Input dir="rtl" id="best_time_to_visit_ar" name="best_time_to_visit_ar" value={formData.best_time_to_visit_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_ar">Tips (Arabic)</Label><Textarea dir="rtl" id="tips_ar" name="tips_ar" value={formData.tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="facilities_ar">Facilities (Arabic)</Label><Input dir="rtl" id="facilities_ar" name="facilities_ar" value={formData.facilities_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="nearby_attractions_ar">Nearby Attractions (Arabic)</Label><Input dir="rtl" id="nearby_attractions_ar" name="nearby_attractions_ar" value={formData.nearby_attractions_ar} onChange={handleChange} /></div>
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
               {categoriesLoading ? (
                   <p>Loading categories...</p>
               ) : combinedDisplayCategories.length > 0 ? ( // USE combinedDisplayCategories directly
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {combinedDisplayCategories.map(category => (
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

        {/* --- Curated Collections Card --- */}
        <Card>
          <CardHeader>
            <CardTitle>Curated Collections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {collectionsLoading ? (
               <div className="flex justify-center items-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : availableCollections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collections available.</p>
            ) : (
              availableCollections.map((collection) => (
                <div key={collection.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div className="flex items-center gap-3">
                     <Checkbox
                      id={`collection-${collection.id}`}
                      checked={collectionSelections[collection.id]?.selected || false}
                      // Pass boolean directly
                      onCheckedChange={(checked) => handleCollectionChange(collection.id, !!checked)} 
                    />
                    <Label htmlFor={`collection-${collection.id}`} className="cursor-pointer">
                      {collection.name_en}
                    </Label>
                  </div>
                  {/* Conditional Switch */}
                  {collectionSelections[collection.id]?.selected && (
                     <div className="flex items-center gap-2">
                         <Label htmlFor={`feature-${collection.id}`} className="text-sm text-muted-foreground">
                           Feature on Home
                         </Label>
                         <Switch
                             id={`feature-${collection.id}`}
                             checked={collectionSelections[collection.id]?.featured || false}
                             onCheckedChange={(checked) => handleFeatureChange(collection.id, checked)}
                         />
                     </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 mt-8">
          <Link href="/dashboard/listings">
             <Button type="button" variant="outline" disabled={saving}>Cancel</Button>
          </Link>
          <Button type="submit" disabled={saving || isLoadingCoreData}>
            {saving ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
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