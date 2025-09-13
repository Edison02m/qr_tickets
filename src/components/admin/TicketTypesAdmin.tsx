import React, { useState, useEffect } from 'react';

interface TicketType {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
  fecha_creacion: string;
}

interface TicketTypeFormData {
  nombre: string;
  precio: number;
}

interface FormErrors {
  nombre?: string;
  precio?: string;
}

const TicketTypesAdmin: React.FC = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TicketTypeFormData>({
    nombre: '',
    precio: 0,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadTicketTypes();
  }, []);

  const loadTicketTypes = async () => {
    try {
      if (window.electronAPI) {
        const types = await window.electronAPI.getTicketTypes();
        setTicketTypes(types);
      }
    } catch (error) {
      console.error('Error loading ticket types:', error);
    }
  };

  const handleOpenDialog = (ticketType?: TicketType) => {
    if (ticketType) {
      setFormData({
        nombre: ticketType.nombre,
        precio: ticketType.precio,
      });
      setEditingId(ticketType.id);
    } else {
      setFormData({
        nombre: '',
        precio: 0,
      });
      setEditingId(null);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({ nombre: '', precio: 0 });
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'precio') {
      // Replace comma with dot for price input
      const sanitizedValue = value.replace(',', '.');
      // Ensure it's a valid non-negative number
      const numberValue = parseFloat(sanitizedValue);
      if (!isNaN(numberValue) && numberValue >= 0) {
        setFormData(prev => ({
          ...prev,
          [name]: numberValue,
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset errors
    setFormErrors({});
    
    // Validate fields
    const errors: FormErrors = {};
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }
    if (formData.precio <= 0) {
      errors.precio = 'El precio debe ser mayor a 0';
    }

    // If there are errors, show them and stop submission
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (window.electronAPI) {
        if (editingId) {
          // Update existing ticket type
          await window.electronAPI.updateTicketType({
            id: editingId,
            ...formData,
          });
        } else {
          // Create new ticket type
          await window.electronAPI.createTicketType(formData);
        }
        await loadTicketTypes();
        handleCloseDialog();
      }
    } catch (error) {
      console.error('Error saving ticket type:', error);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.toggleTicketTypeStatus(id, !currentActive);
        await loadTicketTypes();
      }
    } catch (error) {
      console.error('Error toggling ticket type status:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este tipo de ticket?')) {
      return;
    }

    try {
      if (window.electronAPI) {
        await window.electronAPI.deleteTicketType(id);
        await loadTicketTypes();
      }
    } catch (error) {
      console.error('Error deleting ticket type:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tipos de Tickets</h1>
        <button
          onClick={() => handleOpenDialog()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nuevo Tipo de Ticket
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Creación
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Activo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ticketTypes.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {type.nombre}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ${type.precio.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(type.fecha_creacion).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={type.activo}
                      onChange={() => handleToggleActive(type.id, type.activo)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleOpenDialog(type)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Editar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingId ? 'Editar Tipo de Ticket' : 'Nuevo Tipo de Ticket'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    formErrors.nombre ? 'border-red-500' : 'border-gray-300'
                  }`}
                  required
                />
                {formErrors.nombre && (
                  <p className="mt-1 text-sm text-red-500">{formErrors.nombre}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full pl-7 pr-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      formErrors.precio ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {formErrors.precio && (
                    <p className="mt-1 text-sm text-red-500">{formErrors.precio}</p>
                  )}
                </div>
              </div>
              <div className="pt-4 bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketTypesAdmin;
