import { useState, useEffect } from 'react';
import { LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import FieldList from './FieldList';
import FieldMap from './FieldMap';
import FieldDetails from './FieldDetails';
import AddFieldDialog from './AddFieldDialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export default function Dashboard({ onLogout }) {
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchFields();
  }, []);

  const fetchFields = async () => {
    try {
      const response = await axios.get(`${API}/fields`, getAuthHeaders());
      setFields(response.data);
      if (response.data.length > 0 && !selectedField) {
        setSelectedField(response.data[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch fields');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async (fieldData) => {
    try {
      const response = await axios.post(`${API}/fields`, fieldData, getAuthHeaders());
      setFields(prev => [...prev, response.data]);
      setSelectedField(response.data);
      setShowAddDialog(false);
      toast.success('Field added successfully!');
    } catch (error) {
      toast.error('Failed to add field');
    }
  };

  const handleUpdateField = async (fieldId, updateData) => {
    try {
      const response = await axios.put(`${API}/fields/${fieldId}`, updateData, getAuthHeaders());
      setFields(prev => prev.map(f => f.id === fieldId ? response.data : f));
      setSelectedField(response.data);
      toast.success('Field updated successfully!');
    } catch (error) {
      toast.error('Failed to update field');
    }
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await axios.delete(`${API}/fields/${fieldId}`, getAuthHeaders());
      setFields(prev => prev.filter(f => f.id !== fieldId));
      if (selectedField?.id === fieldId) {
        setSelectedField(fields.length > 1 ? fields[0] : null);
      }
      toast.success('Field deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete field');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <div className="text-lg font-medium text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-green-200 shadow-md z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Maplink</h1>
              <p className="text-xs text-gray-600">Field Monitoring System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900" data-testid="user-name">{user?.name}</p>
              <p className="text-xs text-gray-600" data-testid="user-email">{user?.email}</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              data-testid="logout-button"
              className="border-green-300 hover:bg-green-50 hover:text-green-800 font-medium"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Field List */}
        <div className="w-80 bg-white/70 backdrop-blur-sm border-r border-green-200 flex flex-col shadow-lg">
          <div className="p-4 border-b border-green-200 bg-white/60">
            <Button
              onClick={() => setShowAddDialog(true)}
              data-testid="add-field-button"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Field
            </Button>
          </div>
          <FieldList
            fields={fields}
            selectedField={selectedField}
            onSelectField={setSelectedField}
          />
        </div>

        {/* Center - Map */}
        <div className="flex-1 relative">
          <FieldMap
            fields={fields}
            selectedField={selectedField}
            onSelectField={setSelectedField}
          />
        </div>

        {/* Right Panel - Field Details */}
        <div className="w-96 bg-white/70 backdrop-blur-sm border-l border-green-200 overflow-y-auto shadow-lg">
          <FieldDetails
            field={selectedField}
            onUpdate={handleUpdateField}
            onDelete={handleDeleteField}
          />
        </div>
      </div>

      {/* Add Field Dialog */}
      <AddFieldDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddField}
      />
    </div>
  );
}
