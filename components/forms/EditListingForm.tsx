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
  LinkIcon,
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
import { TagInput } from "@/components/ui/TagInput";
import { OpeningHoursInput, OpeningHoursData } from './OpeningHoursInput';
import { PriceRangeSelector } from '@/components/ui/PriceRangeSelector'; // ADD IMPORT

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

// +++ Add PARKING_OPTIONS Constant +++
const PARKING_OPTIONS = [
  { en: "Not Applicable", ar: "غير متاح" },
  { en: "Street Parking", ar: "مواقف الشارع" },
  { en: "Private Lot", ar: "مواقف خاصة" },
  { en: "Valet Parking", ar: "خدمة صف السيارات" },
  { en: "Garage Parking", ar: "مواقف في كراج" },
  { en: "Paid Parking", ar: "مواقف مدفوعة" },
  { en: "Free Parking", ar: "مواقف مجانية" },
];
// +++ End PARKING_OPTIONS +++

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
 
  parking_info?: string | null;
  cuisine_type?: string | null;
  story_behind?: string | null;
  menu_highlights?: string[] | null;
  price_range?: string | null;
  dietary_options?: string[] | null;
  
  
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

// --- Helper Functions for Price Range Conversion ---
const priceRangeStringToNumber = (priceString: string | null | undefined): number => {
  if (!priceString) return 0;
  switch (priceString) {
    case '$': return 1;
    case '$$': return 2;
    case '$$$': return 3;
    case '$$$$': return 4;
    case '$$$$$': return 5;
    default: return 0; // Return 0 for invalid strings or empty
  }
};

