import React, { useEffect, useState } from 'react';

// Importar tipos globales
/// <reference types="../types/electron" />
/// <reference types="../types/global" />

interface BotonConfig {
  id?: number;
  input_numero: number;
  tipo_ticket_id: number | null;
  tipo_ticket_nombre?: string;
  tipo_ticket_precio?: number;
  cantidad: number;
  descripcion: string;
  activo: boolean;
}

interface TipoTicket {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
}

const ConfigBotonesAdmin: React.FC = () => {
  const [configuraciones, setConfiguraciones] = useState<BotonConfig[]>([]);
  const [tiposTicket, setTiposTicket] = useState<TipoTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [estadosInputs] = useState<{ [key: number]: number }>({
    1: 0, 2: 0, 3: 0, 4: 0
  });

  useEffect(() => {
    cargarDatos();
    // Polling cada 2 segundos para actualizar estado de inputs
    const interval = setInterval(leerEstadoInputs, 2000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [configs, tipos] = await Promise.all([
        window.electronAPI.obtenerConfigBotones(),
        window.electronAPI.getActiveTicketTypes()
      ]);
      setConfiguraciones(configs);
      setTiposTicket(tipos);
    } catch (err: any) {
      setError('Error al cargar datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const leerEstadoInputs = async () => {
    try {
      // Llamar al endpoint de control-acceso-qr para obtener estado
      // Por ahora simularemos con valores aleatorios para testing
      // TODO: Implementar fetch a http://localhost:3000/api/inputs/estado
      // const response = await fetch('http://localhost:3000/api/inputs/estado');
      // const data = await response.json();
      // setEstadosInputs(data);
    } catch (err) {
      // Silenciar errores de polling para no saturar la UI
    }
  };

  const handleConfigChange = (input_numero: number, field: string, value: any) => {
    setConfiguraciones(prev =>
      prev.map(config =>
        config.input_numero === input_numero
          ? { ...config, [field]: value }
          : config
      )
    );
  };

  const handleToggleActivo = async (input_numero: number, nuevoEstado: boolean) => {
    const config = configuraciones.find(c => c.input_numero === input_numero);
    if (!config) return;

    // Si está desactivando un botón que YA está guardado en BD
    if (!nuevoEstado && config.id) {
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        await window.electronAPI.desactivarBoton(input_numero);
        setSuccess(`Input ${input_numero} desactivado`);
        await cargarDatos();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err: any) {
        setError('Error al desactivar: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Si está activando O si es un botón nuevo, solo actualizar estado local
      setConfiguraciones(prev =>
        prev.map(c =>
          c.input_numero === input_numero
            ? { ...c, activo: nuevoEstado }
            : c
        )
      );
    }
  };

  const handleGuardar = async (input_numero: number) => {
    const config = configuraciones.find(c => c.input_numero === input_numero);
    if (!config) return;

    // Validaciones
    if (config.activo && !config.tipo_ticket_id) {
      setError(`Debe seleccionar un tipo de ticket para activar el Input ${input_numero}`);
      return;
    }

    if (config.cantidad < 1) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await window.electronAPI.configurarBoton({
        input_numero: config.input_numero,
        tipo_ticket_id: config.tipo_ticket_id || 0,
        cantidad: config.cantidad,
        descripcion: config.descripcion,
        activo: config.activo
      });
      
      const estado = config.activo ? 'activado' : 'guardado';
      setSuccess(`Input ${input_numero} ${estado} exitosamente`);
      await cargarDatos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (input_numero: number) => {
    if (!window.confirm(`¿Eliminar la configuración del Input ${input_numero}?`)) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      await window.electronAPI.eliminarBoton(input_numero);
      setSuccess(`Configuración del botón ${input_numero} eliminada`);
      await cargarDatos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Error al eliminar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-xl font-semibold text-[#1D324D] mb-0.5 flex items-center gap-2">
          <svg className="w-5 h-5 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          Configuración de Botones Físicos
        </h2>
        <p className="text-xs text-[#1D324D]/60">Configure los botones del X410 para impresión automática</p>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-red-800">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-2">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Grid de configuraciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {configuraciones.map((config) => {
          const estadoActual = estadosInputs[config.input_numero] || 0;
          const estaPresionado = estadoActual === 1;

          return (
            <div
              key={config.input_numero}
              className={`bg-white rounded-lg border-2 p-4 transition-all ${
                estaPresionado
                  ? 'border-green-400 shadow-lg shadow-green-100'
                  : config.activo
                  ? 'border-[#457373]/30'
                  : 'border-gray-200'
              }`}
            >
              {/* Header del card */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    config.activo ? 'bg-[#457373] text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {config.input_numero}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#1D324D]">Input {config.input_numero}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${
                        estaPresionado ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                      }`}></div>
                      <span className="text-xs text-gray-500">
                        {estaPresionado ? 'Presionado' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle activo/inactivo */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-600">Activo</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={config.activo}
                      onChange={(e) => handleToggleActivo(config.input_numero, e.target.checked)}
                      disabled={loading}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#457373] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#457373] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  </div>
                </label>
              </div>

              {/* Formulario de configuración */}
              <div className="space-y-3">
                {/* Tipo de ticket */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tipo de Ticket
                  </label>
                  <select
                    value={config.tipo_ticket_id || ''}
                    onChange={(e) => handleConfigChange(config.input_numero, 'tipo_ticket_id', parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#457373]"
                  >
                    <option value="">Seleccione un tipo</option>
                    {tiposTicket.map(tipo => (
                      <option key={tipo.id} value={tipo.id}>
                        {tipo.nombre} - ${tipo.precio.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Cantidad por pulso
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.cantidad}
                    onChange={(e) => handleConfigChange(config.input_numero, 'cantidad', parseInt(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#457373]"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={config.descripcion}
                    onChange={(e) => handleConfigChange(config.input_numero, 'descripcion', e.target.value)}
                    placeholder="Ej: Botón entrada principal"
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#457373] resize-none"
                  />
                </div>

                {/* Resumen visual */}
                {config.tipo_ticket_id && config.tipo_ticket_nombre && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                    <div className="flex items-center gap-2 text-xs">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-blue-800 font-medium">
                        Imprimirá {config.cantidad}x {config.tipo_ticket_nombre} (${(config.tipo_ticket_precio! * config.cantidad).toFixed(2)})
                      </span>
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleGuardar(config.input_numero)}
                    disabled={loading}
                    className="flex-1 py-1.5 px-3 bg-[#1D324D] text-white text-xs font-semibold rounded-md hover:bg-[#457373] focus:outline-none focus:ring-2 focus:ring-[#457373] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Guardar
                  </button>
                  
                  {config.id && (
                    <button
                      onClick={() => handleEliminar(config.input_numero)}
                      disabled={loading}
                      className="px-3 py-1.5 bg-red-500 text-white text-xs font-semibold rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Información adicional */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Instrucciones
        </h4>
        <ul className="space-y-1 text-xs text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-[#457373] font-bold">1.</span>
            <span>Conecte los botones físicos a los inputs digitales del X410</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#457373] font-bold">2.</span>
            <span>Configure qué tipo de ticket imprimirá cada botón</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#457373] font-bold">3.</span>
            <span>Active el botón y guarde la configuración</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#457373] font-bold">4.</span>
            <span>Al presionar el botón físico, se imprimirá automáticamente el ticket configurado</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ConfigBotonesAdmin;
