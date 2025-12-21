import React, { useEffect, useState } from 'react';

interface CashClosure {
  id: number;
  usuario_nombre: string;
  usuario_usuario: string;
  fecha_inicio: string;
  fecha_cierre: string;
  total_ventas: number;
  cantidad_tickets: number;
  detalle_tipos: string;
}

interface Props {
  userId?: number;
}

const CashClosureAdmin: React.FC<Props> = ({ userId }) => {
  // Paginación para el historial
  const [paginaActual, setPaginaActual] = useState(1);
  const pageSize = 5;

  // Filtros de fecha para el historial
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');

  const [existeCierre, setExisteCierre] = useState(false);
  const [cierreActual, setCierreActual] = useState<CashClosure | null>(null);
  const [cierres, setCierres] = useState<CashClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [resumen, setResumen] = useState<{ total_ventas: number; cantidad_tickets: number; detalle_tipos: string }>({ total_ventas: 0, cantidad_tickets: 0, detalle_tipos: '' });

  useEffect(() => {
    fetchCierres();
    // Por defecto, fecha de hoy
    const hoy = new Date().toISOString().slice(0, 10);
    setFechaInicio(hoy);
    checkExistingClosure(hoy);
  }, []);

  const fetchCierres = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await window.electronAPI.getAllCashClosures();
      setCierres(data);
    } catch (err) {
      setError('Error al cargar cierres');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingClosure = async (fecha: string) => {
    try {
      const closure = await window.electronAPI.getCashClosureByDateAndUser(userId || 1, fecha);
      if (closure) {
        setExisteCierre(true);
        setCierreActual(closure);
      } else {
        setExisteCierre(false);
        setCierreActual(null);
      }
    } catch (err) {
      console.error('Error al verificar cierre existente:', err);
    }
  };

  // Calcular resumen automático de tickets vendidos no anulados
  const fetchResumen = async (fecha: string) => {
    setError('');
    try {
      // Obtener ventas y tickets no anulados SOLO del día seleccionado
      const ventas = await window.electronAPI.getAllDailySales();
      // Filtrar por fecha exacta y no anulados
      const ventasFiltradas = ventas.filter(v => {
        // v.fecha_venta puede venir como string, aseguramos formato yyyy-mm-dd
        const ventaDate = v.fecha_venta.slice(0, 10);
        return ventaDate === fecha && v.anulada === 0;
      });
      // Agrupar por tipo de ticket
      const tipos: Record<string, { cantidad: number; total: number }> = {};
      let cantidad_tickets = 0;
      let total_ventas = 0;
      ventasFiltradas.forEach(v => {
        tipos[v.tipo_ticket] = tipos[v.tipo_ticket] || { cantidad: 0, total: 0 };
        tipos[v.tipo_ticket].cantidad += 1;
        tipos[v.tipo_ticket].total += v.ticket_precio;
        cantidad_tickets += 1;
        total_ventas += v.ticket_precio;
      });
      // Detalle tipos en formato texto
      const detalle_tipos = Object.entries(tipos)
        .map(([tipo, info]) => `${tipo}: ${info.cantidad} tickets, $${info.total.toFixed(2)}`)
        .join(' | ');
      setResumen({ total_ventas, cantidad_tickets, detalle_tipos });
    } catch (err) {
      setError('Error al calcular resumen');
    }
  };

  useEffect(() => {
    if (fechaInicio) {
      fetchResumen(fechaInicio);
    }
  }, [fechaInicio]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nuevaFecha = e.target.value;
    setFechaInicio(nuevaFecha);
    checkExistingClosure(nuevaFecha);
  };

  const handleCreateClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const usuario_id = userId || 1;
      const result = await window.electronAPI.upsertCashClosure({
        usuario_id,
        fecha_inicio: fechaInicio,
        total_ventas: resumen.total_ventas,
        cantidad_tickets: resumen.cantidad_tickets,
        detalle_tipos: resumen.detalle_tipos,
      });
      
      // Actualizar el estado según la acción realizada
      if (result.action === 'created') {
        setExisteCierre(true);
        // Obtener el cierre recién creado
        const newClosure = await window.electronAPI.getCashClosureByDateAndUser(usuario_id, fechaInicio);
        setCierreActual(newClosure);
      } else if (result.action === 'updated') {
        // Obtener el cierre actualizado
        const updatedClosure = await window.electronAPI.getCashClosureByDateAndUser(usuario_id, fechaInicio);
        setCierreActual(updatedClosure);
      }
      
      await fetchCierres();
    } catch (err) {
      setError('Error al procesar el cierre de caja');
      console.error('Error en handleCreateClosure:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-light text-[#1D324D] mb-2">Cierre de Caja</h2>
        <p className="text-sm text-[#1D324D]/60">Gestión de cierres diarios</p>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Form Section - Minimalista */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <form onSubmit={handleCreateClosure} className="space-y-5">
          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={handleInputChange} 
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-200" 
              required 
            />
          </div>

          {/* Estado del cierre */}
          {existeCierre && cierreActual && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium">Cierre ya registrado</p>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {new Date(cierreActual.fecha_cierre || cierreActual.fecha_inicio).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Resumen - Minimalista */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Resumen</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-lg font-semibold text-[#1D324D]">${resumen.total_ventas.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tickets</span>
                <span className="text-lg font-semibold text-[#457373]">{resumen.cantidad_tickets}</span>
              </div>
            </div>
          </div>

          {/* Detalle - Minimalista */}
          {resumen.detalle_tipos && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Detalle</h3>
              <div className="space-y-1.5">
                {resumen.detalle_tipos.split(' | ').map((detalle, idx) => {
                  const match = detalle.match(/^(.*?): (\d+) tickets, \$(\d+\.\d{2})$/);
                  if (match) {
                    const [, tipo, cantidad, total] = match;
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700">{tipo}</span>
                          <span className="text-gray-400">×</span>
                          <span className="font-medium text-[#457373]">{cantidad}</span>
                        </div>
                        <span className="font-medium text-gray-900">${total}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Botón */}
          <button 
            type="submit" 
            className="w-full py-2.5 px-4 bg-[#1D324D] text-white text-sm font-medium rounded-lg hover:bg-[#457373] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:ring-offset-2 transition-all duration-200 shadow-sm"
          >
            {existeCierre ? 'Actualizar Cierre' : 'Guardar Cierre'}
          </button>
        </form>
      </div>

      {/* Historial de cierres */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-medium text-[#1D324D] mb-4">Historial de Cierres</h3>
        
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Desde</label>
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={e => setFiltroFechaInicio(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Hasta</label>
            <input
              type="date"
              value={filtroFechaFin}
              onChange={e => setFiltroFechaFin(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent"
            />
          </div>
        </div>
        
        {loading ? (
          <div className="text-gray-500 py-8 text-center text-sm">Cargando...</div>
      ) : (
        <div className="overflow-x-auto">
          {(() => {
            // Filtrar cierres por fecha seleccionada
            let cierresFiltrados = cierres;
            if (filtroFechaInicio) {
              cierresFiltrados = cierresFiltrados.filter(c => c.fecha_inicio.slice(0, 10) >= filtroFechaInicio);
            }
            if (filtroFechaFin) {
              cierresFiltrados = cierresFiltrados.filter(c => c.fecha_inicio.slice(0, 10) <= filtroFechaFin);
            }
            // Paginación
            const totalPages = Math.max(1, Math.ceil(cierresFiltrados.length / pageSize));
            const startIdx = (paginaActual - 1) * pageSize;
            const endIdx = startIdx + pageSize;
            const cierresPagina = cierresFiltrados.slice(startIdx, endIdx);

            return (
              <>
                <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Usuario</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Fecha Inicio</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Fecha Cierre</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Tickets</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cierresFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Sin cierres registrados</td>
                      </tr>
                    ) : (
                      cierresPagina.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-600">{c.id}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="text-gray-900 font-medium">{c.usuario_nombre}</div>
                            <div className="text-xs text-gray-500">{c.usuario_usuario}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{c.fecha_inicio.slice(0, 16)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{c.fecha_cierre.slice(0, 16)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#1D324D]">${c.total_ventas.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#457373]">{c.cantidad_tickets}</td>
                          <td className="px-4 py-3 text-xs">
                            {c.detalle_tipos ? (
                              <div className="space-y-1">
                                {c.detalle_tipos.split(' | ').map((detalle, i) => {
                                  const match = detalle.match(/^(.*?): (\d+) tickets, \$(\d+\.\d{2})$/);
                                  if (match) {
                                    const [, tipo, cantidad, total] = match;
                                    return (
                                      <div key={i} className="flex items-center gap-1.5 text-xs">
                                        <span className="text-gray-700">{tipo}</span>
                                        <span className="text-gray-400">×</span>
                                        <span className="font-medium text-[#457373]">{cantidad}</span>
                                        <span className="text-gray-400">=</span>
                                        <span className="font-medium text-gray-900">${total}</span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            ) : (
                              <span className="text-gray-400">Sin ventas</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {/* Controles de paginación */}
                {cierresFiltrados.length > pageSize && (
                  <div className="flex justify-center items-center gap-3 mt-4">
                    <button
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-gray-600">
                      Página {paginaActual} de {totalPages}
                    </span>
                    <button
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      onClick={() => setPaginaActual(p => Math.min(totalPages, p + 1))}
                      disabled={paginaActual === totalPages}
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            );
          })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default CashClosureAdmin;