const priceRangeNumberToString = (priceNumber: number | null | undefined): string | null => {
  // Use 0 as the indicator for 'not set' in the state
  if (priceNumber === null || priceNumber === undefined || priceNumber === 0) return null;
  switch (priceNumber) {
    case 1: return '$';
    case 2: return '$$';
    case 3: return '$$$';
    case 4: return '$$$$';
    case 5: return '$$$$$';
    default: return null; // Return null for invalid numbers
  }
};
// --------------------------------------------------

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
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  // REMOVED: Unused translation state
  // const [translationEn, setTranslationEn] = useState<ListingTranslation | null>(null);
  // const [translationAr, setTranslationAr] = useState<ListingTranslation | null>(null);
  // const [existingCategoryLinks, setExistingCategoryLinks] = useState<ListingCategoryLink[]>([]);

  // REMOVED: Old/unused loading/populated flags
  // const [isLoadingCoreData, setIsLoadingCoreData] = useState(true); 
  // const [hasPopulatedForm, setHasPopulatedForm] = useState(false); 

  // --- NEW: Flag to track if initial population is complete ---
  const [initialPopulationDone, setInitialPopulationDone] = useState(false); 
  // -----------------------------------------------------------

  const [availableCollections, setAvailableCollections] = useState<CuratedCollection[]>([]);
  const [collectionSelections, setCollectionSelections] = useState<CollectionSelectionState>({});
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  // Define the type for the form data state (REMOVE seating options)
  type FormDataState = {
    location: string;
    location_ar: string;
    google_maps_link: string;
    latitude: string;
    longitude: string;
    location_id: string | null;
    google_place_id: string | null;
    tags: string[]; 
    listing_type: string;
    city_en: string;
    city_ar: string;
    opening_hours: OpeningHoursData; // <-- UPDATED
    // English fields
    name_en: string;
    description_en: string;
    popular_stores_en: string[]; 
    entertainment_en: string[]; 
    dining_options_en: string[]; 
    special_services_en: string[]; 
   
    parking_info_en: string;
    cuisine_type_en: string;
    story_behind_en: string;
    menu_highlights_en: string[]; 
    price_range_en: number; // <-- Changed to number
    dietary_options_en: string[]; 
    special_features_en: string[]; 
    historical_significance_en: string;
    entry_fee_en: string;
    best_time_to_visit_en: string;
    tour_guide_availability_en: string;
    tips_en: string;
    activities_en: string[]; 
    facilities_en: string[]; 
    safety_tips_en: string; 
    duration_en: string;
    highlights_en: string[]; 
    religious_significance_en: string;
    entry_rules_en: string;
    slug_en: string;
    // Arabic fields
    name_ar: string;
    description_ar: string;
    popular_stores_ar: string[]; 
    entertainment_ar: string[]; 
    dining_options_ar: string[]; 
    special_services_ar: string[]; 

    parking_info_ar: string;
    cuisine_type_ar: string;
    story_behind_ar: string;
    menu_highlights_ar: string[]; 
    price_range_ar: number; // <-- Changed to number
    dietary_options_ar: string[]; 
    special_features_ar: string[]; 
    historical_significance_ar: string;
    entry_fee_ar: string;
    best_time_to_visit_ar: string;
    tour_guide_availability_ar: string;
    tips_ar: string;
    activities_ar: string[]; 
    facilities_ar: string[]; 
    safety_tips_ar: string; 
    duration_ar: string;
    highlights_ar: string[]; 
    religious_significance_ar: string;
    entry_rules_ar: string;
    slug_ar: string;
    // Other
    categoryIds: string[];
  };

  // --- Default Opening Hours Structure (ADDED/UPDATED) ---
  const defaultOpeningHours: OpeningHoursData = {
      Monday: { isOpen: false, is24Hours: false, open: '09:00', close: '17:00', notes_en: '', notes_ar: '' },
      Tuesday: { isOpen: false, is24Hours: false, open: '09:00', close: '17:00', notes_en: '', notes_ar: '' },
      Wednesday: { isOpen: false, is24Hours: false, open: '09:00', close: '17:00', notes_en: '', notes_ar: '' },
      Thursday: { isOpen: false, is24Hours: false, open: '09:00', close: '17:00', notes_en: '', notes_ar: '' },
      Friday: { isOpen: false, is24Hours: false, open: '09:00', close: '17:00', notes_en: '', notes_ar: '' },
      Saturday: { isOpen: false, is24Hours: false, open: '09:00', close: '17:00', notes_en: '', notes_ar: '' },
      Sunday: { isOpen: false, is24Hours: false, open: '09:00', close: '17:00', notes_en: '', notes_ar: '' },
  };
  // -------------------------------------------------------

  // Initial form state (REMOVE seating options)
  const initialFormData: FormDataState = {
    location: "",
    location_ar: "",
    google_maps_link: "",
    latitude: "",
    longitude: "",
    location_id: null,
    google_place_id: null,
    tags: [], 
    listing_type: "",
    city_en: "",
    city_ar: "",
    opening_hours: defaultOpeningHours, // Keep this
    name_en: "",
    description_en: "",
    popular_stores_en: [], 
    entertainment_en: [], 
    dining_options_en: [], 
    special_services_en: [], 
   
    parking_info_en: "",
    cuisine_type_en: "",
    story_behind_en: "",
    menu_highlights_en: [],
    price_range_en: 0, // <-- Initialized to 0
    dietary_options_en: [],
    special_features_en: [], 
    historical_significance_en: "",
    entry_fee_en: "",
    best_time_to_visit_en: "",
    tour_guide_availability_en: "",
    tips_en: "",
    activities_en: [], 
    facilities_en: [], 
    safety_tips_en: "", 
    duration_en: "",
    highlights_en: [], 
    religious_significance_en: "",
    entry_rules_en: "",
    slug_en: "",
    name_ar: "",
    description_ar: "",
    popular_stores_ar: [], 
    entertainment_ar: [], 
    dining_options_ar: [], 
    special_services_ar: [], 
   
    parking_info_ar: "",
    cuisine_type_ar: "",
    story_behind_ar: "",
    menu_highlights_ar: [],
    price_range_ar: 0, // <-- Initialized to 0
    dietary_options_ar: [],
    special_features_ar: [], 
    historical_significance_ar: "",
    entry_fee_ar: "",
    best_time_to_visit_ar: "",
    tour_guide_availability_ar: "",
    tips_ar: "",
    activities_ar: [], 
    facilities_ar: [], 
    safety_tips_ar: "", 
    duration_ar: "",
    highlights_ar: [], 
    religious_significance_ar: "",
    entry_rules_ar: "",
    slug_ar: "",
    categoryIds: [],
  };

  const [formData, setFormData] = useState<FormDataState>(initialFormData);

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
    refresh: refreshListing
  } = useSupabaseRow('listings', listingId);

  const {
    data: allTranslations,
    status: translationsStatus,
    error: translationsError,
  } = useSupabaseTable("listing_translations");

  const {
    data: allCategoryLinks,
    status: linksStatus,
    error: linksError,
    // Removed unused add/remove
    // add: addListingCategoryLink,
    // remove: removeListingCategoryLink,
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

  // --- Memoize combined categories (no change) ---
  const combinedDisplayCategories = useMemo(() => {
    // ... same memoization logic ...
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

  // Consolidated loading state check
  const isInitialDataLoading = 
      authLoading ||
      listingStatus === "loading" || listingStatus === "idle" ||
      translationsStatus === "loading" || translationsStatus === "idle" ||
      linksStatus === "loading" || linksStatus === "idle" ||
      categoriesLoading || // Base categories
      categoryTranslationsStatus === "loading" || categoryTranslationsStatus === "idle"; 

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
      // setTranslationEn(en);
      // setTranslationAr(ar);
    } else {
      console.log("[EditListingForm] All translations not yet available or no listingId.");
      // setTranslationEn(null); // Reset if listingId changes or translations disappear
      // setTranslationAr(null);
    }

    if (allCategoryLinks && listingId) {
      console.log("[EditListingForm] All category links available, finding specific ones...");
      const links = allCategoryLinks.filter(
        (link) => link.listing_id === listingId
      ) as ListingCategoryLink[];
       console.log(`[EditListingForm] Found ${links.length} category links for this listing.`);
      // setExistingCategoryLinks(links);
    } else {
       console.log("[EditListingForm] All category links not yet available or no listingId.");
      // setExistingCategoryLinks([]); // Reset
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
          // setIsLoadingCoreData(false);
      } else {
           console.log("%c[EditListingForm] Core data is still loading...", "color: #999;");
          // Ensure it's true if any dependency is still loading
          // setIsLoadingCoreData(true); 
      }
  }, [listingStatus, translationsStatus, linksStatus]);
  // ----------------------------------------------------

  // --- REVISED: Effect to Populate Form Data ONCE on Initial Load (REMOVE seating options) ---
  useEffect(() => {
    console.log(`%c[FormPopulationEffect - Revised] Running`, 'color: #007bff'); // Blue color
    console.log("[FormPopulationEffect - Revised] Dependencies:", {
      listingExists: !!listing,
      allTranslationsExist: !!allTranslations,
      allCategoryLinksExist: !!allCategoryLinks,
      initialPopulationDone, // Check the flag
      listingId
    });

    // Only attempt population if data is loaded AND it hasn't been done yet
    if (listing && allTranslations && allCategoryLinks && !initialPopulationDone) {
      console.log("[FormPopulationEffect - Revised] Core data loaded and initial population not done. Proceeding...");

      const populateForm = async () => {
        try {
          let locationDataEn: any = null;
          let locationDataAr: any = null;
          let cityEn = "";
          let cityAr = "";
          let locationAddressEn = ""; // Use a distinct variable for location address
          let locationAddressAr = ""; // Use a distinct variable for location address

          // Fetch location data ONLY if location_id exists
          if (listing.location_id) {
            console.log(`[FormPopulationEffect - Revised] Fetching location translations for location_id: ${listing.location_id}`);
            if (!supabase) throw new Error("Supabase client needed for location fetch.");

            const { data: locTransData, error: locTransError } = await supabase
              .from('location_translations')
              .select('language_code, name, address, city') // Fetch name, address, city
              .eq('location_id', listing.location_id);

            if (locTransError) throw locTransError;

            locationDataEn = locTransData?.find(t => t.language_code === 'en');
            locationDataAr = locTransData?.find(t => t.language_code === 'ar');
            console.log('[FormPopulationEffect - Revised] Fetched location data:', { locationDataEn, locationDataAr });
            // === IMPORTANT: Get CITY and ADDRESS from fetched location data ===
            cityEn = locationDataEn?.city || "";
            cityAr = locationDataAr?.city || "";
            locationAddressEn = locationDataEn?.address || locationDataEn?.name || ""; // Use address or name from location
            locationAddressAr = locationDataAr?.address || locationDataAr?.name || ""; // Use address or name from location
          } else {
              console.warn("[FormPopulationEffect - Revised] Listing has no location_id. Using listing.location as fallback.");
              locationAddressEn = listing.location || ""; // Fallback to listing's own location field
              locationAddressAr = ""; // No specific Arabic address if no location_id
              // Assuming city is also not available if location_id is missing
              cityEn = ""; 
              cityAr = "";
          }

          // Find listing translations
          const en = allTranslations.find(t => t.listing_id === listingId && t.language_code === 'en');
          const ar = allTranslations.find(t => t.listing_id === listingId && t.language_code === 'ar');
          const links = allCategoryLinks.filter(link => link.listing_id === listingId);
          const currentCategoryIds = links.map(link => String(link.category_id));

          if (en && ar) { // Ensure EN and AR listing translations exist
            console.log('[FormPopulationEffect - Revised] Found en, ar listing translations. Preparing initialFormData...');

            // --- Parse Opening Hours (REVISED for Robustness) ---
            let parsedOpeningHours: OpeningHoursData = { ...defaultOpeningHours }; // Start with a fresh copy of the MULTILINGUAL default
            if (en.opening_hours && typeof en.opening_hours === 'string') {
              try {
                const parsedDbData = JSON.parse(en.opening_hours);

                // Validate and merge day by day
                if (parsedDbData && typeof parsedDbData === 'object') {
                  let structureSeemsValid = true;
                  const mergedHours: OpeningHoursData = {} as OpeningHoursData; // Initialize empty and assert type

                  Object.keys(defaultOpeningHours).forEach(dayKey => {
                    const day = dayKey as keyof OpeningHoursData;
                    const dbDayData = parsedDbData[day];
                    const defaultDayData = defaultOpeningHours[day]; // Get default for this day

                    if (dbDayData && typeof dbDayData === 'object') {
                      // Data for this day exists in DB JSON
                      mergedHours[day] = {
                        isOpen: typeof dbDayData.isOpen === 'boolean' ? dbDayData.isOpen : defaultDayData.isOpen,
                        is24Hours: typeof dbDayData.is24Hours === 'boolean' ? dbDayData.is24Hours : defaultDayData.is24Hours,
                        open: typeof dbDayData.open === 'string' ? dbDayData.open : defaultDayData.open,
                        close: typeof dbDayData.close === 'string' ? dbDayData.close : defaultDayData.close,
                        // Prioritize new fields, fallback to old 'notes' ONLY if new are missing, else default to empty
                        notes_en: typeof dbDayData.notes_en === 'string' ? dbDayData.notes_en 
                                  : (typeof dbDayData.notes === 'string' ? dbDayData.notes : defaultDayData.notes_en), // Fallback to 'notes' then default
                        notes_ar: typeof dbDayData.notes_ar === 'string' ? dbDayData.notes_ar : defaultDayData.notes_ar, // Default if missing
                      };
                      // If isOpen is false, ensure is24Hours is also false
                      if (!mergedHours[day].isOpen) {
                        mergedHours[day].is24Hours = false;
                      }
                    } else {
                      // Day missing from DB JSON, use default
                      console.warn(`[FormPopulationEffect] Day ${day} missing from parsed DB opening hours. Using default.`);
                      mergedHours[day] = defaultDayData;
                      structureSeemsValid = false; // Mark as potentially incomplete
                    }
                  });

                  parsedOpeningHours = mergedHours; // Assign the carefully merged data
                  if (structureSeemsValid) {
                     console.log("[FormPopulationEffect] Successfully parsed and validated opening hours from DB string.");
                  } else {
                     console.warn("[FormPopulationEffect] Parsed opening hours from DB string might have been incomplete. Defaults applied where necessary.");
                  }

                } else {
                   console.warn("[FormPopulationEffect] Parsed opening hours JSON was not a valid object. Using default.");
                   parsedOpeningHours = { ...defaultOpeningHours }; // Ensure fallback is a fresh copy
                }
              } catch (parseError) {
                 console.error("[FormPopulationEffect] Error parsing opening_hours JSON from DB:", parseError, "Using default.");
                 parsedOpeningHours = { ...defaultOpeningHours }; // Ensure fallback is a fresh copy
              }
            } else {
               console.log("[FormPopulationEffect] No opening hours string found in EN translation. Using default.");
               parsedOpeningHours = { ...defaultOpeningHours }; // Ensure fallback is a fresh copy
            }
            // -----------------------------------------------------

            const populatedFormData: FormDataState = {
              // Core Listing Fields
              location: locationAddressEn, 
              location_ar: locationAddressAr, 
              google_maps_link: listing.google_maps_link || "",
              latitude: listing.latitude?.toString() || "",
              longitude: listing.longitude?.toString() || "",
              location_id: listing.location_id || null,
              google_place_id: (listing as any).google_place_id || null,
              tags: listing.tags || [],
              listing_type: listing.listing_type || "",
              city_en: cityEn,
              city_ar: cityAr,
              opening_hours: parsedOpeningHours, 
              // English Listing Translation fields
              name_en: en.name || "",
              description_en: en.description || "",
              popular_stores_en: en.popular_stores || [],
              entertainment_en: en.entertainment || [],
              dining_options_en: en.dining_options || [],
              special_services_en: en.special_services || [],
             
              parking_info_en: en.parking_info || "",
              cuisine_type_en: en.cuisine_type || "",
              story_behind_en: en.story_behind || "",
              menu_highlights_en: en.menu_highlights || [],
              price_range_en: typeof en.price_range === 'number' ? en.price_range : 0, // Directly use number, default to 0
              dietary_options_en: en.dietary_options || [],
              special_features_en: en.special_features || [],
              historical_significance_en: en.historical_significance || "",
              entry_fee_en: en.entry_fee || "",
              best_time_to_visit_en: en.best_time_to_visit || "",
              tour_guide_availability_en: en.tour_guide_availability || "",
              tips_en: en.tips || "",
              activities_en: en.activities || [],
              facilities_en: en.facilities || [],
              // Convert safety_tips array from DB to comma-separated string, handle potential non-array values
              safety_tips_en: (Array.isArray(en.safety_tips) ? en.safety_tips.join(', ') : typeof en.safety_tips === 'string' ? en.safety_tips : '') || "", 
              duration_en: en.duration || "",
              highlights_en: en.highlights || [],
              religious_significance_en: en.religious_significance || "",
              entry_rules_en: en.entry_rules || "",
              slug_en: en.slug || "",
              // Arabic Listing Translation fields
              name_ar: ar.name || "",
              description_ar: ar.description || "",
              popular_stores_ar: ar.popular_stores || [],
              entertainment_ar: ar.entertainment || [],
              dining_options_ar: ar.dining_options || [],
              special_services_ar: ar.special_services || [],
             
              parking_info_ar: ar.parking_info || "",
              cuisine_type_ar: ar.cuisine_type || "",
              story_behind_ar: ar.story_behind || "",
              menu_highlights_ar: ar.menu_highlights || [],
              price_range_ar: typeof ar.price_range === 'number' ? ar.price_range : (typeof en.price_range === 'number' ? en.price_range : 0),  // Directly use number, fallback to EN number if AR is null/invalid, else 0
              dietary_options_ar: ar.dietary_options || [],
              special_features_ar: ar.special_features || [],
              historical_significance_ar: ar.historical_significance || "",
              entry_fee_ar: ar.entry_fee || "",
              best_time_to_visit_ar: ar.best_time_to_visit || "",
              tour_guide_availability_ar: ar.tour_guide_availability || "",
              tips_ar: ar.tips || "",
              activities_ar: ar.activities || [],
              facilities_ar: ar.facilities || [],
              // Convert safety_tips array from DB to comma-separated string, handle potential non-array values, fallback to EN string
              safety_tips_ar: (Array.isArray(ar.safety_tips) ? ar.safety_tips.join(', ') : typeof ar.safety_tips === 'string' ? ar.safety_tips : '') || (Array.isArray(en.safety_tips) ? en.safety_tips.join(', ') : typeof en.safety_tips === 'string' ? en.safety_tips : '') || "", 
              duration_ar: ar.duration || "",
              highlights_ar: ar.highlights || [],
              religious_significance_ar: ar.religious_significance || "",
              entry_rules_ar: ar.entry_rules || "",
              slug_ar: ar.slug || "",
              // Category IDs
              categoryIds: currentCategoryIds,
            };

            console.log(`%c[FormPopulationEffect - Revised] Calling setFormData with fully populated data.`, "color: #28a745");
            setFormData(populatedFormData); 
            setInitialPopulationDone(true); 
          } else {
            console.warn('[FormPopulationEffect - Revised] Could not find required EN/AR listing translations. Population skipped.');
            // Optionally set flag true even if skipped, to prevent retries if data is fundamentally missing
            // setInitialPopulationDone(true); 
          }
        } catch (error: any) {
          console.error("[FormPopulationEffect - Revised] Error during population:", error);
          setErrorMessage(`Error populating form: ${error.message}`);
          // Optionally set flag true on error to prevent infinite retries
          // setInitialPopulationDone(true);
        }
      };

      populateForm(); // Execute the population logic

    } else {
      // Log why it didn't run
      if (initialPopulationDone) {
        console.log("[FormPopulationEffect - Revised] Skipping population: Already done.");
      } else if (!listing || !allTranslations || !allCategoryLinks) {
        console.log("[FormPopulationEffect - Revised] Skipping population: Core data not yet loaded.");
      }
    }

  // Depend ONLY on the data needed and the flag. Avoid formData itself.
  }, [listing, allTranslations, allCategoryLinks, listingId, supabase, initialPopulationDone]); 
  // --- End of Revised Effect ---

  // --- Fetch Available Collections & Existing Associations (No Change) ---
  useEffect(() => {
     // ... same collections fetch logic ...
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
  }, [supabase, listingId]);

  // --- NEW: Handle Form Input Change ---
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log(`[EditListingForm] handleChange: name=${name}, value=${value.substring(0, 50)}...`);
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  // >>> NEW HANDLER FOR TAG INPUTS
  const handleGenericTagInputChange = useCallback((fieldName: keyof FormDataState, newValueString: string) => { // <<< Changed second param to string
    console.log(`[EditListingForm] handleGenericTagInputChange: field=${fieldName}, valueString=`, newValueString);
    // Split by comma, trim whitespace from each tag, and remove any empty strings resulting from multiple commas
    const newTags = newValueString.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    // ---> ADD LOG HERE <---
    console.log('[handleGenericTagInputChange]', { fieldName, newValueString, newTags });
    // ---------------------
    setFormData(prev => ({
      ...prev,
      [fieldName]: newTags, // Update state with the array of strings
    }));
  }, []);
  // <<< END NEW HANDLER

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
  
  // --- ADDED: Handler for OpeningHoursInput ---
  const handleOpeningHoursChange = (newOpeningHours: OpeningHoursData) => {
    console.log("[EditListingForm] handleOpeningHoursChange:", newOpeningHours);
    setFormData(prev => ({ ...prev, opening_hours: newOpeningHours }));
  };
  // -------------------------------------------
  
  // --- ADD NEW/UPDATED: Handler to synchronize price range (accepts number | null) ---
  const handlePriceRangeChange = (value: number | null) => { // Accepts number OR null
    console.log(`[handlePriceRangeChange] New value: ${value}`);
    // Use 0 to represent null/unset in the state
    const numericValue: number = value === null ? 0 : value;
    setFormData((prev) => {
      // Create the new state object explicitly typed
      const newState: FormDataState = {
         ...prev,
         price_range_en: numericValue, // Use the guaranteed number
         price_range_ar: numericValue, // Use the guaranteed number
       };
       return newState; // Return the correctly typed state
    });
  };
  // ----------------------------------------------------------------------

  // +++ ADD NEW: Handler for Parking Select ---
  const handleParkingChange = (value: string) => {
    console.log(`[handleParkingChange] New value: ${value}`);
    setFormData((prev) => ({
      ...prev,
      parking_info_en: value,
      parking_info_ar: value, // Keep both synced with the EN value
    }));
  };
  // +++ ------------------------------------ +++

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("%c[EditListingForm] handleSubmit triggered!", "color: green; font-weight: bold;"); // <-- Add log here
    setSaving(true);
    setErrorMessage(null);
    
    // --- Prepare data (REMOVE seating options) ---
    const listingPayload = {
      listing_type: formData.listing_type,
      google_maps_link: formData.google_maps_link || null,
      tags: formData.tags, 
      latitude: parseFloat(formData.latitude) || null,
      longitude: parseFloat(formData.longitude) || null,
      google_place_id: formData.google_place_id || null, 
    };

    // 2. Location Translation Fields (No change needed here)
    const locationTranslationPayload = {
       address_en: formData.location,       
       address_ar: formData.location_ar,    
       city_en: formData.city_en,          
       city_ar: formData.city_ar,          
       location_id: formData.location_id 
    };

    // --- Stringify Opening Hours ---
    const openingHoursString = JSON.stringify(formData.opening_hours);
    // ----------------------------

    // 3. Listing Translation Fields (INCLUDE ALL FIELDS)
    const listingTranslationsPayload = [
      { // English
        language_code: 'en',
        name: formData.name_en,
        description: formData.description_en,
        opening_hours: openingHoursString,
        popular_stores: formData.popular_stores_en, 
        entertainment: formData.entertainment_en,
        dining_options: formData.dining_options_en,
        special_services: formData.special_services_en,
       
        parking_info: formData.parking_info_en,
        cuisine_type: formData.cuisine_type_en,
        story_behind: formData.story_behind_en,
        menu_highlights: formData.menu_highlights_en,
        price_range: formData.price_range_en === 0 ? null : formData.price_range_en, // Send number directly, or null if 0
        dietary_options: formData.dietary_options_en,
      
        special_features: formData.special_features_en,
        historical_significance: formData.historical_significance_en,
        entry_fee: formData.entry_fee_en,
        best_time_to_visit: formData.best_time_to_visit_en,
        tour_guide_availability: formData.tour_guide_availability_en,
        tips: formData.tips_en,
        activities: formData.activities_en,
        facilities: formData.facilities_en,
        // Convert safety_tips array from DB to comma-separated string, handle potential non-array values
        safety_tips: formData.safety_tips_en ? formData.safety_tips_en.split(',').map(s => s.trim()).filter(Boolean) : null, 
        duration: formData.duration_en,
        highlights: formData.highlights_en,
        religious_significance: formData.religious_significance_en,
        entry_rules: formData.entry_rules_en || null,
        slug: formData.slug_en,
      },
      { // Arabic
        language_code: 'ar',
        name: formData.name_ar, 
        description: formData.description_ar, 
        opening_hours: openingHoursString, // Use SAME string
        popular_stores: formData.popular_stores_ar, 
        entertainment: formData.entertainment_ar,
        dining_options: formData.dining_options_ar,
        special_services: formData.special_services_ar,
       
        parking_info: formData.parking_info_ar,
        cuisine_type: formData.cuisine_type_ar,
        story_behind: formData.story_behind_ar,
        menu_highlights: formData.menu_highlights_ar,
        price_range: formData.price_range_ar === 0 ? null : formData.price_range_ar, // Send number directly, or null if 0
        dietary_options: formData.dietary_options_ar,
      
        special_features: formData.special_features_ar,
        historical_significance: formData.historical_significance_ar,
        entry_fee: formData.entry_fee_ar,
        best_time_to_visit: formData.best_time_to_visit_ar,
        tour_guide_availability: formData.tour_guide_availability_ar,
        tips: formData.tips_ar,
        activities: formData.activities_ar,
        facilities: formData.facilities_ar,
        // Convert comma-separated string back to array for submission, or null if empty
        safety_tips: formData.safety_tips_ar ? formData.safety_tips_ar.split(',').map(s => s.trim()).filter(Boolean) : null, 
        duration: formData.duration_ar,
        highlights: formData.highlights_ar,
        religious_significance: formData.religious_significance_ar,
        entry_rules: formData.entry_rules_ar || null,
        slug: formData.slug_ar,
      },
    ];

    // 4. Category Links (No change needed here)
    const categoryIdsPayload = formData.categoryIds;

    // 5. Collection Links (No change needed here)
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
  if (isInitialDataLoading) { 
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading listing data...</span>
      </div>
    );
  }

  console.log(`%c[EditListingForm] Rendering with formData.listing_type: ${formData.listing_type}`, "color: purple"); // <-- Log current value on render
  console.log(`%c[EditListingForm] Button State Check: saving=${saving}, isInitialDataLoading=${isInitialDataLoading}`, "color: orange"); // <-- ADDED LOG

  // ---> ADD LOG HERE <---
  console.log('%c[Render Check] formData.safety_tips_en:', 'color: red;', typeof formData.safety_tips_en, formData.safety_tips_en);
  // ---------------------

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
                        // REMOVED the name prop from Select as it's handled by onValueChange/value
                        onValueChange={(value) => {
                            console.log(`%c[EditListingForm] Listing Type onValueChange triggered with: ${value}`, 'color: magenta;'); // Log value
                            console.log("%cBEFORE setFormData (listing_type)", "color: orange;"); // Log before setting state
                            setFormData((prev) => ({ ...prev, listing_type: value }));
                            console.log("%cAFTER setFormData (listing_type)", "color: orange;"); // Log after setting state
                        }} 
                        value={formData.listing_type} // Controlled component
                        required // Add required here if needed
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
                    {/* Bind Textarea value and onChange */}
                    <Textarea id="location" name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Main Street, Downtown" /> 
                </div>

                 {/* --- START: City Dropdowns --- */}
                 {/* City (English) */}
                 <div className="space-y-2">
                    <Label htmlFor="city_en">City (English) *</Label>
                     {/* Bind Select value and onValueChange */}
                    <Select
                        name="city_en" 
                        required
                        value={formData.city_en}
                        onValueChange={(value) => {
                            const matchingProvince = IRAQ_PROVINCES.find(p => p.en === value);
                            setFormData((prev) => ({ 
                                ...prev, 
                                city_en: value, 
                                city_ar: matchingProvince ? matchingProvince.ar : '' 
                            }));
                        }}
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
                      {/* Bind Select value and onValueChange */}
                     <Select
                         name="city_ar"
                         required
                         value={formData.city_ar}
                         onValueChange={(value) => {
                             const matchingProvince = IRAQ_PROVINCES.find(p => p.ar === value);
                             setFormData((prev) => ({ 
                                 ...prev, 
                                 city_ar: value, 
                                 city_en: matchingProvince ? matchingProvince.en : '' 
                             }));
                         }}
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
                        {/* Bind Input value and onChange */}
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
                     {/* Bind Textarea value and onChange */}
                    <Textarea 
                        id="location_ar" 
                        name="location_ar" 
                        value={formData.location_ar} 
                        onChange={handleChange} 
                        placeholder="مثال: الشارع الرئيسي، وسط البلد" 
                        dir="rtl" 
                    />
                </div>

                {/* Tags */}
                <div className="space-y-2">
                    <Label htmlFor="tags">Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                    {/* Bind TagInput value and onTagsChange */}
                    <TagInput 
                        id="tags"
                        value={(formData.tags || []).join(',')} 
                        onTagsChange={(newValueString: string) => handleGenericTagInputChange('tags', newValueString)}
                    />
                </div>

                {/* Latitude & Longitude */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Latitude */}
                    <div className="space-y-2">
                        <Label htmlFor="latitude">Latitude</Label>
                         {/* Bind Input value and onChange */}
                        <Input id="latitude" name="latitude" type="number" step="any" value={formData.latitude} onChange={handleChange} placeholder="e.g., 24.7136" />
                    </div>

                    {/* Longitude */}
                    <div className="space-y-2">
                        <Label htmlFor="longitude">Longitude</Label>
                        {/* Bind Input value and onChange */}
                        <Input id="longitude" name="longitude" type="number" step="any" value={formData.longitude} onChange={handleChange} placeholder="e.g., 46.6753" />
                    </div>
                </div>

                {/* --- Add Map Display Here (Moved Inside CardContent) --- */}
                {/* Spanning 2 columns on medium screens and up */}
                <div className="mt-4 md:col-span-2">
                  <Label>Map Preview</Label>
                  <div className="mt-2">
                      <MapDisplay 
                          latitude={parsedLatitude}   
                          longitude={parsedLongitude} 
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
              <ListingImageManager 
                listingId={listingId} 
              />
            </CardContent>
         </Card>
          
        {/* --- Side-by-Side Language Container --- */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {/* --- English Content Card (REMOVE Seating Options JSX) --- */}
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
                    {/* === Shop/Mall Specific Fields === */}
                    {formData.listing_type === 'Shop/Mall' && (
                        <>
                           <div className="space-y-2">
                                <Label htmlFor="popular_stores_en">Popular Stores (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="popular_stores_en" value={(formData.popular_stores_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('popular_stores_en', newValueString)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="entertainment_en">Entertainment (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="entertainment_en" value={(formData.entertainment_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('entertainment_en', newValueString)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dining_options_en">Dining Options (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="dining_options_en" value={(formData.dining_options_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('dining_options_en', newValueString)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="special_services_en">Special Services (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="special_services_en" value={(formData.special_services_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('special_services_en', newValueString)} />
                            </div>
                            {/* --- REPLACE Input with Select for parking_info_en (Shop/Mall) --- */}
                            <div className="space-y-2">
                                <Label htmlFor="parking_info_en">Parking Info (English)</Label>
                                <Select
                                    value={formData.parking_info_en}
                                    onValueChange={handleParkingChange}
                                >
                                    <SelectTrigger id="parking_info_en">
                                        <SelectValue placeholder="Select Parking Option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PARKING_OPTIONS.map(option => (
                                            <SelectItem key={option.en} value={option.en}>
                                                {option.en}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* ---------------------------------------------------------- */}
                        </>
                    )}

                    {/* === Restaurant/Café Specific Fields === */}
                   {formData.listing_type === 'Restaurant/Café' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="cuisine_type_en">Cuisine Type (English)</Label><Input id="cuisine_type_en" name="cuisine_type_en" value={formData.cuisine_type_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="story_behind_en">Story Behind (English)</Label><Textarea id="story_behind_en" name="story_behind_en" value={formData.story_behind_en} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="menu_highlights_en">Menu Highlights (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="menu_highlights_en" value={(formData.menu_highlights_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('menu_highlights_en', newValueString)} />
                            </div>
                           {/* --- ADD English PriceRangeSelector Here --- */}
                           <div className="space-y-2">
                               <Label>Price Range (English)</Label>
                               <PriceRangeSelector
                                   value={formData.price_range_en}
                                   onChange={handlePriceRangeChange}
                               />
                           </div>
                           {/* ----------------------------------------- */}
                           <div className="space-y-2">
                                <Label htmlFor="dietary_options_en">Dietary Options (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="dietary_options_en" value={(formData.dietary_options_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('dietary_options_en', newValueString)} />
                            </div>
                           <div className="space-y-2"><Label htmlFor="special_features_en">Special Features (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label><Input id="special_features_en" name="special_features_en" value={formData.special_features_en} onChange={handleChange} /></div>
                           {/* --- REPLACE Input with Select for parking_info_en (Restaurant/Café) --- */}
                           <div className="space-y-2">
                               <Label htmlFor="parking_info_en">Parking Info (English)</Label>
                               <Select
                                   value={formData.parking_info_en}
                                   onValueChange={handleParkingChange}
                               >
                                   <SelectTrigger id="parking_info_en">
                                       <SelectValue placeholder="Select Parking Option" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       {PARKING_OPTIONS.map(option => (
                                           <SelectItem key={option.en} value={option.en}>
                                               {option.en}
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           </div>
                           {/* ---------------------------------------------------------------- */}
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
                           <div className="space-y-2">
                                <Label htmlFor="facilities_en">Facilities (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="facilities_en" value={(formData.facilities_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('facilities_en', newValueString)} />
                            </div>
                           {/* --- REPLACE Input with Select for parking_info_en (Historical Site) --- */}
                           <div className="space-y-2">
                               <Label htmlFor="parking_info_en">Parking Info (English)</Label>
                               <Select
                                   value={formData.parking_info_en}
                                   onValueChange={handleParkingChange}
                               >
                                   <SelectTrigger id="parking_info_en">
                                       <SelectValue placeholder="Select Parking Option" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       {PARKING_OPTIONS.map(option => (
                                           <SelectItem key={option.en} value={option.en}>
                                               {option.en}
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           </div>
                           {/* ----------------------------------------------------------------- */}
                       </>
                   )}

                   {/* === Park/Nature Specific Fields === */}
                    {formData.listing_type === 'Park/Nature' && (
                        <>
                           <div className="space-y-2">
                                <Label htmlFor="activities_en">Activities (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="activities_en" value={(formData.activities_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('activities_en', newValueString)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facilities_en">Facilities (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="facilities_en" value={(formData.facilities_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('facilities_en', newValueString)} />
                            </div>
                            <div className="space-y-2">
                             <Label htmlFor="safety_tips_en">Safety Tips (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                             <Input 
                                 id="safety_tips_en"
                                 name="safety_tips_en"
                                 value={formData.safety_tips_en} 
                                 onChange={handleChange} 
                                 placeholder="e.g., Wear good shoes, Bring water, Stay on trail"
                                 disabled={saving}
                             />
                         </div>
                            <div className="space-y-2"><Label htmlFor="best_time_to_visit_en">Best Time to Visit (English)</Label><Input id="best_time_to_visit_en" name="best_time_to_visit_en" value={formData.best_time_to_visit_en} onChange={handleChange} /></div>
                            {/* --- REPLACE Input with Select for parking_info_en (Park/Nature) --- */}
                            <div className="space-y-2">
                               <Label htmlFor="parking_info_en">Parking Info (English)</Label>
                               <Select
                                   value={formData.parking_info_en}
                                   onValueChange={handleParkingChange}
                               >
                                   <SelectTrigger id="parking_info_en">
                                       <SelectValue placeholder="Select Parking Option" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       {PARKING_OPTIONS.map(option => (
                                           <SelectItem key={option.en} value={option.en}>
                                               {option.en}
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                            </div>
                            {/* ------------------------------------------------------------- */}
                        </>
                   )}

                   {/* === Experience Specific Fields === */}
                    {formData.listing_type === 'Experience' && (
                        <>
                           <div className="space-y-2"><Label htmlFor="duration_en">Duration (English)</Label><Input id="duration_en" name="duration_en" value={formData.duration_en} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="highlights_en">Highlights (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="highlights_en" value={(formData.highlights_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('highlights_en', newValueString)} />
                            </div>
                            {/* --- ADD English PriceRangeSelector Here --- */}
                           <div className="space-y-2">
                               <Label>Price Range (English)</Label>
                               <PriceRangeSelector
                                   value={formData.price_range_en}
                                   onChange={handlePriceRangeChange}
                               />
                           </div>
                           {/* ----------------------------------------- */}
                           <div className="space-y-2"><Label htmlFor="tips_en">Tips (English)</Label><Textarea id="tips_en" name="tips_en" value={formData.tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="safety_tips_en">Safety Tips (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <Input 
                                    id="safety_tips_en"
                                    name="safety_tips_en"
                                    value={formData.safety_tips_en} 
                                    onChange={handleChange} 
                                    placeholder="e.g., Wear good shoes, Bring water, Stay on trail"
                                    disabled={saving}
                                />
                            </div>
                           {/* --- REPLACE Input with Select for parking_info_en (Experience) --- */}
                           <div className="space-y-2">
                               <Label htmlFor="parking_info_en">Parking Info (English)</Label>
                               <Select
                                   value={formData.parking_info_en}
                                   onValueChange={handleParkingChange}
                               >
                                   <SelectTrigger id="parking_info_en">
                                       <SelectValue placeholder="Select Parking Option" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       {PARKING_OPTIONS.map(option => (
                                           <SelectItem key={option.en} value={option.en}>
                                               {option.en}
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           </div>
                           {/* -------------------------------------------------------------- */}
                        </>
                   )}

                   {/* === Museum Specific Fields === */}
                   {formData.listing_type === 'Museum' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="entry_fee_en">Entry Fee (English)</Label><Input id="entry_fee_en" name="entry_fee_en" value={formData.entry_fee_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_en">Best Time to Visit (English)</Label><Input id="best_time_to_visit_en" name="best_time_to_visit_en" value={formData.best_time_to_visit_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tour_guide_availability_en">Tour Guide Availability (English)</Label><Input id="tour_guide_availability_en" name="tour_guide_availability_en" value={formData.tour_guide_availability_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_en">Tips (English)</Label><Textarea id="tips_en" name="tips_en" value={formData.tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="facilities_en">Facilities (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="facilities_en" value={(formData.facilities_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('facilities_en', newValueString)} />
                            </div>
                           {/* --- REPLACE Input with Select for parking_info_en (Museum) --- */}
                            <div className="space-y-2">
                               <Label htmlFor="parking_info_en">Parking Info (English)</Label>
                               <Select
                                   value={formData.parking_info_en}
                                   onValueChange={handleParkingChange}
                               >
                                   <SelectTrigger id="parking_info_en">
                                       <SelectValue placeholder="Select Parking Option" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       {PARKING_OPTIONS.map(option => (
                                           <SelectItem key={option.en} value={option.en}>
                                               {option.en}
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           </div>
                           {/* ---------------------------------------------------------- */}
                           <div className="space-y-2">
                                <Label htmlFor="highlights_en">Highlights (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="highlights_en" value={(formData.highlights_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('highlights_en', newValueString)} />
                            </div>
                       </>
                   )}

                   {/* === Religious Site Specific Fields === */}
                   {formData.listing_type === 'Religious Site' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="religious_significance_en">Religious Significance (English)</Label><Textarea id="religious_significance_en" name="religious_significance_en" value={formData.religious_significance_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_rules_en">Entry Rules (English)</Label><Textarea id="entry_rules_en" name="entry_rules_en" value={formData.entry_rules_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_en">Best Time to Visit (English)</Label><Input id="best_time_to_visit_en" name="best_time_to_visit_en" value={formData.best_time_to_visit_en} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_en">Tips (English)</Label><Textarea id="tips_en" name="tips_en" value={formData.tips_en} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="facilities_en">Facilities (English) <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                <TagInput id="facilities_en" value={(formData.facilities_en || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('facilities_en', newValueString)} />
                            </div>
                           {/* --- REPLACE Input with Select for parking_info_en (Religious Site) --- */}
                           <div className="space-y-2">
                               <Label htmlFor="parking_info_en">Parking Info (English)</Label>
                               <Select
                                   value={formData.parking_info_en}
                                   onValueChange={handleParkingChange}
                               >
                                   <SelectTrigger id="parking_info_en">
                                       <SelectValue placeholder="Select Parking Option" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       {PARKING_OPTIONS.map(option => (
                                           <SelectItem key={option.en} value={option.en}>
                                               {option.en}
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           </div>
                           {/* ------------------------------------------------------------------ */}
                       </>
                   )}
               </CardContent>
             </Card>

             {/* --- Arabic Content Card (REMOVE Seating Options JSX) --- */}
             <Card>
               <CardHeader><CardTitle>Arabic Content</CardTitle></CardHeader>
               <CardContent className="grid grid-cols-1 gap-6">
                  {/* === Always Shown Fields === */}
                  <div className="space-y-2"><Label htmlFor="name_ar">Name (Arabic) *</Label><Input dir="rtl" id="name_ar" name="name_ar" value={formData.name_ar} onChange={handleChange} required /></div>
                  <div className="space-y-2"><Label htmlFor="slug_ar">Slug (Arabic)</Label><Input dir="rtl" id="slug_ar" name="slug_ar" value={formData.slug_ar} onChange={handleChange} /></div>
                  <div className="space-y-2"><Label htmlFor="description_ar">Description (Arabic)</Label><Textarea dir="rtl" id="description_ar" name="description_ar" value={formData.description_ar} onChange={handleChange} /></div>
                  {/* === Shop/Mall Specific Fields === */}
                   {formData.listing_type === 'Shop/Mall' && (
                       <>
                           <div className="space-y-2">
                                <Label htmlFor="popular_stores_ar">Popular Stores (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="popular_stores_ar" value={(formData.popular_stores_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('popular_stores_ar', newValueString)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="entertainment_ar">Entertainment (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="entertainment_ar" value={(formData.entertainment_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('entertainment_ar', newValueString)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dining_options_ar">Dining Options (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="dining_options_ar" value={(formData.dining_options_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('dining_options_ar', newValueString)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="special_services_ar">Special Services (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="special_services_ar" value={(formData.special_services_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('special_services_ar', newValueString)} />
                            </div>
                            {/* --- REPLACE Input with Select for parking_info_ar (Shop/Mall) --- */}
                             <div className="space-y-2">
                                <Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label>
                                <Select
                                    value={formData.parking_info_ar}
                                    onValueChange={handleParkingChange}
                                    dir="rtl"
                                >
                                    <SelectTrigger id="parking_info_ar">
                                        <SelectValue placeholder="اختر خيار المواقف" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                        {PARKING_OPTIONS.map(option => (
                                            <SelectItem key={option.en} value={option.en}> {/* Still use EN value */}
                                                {option.ar} {/* Show AR label */}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* ---------------------------------------------------------- */}
                        </>
                   )}

                    {/* === Restaurant/Café Specific Fields === */}
                   {formData.listing_type === 'Restaurant/Café' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="cuisine_type_ar">Cuisine Type (Arabic)</Label><Input dir="rtl" id="cuisine_type_ar" name="cuisine_type_ar" value={formData.cuisine_type_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="story_behind_ar">Story Behind (Arabic)</Label><Textarea dir="rtl" id="story_behind_ar" name="story_behind_ar" value={formData.story_behind_ar} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="menu_highlights_ar">Menu Highlights (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="menu_highlights_ar" value={(formData.menu_highlights_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('menu_highlights_ar', newValueString)} />
                            </div>
                           {/* --- REPLACE Old Input with PriceRangeSelector (Arabic) --- */}
                           <div className="space-y-2">
                               <Label>Price Range (Arabic)</Label> {/* Label doesn't need htmlFor */}
                               <PriceRangeSelector
                                   value={formData.price_range_ar}
                                   onChange={handlePriceRangeChange}
                                   // REMOVE dir="rtl"
                               />
                           </div>
                           {/* --------------------------------------------------------- */}
                           <div className="space-y-2">
                                <Label htmlFor="dietary_options_ar">Dietary Options (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="dietary_options_ar" value={(formData.dietary_options_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('dietary_options_ar', newValueString)} />
                            </div>
                           <div className="space-y-2">
                                <Label htmlFor="special_features_ar">Special Features (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="special_features_ar" value={(formData.special_features_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('special_features_ar', newValueString)} />
                            </div>
                           {/* --- REPLACE Input with Select for parking_info_ar (Restaurant/Café) --- */}
                           <div className="space-y-2">
                                <Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label>
                                <Select
                                    value={formData.parking_info_ar}
                                    onValueChange={handleParkingChange}
                                    dir="rtl"
                                >
                                    <SelectTrigger id="parking_info_ar">
                                        <SelectValue placeholder="اختر خيار المواقف" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                        {PARKING_OPTIONS.map(option => (
                                            <SelectItem key={option.en} value={option.en}> {/* Still use EN value */}
                                                {option.ar} {/* Show AR label */}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                           {/* ---------------------------------------------------------------- */}
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
                           <div className="space-y-2">
                                <Label htmlFor="facilities_ar">Facilities (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="facilities_ar" value={(formData.facilities_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('facilities_ar', newValueString)} />
                            </div>
                           {/* --- REPLACE Input with Select for parking_info_ar (Historical Site) --- */}
                           <div className="space-y-2">
                                <Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label>
                                <Select
                                    value={formData.parking_info_ar}
                                    onValueChange={handleParkingChange}
                                    dir="rtl"
                                >
                                    <SelectTrigger id="parking_info_ar">
                                        <SelectValue placeholder="اختر خيار المواقف" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                        {PARKING_OPTIONS.map(option => (
                                            <SelectItem key={option.en} value={option.en}> {/* Still use EN value */}
                                                {option.ar} {/* Show AR label */}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                           {/* ----------------------------------------------------------------- */}
                       </>
                   )}

                   {/* === Park/Nature Specific Fields === */}
                   {formData.listing_type === 'Park/Nature' && (
                       <>
                           <div className="space-y-2">
                                <Label htmlFor="activities_ar">Activities (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="activities_ar" value={(formData.activities_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('activities_ar', newValueString)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="facilities_ar">Facilities (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="facilities_ar" value={(formData.facilities_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('facilities_ar', newValueString)} />
                            </div>
                            <div className="space-y-2">
                             <Label htmlFor="safety_tips_ar">Safety Tips (Arabic) <span className="text-muted-foreground text-xs">(مفصولة بفواصل)</span></Label>
                             <Input 
                                 dir="rtl"
                                 id="safety_tips_ar"
                                 name="safety_tips_ar"
                                 value={formData.safety_tips_ar} 
                                 onChange={handleChange} 
                                 placeholder="مثال: ارتدِ أحذية جيدة، أحضر ماء، ابق على الطريق"
                                 disabled={saving}
                             />
                         </div>
                            <div className="space-y-2"><Label htmlFor="best_time_to_visit_ar">Best Time to Visit (Arabic)</Label><Input dir="rtl" id="best_time_to_visit_ar" name="best_time_to_visit_ar" value={formData.best_time_to_visit_ar} onChange={handleChange} /></div>
                            <div className="space-y-2"><Label htmlFor="entry_fee_ar">Entry Fee (Arabic)</Label><Input dir="rtl" id="entry_fee_ar" name="entry_fee_ar" value={formData.entry_fee_ar} onChange={handleChange} /></div>
                            {/* --- REPLACE Input with Select for parking_info_ar (Park/Nature) --- */}
                            <div className="space-y-2">
                                <Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label>
                                <Select
                                    value={formData.parking_info_ar}
                                    onValueChange={handleParkingChange}
                                    dir="rtl"
                                >
                                    <SelectTrigger id="parking_info_ar">
                                        <SelectValue placeholder="اختر خيار المواقف" />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                        {PARKING_OPTIONS.map(option => (
                                            <SelectItem key={option.en} value={option.en}> {/* Still use EN value */}
                                                {option.ar} {/* Show AR label */}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* ------------------------------------------------------------- */}
                        </>
                   )}

                   {/* === Experience Specific Fields === */}
                   {formData.listing_type === 'Experience' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="duration_ar">Duration (Arabic)</Label><Input dir="rtl" id="duration_ar" name="duration_ar" value={formData.duration_ar} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="highlights_ar">Highlights (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="highlights_ar" value={(formData.highlights_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('highlights_ar', newValueString)} />
                            </div>
                            {/* --- REPLACE Old Input with PriceRangeSelector (Arabic) --- */}
                           <div className="space-y-2">
                               <Label>Price Range (Arabic)</Label> {/* Label doesn't need htmlFor */}
                               <PriceRangeSelector
                                   value={formData.price_range_ar}
                                   onChange={handlePriceRangeChange}
                                   // REMOVE dir="rtl"
                               />
                           </div>
                           {/* --------------------------------------------------------- */}
                           <div className="space-y-2"><Label htmlFor="tips_ar">Tips (Arabic)</Label><Textarea dir="rtl" id="tips_ar" name="tips_ar" value={formData.tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="safety_tips_ar">Safety Tips (Arabic) <span className="text-muted-foreground text-xs">(مفصولة بفواصل)</span></Label>
                                <Input 
                                    dir="rtl"
                                    id="safety_tips_ar"
                                    name="safety_tips_ar"
                                    value={formData.safety_tips_ar} 
                                    onChange={handleChange} 
                                    placeholder="مثال: ارتدِ أحذية جيدة، أحضر ماء، ابق على الطريق"
                                    disabled={saving}
                                />
                            </div>
                           {/* --- REPLACE Input with Select for parking_info_ar (Experience) --- */}
                           <div className="space-y-2">
                               <Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label>
                               <Select
                                   value={formData.parking_info_ar}
                                   onValueChange={handleParkingChange}
                                   dir="rtl"
                               >
                                   <SelectTrigger id="parking_info_ar">
                                       <SelectValue placeholder="اختر خيار المواقف" />
                                   </SelectTrigger>
                                   <SelectContent dir="rtl">
                                       {PARKING_OPTIONS.map(option => (
                                           <SelectItem key={option.en} value={option.en}> {/* Still use EN value */}
                                               {option.ar} {/* Show AR label */}
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           </div>
                           {/* -------------------------------------------------------------- */}
                        </>
                   )}

                   {/* === Museum Specific Fields === */}
                   {formData.listing_type === 'Museum' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="entry_fee_ar">Entry Fee (Arabic)</Label><Input dir="rtl" id="entry_fee_ar" name="entry_fee_ar" value={formData.entry_fee_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_ar">Best Time to Visit (Arabic)</Label><Input dir="rtl" id="best_time_to_visit_ar" name="best_time_to_visit_ar" value={formData.best_time_to_visit_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tour_guide_availability_ar">Tour Guide Availability (Arabic)</Label><Input dir="rtl" id="tour_guide_availability_ar" name="tour_guide_availability_ar" value={formData.tour_guide_availability_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_ar">Tips (Arabic)</Label><Textarea dir="rtl" id="tips_ar" name="tips_ar" value={formData.tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="facilities_ar">Facilities (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="facilities_ar" value={(formData.facilities_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('facilities_ar', newValueString)} />
                            </div>
                           {/* --- REPLACE Input with Select for parking_info_ar (Museum) --- */}
                            <div className="space-y-2">
                               <Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label>
                               <Select
                                   value={formData.parking_info_ar}
                                   onValueChange={handleParkingChange}
                               >
                                   <SelectTrigger id="parking_info_ar">
                                       <SelectValue placeholder="اختر خيار المواقف" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       {PARKING_OPTIONS.map(option => (
                                           <SelectItem key={option.en} value={option.en}>
                                               {option.en}
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           </div>
                           {/* ---------------------------------------------------------- */}
                           <div className="space-y-2">
                                <Label htmlFor="highlights_ar">Highlights (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="highlights_ar" value={(formData.highlights_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('highlights_ar', newValueString)} />
                            </div>
                       </>
                   )}

                   {/* === Religious Site Specific Fields === */}
                   {formData.listing_type === 'Religious Site' && (
                       <>
                           <div className="space-y-2"><Label htmlFor="religious_significance_ar">Religious Significance (Arabic)</Label><Textarea dir="rtl" id="religious_significance_ar" name="religious_significance_ar" value={formData.religious_significance_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="entry_rules_ar">Entry Rules (Arabic)</Label><Textarea dir="rtl" id="entry_rules_ar" name="entry_rules_ar" value={formData.entry_rules_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="best_time_to_visit_ar">Best Time to Visit (Arabic)</Label><Input dir="rtl" id="best_time_to_visit_ar" name="best_time_to_visit_ar" value={formData.best_time_to_visit_ar} onChange={handleChange} /></div>
                           <div className="space-y-2"><Label htmlFor="tips_ar">Tips (Arabic)</Label><Textarea dir="rtl" id="tips_ar" name="tips_ar" value={formData.tips_ar} onChange={handleChange} /></div>
                           <div className="space-y-2">
                                <Label htmlFor="facilities_ar">Facilities (Arabic) <span className="text-muted-foreground text-xs">(علامات)</span></Label>
                                <TagInput dir="rtl" id="facilities_ar" value={(formData.facilities_ar || []).join(',')} onTagsChange={(newValueString: string) => handleGenericTagInputChange('facilities_ar', newValueString)} />
                            </div>
                           {/* --- REPLACE Input with Select for parking_info_ar (Religious Site) --- */}
                           <div className="space-y-2">
                               <Label htmlFor="parking_info_ar">Parking Info (Arabic)</Label>
                               <Select
                                   value={formData.parking_info_ar}
                                   onValueChange={handleParkingChange}
                               >
                                   <SelectTrigger id="parking_info_ar">
                                       <SelectValue placeholder="اختر خيار المواقف" />
                                   </SelectTrigger>
                                   <SelectContent dir="rtl">
                                       {PARKING_OPTIONS.map(option => (
                                           <SelectItem key={option.en} value={option.en}> {/* Still use EN value */}
                                               {option.ar} {/* Show AR label */}
                                           </SelectItem>
                                       ))}
                                   </SelectContent>
                               </Select>
                           </div>
                           {/* ------------------------------------------------------------------ */}
                       </>
                   )}
               </CardContent>
             </Card>
         </div> {/* End Side-by-Side Container */}

        {/* --- Re-adding Opening Hours Card --- */}
        <Card>
          <CardHeader>
            <CardTitle>Opening Hours</CardTitle>
            <CardDescription>Set the opening hours for each day of the week. This applies to both languages.</CardDescription>
          </CardHeader>
          <CardContent>
            <OpeningHoursInput
              value={formData.opening_hours} // Use the new state field
              onChange={handleOpeningHoursChange} // Use the new handler
            />
          </CardContent>
        </Card>
        {/* ------------------------------- */}

        {/* --- Categories Card (No Change) --- */}
         <Card>
             {/* ... same categories card ... */}
             <CardHeader><CardTitle>Categories</CardTitle></CardHeader>
            <CardContent>
                 {categoriesLoading ? (
                     <p>Loading categories...</p>
               ) : combinedDisplayCategories.length > 0 ? ( 
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

        {/* --- Curated Collections Card (No Change) --- */}
         <Card>
           {/* ... same collections card ... */}
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

        {/* Submit Buttons (Update disabled state) */}
        <div className="flex justify-end gap-3 mt-8">
          <Link href="/dashboard/listings">
             <Button type="button" variant="outline" disabled={saving}>Cancel</Button>
          </Link>
          {/* Disable submit if initial data is still loading OR saving is in progress */}
          <Button type="submit" disabled={saving || isInitialDataLoading}> 
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