"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageTitle } from '@/components/PageTitle';
import { CollectionForm } from '@/components/collections/CollectionForm';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface CollectionFormData {
  name_en: string;
  name_ar: string;
  slug: string;
}

export default function NewCollectionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Placeholder save function - logs data, simulates API call
  const handleSave = async (data: CollectionFormData, id?: string) => {
    setSaving(true);
    setErrorMessage(null);
    console.log("Attempting to create collection via API:", data);

    try {
      // --- Replace simulation with actual API call --- 
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})); // Try get error
        throw new Error(errorData.message || `Failed to create collection (${response.status})`);
      }
      // const newCollection = await response.json(); // Optionally use returned data
      // console.log("Created collection:", newCollection);
      // --- Remove Simulation ---
      /*
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      console.log("Simulated save successful.");
      */
      // --- End Remove Simulation ---

      console.log("Successfully created collection via API.");
      router.push('/dashboard/collections');
      // Optionally add a success toast message here

    } catch (error: any) {
      console.error("API Save failed:", error);
      setErrorMessage(error.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

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
        title="Add New Collection" 
        description="Create a new curated collection."
      />
      <div className="mt-6 max-w-2xl">
        <CollectionForm 
          onSave={handleSave} 
          saving={saving} 
          errorMessage={errorMessage}
        />
      </div>
    </div>
  );
}
