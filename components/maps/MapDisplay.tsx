import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

interface MapDisplayProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  mapId?: string; // Optional: For custom map styles
  zoom?: number;
  markerLabel?: string;
}

const DEFAULT_CENTER = { lat: 29.5, lng: 45.5 }; // Approx center of Iraq
const DEFAULT_ZOOM = 5;
const MARKER_ZOOM = 14; // Zoom level when a marker is present

export function MapDisplay({
  latitude,
  longitude,
  mapId,
  zoom,
  markerLabel = "Location"
}: MapDisplayProps) {
  // Log the value directly in the browser console when the component renders
  console.log("[MapDisplay] Reading NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  // Log the map ID as well for debugging
  console.log("[MapDisplay] Reading NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID:", process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID);
  const mapIdFromEnv = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);

  useEffect(() => {
    if (latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude)) {
      const newPos = { lat: latitude, lng: longitude };
      setPosition(newPos);
      setCurrentZoom(zoom ?? MARKER_ZOOM); // Use specific zoom or marker zoom
    } else {
      // Reset to default if lat/lng are invalid/missing
      setPosition(null); // Or keep previous? Resetting might be clearer.
      setCurrentZoom(zoom ?? DEFAULT_ZOOM); // Use specific zoom or default zoom
    }
  }, [latitude, longitude, zoom]);


  if (!apiKey) {
    console.error("Google Maps API Key is missing. Please check your .env.local file.");
    return <div className="text-red-500 p-4 border border-red-300 rounded">Error: Google Maps API Key is missing.</div>;
  }

  // Add check for mapId as well, maybe just a warning
  if (!mapIdFromEnv) {
    console.warn("Google Maps Map ID is missing. Advanced Markers might not work correctly. Please check NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID in your .env.local file.");
    // Don't return error, map might still work in basic mode
  }

  // Determine center: use marker position if available, otherwise default
  const mapCenter = position ?? DEFAULT_CENTER;

  return (
    <APIProvider apiKey={apiKey}>
      <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
        <Map
          mapId={mapIdFromEnv}
          zoom={currentZoom}
          center={mapCenter}
          gestureHandling={'greedy'} // Allows better interaction on mobile
          disableDefaultUI={false} // Show default controls (zoom, etc.)
        >
          {position && (
            <AdvancedMarker
              position={position}
              title={markerLabel}
            >
               {/* You can customize the marker appearance here */}
               <Pin background={'#FBBC04'} glyphColor={'#000'} borderColor={'#000'} />
            </AdvancedMarker>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}
