import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function GEEAppModal({ open, onClose, field }) {
  const geeAppUrl = 'https://premium-student-469313-i6.projects.earthengine.app/view/maplink-crop-health-monitor';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[90vh] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900">
              Health Index Analysis - {field?.name}
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
            Google Earth Engine Satellite Analysis
          </p>
        </DialogHeader>
        
        <div className="flex-1 w-full h-full">
          <iframe
            src={geeAppUrl}
            className="w-full h-full border-0"
            title="GEE Health Index Analysis"
            allow="geolocation"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
