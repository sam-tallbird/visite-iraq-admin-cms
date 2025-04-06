import { NextRequest, NextResponse } from 'next/server';
import { Client, Language, PlaceData } from "@googlemaps/google-maps-services-js";

// Regex to capture name and coordinates
// Example: /maps/place/Ishtar+Gate/@32.542,44.427,17z
const placeAndCoordsRegex = /\/place\/([^\/]+)\/@(-?\d+\.\d+),(-?\d+\.\d+)/;

// Helper function to remove Plus Code prefix
const removePlusCode = (address: string | null): string | null => {
    if (!address) return null;
    // Corrected Regex: Matches the Plus Code pattern at the start,
    // followed by zero or more spaces or commas (English/Arabic).
    const plusCodeRegex = /^([A-Z0-9]+\+[A-Z0-9]+)[\s,،]*/i;
    return address.replace(plusCodeRegex, '').trim();
};

export async function POST(request: NextRequest) {
    // Use the SERVER-SIDE environment variable (no NEXT_PUBLIC_ prefix)
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
        // Update error message to reflect the variable name checked
        console.error("[API /location-lookup] Server-side Google Maps API Key (GOOGLE_MAPS_API_KEY) is not configured in environment variables.");
        return NextResponse.json({ message: 'Server-side API key not configured.' }, { status: 500 });
    }

    const client = new Client({}); // Initialize client once

    try {
        const body = await request.json();
        const googleMapsUrl = body.url;

        if (!googleMapsUrl || typeof googleMapsUrl !== 'string') {
            return NextResponse.json({ message: 'Missing or invalid \'url\' in request body.' }, { status: 400 });
        }

        console.log(`[API /location-lookup] Received URL: ${googleMapsUrl}`);

        // --- Extract Name and Coordinates ---
        const match = googleMapsUrl.match(placeAndCoordsRegex);
        if (!match || match.length < 4) { // Need 4 groups: full match, name, lat, lng
            console.warn(`[API /location-lookup] Could not extract name/coords pattern from URL: ${googleMapsUrl}`);
            // Fallback? Maybe try just coords if name is missing?
            return NextResponse.json({ message: 'Could not extract name and coordinates from the provided URL pattern.' }, { status: 400 });
        }
        
        const encodedName = match[1];
        const inputLatitude = parseFloat(match[2]);
        const inputLongitude = parseFloat(match[3]);
        let keyword: string | undefined = undefined;
        
        try {
            // Decode the place name (replace + with space before decoding)
            let decodedName = decodeURIComponent(encodedName.replace(/\+/g, ' '));
            console.log(`[API /location-lookup] Decoded Name: '${decodedName}'`);
            // Clean potential problematic Unicode control characters (like LRO, RLO, etc.)
            keyword = decodedName.replace(/[\u202A-\u202E\u200E\u200F]/g, '').trim(); 
            console.log(`[API /location-lookup] Cleaned Keyword: '${keyword}'`);
        } catch (e) {
            console.warn(`[API /location-lookup] Failed to decode/clean extracted name: ${encodedName}`, e);
            // Proceed without keyword if decoding fails
        }
        console.log(`[API /location-lookup] Extracted Coords: Lat=${inputLatitude}, Lng=${inputLongitude}`);

        // --- Step 1: Nearby Search with Keyword ---
        let nearbySearchResponse;
        try {
            console.log(`[API /location-lookup] Performing Nearby Search with Keyword: '${keyword}'...`);
            nearbySearchResponse = await client.placesNearby({
                params: {
                    location: { lat: inputLatitude, lng: inputLongitude },
                    radius: 250, // Increased radius to 250 meters
                    key: apiKey,
                    keyword: keyword, // Use the extracted keyword!
                },
                timeout: 5000,
            });
             if (nearbySearchResponse.status !== 200) {
                 throw { 
                     message: `Nearby Search API Error Status: ${nearbySearchResponse.status}`,
                     response: nearbySearchResponse.data
                 };
             }
        } catch (error: any) {
             console.error("[API /location-lookup] Nearby Search Request FAILED:", error);
             throw new Error(`Nearby Search Request Failed: ${error.message || 'Unknown error'}`);
        }
        
        if (!nearbySearchResponse.data.results || nearbySearchResponse.data.results.length === 0) {
            console.warn(`[API /location-lookup] No Nearby Search results found for keyword '${keyword}' near ${inputLatitude},${inputLongitude}`);
             return NextResponse.json({ message: 'No nearby places found matching the name and coordinates.' }, { status: 404 });
        }

        const bestMatch = nearbySearchResponse.data.results[0];
        const placeId = bestMatch.place_id;
        const initialName = bestMatch.name; 
        const resultLat = bestMatch.geometry?.location?.lat ?? inputLatitude;
        const resultLng = bestMatch.geometry?.location?.lng ?? inputLongitude;
        
        if (!placeId) {
             console.warn(`[API /location-lookup] First Nearby Search result missing Place ID.`);
             return NextResponse.json({ message: 'Could not determine Place ID from nearby search.' }, { status: 404 });
        }
        console.log(`[API /location-lookup] Best match from Nearby Search: Name='${initialName}', ID=${placeId}, Coords=${resultLat},${resultLng}`);

        // --- Step 2: Place Details for accurate/translated address ---
        let raw_nameEn: string | null = null; // Store raw address before cleaning
        let raw_nameAr: string | null = null;
        
        // Fetch English Details
        try {
            console.log(`[API /location-lookup] Fetching Place Details (EN) for ID: ${placeId}`);
            const detailsEnResponse = await client.placeDetails({
                params: { place_id: placeId, key: apiKey, language: Language.en, fields: ['formatted_address'] }, 
                timeout: 5000,
            });
            if (detailsEnResponse.status === 200 && detailsEnResponse.data?.result?.formatted_address) {
                raw_nameEn = detailsEnResponse.data.result.formatted_address;
                console.log(`[API /location-lookup] Raw English Address: ${raw_nameEn}`);
            } else {
                 console.warn("[API /location-lookup] Place Details (EN) non-200 or no formatted_address:", 
                    detailsEnResponse.status, detailsEnResponse.data?.error_message || detailsEnResponse.data?.status);
                 // Fallback to initial name from nearby search if details fail?
                 // nameEn = initialName || null; 
            }
        } catch(error: any) {
            console.error("[API /location-lookup] Place Details (EN) Request FAILED:", error);
        }
       
        // Fetch Arabic Details
        try { 
            console.log(`[API /location-lookup] Fetching Place Details (AR) for ID: ${placeId}`);
            const detailsArResponse = await client.placeDetails({
                params: { place_id: placeId, key: apiKey, language: Language.ar, fields: ['formatted_address'] },
                timeout: 5000,
            });
            if (detailsArResponse.status === 200 && detailsArResponse.data?.result?.formatted_address) {
                raw_nameAr = detailsArResponse.data.result.formatted_address;
                console.log(`[API /location-lookup] Raw Arabic Address: ${raw_nameAr}`);
            } else {
                console.warn("[API /location-lookup] Place Details (AR) non-200 or no formatted_address:", 
                    detailsArResponse.status, detailsArResponse.data?.error_message || detailsArResponse.data?.status);
            }
        } catch (error: any) {
            console.error("[API /location-lookup] Place Details (AR) Request FAILED:", error);
        }
         
        // --- Clean Addresses and Return Results ---
        const nameEn = removePlusCode(raw_nameEn); // Clean the English address
        const nameAr = removePlusCode(raw_nameAr); // Clean the Arabic address

        console.log(`[API /location-lookup] Cleaned English Address: ${nameEn}`);
        console.log(`[API /location-lookup] Cleaned Arabic Address: ${nameAr}`);

        return NextResponse.json({
            latitude: resultLat, 
            longitude: resultLng,
            name_en: nameEn, // Return cleaned English address
            name_ar: nameAr, // Return cleaned Arabic address
            google_place_id: placeId, 
        });

    } catch (error: any) {
        console.error("[API /location-lookup] Overall Error processing request:", error);
        // Log nested response data if available from custom thrown error
        if (error.response) {
            console.error("[API /location-lookup] Google API Error Response Data:", error.response);
        }
        if (error instanceof SyntaxError) {
             return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
        }
        if (error.message?.includes('API key not configured')) {
             return NextResponse.json({ message: 'Server-side API key not configured.' }, { status: 500 });
        }
        // Specific check for 403 type errors potentially caught from the API calls
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
             return NextResponse.json({ message: `Google API Forbidden (403): ${error.message}` }, { status: 403 }); // Return 403 to client too
        }
        return NextResponse.json({ message: error.message || 'An internal server error occurred.' }, { status: 500 });
    }
} 