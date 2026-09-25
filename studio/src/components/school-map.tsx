
"use client";

import { useState, useRef, useEffect } from 'react';
// Use the maplibre-typed entry of react-map-gl: we render with MapLibre,
// so the default mapbox-gl typings reject `mapLib={maplibregl}`.
import Map, { Marker, Popup, type MapRef } from 'react-map-gl/maplibre';
import type { School } from '@/lib/types';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAPTILER_TOKEN = "<REDACTED_SECRET>";

interface SchoolMapProps {
  schools: School[];
  selectedSchool: School | null;
  onSchoolSelect: (school: School | null) => void;
  clickedSchool: School | null;
}

export default function SchoolMap({ schools, selectedSchool, onSchoolSelect, clickedSchool }: SchoolMapProps) {
  const [popupInfo, setPopupInfo] = useState<School | null>(null);
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (clickedSchool && mapRef.current) {
        mapRef.current.flyTo({
            center: [clickedSchool.longitude, clickedSchool.latitude],
            zoom: 14,
            duration: 2000,
            essential: true,
        });
    }
  }, [clickedSchool]);


  if (!MAPTILER_TOKEN) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg">
        <p className="text-muted-foreground">Map API key is not configured. Please add it to your .env file.</p>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: 36.8219, // Centered on Nairobi
        latitude: -1.2921,
        zoom: 6
      }}
      style={{ width: '100%', height: '100%', borderRadius: '0.5rem', background: 'transparent' }}
      mapStyle={`https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${MAPTILER_TOKEN}`}
    >
      {schools.map(school => (
        <Marker
          key={school.id}
          longitude={school.longitude}
          latitude={school.latitude}
          onClick={e => {
            e.originalEvent.stopPropagation();
            onSchoolSelect(school);
            if (mapRef.current) {
                mapRef.current.flyTo({
                    center: [school.longitude, school.latitude],
                    zoom: 14,
                    duration: 2000,
                    essential: true,
                });
            }
          }}
        >
            <div 
                className={cn(
                    "w-4 h-4 rounded-full bg-primary border-2 border-primary-foreground shadow-lg cursor-pointer transition-all duration-300",
                    "hover:scale-125",
                    selectedSchool?.id === school.id ? "scale-150 ring-4 ring-primary/50" : ""
                )}
                onMouseEnter={() => onSchoolSelect(school)}
                onMouseLeave={() => onSchoolSelect(null)}
            >
                 <div className={cn("w-full h-full rounded-full bg-primary animate-pulse", selectedSchool?.id === school.id ? "animation-delay-0" : "animation-delay-[2s]")} />
            </div>
        </Marker>
      ))}
    </Map>
  );
}
