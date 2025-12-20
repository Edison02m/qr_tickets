import React, { useState, useEffect } from 'react';

interface Puerta {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  activo: boolean;
  fecha_creacion: string;
}

interface PuertaFormData {
  nombre: string;
  codigo: string;
  descripcion: string;
}

interface FormErrors {
  nombre?: string;
  codigo?: string;
}

const PuertasAdmin: React.FC = () => {
  const [puertas, setPuertas] = useState<Puerta[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PuertaFormData>({
    nombre: '',
    codigo: '',
    descripcion: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadPuertas();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDialogOpen) {
        handleCloseDialog();
      }
    };

    if (isDialogOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDialogOpen]);

  const loadPuertas = async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getPuertas();
        setPuertas(data);
      }
    } catch (error) {
      console.error('Error loading puertas:', error);
    }
  };

  const handleOpenDialog = (puerta?: Puerta) => {
    if (puerta) {
      setFormData({
        nombre: puerta.nombre,
        codigo: puerta.codigo,
        descripcion: puerta.descripcion || '',
      });
      setEditingId(puerta.id);
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        descripcion: '',
      });
      setEditingId(null);
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({ nombre: '', codigo: '', descripcion: '' });
    setEditingId(null);
    setFormErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    setFormErrors({});
    
    const errors: FormErrors = {};
    
    // Validar nombre
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    } else {
      const nombreExiste = puertas.some(
        p => p.nombre.toLowerCase().trim() === formData.nombre.toLowerCase().trim() && p.id !== editingId
      );
      if (nombreExiste) {
        errors.nombre = 'Ya existe una puerta con este nombre';
      }
    }
    
    // Validar código
    if (!formData.codigo.trim()) {
      errors.codigo = 'El código es requerido';
    } else {
      // Validar que el código solo contenga letras y números
      if (!/^[A-Za-z0-9]+$/.test(formData.codigo)) {
        errors.codigo = 'El código solo puede contener letras y números';
      } else {
        const codigoExiste = puertas.some(
          p => p.codigo.toLowerCase() === formData.codigo.toLowerCase() && p.id !== editingId
        );
        if (codigoExiste) {
          errors.codigo = 'Ya existe una puerta con este código';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (window.electronAPI) {
        if (editingId) {
          await window.electronAPI.updatePuerta({
            id: editingId,
            ...formData,
          });
        } else {
          await window.electronAPI.createPuerta(formData);
        }
        await loadPuertas();
        handleCloseDialog();
      }
    } catch (error: any) {
      console.error('Error saving puerta:', error);
      if (error.message && error.message.includes('UNIQUE')) {
        setFormErrors({ codigo: 'Este código ya está en uso' });
      } else {
        alert('Error al guardar la puerta. Por favor, intenta de nuevo.');
      }
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      if (window.electronAPI) {
        await window.electronAPI.togglePuertaStatus(id, !currentStatus);
        await loadPuertas();
      }
    } catch (error) {
      console.error('Error toggling puerta status:', error);
    }
  };

  const handleDelete = async (id: number) => {
    const puerta = puertas.find(p => p.id === id);
    if (!puerta) return;
    
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la puerta "${puerta.nombre}"?\n\nNota: Si hay tipos de ticket usando esta puerta, solo se desactivará.`)) {
      return;
    }

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.deletePuerta(id);
        await loadPuertas();
        
        // Mostrar mensaje informativo si fue desactivada en lugar de eliminada
        if (result && result.desactivada) {
          alert(`La puerta "${puerta.nombre}" tiene tipos de ticket asociados, por lo que fue desactivada en lugar de eliminada.`);
        }
      }
    } catch (error: any) {
      console.error('Error deleting puerta:', error);
      alert('Error al eliminar la puerta. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="w-8 h-0.5 bg-[#457373] mb-3 rounded-full"></div>
          <h1 className="text-xl font-light text-[#1D324D] tracking-tight">Gestión de Puertas</h1>
          <p className="text-[#7C4935]/70 text-xs font-light mt-1">Administra las puertas y ubicaciones de acceso</p>
        </div>
        <button
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#1D324D] to-[#457373] text-white rounded-2xl hover:from-[#457373] hover:to-[#1D324D] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] font-medium text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Puerta
        </button>
      </div>

      {/* Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gradient-to-r from-[#F1EADC] to-[#DFE4E4]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Código</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Estado</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DFE4E4]/30">
            {puertas.map((puerta) => (
              <tr key={puerta.id} className="hover:bg-[#F1EADC]/20 transition-colors duration-200">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-[#1D324D]">{puerta.nombre}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#457373]/10 text-[#457373] border border-[#457373]/20">
                    {puerta.codigo}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-[#7C4935]/80">{puerta.descripcion || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {puerta.activo ? (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      Activa
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      Inactiva
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenDialog(puerta)}
                      className="p-2 text-[#457373] hover:text-[#1D324D] hover:bg-[#F1EADC]/50 rounded-xl transition-all duration-200"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(puerta.id, puerta.activo)}
                      className={`p-2 rounded-xl transition-all duration-200 ${
                        puerta.activo
                          ? 'text-orange-500 hover:text-orange-700 hover:bg-orange-50'
                          : 'text-green-500 hover:text-green-700 hover:bg-green-50'
                      }`}
                      title={puerta.activo ? 'Desactivar' : 'Activar'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(puerta.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {puertas.length === 0 && (
          <div className="text-center py-12 text-[#7C4935]/70">
            <svg className="w-12 h-12 mx-auto mb-4 text-[#457373]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm">No hay puertas registradas</p>
            <p className="text-xs mt-1">Crea una nueva puerta para comenzar</p>
          </div>
        )}
      </div>

      {/* Dialog Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 border border-white/50">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-light text-[#1D324D]">
                {editingId ? 'Editar Puerta' : 'Nueva Puerta'}
              </h2>
              <button
                onClick={handleCloseDialog}
                className="p-2 hover:bg-[#F1EADC]/50 rounded-xl transition-all duration-200"
              >
                <svg className="w-6 h-6 text-[#7C4935]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1D324D] mb-2">
                  Nombre de la Puerta *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-[#F1EADC]/30 border ${
                    formErrors.nombre ? 'border-red-500' : 'border-[#DFE4E4]'
                  } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300`}
                  placeholder="Ej: Puerta Principal"
                />
                {formErrors.nombre && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.nombre}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1D324D] mb-2">
                  Código *
                </label>
                <input
                  type="text"
                  name="codigo"
                  value={formData.codigo}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-[#F1EADC]/30 border ${
                    formErrors.codigo ? 'border-red-500' : 'border-[#DFE4E4]'
                  } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 uppercase font-mono`}
                  placeholder="Ej: A, VIP, N, S"
                  maxLength={20}
                />
                {formErrors.codigo && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.codigo}</p>
                )}
                <p className="mt-1 text-xs text-[#7C4935]/70">
                  Este código se usará en los QR de los tickets
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1D324D] mb-2">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 resize-none"
                  placeholder="Descripción opcional de la ubicación..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseDialog}
                  className="flex-1 px-6 py-3 bg-[#DFE4E4]/50 text-[#1D324D] rounded-xl hover:bg-[#DFE4E4] transition-all duration-300 font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1D324D] to-[#457373] text-white rounded-xl hover:from-[#457373] hover:to-[#1D324D] transition-all duration-300 shadow-lg font-medium text-sm"
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

export default PuertasAdmin;
