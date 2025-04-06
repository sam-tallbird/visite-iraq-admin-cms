"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import slugify from "slugify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, Loader2, Save } from "lucide-react";

// Updated data structure for the form
interface CollectionFormData {
  name_en: string;
  name_ar: string;
  slug: string;
}

// Updated props: initialData might contain translations
interface CollectionFormProps {
  initialData?: Partial<CollectionFormData> & { id?: string }; // Use Partial for flexibility
  onSave: (data: CollectionFormData, id?: string) => Promise<void>; 
  saving: boolean;
  errorMessage: string | null;
}

export function CollectionForm({
  initialData,
  onSave,
  saving,
  errorMessage,
}: CollectionFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [formData, setFormData] = useState<CollectionFormData>({
    name_en: initialData?.name_en || "",
    name_ar: initialData?.name_ar || "",
    slug: initialData?.slug || "",
  });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(!!initialData?.slug);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name_en: initialData.name_en || "",
        name_ar: initialData.name_ar || "",
        slug: initialData.slug || "",
      });
      setSlugManuallyEdited(!!initialData.slug);
    } else {
      setFormData({ name_en: "", name_ar: "", slug: "" });
      setSlugManuallyEdited(false);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedData = { ...prev, [name]: value };

      // Auto-generate slug from English name if creating and not manually edited
      if (name === "name_en" && !initialData?.id && !slugManuallyEdited) {
        updatedData.slug = slugify(value, { lower: true, strict: true });
      }
      
      if (name === 'slug') {
        setSlugManuallyEdited(true);
      }
      
      return updatedData;
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Require English name at least
    if (!formData.name_en || saving) return;

    // Ensure slug exists, generate from English if somehow empty
    let finalSlug = formData.slug;
    if (!finalSlug && formData.name_en) {
        finalSlug = slugify(formData.name_en, { lower: true, strict: true });
    }
    
    // Pass the full structure to onSave
    await onSave({ 
        name_en: formData.name_en, 
        name_ar: formData.name_ar, 
        slug: finalSlug 
    }, initialData?.id);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>
            {initialData?.id ? "Edit Collection" : "Create New Collection"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           {/* English Name */}
           <div className="space-y-2">
            <Label htmlFor="name_en">Name (English) *</Label>
            <Input
              id="name_en"
              name="name_en"
              value={formData.name_en}
              onChange={handleChange}
              placeholder="e.g., Must See Landmarks"
              required
              disabled={saving}
            />
          </div>
          
           {/* Arabic Name */}
           <div className="space-y-2">
            <Label htmlFor="name_ar">Name (Arabic)</Label>
            <Input
              id="name_ar"
              name="name_ar"
              value={formData.name_ar}
              onChange={handleChange}
              placeholder="(Arabic translation)"
              disabled={saving}
              dir="rtl" // Set text direction for Arabic
            />
          </div>

           {/* Slug */}
           <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="auto-generated or custom-slug"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier used in URLs. Auto-generated from English name, but can be customized.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4">
           {/* Error Message */}
           {errorMessage && (
                <div className="flex items-center text-sm text-destructive">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
            )}
            {/* Action Buttons */}
          <div className="flex justify-end gap-2 w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()} 
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !formData.name_en}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {initialData?.id ? "Save Changes" : "Create Collection"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
} 