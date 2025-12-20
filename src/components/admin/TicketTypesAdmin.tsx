import React, { useState, useEffect } from 'react';

interface TicketType {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
  fecha_creacion: string;
  puerta_id?: number;
  puerta_nombre?: string;
  puerta_codigo?: string;
}

interface Puerta {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
}

interface TicketTypeFormData {
  nombre: string;
  precio: number;
  puerta_id?: number;
}

interface FormErrors {
  nombre?: string;
  precio?: string;
}

const TicketTypesAdmin: React.FC = () => {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [puertas, setPuertas] = useState<Puerta[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<TicketTypeFormData>({
    nombre: '',
    precio: 0,
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadTicketTypes();
    loadPuertas();
  }, []);

  // Effect para cerrar modal con ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDialogOpen) {
        handleCloseDialog();
      }
    };

    // Solo agregar el listener si el modal está abierto
    if (isDialogOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDialogOpen]);

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

  const loadPuertas = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getActivePuertas();
        setPuertas(data);
      }
    } catch (error) {
      console.error('Error loading puertas:', error);
    }
  };

  const handleOpenDialog = (ticketType?: TicketType) => {
    if (ticketType) {
      const newFormData: TicketTypeFormData = {
        nombre: ticketType.nombre,
        precio: ticketType.precio,
      };
      if (ticketType.puerta_id) {
        newFormData.puerta_id = ticketType.puerta_id;
      }
      setFormData(newFormData);
      setEditingId(ticketType.id);
    } else {
      setFormData({
        nombre: '',
        precio: 0,
      });
      setEditingId(null);
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({ nombre: '', precio: 0 });
    setEditingId(null);
    setFormErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    } else if (name === 'puerta_id') {
      if (value) {
        setFormData(prev => ({
          ...prev,
          puerta_id: parseInt(value),
        }));
      } else {
        const { puerta_id, ...rest } = formData;
        setFormData(rest);
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
    
    // Validar nombre
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    } else {
      // Verificar que el nombre no exista (excepto si es el mismo ticket en edición)
      const nombreExiste = ticketTypes.some(
        t => t.nombre.toLowerCase().trim() === formData.nombre.toLowerCase().trim() && t.id !== editingId
      );
      if (nombreExiste) {
        errors.nombre = 'Ya existe un tipo de ticket con este nombre';
      }
    }
    
    // Validar precio
    if (formData.precio <= 0) {
      errors.precio = 'El precio debe ser mayor a 0';
    }
    if (isNaN(formData.precio)) {
      errors.precio = 'El precio debe ser un número válido';
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
    } catch (error: any) {
      console.error('Error saving ticket type:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        setFormErrors({ nombre: 'Este nombre ya está en uso' });
      }
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="w-8 h-0.5 bg-[#457373] mb-3 rounded-full"></div>
          <h1 className="text-xl font-light text-[#1D324D] tracking-tight">Tipos de Tickets</h1>
          <p className="text-[#7C4935]/70 text-xs font-light mt-1">Administra los tipos y precios</p>
        </div>
        <button
          onClick={() => handleOpenDialog()}
          className="bg-gradient-to-r from-[#1D324D] to-[#457373] text-white px-5 py-2.5 rounded-2xl text-sm font-medium hover:from-[#457373] hover:to-[#1D324D] transition-all duration-300 shadow-md hover:scale-[1.02]"
        >
          Nuevo Tipo
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-[#F1EADC] to-[#DFE4E4]">
              <tr>
                <th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                  Puerta
                </th>
                <th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                  Fecha Creación
                </th>
                <th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-8 py-6 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE4E4]/30">
              {ticketTypes.map((type, index) => (
                <tr key={type.id} className="hover:bg-[#F1EADC]/20 transition-colors duration-200">
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#1D324D]">{type.nombre}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-semibold text-[#457373]">
                      ${type.precio.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm text-[#1D324D]">
                      {type.puerta_nombre ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#457373]/20 text-[#457373]">
                          {type.puerta_nombre} ({type.puerta_codigo})
                        </span>
                      ) : (
                        <span className="text-[#7C4935]/60 italic">Sin puerta</span>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm text-[#7C4935]/80">
                      {new Date(type.fecha_creacion).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={type.activo}
                        onChange={() => handleToggleActive(type.id, type.activo)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#DFE4E4] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#457373]/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-[#DFE4E4] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#457373]"></div>
                    </label>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleOpenDialog(type)}
                        className="p-2 text-[#457373] hover:text-[#1D324D] hover:bg-[#F1EADC]/50 rounded-xl transition-all duration-200"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(type.id)}
                        className="p-2 text-[#7C4935] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
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
      </div>

      {/* Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-[#1D324D]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl max-w-md w-full shadow-2xl border border-white/50 relative">
            {/* Close button */}
            <button
              onClick={handleCloseDialog}
              className="absolute top-4 right-4 p-2 text-[#7C4935] hover:text-[#1D324D] hover:bg-[#F1EADC]/50 rounded-full transition-all duration-200 z-10"
              title="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Header */}
            <div className="px-8 py-6 border-b border-[#DFE4E4]/30">
              <div className="w-8 h-1 bg-[#457373] mb-3 rounded-full"></div>
              <h3 className="text-xl font-light text-[#1D324D]">
                {editingId ? 'Editar Tipo de Ticket' : 'Nuevo Tipo de Ticket'}
              </h3>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-[#1D324D] mb-3">
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-4 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] placeholder-[#7C4935]/60 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 ${
                    formErrors.nombre ? 'border-red-400 ring-2 ring-red-400' : ''
                  }`}
                  placeholder="Ingresa el nombre del ticket"
                  required
                />
                {formErrors.nombre && (
                  <p className="mt-2 text-sm text-red-600">{formErrors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1D324D] mb-3">
                  Puerta (Opcional)
                </label>
                <select
                  name="puerta_id"
                  value={formData.puerta_id || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300"
                >
                  <option value="">Sin puerta asignada</option>
                  {puertas.map(puerta => (
                    <option key={puerta.id} value={puerta.id}>
                      {puerta.nombre} ({puerta.codigo})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-[#7C4935]/60">
                  Selecciona la puerta que abre este tipo de ticket
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1D324D] mb-3">
                  Precio
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#7C4935]/60 font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    name="precio"
                    value={formData.precio}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full pl-8 pr-4 py-4 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] placeholder-[#7C4935]/60 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 ${
                      formErrors.precio ? 'border-red-400 ring-2 ring-red-400' : ''
                    }`}
                    placeholder="0.00"
                    required
                  />
                </div>
                {formErrors.precio && (
                  <p className="mt-2 text-sm text-red-600">{formErrors.precio}</p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  className="px-6 py-3 text-[#7C4935] hover:text-[#1D324D] font-medium transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#1D324D] to-[#457373] text-white px-6 py-3 rounded-2xl font-medium hover:from-[#457373] hover:to-[#1D324D] transition-all duration-300 shadow-lg hover:scale-[1.02]"
                >
                  {editingId ? 'Actualizar' : 'Crear'}
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
