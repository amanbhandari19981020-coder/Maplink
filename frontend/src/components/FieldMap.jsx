import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Layers } from 'lucide-react';

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
  const [mapLayer, setMapLayer] = useState('street'); // 'street' or 'satellite'
  const tileLayerRef = useRef(null);

  useEffect(() => {
    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5); // India center

      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
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

    // Only show the selected field
    if (!selectedField || !selectedField.coordinates || selectedField.coordinates.length < 3) {
      return;
    }

    const latlngs = selectedField.coordinates.map(coord => [coord.lat, coord.lng]);
    
    const polygon = L.polygon(latlngs, {
      color: '#16a34a',
      fillColor: '#16a34a',
      fillOpacity: 0.4,
      weight: 3,
    }).addTo(mapInstanceRef.current);

    polygon.bindPopup(`
      <div class="font-sans">
        <h3 class="font-bold text-base mb-1">${selectedField.name}</h3>
        <p class="text-sm text-gray-600 mb-2">${selectedField.crop_type}</p>
        <div class="text-xs">
          <div class="flex justify-between mb-1">
            <span class="text-gray-500">Health:</span>
            <span class="font-medium">${selectedField.health_index}%</span>
          </div>
          <div class="flex justify-between mb-1">
            <span class="text-gray-500">Started:</span>
            <span class="font-medium">${selectedField.start_date}</span>
          </div>
          <div class="flex justify-between mb-1">
            <span class="text-gray-500">Farmer:</span>
            <span class="font-medium">${selectedField.farmer_name || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Contact:</span>
            <span class="font-medium">${selectedField.contact_number || 'N/A'}</span>
          </div>
        </div>
      </div>
    `);

    layersRef.current.push(polygon);

    // Fit map to selected field bounds
    mapInstanceRef.current.fitBounds(latlngs, { padding: [50, 50] });
  }, [selectedField]);

  const toggleMapLayer = () => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    // Remove current tile layer
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    if (mapLayer === 'street') {
      // Switch to satellite
      tileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles © Esri',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
      setMapLayer('satellite');
    } else {
      // Switch to street
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
      setMapLayer('street');
    }
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" data-testid="field-map" />
      
      {/* Map Layer Toggle */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Button
          onClick={toggleMapLayer}
          data-testid="map-layer-toggle"
          className="bg-white hover:bg-gray-50 text-gray-800 shadow-lg border-2 border-green-200"
          size="sm"
        >
          <Layers className="w-4 h-4 mr-2" />
          {mapLayer === 'street' ? 'Satellite' : 'Street'}
        </Button>
      </div>

      {!selectedField && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm pointer-events-none">
          <div className="text-center text-gray-500">
            <p className="text-lg font-medium">No field selected</p>
            <p className="text-sm mt-1">Select a field from the list to view on map</p>
          </div>
        </div>
      )}
    </div>
  );
}
