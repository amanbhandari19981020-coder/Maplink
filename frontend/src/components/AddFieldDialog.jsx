import { useState, useEffect, useRef } from 'react';
import { X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function AddFieldDialog({ open, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    crop_type: '',
    start_date: '',
    health_index: 75,
    coordinates: []
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (open && mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);

      // Handle map clicks for drawing
      mapInstanceRef.current.on('click', handleMapClick);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [open]);

  const handleMapClick = (e) => {
    if (!isDrawing) return;

    const { lat, lng } = e.latlng;
    const newCoords = [...formData.coordinates, { lat, lng }];

    // Add marker
    const marker = L.circleMarker([lat, lng], {
      radius: 6,
      fillColor: '#0ea5e9',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(mapInstanceRef.current);

    markersRef.current.push(marker);

    // Update polygon
    if (polygonRef.current) {
      mapInstanceRef.current.removeLayer(polygonRef.current);
    }

    if (newCoords.length >= 2) {
      const latlngs = newCoords.map(coord => [coord.lat, coord.lng]);
      polygonRef.current = L.polygon(latlngs, {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.3,
        weight: 2,
      }).addTo(mapInstanceRef.current);
    }

    setFormData(prev => ({ ...prev, coordinates: newCoords }));
  };

  const handleStartDrawing = () => {
    setIsDrawing(true);
    toast.info('Click on the map to draw field boundaries');
  };

  const handleClearDrawing = () => {
    // Clear markers
    markersRef.current.forEach(marker => mapInstanceRef.current.removeLayer(marker));
    markersRef.current = [];

    // Clear polygon
    if (polygonRef.current) {
      mapInstanceRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }

    setFormData(prev => ({ ...prev, coordinates: [] }));
    setIsDrawing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.coordinates.length < 3) {
      toast.error('Please draw at least 3 points for the field boundary');
      return;
    }

    onAdd(formData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      crop_type: '',
      start_date: '',
      health_index: 75,
      coordinates: []
    });
    setIsDrawing(false);
    handleClearDrawing();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Field</DialogTitle>
          <DialogDescription>
            Enter field details and draw boundaries on the map
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Field Name</Label>
              <Input
                id="name"
                placeholder="North Field"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                data-testid="add-field-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="crop_type">Crop Type</Label>
              <Input
                id="crop_type"
                placeholder="Wheat"
                value={formData.crop_type}
                onChange={(e) => setFormData(prev => ({ ...prev, crop_type: e.target.value }))}
                required
                data-testid="add-field-crop-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
                data-testid="add-field-date-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="health_index">Health Index (%)</Label>
              <Input
                id="health_index"
                type="number"
                min="0"
                max="100"
                value={formData.health_index}
                onChange={(e) => setFormData(prev => ({ ...prev, health_index: parseFloat(e.target.value) || 0 }))}
                required
                data-testid="add-field-health-input"
              />
            </div>
          </div>

          {/* Map Section */}
          <div className="space-y-2">
            <Label>Field Boundaries</Label>
            <div className="border-2 border-sky-200 rounded-lg overflow-hidden">
              <div ref={mapRef} style={{ height: '300px' }} data-testid="add-field-map" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-600">
                <MapPin className="w-4 h-4 inline mr-1" />
                {formData.coordinates.length} points drawn
              </p>
              <div className="space-x-2">
                {!isDrawing ? (
                  <Button
                    type="button"
                    onClick={handleStartDrawing}
                    variant="outline"
                    size="sm"
                    data-testid="start-drawing-button"
                  >
                    Start Drawing
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setIsDrawing(false)}
                    variant="outline"
                    size="sm"
                    data-testid="stop-drawing-button"
                  >
                    Stop Drawing
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleClearDrawing}
                  variant="outline"
                  size="sm"
                  data-testid="clear-drawing-button"
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} data-testid="cancel-add-field-button">
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="submit-add-field-button"
              className="bg-gradient-to-r from-sky-500 to-green-600 hover:from-sky-600 hover:to-green-700 text-white"
            >
              Add Field
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
