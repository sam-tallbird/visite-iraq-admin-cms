"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageTitle } from '@/components/PageTitle';
import { CollectionForm } from '@/components/collections/CollectionForm';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';

// Represents the data structure expected by the CollectionForm
interface CollectionFormData {
  name_en: string;
  name_ar: string;
  slug: string;
}

// Represents combined data fetched for editing
interface InitialCollectionData extends Partial<CollectionFormData> {
  id: string;
}

export default function EditCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string; 

  const [initialData, setInitialData] = useState<InitialCollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionId) return;
    
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      console.log(`Fetching data for collection ID ${collectionId} via API`);
      try {
        // --- Replace simulation with actual API call --- 
        const response = await fetch(`/api/collections/${collectionId}`); 
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Try get error
            if (response.status === 404) {
                throw new Error('Collection not found');
            } else {
                 throw new Error(errorData.message || `Failed to fetch collection (${response.status})`);
            }
        }
        const data: InitialCollectionData = await response.json(); // API returns combined structure
        // --- Remove Simulation --- 
        /*
        await new Promise(resolve => setTimeout(resolve, 500)); 
        const data_sim: InitialCollectionData = { 
            id: collectionId, 
            slug: `fetched-collection-${collectionId.substring(0, 5)}`, 
            name_en: `Fetched EN Name ${collectionId.substring(0, 5)}`,  
            name_ar: `Fetched AR Name ${collectionId.substring(0, 5)}`   
        };
        */
        // --- End Remove Simulation ---
        
        console.log("Fetched data for edit from API:", data);
        setInitialData(data);
      } catch (error: any) {
        console.error("API Fetch failed:", error);
        setFetchError(error.message || "Failed to load collection details.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [collectionId]);

  // Update save function
  const handleSave = async (data: CollectionFormData, id?: string) => {
    if (!id) return; 
    setSaving(true);
    setErrorMessage(null);
    console.log(`Attempting to update collection ${id} via API:`, data); 

    try {
      // --- Replace simulation with actual API call --- 
      const response = await fetch(`/api/collections/${id}`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), 
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try get error
        throw new Error(errorData.message || `Failed to update collection (${response.status})`);
      }
      // --- Remove Placeholder ---
      /*
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log("Simulated update successful.");
      */
      // --- End Remove Placeholder ---
      console.log("Successfully updated collection via API.");
      router.push('/dashboard/collections');

    } catch (error: any) {
      console.error("API Save failed:", error);
      setErrorMessage(error.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center items-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (fetchError) {
    return <div className="p-6 text-destructive">Error loading data: {fetchError}</div>;
  }
  
  if (!initialData) {
    return <div className="p-6 text-muted-foreground">Collection not found.</div>;
  }

  return (
    <div className="p-4 md:p-6">
       <Button 
        variant="outline" 
        size="sm" 
        className="mb-4" 
        onClick={() => router.back()}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>
      <PageTitle 
        title="Edit Collection" 
        // Use English name for the title description, fallback to slug if name_en missing
        description={`Update details for ${initialData.name_en || initialData.slug}.`}
      />
      <div className="mt-6 max-w-2xl">
        <CollectionForm 
          initialData={initialData} // Pass the combined initial data
          onSave={handleSave} 
          saving={saving} 
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
}
