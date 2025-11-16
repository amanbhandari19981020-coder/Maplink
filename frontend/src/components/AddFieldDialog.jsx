import { useState, useEffect, useRef } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function AddFieldDialog({ open, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    crop_type: '',
    start_date: '',
    health_index: 75,
    coordinates: []
  });
  const [uploadingKML, setUploadingKML] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open && mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      mapInstanceRef.current = L.map(mapRef.current).setView([20.5937, 78.9629], 5);

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
  }, [open]);

  const handleClearKML = () => {
    // Clear polygon
    if (polygonRef.current) {
      mapInstanceRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }

    setFormData(prev => ({ ...prev, coordinates: [] }));
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKMLUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.kml')) {
      toast.error('Please upload a KML file');
      return;
    }

    setUploadingKML(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/kml/parse`, formData, {
        ...getAuthHeaders(),
        headers: {
          ...getAuthHeaders().headers,
          'Content-Type': 'multipart/form-data',
        },
      });

      const coordinates = response.data.coordinates;
      setFormData(prev => ({ ...prev, coordinates }));

      // Clear existing polygon
      handleClearKML();

      // Draw the KML boundaries on map
      const latlngs = coordinates.map(coord => [coord.lat, coord.lng]);
      polygonRef.current = L.polygon(latlngs, {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.3,
        weight: 2,
      }).addTo(mapInstanceRef.current);

      // Fit map to bounds
      mapInstanceRef.current.fitBounds(latlngs, { padding: [50, 50] });

      toast.success(`KML loaded: ${coordinates.length} points`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to parse KML file');
    } finally {
      setUploadingKML(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.coordinates.length < 3) {
      toast.error('Please upload a KML file with at least 3 boundary points');
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
    handleClearKML();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">Add New Field</DialogTitle>
          <DialogDescription>
            Enter field details and upload a KML file to define field boundaries
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="font-medium">Field Name</Label>
              <Input
                id="name"
                placeholder="North Field"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                data-testid="add-field-name-input"
                className="border-2 border-gray-200 focus:border-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="crop_type" className="font-medium">Crop Type</Label>
              <Input
                id="crop_type"
                placeholder="Wheat"
                value={formData.crop_type}
                onChange={(e) => setFormData(prev => ({ ...prev, crop_type: e.target.value }))}
                required
                data-testid="add-field-crop-input"
                className="border-2 border-gray-200 focus:border-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date" className="font-medium">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
                data-testid="add-field-date-input"
                className="border-2 border-gray-200 focus:border-green-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="health_index" className="font-medium">Health Index (%)</Label>
              <Input
                id="health_index"
                type="number"
                min="0"
                max="100"
                value={formData.health_index}
                onChange={(e) => setFormData(prev => ({ ...prev, health_index: parseFloat(e.target.value) || 0 }))}
                required
                data-testid="add-field-health-input"
                className="border-2 border-gray-200 focus:border-green-500"
              />
            </div>
          </div>

          {/* KML Upload Section */}
          <div className="space-y-4">
            <Label className="font-medium text-base">Field Boundaries (KML Upload)</Label>
            
            <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center bg-green-50/50">
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml"
                onChange={handleKMLUpload}
                className="hidden"
                id="kml-upload"
                data-testid="kml-file-input"
              />
              <label htmlFor="kml-upload" className="cursor-pointer">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <FileUp className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900 mb-1">
                      {uploadingKML ? 'Uploading...' : 'Click to upload KML file'}
                    </p>
                    <p className="text-sm text-gray-600">Upload a KML file to define field boundaries</p>
                  </div>
                  {formData.coordinates.length > 0 && (
                    <div className="mt-3 px-4 py-2 bg-green-100 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        ✓ {formData.coordinates.length} coordinates loaded from KML
                      </p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Map Preview */}
            {formData.coordinates.length > 0 && (
              <div className="space-y-2">
                <Label className="font-medium text-sm text-gray-700">Preview</Label>
                <div className="border-2 border-green-200 rounded-lg overflow-hidden">
                  <div ref={mapRef} style={{ height: '350px' }} data-testid="add-field-map" />
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    onClick={handleClearKML}
                    variant="outline"
                    size="sm"
                    data-testid="clear-kml-button"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Clear KML
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} data-testid="cancel-add-field-button">
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="submit-add-field-button"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
            >
              Add Field
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
