import { Sprout } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function FieldList({ fields, selectedField, onSelectField }) {
  if (fields.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" data-testid="empty-field-list">
        <div className="text-center text-gray-500">
          <Sprout className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">No fields yet</p>
          <p className="text-xs mt-1">Click "Add New Field" to start</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-2" data-testid="field-list">
        {fields.map((field) => (
          <button
            key={field.id}
            onClick={() => onSelectField(field)}
            data-testid={`field-item-${field.id}`}
            className={`w-full text-left p-4 rounded-xl transition-all ${
              selectedField?.id === field.id
                ? 'bg-gradient-to-r from-sky-100 to-green-100 border-2 border-sky-300 shadow-md'
                : 'bg-white/60 border border-sky-100 hover:bg-white hover:shadow-sm'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                selectedField?.id === field.id ? 'bg-sky-500' : 'bg-green-100'
              }`}>
                <Sprout className={`w-5 h-5 ${
                  selectedField?.id === field.id ? 'text-white' : 'text-green-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 truncate" data-testid={`field-name-${field.id}`}>
                  {field.name}
                </h3>
                <p className="text-sm text-gray-600 truncate" data-testid={`field-crop-${field.id}`}>
                  {field.crop_type}
                </p>
                <div className="mt-2 flex items-center space-x-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-green-500 rounded-full transition-all"
                      style={{ width: `${field.health_index}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700" data-testid={`field-health-${field.id}`}>
                    {field.health_index}%
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
