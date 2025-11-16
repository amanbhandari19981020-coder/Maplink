import { useState } from 'react';
import { Calendar, Sprout, TrendingUp, Edit2, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function FieldDetails({ field, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    crop_type: '',
    start_date: '',
    health_index: 0
  });

  const startEditing = () => {
    setFormData({
      name: field.name,
      crop_type: field.crop_type,
      start_date: field.start_date,
      health_index: field.health_index
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate(field.id, formData);
    setIsEditing(false);
  };

  const handleDelete = () => {
    onDelete(field.id);
    setShowDeleteDialog(false);
  };

  if (!field) {
    return (
      <div className="flex items-center justify-center h-full p-6" data-testid="no-field-selected">
        <div className="text-center text-gray-500">
          <Sprout className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">Select a field to view details</p>
        </div>
      </div>
    );
  }

  const getHealthColor = (health) => {
    if (health >= 80) return 'text-green-600';
    if (health >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthLabel = (health) => {
    if (health >= 80) return 'Excellent';
    if (health >= 50) return 'Good';
    return 'Needs Attention';
  };

  return (
    <div className="h-full flex flex-col" data-testid="field-details">
      <div className="p-6 bg-white/40 border-b border-sky-100">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {isEditing ? (
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                data-testid="edit-field-name"
                className="text-xl font-bold mb-2"
              />
            ) : (
              <h2 className="text-2xl font-bold text-gray-800" data-testid="field-detail-name">{field.name}</h2>
            )}
          </div>
          {!isEditing && (
            <div className="flex space-x-2">
              <Button
                onClick={startEditing}
                size="sm"
                variant="outline"
                data-testid="edit-field-button"
                className="border-sky-200 hover:bg-sky-50"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                size="sm"
                variant="outline"
                data-testid="delete-field-button"
                className="border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="flex space-x-2">
            <Button
              onClick={handleSave}
              size="sm"
              data-testid="save-field-button"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={() => setIsEditing(false)}
              size="sm"
              variant="outline"
              data-testid="cancel-edit-button"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Crop Type */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600 flex items-center">
            <Sprout className="w-4 h-4 mr-2" />
            Crop Type
          </Label>
          {isEditing ? (
            <Input
              value={formData.crop_type}
              onChange={(e) => setFormData(prev => ({ ...prev, crop_type: e.target.value }))}
              data-testid="edit-crop-type"
            />
          ) : (
            <p className="text-base font-medium text-gray-800" data-testid="field-detail-crop">{field.crop_type}</p>
          )}
        </div>

        <Separator />

        {/* Start Date */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Start Date
          </Label>
          {isEditing ? (
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              data-testid="edit-start-date"
            />
          ) : (
            <p className="text-base font-medium text-gray-800" data-testid="field-detail-date">{field.start_date}</p>
          )}
        </div>

        <Separator />

        {/* Health Index */}
        <div className="space-y-3">
          <Label className="text-sm text-gray-600 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            Health Index
          </Label>
          {isEditing ? (
            <div className="space-y-2">
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.health_index}
                onChange={(e) => setFormData(prev => ({ ...prev, health_index: parseFloat(e.target.value) || 0 }))}
                data-testid="edit-health-index"
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className={`text-3xl font-bold ${getHealthColor(field.health_index)}`} data-testid="field-detail-health">
                  {field.health_index}%
                </span>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  field.health_index >= 80 ? 'bg-green-100 text-green-700' :
                  field.health_index >= 50 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {getHealthLabel(field.health_index)}
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${field.health_index}%` }}
                />
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Coordinates Info */}
        <div className="space-y-2">
          <Label className="text-sm text-gray-600">Field Boundaries</Label>
          <div className="bg-sky-50 rounded-lg p-3">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{field.coordinates?.length || 0}</span> boundary points defined
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{field.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              data-testid="confirm-delete-button"
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
