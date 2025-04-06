import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Use server client for security
import { cookies } from 'next/headers';
import slugify from 'slugify';

// GET handler to fetch all collections with translations
export async function GET(request: Request) {
  cookies();
  const supabase = createClient();

  try {
    // Fetch collections and join with their translations
    const { data, error } = await supabase
      .from('curated_collections')
      .select(`
        id,
        slug,
        curated_collection_translations ( language_code, name )
      `)
      .order('created_at', { ascending: true }); // Order by creation date, adjust if needed

    if (error) {
      console.error('Error fetching collections:', error);
      throw error;
    }

    // Process data to match the expected frontend structure (name_en, name_ar)
    const processedData = data.map(collection => {
      const translations = collection.curated_collection_translations || [];
      const name_en = translations.find((t: any) => t.language_code === 'en')?.name || '';
      const name_ar = translations.find((t: any) => t.language_code === 'ar')?.name || '';
      return {
        id: collection.id,
        slug: collection.slug,
        name_en: name_en,
        name_ar: name_ar,
        // created_at could be added here if needed on the list page
      };
    });

    return NextResponse.json(processedData);

  } catch (error: any) {
    return NextResponse.json(
        { message: error.message || 'Failed to fetch collections' }, 
        { status: 500 } 
    );
  }
}

// POST handler to create a new collection and its translations
export async function POST(request: Request) {
    cookies();
    const supabase = createClient();

    try {
        const { name_en, name_ar, slug } = await request.json();

        // Validate required fields
        if (!name_en || !slug) {
            return NextResponse.json(
                { message: 'English name and slug are required' }, 
                { status: 400 } 
            );
        }
        
        // Ensure slug is unique (optional but good practice)
        // You might want more robust checking here
        const { data: existingSlug, error: slugError } = await supabase
            .from('curated_collections')
            .select('id')
            .eq('slug', slug)
            .maybeSingle();

        if (slugError) throw slugError;
        if (existingSlug) {
             return NextResponse.json(
                { message: 'Slug already exists. Please provide a unique slug.' }, 
                { status: 409 } // Conflict
            );
        }

        // 1. Insert into curated_collections
        const { data: newCollection, error: collectionError } = await supabase
            .from('curated_collections')
            .insert([{ name: name_en, slug: slug }]) // Use name_en as the main name for now
            .select()
            .single();

        if (collectionError || !newCollection) {
            console.error('Error creating collection:', collectionError);
            throw collectionError || new Error('Failed to create collection base entry');
        }

        // 2. Insert translations
        const translationsToInsert = [];
        if (name_en) {
            translationsToInsert.push({ 
                collection_id: newCollection.id, 
                language_code: 'en', 
                name: name_en 
            });
        }
        if (name_ar) {
            translationsToInsert.push({ 
                collection_id: newCollection.id, 
                language_code: 'ar', 
                name: name_ar 
            });
        }

        if (translationsToInsert.length > 0) {
            const { error: translationError } = await supabase
                .from('curated_collection_translations')
                .insert(translationsToInsert);

            if (translationError) {
                // Attempt to clean up if translation insert fails?
                console.error('Error creating collection translations:', translationError);
                // Consider rolling back the collection insert or logging for manual fix
                throw translationError;
            }
        }
        
        // Return the newly created collection (or just success)
        // Fetching again might be needed to return the combined structure
        return NextResponse.json(newCollection, { status: 201 });

    } catch (error: any) {
        console.error('Collection POST error:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to create collection' }, 
            { status: 500 } 
        );
    }
}
