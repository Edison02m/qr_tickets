import React, { useState, useEffect } from 'react';

interface Puerta {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  lector_ip?: string;
  lector_port?: number;
  relay_number?: number;
  tiempo_apertura_segundos?: number;
  activo: boolean;
  fecha_creacion: string;
}

interface PuertaFormData {
  nombre: string;
  codigo: string;
  descripcion: string;
  lector_ip: string;
  lector_port: number;
    relay_number: number | '';
  tiempo_apertura_segundos: number;
}

interface FormErrors {
  nombre?: string;
  codigo?: string;
  lector_ip?: string;
  lector_port?: string;
  relay_number?: string;
  tiempo_apertura_segundos?: string;
}

const PuertasAdmin: React.FC = () => {
  const [puertas, setPuertas] = useState<Puerta[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PuertaFormData>({
    nombre: '',
    codigo: '',
    descripcion: '',
    lector_ip: '',
    lector_port: 5000,
    relay_number: '',
    tiempo_apertura_segundos: 5,
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
        lector_ip: puerta.lector_ip || '',
        lector_port: puerta.lector_port || 5000,
        relay_number: puerta.relay_number || '',
        tiempo_apertura_segundos: puerta.tiempo_apertura_segundos || 5,
      });
      setEditingId(puerta.id);
    } else {
      setFormData({
        nombre: '',
        codigo: '',
        descripcion: '',
        lector_ip: '',
        lector_port: 5000,
        relay_number: '',
        tiempo_apertura_segundos: 5,
      });
      setEditingId(null);
    }
    setFormErrors({});
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({ 
      nombre: '', 
      codigo: '', 
      descripcion: '',
      lector_ip: '',
      lector_port: 5000,
      relay_number: '',
      tiempo_apertura_segundos: 5,
    });
    setEditingId(null);
    setFormErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Convertir a número para campos numéricos
    if (name === 'lector_port' || name === 'tiempo_apertura_segundos') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? '' : parseInt(value, 10),
      }));
    } else if (name === 'relay_number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? '' : parseInt(value, 10),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
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

    // Validar IP del lector (opcional pero si se ingresa debe ser válida)
    if (formData.lector_ip && formData.lector_ip.trim() !== '') {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(formData.lector_ip.trim())) {
        errors.lector_ip = 'Formato de IP inválido (ej: 192.168.1.100)';
      } else {
        // Validar rangos de cada octeto
        const octetos = formData.lector_ip.trim().split('.');
        const valido = octetos.every(o => {
          const num = parseInt(o, 10);
          return num >= 0 && num <= 255;
        });
        if (!valido) {
          errors.lector_ip = 'Los valores de IP deben estar entre 0-255';
        } else {
          // Validar que la IP no esté siendo usada por otra puerta
          const ipEnUso = puertas.some(
            p => p.lector_ip && 
                 p.lector_ip.trim() === formData.lector_ip.trim() && 
                 p.id !== editingId
          );
          if (ipEnUso) {
            errors.lector_ip = 'Esta IP ya está asignada a otra puerta';
          }
        }
      }
    }

    // Validar puerto del lector
    if (formData.lector_port) {
      if (formData.lector_port < 1 || formData.lector_port > 65535) {
        errors.lector_port = 'El puerto debe estar entre 1 y 65535';
      }
    }

    // Validar número de relay (opcional pero si se ingresa debe ser 1-4)
    if (formData.relay_number !== '' && formData.relay_number !== null) {
      const relayNum = Number(formData.relay_number);
      if (isNaN(relayNum) || relayNum < 1 || relayNum > 4) {
        errors.relay_number = 'El número de relay debe ser 1, 2, 3 o 4';
      } else {
        // Validar que el número de relay no esté siendo usado por otra puerta
        const relayEnUso = puertas.some(
          p => p.relay_number && 
               p.relay_number === relayNum && 
               p.id !== editingId
        );
        if (relayEnUso) {
          const puertaConRelay = puertas.find(p => p.relay_number === relayNum && p.id !== editingId);
          errors.relay_number = `El Relay ${relayNum} ya está asignado a "${puertaConRelay?.nombre}"`;
        }
      }
    }

    // Validar tiempo de apertura
    if (formData.tiempo_apertura_segundos) {
      if (formData.tiempo_apertura_segundos < 1 || formData.tiempo_apertura_segundos > 60) {
        errors.tiempo_apertura_segundos = 'El tiempo debe estar entre 1 y 60 segundos';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (window.electronAPI) {
        const dataToSend = {
          ...formData,
          relay_number: formData.relay_number === '' ? undefined : formData.relay_number,
        };
        
        if (editingId) {
          await window.electronAPI.updatePuerta({
            id: editingId,
            ...dataToSend,
          });
        } else {
          await window.electronAPI.createPuerta(dataToSend);
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
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-[#F1EADC] to-[#DFE4E4]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Código</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Lector QR</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Relay</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Tiempo</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFE4E4]/30">
              {puertas.map((puerta) => (
                <tr key={puerta.id} className="hover:bg-[#F1EADC]/20 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[#1D324D]">{puerta.nombre}</div>
                    {puerta.descripcion && (
                      <div className="text-xs text-[#7C4935]/60 mt-0.5">{puerta.descripcion}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#457373]/10 text-[#457373] border border-[#457373]/20">
                      {puerta.codigo}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {puerta.lector_ip ? (
                      <div>
                        <div className="text-xs font-mono text-[#1D324D]">{puerta.lector_ip}</div>
                        <div className="text-xs text-[#7C4935]/60">Puerto: {puerta.lector_port || 5000}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Sin configurar</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {puerta.relay_number ? (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                        Relay {puerta.relay_number}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {puerta.tiempo_apertura_segundos ? (
                      <span className="text-xs text-[#1D324D]">{puerta.tiempo_apertura_segundos}s</span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
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
        </div>

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
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 border border-white/50 max-h-[90vh] overflow-y-auto">
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
                  rows={2}
                  className="w-full px-4 py-3 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 resize-none"
                  placeholder="Descripción opcional de la ubicación..."
                />
              </div>

              {/* Sección de Configuración del Lector QR y Relay */}
              <div className="border-t border-[#DFE4E4] pt-4 mt-4">
                <h3 className="text-sm font-medium text-[#1D324D] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Configuración del Sistema de Control
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#1D324D] mb-2">
                      IP del Lector QR
                    </label>
                    <input
                      type="text"
                      name="lector_ip"
                      value={formData.lector_ip}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 bg-[#F1EADC]/30 border ${
                        formErrors.lector_ip ? 'border-red-500' : 'border-[#DFE4E4]'
                      } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 font-mono text-sm`}
                      placeholder="192.168.1.100"
                    />
                    {formErrors.lector_ip && (
                      <p className="mt-1 text-xs text-red-500">{formErrors.lector_ip}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1D324D] mb-2">
                      Puerto
                    </label>
                    <input
                      type="number"
                      name="lector_port"
                      value={formData.lector_port}
                      onChange={handleInputChange}
                      min="1"
                      max="65535"
                      className={`w-full px-4 py-2.5 bg-[#F1EADC]/30 border ${
                        formErrors.lector_port ? 'border-red-500' : 'border-[#DFE4E4]'
                      } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300`}
                    />
                    {formErrors.lector_port && (
                      <p className="mt-1 text-xs text-red-500">{formErrors.lector_port}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#1D324D] mb-2">
                      Número de Relay
                    </label>
                    <select
                      name="relay_number"
                      value={formData.relay_number}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 bg-[#F1EADC]/30 border ${
                        formErrors.relay_number ? 'border-red-500' : 'border-[#DFE4E4]'
                      } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300`}
                    >
                      <option value="">Sin asignar</option>
                      <option value="1">Relay 1</option>
                      <option value="2">Relay 2</option>
                      <option value="3">Relay 3</option>
                      <option value="4">Relay 4</option>
                    </select>
                    {formErrors.relay_number && (
                      <p className="mt-1 text-xs text-red-500">{formErrors.relay_number}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#1D324D] mb-2">
                      Tiempo de Apertura (segundos)
                    </label>
                    <input
                      type="number"
                      name="tiempo_apertura_segundos"
                      value={formData.tiempo_apertura_segundos}
                      onChange={handleInputChange}
                      min="1"
                      max="60"
                      className={`w-full px-4 py-2.5 bg-[#F1EADC]/30 border ${
                        formErrors.tiempo_apertura_segundos ? 'border-red-500' : 'border-[#DFE4E4]'
                      } rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300`}
                    />
                    {formErrors.tiempo_apertura_segundos && (
                      <p className="mt-1 text-xs text-red-500">{formErrors.tiempo_apertura_segundos}</p>
                    )}
                    <p className="mt-1 text-xs text-[#7C4935]/70">
                      Duración que el relay permanecerá activo (1-60 seg)
                    </p>
                  </div>
                </div>
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
