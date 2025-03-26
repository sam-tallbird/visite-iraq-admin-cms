"use client";

import { useState } from "react";
import Shell from "@/components/layout/shell";
import { ImageUpload } from "@/components/ImageUpload";
import Image from "next/image";

export default function TestUploadPage() {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Test Image Upload</h1>
          <p className="text-muted-foreground">
            This page is used to test the image upload functionality to Firebase Storage.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="card">
            <h2 className="text-xl font-semibold">Upload Component</h2>
            <div className="mt-4">
              <ImageUpload
                onImageUploaded={(url) => setUploadedImageUrl(url)}
                storagePath="test-uploads"
              />
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold">Results</h2>
            <div className="mt-4 space-y-4">
              {uploadedImageUrl ? (
                <>
                  <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                    <Image
                      src={uploadedImageUrl}
                      alt="Uploaded image"
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div>
                    <p className="font-medium">Image URL:</p>
                    <input
                      type="text"
                      readOnly
                      value={uploadedImageUrl}
                      className="input-field mt-1 w-full font-mono text-xs"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <p>Upload an image to see the result here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
} 