import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function FieldMap({ fields, selectedField, onSelectField }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef([]);

  useEffect(() => {
    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5); // India center

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear existing layers
    layersRef.current.forEach(layer => mapInstanceRef.current.removeLayer(layer));
    layersRef.current = [];

    if (fields.length === 0) return;

    const bounds = [];

    // Add polygons for each field
    fields.forEach(field => {
      if (!field.coordinates || field.coordinates.length < 3) return;

      const latlngs = field.coordinates.map(coord => [coord.lat, coord.lng]);
      
      const isSelected = selectedField?.id === field.id;
      
      const polygon = L.polygon(latlngs, {
        color: isSelected ? '#0ea5e9' : '#10b981',
        fillColor: isSelected ? '#0ea5e9' : '#10b981',
        fillOpacity: isSelected ? 0.4 : 0.2,
        weight: isSelected ? 3 : 2,
      }).addTo(mapInstanceRef.current);

      polygon.on('click', () => {
        onSelectField(field);
      });

      polygon.bindPopup(`
        <div class="font-sans">
          <h3 class="font-bold text-base mb-1">${field.name}</h3>
          <p class="text-sm text-gray-600 mb-2">${field.crop_type}</p>
          <div class="text-xs">
            <div class="flex justify-between mb-1">
              <span class="text-gray-500">Health:</span>
              <span class="font-medium">${field.health_index}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Started:</span>
              <span class="font-medium">${field.start_date}</span>
            </div>
          </div>
        </div>
      `);

      layersRef.current.push(polygon);

      // Collect bounds
      latlngs.forEach(coord => bounds.push(coord));
    });

    // Fit map to bounds
    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [fields, selectedField, onSelectField]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" data-testid="field-map" />
      {fields.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm pointer-events-none">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No fields to display</p>
            <p className="text-sm mt-1">Add a field to see it on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
