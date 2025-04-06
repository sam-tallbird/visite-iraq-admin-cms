import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Helper type for combined data
interface CollectionUpdateData {
    name_en?: string;
    name_ar?: string;
    slug?: string;
}

// GET handler for single collection by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const collectionId = params.id;
  if (!collectionId) {
    return NextResponse.json({ message: 'Collection ID is required' }, { status: 400 });
  }

  cookies();
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('curated_collections')
      .select(`
        id,
        slug,
        curated_collection_translations ( language_code, name )
      `)
      .eq('id', collectionId)
      .single(); // Expect only one result

    if (error) {
        if (error.code === 'PGRST116') { // Not found code
             return NextResponse.json({ message: 'Collection not found' }, { status: 404 });
        }
        console.error('Error fetching collection by ID:', error);
        throw error;
    }

    if (!data) {
         return NextResponse.json({ message: 'Collection not found' }, { status: 404 });
    }

    // Process data to match the expected frontend structure
    const translations = data.curated_collection_translations || [];
    const name_en = translations.find((t: any) => t.language_code === 'en')?.name || '';
    const name_ar = translations.find((t: any) => t.language_code === 'ar')?.name || '';
    
    const responseData = {
        id: data.id,
        slug: data.slug,
        name_en: name_en,
        name_ar: name_ar,
    };

    return NextResponse.json(responseData);

  } catch (error: any) {
    return NextResponse.json(
        { message: error.message || 'Failed to fetch collection' }, 
        { status: 500 } 
    );
  }
}

// PUT handler for updating a collection
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const collectionId = params.id;
  if (!collectionId) {
    return NextResponse.json({ message: 'Collection ID is required' }, { status: 400 });
  }

  cookies();
  const supabase = createClient();

  try {
    const { name_en, name_ar, slug }: CollectionUpdateData = await request.json();

    // Validate required fields
    if (!name_en || !slug) {
      return NextResponse.json({ message: 'English name and slug are required' }, { status: 400 });
    }

    // 1. Update the slug in curated_collections
    // (We might skip updating the 'name' column here if it's derived from translations)
    const { data: updatedCollection, error: collectionError } = await supabase
      .from('curated_collections')
      .update({ slug: slug, name: name_en }) // Update main name too for consistency?
      .eq('id', collectionId)
      .select()
      .single();

    if (collectionError) {
        console.error('Error updating collection slug:', collectionError);
        throw collectionError;
    }
    if (!updatedCollection) {
        return NextResponse.json({ message: 'Collection not found for update' }, { status: 404 });
    }

    // 2. Upsert translations (update existing or insert new)
    const translationsToUpsert = [];
    if (name_en !== undefined) {
        translationsToUpsert.push({ 
            collection_id: collectionId, 
            language_code: 'en', 
            name: name_en 
        });
    }
    if (name_ar !== undefined) {
        translationsToUpsert.push({ 
            collection_id: collectionId, 
            language_code: 'ar', 
            name: name_ar || '' // Handle potential null/empty string
        });
    }

    if (translationsToUpsert.length > 0) {
        const { error: translationError } = await supabase
            .from('curated_collection_translations')
            .upsert(translationsToUpsert, { onConflict: 'collection_id, language_code' });

        if (translationError) {
            console.error('Error upserting collection translations:', translationError);
            // Might have partially updated, log for review
            throw translationError;
        }
    }

    // Return the updated collection data (or just success)
    // Fetching again might be needed to return the combined structure easily
    return NextResponse.json(updatedCollection);

  } catch (error: any) {
    console.error('Collection PUT error:', error);
    // Add specific check for unique constraint violation on slug if needed
    // if (error.code === '23505') { ... }
    return NextResponse.json(
        { message: error.message || 'Failed to update collection' }, 
        { status: 500 } 
    );
  }
}

// DELETE handler for deleting a collection
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const collectionId = params.id;
  if (!collectionId) {
    return NextResponse.json({ message: 'Collection ID is required' }, { status: 400 });
  }

  cookies();
  const supabase = createClient();

  try {
    // Deleting from curated_collections should cascade delete translations
    // due to the ON DELETE CASCADE foreign key constraint.
    const { error } = await supabase
        .from('curated_collections')
        .delete()
        .eq('id', collectionId);

    if (error) {
        console.error('Error deleting collection:', error);
        throw error;
    }

    // Also delete related items? Decide if this is desired.
    // const { error: itemError } = await supabase
    //     .from('curated_collection_items')
    //     .delete()
    //     .eq('collection_id', collectionId);
    // if (itemError) { console.error('Error deleting collection items:', itemError); /* Handle cascade failure? */ }

    return NextResponse.json({ message: 'Collection deleted successfully' }, { status: 200 }); // 200 OK or 204 No Content

  } catch (error: any) {
      console.error('Collection DELETE error:', error);
    return NextResponse.json(
        { message: error.message || 'Failed to delete collection' }, 
        { status: 500 } 
    );
  }
}
