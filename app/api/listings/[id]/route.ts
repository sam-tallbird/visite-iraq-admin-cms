import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Define the expected structure of the request body for PUT (matching frontend)
interface ListingPutPayload {
    listingData: {
        // Direct listing fields
        listing_type: string;
        google_maps_link?: string | null;
        tags?: string[] | null;
        latitude?: number | null;
        longitude?: number | null;
        google_place_id?: string | null; 
        // location_id will be determined later
    };
    locationTranslations: { // Location name/address data
        name_en: string | null;
        name_ar: string | null;
        location_id: string | null; // Existing ID if available
    };
    listingTranslations: Array<{ // Listing specific translations
        language_code: 'en' | 'ar';
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
    }>;
    categoryIds: string[];
    collectionLinks: Array<{ 
        collection_id: string;
        feature_on_home: boolean;
    }>;
}


export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient(); 
    const listingId = params.id;

    console.log(`[API PUT /api/listings/${listingId}] Received update request.`);

    if (!listingId) {
        console.error(`[API PUT /api/listings] Missing listing ID.`);
        return NextResponse.json({ message: 'Listing ID is required' }, { status: 400 });
    }

    try {
        const payload: ListingPutPayload = await request.json();
        console.log(`[API PUT /api/listings/${listingId}] Parsed Payload Corrected:`, JSON.stringify(payload, null, 2));

        // Destructure payload for easier access
        const {
            listingData,
            locationTranslations,
            listingTranslations,
            categoryIds,
            collectionLinks
        } = payload;

        // --- TODO: Wrap in Transaction --- 
        // For atomicity, wrap all DB operations below in a transaction
        // using supabase.rpc('transaction', async (tx) => { ... }); or similar

        // --- 1. Upsert Location & Get Location ID ---
        let locationIdToLink: string | null = locationTranslations.location_id; // Start with potentially existing ID
        console.log(`[API PUT /api/listings/${listingId}] Initial location_id from payload: ${locationIdToLink}`);

        // Try to upsert based on google_place_id if available
        if (listingData.latitude != null && listingData.longitude != null && listingData.google_place_id) {
             console.log(`[API PUT /api/listings/${listingId}] Upserting location based on google_place_id: ${listingData.google_place_id}`);
            
            const locationUpsertData = {
                google_place_id: listingData.google_place_id, 
                latitude: listingData.latitude,
                longitude: listingData.longitude,
            };

            const { data: upsertedLocationData, error: locationUpsertError } = await supabase
                .from('locations')
                .upsert(locationUpsertData, { onConflict: 'google_place_id' })
                .select('id')
                .single();

            if (locationUpsertError) {
                console.error(`[API PUT /api/listings/${listingId}] Error upserting location:`, locationUpsertError);
                throw new Error(`Failed to upsert location: ${locationUpsertError.message}`);
            }
            locationIdToLink = upsertedLocationData?.id || null;
            console.log(`[API PUT /api/listings/${listingId}] Location ID after place_id upsert: ${locationIdToLink}`);
        }
        
        // If we have a location ID (either existing or from upsert) and names, upsert translations
        if (locationIdToLink && (locationTranslations.name_en || locationTranslations.name_ar)) {
            console.log(`[API PUT /api/listings/${listingId}] Upserting location translations for location ID: ${locationIdToLink}`);
            const locationTranslationsToUpsert = [];
            if (locationTranslations.name_en) {
                locationTranslationsToUpsert.push({
                    location_id: locationIdToLink,
                    language_code: 'en', 
                    name: locationTranslations.name_en,
                    address: locationTranslations.name_en // Use name as address for now
                });
            }
            if (locationTranslations.name_ar) {
                locationTranslationsToUpsert.push({
                    location_id: locationIdToLink,
                    language_code: 'ar',
                    name: locationTranslations.name_ar,
                    address: locationTranslations.name_ar // Use name as address for now
                });
            }

            if (locationTranslationsToUpsert.length > 0) {
                 const { error: locTransError } = await supabase
                    .from('location_translations')
                    .upsert(locationTranslationsToUpsert, { onConflict: 'location_id, language_code' });
                
                 if (locTransError) {
                     console.error(`[API PUT /api/listings/${listingId}] Error upserting location translations:`, locTransError);
                     throw new Error(`Failed to upsert location translations: ${locTransError.message}`);
                 } else {
                     console.log(`[API PUT /api/listings/${listingId}] Successfully upserted location translations.`);
                 }
            }
        } else {
             console.log(`[API PUT /api/listings/${listingId}] Skipping location translations upsert (no ID or no names provided).`);
        }

        // --- 2. Update Main Listing Table ---
        console.log(`[API PUT /api/listings/${listingId}] Updating main listing table...`);
        const listingUpdateData: any = {
            listing_type: listingData.listing_type,
            google_maps_link: listingData.google_maps_link,
            tags: listingData.tags,
            // IMPORTANT: Update the location_id foreign key
            location_id: locationIdToLink, 
            // Include other direct fields from listingData if needed
        };

        const { error: listingUpdateError } = await supabase
            .from('listings')
            .update(listingUpdateData)
            .eq('id', listingId);

        if (listingUpdateError) {
            console.error(`[API PUT /api/listings/${listingId}] Error updating listing table:`, listingUpdateError);
            throw new Error(`Failed to update listing: ${listingUpdateError.message}`);
        }
        console.log(`[API PUT /api/listings/${listingId}] Successfully updated main listing table.`);

        // --- 3. Upsert Listing Translations ---
        console.log(`[API PUT /api/listings/${listingId}] Upserting listing translations...`);
        if (listingTranslations && listingTranslations.length > 0) {
            const translationsToUpsert = listingTranslations.map(trans => ({
                ...trans, // Spread all fields from the payload
                listing_id: listingId, // Ensure listing_id is set
            }));

            const { error: translationsUpsertError } = await supabase
                .from('listing_translations')
                .upsert(translationsToUpsert, { onConflict: 'listing_id, language_code' });

            if (translationsUpsertError) {
                console.error(`[API PUT /api/listings/${listingId}] Error upserting listing translations:`, translationsUpsertError);
                throw new Error(`Failed to upsert listing translations: ${translationsUpsertError.message}`);
            }
            console.log(`[API PUT /api/listings/${listingId}] Successfully upserted listing translations.`);
        } else {
            console.log(`[API PUT /api/listings/${listingId}] No listing translations provided.`);
        }

        // --- 4. Update Category Links --- 
        console.log(`[API PUT /api/listings/${listingId}] Updating category links...`);
        // Fetch existing links
         const { data: existingLinksData, error: fetchExistingError } = await supabase
             .from('listing_categories')
             .select('category_id') 
             .eq('listing_id', listingId);

         if (fetchExistingError) {
             console.error(`[API PUT /api/listings/${listingId}] Error fetching existing category links:`, fetchExistingError);
             throw new Error(`Failed to fetch existing category links: ${fetchExistingError.message}`);
         }
         const existingCategoryIds = new Set(existingLinksData?.map(link => link.category_id) || []);
         const submittedCategoryIds = new Set(categoryIds || []);
         
         // Calculate diff
         const categoriesToAdd = (categoryIds || []).filter(id => !existingCategoryIds.has(id));
         const categoriesToRemove = Array.from(existingCategoryIds).filter(id => !submittedCategoryIds.has(id));

         // Remove old links
         if (categoriesToRemove.length > 0) {
             const { error: deleteCatError } = await supabase
                 .from('listing_categories')
                 .delete()
                 .eq('listing_id', listingId)
                 .in('category_id', categoriesToRemove);
             if (deleteCatError) {
                  console.error(`[API PUT /api/listings/${listingId}] Error deleting category links:`, deleteCatError);
                  throw new Error(`Failed to delete category links: ${deleteCatError.message}`);
             }
              console.log(`[API PUT /api/listings/${listingId}] Successfully deleted ${categoriesToRemove.length} category links.`);
         }

         // Add new links
         if (categoriesToAdd.length > 0) {
             const linksToInsert = categoriesToAdd.map(catId => ({ listing_id: listingId, category_id: catId }));
             const { error: insertCatError } = await supabase.from('listing_categories').insert(linksToInsert);
             if (insertCatError) {
                 console.error(`[API PUT /api/listings/${listingId}] Error inserting category links:`, insertCatError);
                 throw new Error(`Failed to insert category links: ${insertCatError.message}`);
             }
              console.log(`[API PUT /api/listings/${listingId}] Successfully inserted ${linksToInsert.length} category links.`);
         }

        // --- 5. Update Collection Links --- 
        console.log(`[API PUT /api/listings/${listingId}] Updating collection links...`);
        // Delete existing links
        const { error: deleteCollError } = await supabase
            .from('curated_collection_items')
            .delete()
            .eq('listing_id', listingId);

        if (deleteCollError) {
            console.error(`[API PUT /api/listings/${listingId}] Error deleting existing collection links:`, deleteCollError);
            throw new Error(`Failed to clear old collection links: ${deleteCollError.message}`);
        }

        // Insert new links
        if (collectionLinks && collectionLinks.length > 0) {
            const itemsToInsert = collectionLinks.map(link => ({
                listing_id: listingId,
                collection_id: link.collection_id,
                feature_on_home: link.feature_on_home,
            }));
            const { error: insertCollError } = await supabase.from('curated_collection_items').insert(itemsToInsert);
            if (insertCollError) {
                console.error(`[API PUT /api/listings/${listingId}] Error inserting new collection links:`, insertCollError);
                throw new Error(`Failed to insert new collection links: ${insertCollError.message}`);
            }
             console.log(`[API PUT /api/listings/${listingId}] Successfully inserted ${itemsToInsert.length} new collection links.`);
        }

        // --- Success --- 
        console.log(`[API PUT /api/listings/${listingId}] All updates completed successfully.`);
        return NextResponse.json({ message: 'Listing updated successfully' }, { status: 200 });

    } catch (error: any) {
        console.error(`[API PUT /api/listings/${listingId}] Error processing request:`, error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

// --- Add GET and DELETE handlers if needed ---

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient();
    const listingId = params.id;

    console.log(`[API GET /api/listings/${listingId}] Received request.`);

    if (!listingId) {
        return NextResponse.json({ message: 'Listing ID is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('listings')
            .select(`
                *,
                listing_translations ( * ),
                listing_categories ( category_id ),
                locations ( *,
                    location_translations ( * )
                )
            `)
            .eq('id', listingId)
            .maybeSingle(); // Use maybeSingle() in case the ID doesn't exist

        if (error) {
            console.error(`[API GET /api/listings/${listingId}] Error fetching listing:`, error);
            throw error;
        }

        if (!data) {
            return NextResponse.json({ message: 'Listing not found' }, { status: 404 });
        }

        console.log(`[API GET /api/listings/${listingId}] Listing fetched successfully.`);
        return NextResponse.json(data, { status: 200 });

    } catch (error: any) {
        console.error(`[API GET /api/listings/${listingId}] Error processing request:`, error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}


export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const supabase = createClient();
    const listingId = params.id;

    console.log(`[API DELETE /api/listings/${listingId}] Received request.`);

    if (!listingId) {
        return NextResponse.json({ message: 'Listing ID is required' }, { status: 400 });
    }

    try {
        // Add logic to delete related data if necessary (e.g., translations, category links)
        // depending on your database cascade settings.

        const { error } = await supabase
            .from('listings')
            .delete()
            .eq('id', listingId);

        if (error) {
            console.error(`[API DELETE /api/listings/${listingId}] Error deleting listing:`, error);
            // Check for specific errors, like foreign key violations if cascade isn't set up
            throw error;
        }

        // Check if any row was actually deleted (optional)
        // const { count } = await supabase... (delete returns null data, check error or count?)
        // Supabase delete doesn't easily return count, rely on error checking.

        console.log(`[API DELETE /api/listings/${listingId}] Listing deleted successfully (or did not exist).`);
        return NextResponse.json({ message: 'Listing deleted successfully' }, { status: 200 }); // 200 or 204 No Content

    } catch (error: any) {
        console.error(`[API DELETE /api/listings/${listingId}] Error processing request:`, error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
} 