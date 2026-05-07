"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  lat: string;
  lng: string;
  center?: [number, number];
  zoom?: number;
  onChange: (lat: string, lng: string) => void;
}

export default function LocationPicker({ lat, lng, center, zoom, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const initLat = lat ? parseFloat(lat) : 13.756331;
    const initLng = lng ? parseFloat(lng) : 100.501765;

    const map = L.map(mapRef.current, {
      center: [initLat, initLng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (lat && lng) {
      markerRef.current = L.marker([initLat, initLng], { icon: defaultIcon }).addTo(map);
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: cLat, lng: cLng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([cLat, cLng]);
      } else {
        markerRef.current = L.marker([cLat, cLng], { icon: defaultIcon }).addTo(map);
      }
      onChange(cLat.toFixed(6), cLng.toFixed(6));
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to new center when province/district/subdistrict changes
  useEffect(() => {
    if (!center || !mapInstanceRef.current) return;
    const [cLat, cLng] = center;
    if (!cLat || !cLng) return;
    mapInstanceRef.current.flyTo([cLat, cLng], zoom ?? 13, { duration: 1.2 });
  }, [center, zoom]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: 300,
        borderRadius: 12,
        overflow: "hidden",
        border: "1.5px solid #e5e7eb",
      }}
    />
  );
}
