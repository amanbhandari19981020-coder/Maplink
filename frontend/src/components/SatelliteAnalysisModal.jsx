import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function SatelliteAnalysisModal({ open, onClose, field }) {
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [error, setError] = useState(null);

  const runAnalysis = async () => {
    if (!field?.id) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/fields/${field.id}/analysis`,
        getAuthHeaders()
      );

      if (response.data.status === 'error') {
        setError(response.data.message);
        toast.error(response.data.message);
      } else if (response.data.status === 'success') {
        setAnalysisData(response.data);
        toast.success('Satellite analysis completed successfully!');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to run analysis';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (open && !analysisData && !loading) {
      runAnalysis();
    }
  };

  // Run analysis when modal opens
  useState(() => {
    if (open) {
      handleOpen();
    }
  }, [open]);

  const indexInfo = {
    ndvi: {
      name: 'NDVI',
      fullName: 'Normalized Difference Vegetation Index',
      description: 'Measures vegetation health and density'
    },
    ndwi: {
      name: 'NDWI',
      fullName: 'Normalized Difference Water Index',
      description: 'Indicates water content in vegetation'
    },
    evi: {
      name: 'EVI',
      fullName: 'Enhanced Vegetation Index',
      description: 'Enhanced vegetation analysis with reduced atmospheric effects'
    },
    savi: {
      name: 'SAVI',
      fullName: 'Soil Adjusted Vegetation Index',
      description: 'Vegetation analysis accounting for soil brightness'
    },
    ndre: {
      name: 'NDRE',
      fullName: 'Normalized Difference Red Edge',
      description: 'Sensitive to chlorophyll content changes'
    },
    gndvi: {
      name: 'GNDVI',
      fullName: 'Green NDVI',
      description: 'Uses green band for vegetation analysis'
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Satellite Analysis - {field?.name}
            </DialogTitle>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Planet SkySat Imagery Analysis
          </p>
        </DialogHeader>

        <div className="mt-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-green-600 mb-4" />
              <p className="text-gray-600">Processing satellite imagery...</p>
              <p className="text-sm text-gray-500 mt-2">This may take 30-60 seconds</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 font-medium mb-2">Analysis Failed</p>
              <p className="text-red-600 text-sm">{error}</p>
              <Button
                onClick={runAnalysis}
                className="mt-4 bg-red-600 hover:bg-red-700"
                size="sm"
              >
                Retry Analysis
              </Button>
            </div>
          )}

          {analysisData && analysisData.overlays && (
            <div className="space-y-4">
              <Tabs defaultValue="ndvi" className="w-full">
                <TabsList className="grid w-full grid-cols-6 bg-green-100">
                  {Object.keys(analysisData.overlays).map((index) => (
                    <TabsTrigger
                      key={index}
                      value={index}
                      className="data-[state=active]:bg-green-600 data-[state=active]:text-white uppercase"
                    >
                      {indexInfo[index]?.name || index}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(analysisData.overlays).map(([indexName, imageData]) => (
                  <TabsContent key={indexName} value={indexName} className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-bold text-lg text-gray-900 mb-1">
                        {indexInfo[indexName]?.fullName || indexName.toUpperCase()}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {indexInfo[indexName]?.description || 'Vegetation health indicator'}
                      </p>
                      
                      <div className="bg-white rounded-lg border-2 border-gray-300 overflow-hidden">
                        <img
                          src={imageData}
                          alt={`${indexName} overlay`}
                          className="w-full h-auto"
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-4 bg-gradient-to-r from-red-500 to-yellow-500 rounded"></div>
                          <span className="text-xs text-gray-600">Low/Poor</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-4 bg-gradient-to-r from-yellow-500 to-green-500 rounded"></div>
                          <span className="text-xs text-gray-600">High/Good</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
