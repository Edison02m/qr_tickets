import React, { useEffect, useState } from 'react';

interface CashClosure {
  id: number;
  usuario_id: number;
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
  userRole?: string;
}

const CashClosureAdmin: React.FC<Props> = ({ userId, userRole }) => {
  // Determinar si es admin
  const isAdmin = userRole === 'admin';
  
  // Para admin: selector de usuario para hacer cierres de otros
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number>(userId || 1);
  
  // Para admin: cierres consolidados de la fecha
  const [cierresConsolidados, setCierresConsolidados] = useState<any>(null);
  
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
    // Si es admin, cargar lista de usuarios
    if (isAdmin) {
      fetchUsuarios();
    }
    // Por defecto, fecha de hoy
    const hoy = new Date().toISOString().slice(0, 10);
    setFechaInicio(hoy);
    checkExistingClosure(hoy);
  }, []);

  const fetchUsuarios = async () => {
    try {
      const data = await window.electronAPI.getUsers();
      setUsuarios(data.filter((u: any) => u.activo === 1));
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

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
      const userIdToCheck = isAdmin ? usuarioSeleccionado : (userId || 1);
      const closure = await window.electronAPI.getCashClosureByDateAndUser(userIdToCheck, fecha);
      if (closure) {
        setExisteCierre(true);
        setCierreActual(closure);
      } else {
        setExisteCierre(false);
        setCierreActual(null);
      }
      
      // Si es admin, también cargar cierres consolidados
      if (isAdmin) {
        const consolidado = await window.electronAPI.getAllCashClosuresByDate(fecha);
        setCierresConsolidados(consolidado);
      }
    } catch (err) {
      console.error('Error al verificar cierre existente:', err);
    }
  };

  // Calcular resumen automático de tickets vendidos no anulados
  const fetchResumen = async (fecha: string) => {
    setError('');
    try {
      const userIdToUse = isAdmin ? usuarioSeleccionado : (userId || 1);
      
      // Obtener resumen del vendedor
      const summary = await window.electronAPI.getVendedorDailySummaryByUser(userIdToUse, fecha);
      
      if (summary && summary.detalle_por_tipo && summary.detalle_por_tipo.length > 0) {
        const total_ventas = summary.total_ventas || 0;
        const cantidad_tickets = summary.total_tickets || 0;
        const detalle_tipos = summary.detalle_por_tipo
          .map((tipo: any) => `${tipo.tipo_ticket}: ${tipo.cantidad_tickets} tickets, $${tipo.total_tipo.toFixed(2)}`)
          .join(' | ');
        setResumen({ total_ventas, cantidad_tickets, detalle_tipos });
      } else {
        setResumen({ total_ventas: 0, cantidad_tickets: 0, detalle_tipos: 'Sin ventas' });
      }
    } catch (err) {
      console.error('Error al calcular resumen:', err);
      setError('Error al calcular resumen');
    }
  };

  useEffect(() => {
    if (fechaInicio) {
      fetchResumen(fechaInicio);
    }
  }, [fechaInicio, usuarioSeleccionado]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nuevaFecha = e.target.value;
    setFechaInicio(nuevaFecha);
    checkExistingClosure(nuevaFecha);
  };

  const handleCreateClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const usuario_id = isAdmin ? usuarioSeleccionado : (userId || 1);
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
      
      // Si es admin, recargar cierres consolidados
      if (isAdmin) {
        const consolidado = await window.electronAPI.getAllCashClosuresByDate(fechaInicio);
        setCierresConsolidados(consolidado);
      }
    } catch (err) {
      setError('Error al procesar el cierre de caja');
      console.error('Error en handleCreateClosure:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header - Compacto */}
      <div className="mb-3">
        <h2 className="text-xl font-semibold text-[#1D324D] mb-0.5">Cierre de Caja</h2>
        <p className="text-xs text-[#1D324D]/60">Gestión de cierres diarios</p>
      </div>

      {/* Error message */}
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

      {/* Form Section - Ultra Compacto */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <form onSubmit={handleCreateClosure} className="space-y-3">
          {/* Grid de 2 columnas para Usuario y Fecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Selector de usuario (solo para admin) */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Usuario</label>
                <select
                  value={usuarioSeleccionado}
                  onChange={(e) => {
                    const newUserId = parseInt(e.target.value);
                    setUsuarioSeleccionado(newUserId);
                    checkExistingClosure(fechaInicio);
                    fetchResumen(fechaInicio);
                  }}
                  className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#457373] focus:border-transparent"
                >
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.usuario})</option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Fecha */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
              <input 
                type="date" 
                value={fechaInicio} 
                onChange={handleInputChange} 
                className="w-full px-2.5 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#457373] focus:border-transparent" 
                required 
              />
            </div>
          </div>

          {/* Estado del cierre - Compacto */}
          {existeCierre && cierreActual && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-blue-900 font-medium">Cierre ya registrado</p>
                <p className="text-xs text-blue-600 font-mono">
                  {new Date(cierreActual.fecha_cierre || cierreActual.fecha_inicio).toLocaleString('es-ES', { 
                    month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Resumen - Ultra Compacto */}
          <div className="border-t border-gray-200 pt-2">
            <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Resumen</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-md p-2 text-center">
                <div className="text-xs text-gray-500 mb-0.5">Total</div>
                <div className="text-base font-bold text-[#1D324D]">${resumen.total_ventas.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 rounded-md p-2 text-center">
                <div className="text-xs text-gray-500 mb-0.5">Tickets</div>
                <div className="text-base font-bold text-[#457373]">{resumen.cantidad_tickets}</div>
              </div>
            </div>
          </div>

          {/* Detalle - Ultra Compacto */}
          {resumen.detalle_tipos && (
            <div className="border-t border-gray-200 pt-2">
              <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Detalle</h3>
              <div className="bg-gray-50 rounded-md p-2 space-y-1">
                {resumen.detalle_tipos.split(' | ').map((detalle, idx) => {
                  const match = detalle.match(/^(.*?): (\d+) tickets, \$(\d+\.\d{2})$/);
                  if (match) {
                    const [, tipo, cantidad, total] = match;
                    return (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-700 font-medium">{tipo}</span>
                          <span className="text-gray-400">×</span>
                          <span className="font-semibold text-[#457373]">{cantidad}</span>
                        </div>
                        <span className="font-bold text-gray-900">${total}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Botón - Compacto */}
          <button 
            type="submit" 
            className="w-full py-2 px-3 bg-[#1D324D] text-white text-sm font-semibold rounded-md hover:bg-[#457373] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:ring-offset-1 transition-all duration-200 shadow-sm"
          >
            {existeCierre ? 'Actualizar Cierre' : 'Guardar Cierre'}
          </button>
        </form>
      </div>

      {/* Cierres consolidados del día (solo para admin) */}
      {isAdmin && cierresConsolidados && cierresConsolidados.cierres.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#1D324D] flex items-center gap-2">
              <svg className="w-4 h-4 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Consolidado {new Date(fechaInicio).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#457373]/10 rounded-lg">
                <svg className="w-3.5 h-3.5 text-[#457373]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span className="font-medium text-[#1D324D]">{cierresConsolidados.totales.cantidad_usuarios} usuarios</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg">
                <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                </svg>
                <span className="font-semibold text-green-700">${cierresConsolidados.totales.total_ventas.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Tabla compacta */}
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                  <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets</th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {cierresConsolidados.cierres.map((cierre: any) => (
                  <tr key={cierre.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#457373]/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-[#457373]">
                            {cierre.usuario_nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{cierre.usuario_nombre}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#457373]/10 text-[#457373]">
                        {cierre.cantidad_tickets}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">${cierre.total_ventas.toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(cierre.fecha_cierre).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Fila de totales */}
              <tfoot className="bg-gradient-to-r from-[#457373]/5 to-[#1D324D]/5">
                <tr className="border-t-2 border-[#457373]/20">
                  <td className="px-3 py-2.5 text-sm font-bold text-[#1D324D] uppercase">
                    Total General
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold bg-[#457373] text-white">
                      {cierresConsolidados.totales.cantidad_tickets}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-base font-bold text-[#1D324D]">${cierresConsolidados.totales.total_ventas.toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-2.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

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
