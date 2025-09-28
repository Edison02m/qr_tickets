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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="w-8 h-0.5 bg-[#457373] mb-3 rounded-full"></div>
          <h1 className="text-xl font-light text-[#1D324D] tracking-tight">Cierres de Caja</h1>
          <p className="text-[#7C4935]/70 text-xs font-light mt-1">Gestiona y consulta los cierres diarios</p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Form Section */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8">
        <form onSubmit={handleCreateClosure} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1D324D] mb-3 flex items-center">
              <svg className="w-4 h-4 mr-2 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Fecha de inicio
            </label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={handleInputChange} 
              className="w-full px-4 py-3 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-2xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300" 
              required 
            />
          </div>

          {/* Estado del cierre */}
          {existeCierre && cierreActual && (
            <div className="bg-gradient-to-r from-[#457373]/10 to-[#7C4935]/10 rounded-2xl p-4 border border-[#457373]/20">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-[#1D324D] font-medium">
                    Ya existe un cierre para esta fecha
                  </p>
                  <p className="text-xs text-[#7C4935]/70">
                    Último cierre: {new Date(cierreActual.fecha_cierre || cierreActual.fecha_inicio).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Resumen automático */}
          <div className="bg-gradient-to-br from-[#F1EADC]/20 via-white to-[#DFE4E4]/20 rounded-2xl p-6 border border-[#DFE4E4]/50">
            <div className="text-lg text-[#1D324D] font-medium mb-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-[#457373]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 8v4l3 3"/>
              </svg>
              Resumen Automático
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className="text-center p-4 bg-white/50 rounded-xl border border-[#DFE4E4]/30">
                <span className="text-sm text-[#7C4935] font-medium">Total Ventas</span>
                <div className="text-2xl font-bold text-[#457373] mt-1">${resumen.total_ventas.toFixed(2)}</div>
              </div>
              <div className="text-center p-4 bg-white/50 rounded-xl border border-[#DFE4E4]/30">
                <span className="text-sm text-[#7C4935] font-medium">Cantidad Tickets</span>
                <div className="text-2xl font-bold text-[#1D324D] mt-1">{resumen.cantidad_tickets}</div>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-sm text-[#7C4935] font-medium mb-2 block">Detalle por tipo de ticket:</span>
              {resumen.detalle_tipos ? (
                <ul className="space-y-2">
                  {resumen.detalle_tipos.split(' | ').map((detalle, idx) => {
                    const match = detalle.match(/^(.*?): (\d+) tickets, \$(\d+\.\d{2})$/);
                    if (match) {
                      const [, tipo, cantidad, total] = match;
                      return (
                        <li key={idx} className="flex items-center gap-3 bg-white/50 rounded-xl px-4 py-3 text-sm border border-[#DFE4E4]/30">
                          <span className="font-medium text-[#1D324D]">{tipo}</span>
                          <span className="text-[#7C4935]/60">×</span>
                          <span className="font-bold text-[#457373]">{cantidad}</span>
                          <span className="text-[#7C4935]/60">=</span>
                          <span className="font-bold text-[#7C4935]">${total}</span>
                        </li>
                      );
                    }
                    return (
                      <li key={idx} className="text-[#1D324D] text-sm">{detalle}</li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-[#7C4935]/60 italic">Sin ventas</div>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            className={`w-full py-4 px-6 rounded-2xl text-white font-medium transition-all duration-300 shadow-lg ${
              existeCierre 
                ? 'bg-gradient-to-r from-[#457373] to-[#7C4935] hover:shadow-xl' 
                : 'bg-gradient-to-r from-[#1D324D] to-[#457373] hover:shadow-xl'
            }`}
          >
            {existeCierre ? 'Actualizar Cierre de Caja' : 'Crear Cierre de Caja'}
            </button>
        </form>
      </div>
      {/* Historial de cierres */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-0.5 bg-[#457373] rounded-full"></div>
          <h3 className="text-xl font-light text-[#1D324D]">Historial de Cierres</h3>
          <div className="w-8 h-0.5 bg-[#457373] rounded-full"></div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
          <label className="text-sm text-[#1D324D] font-medium flex items-center gap-2">
            Desde:
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={e => setFiltroFechaInicio(e.target.value)}
              className="px-3 py-2 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent"
            />
          </label>
          <label className="text-sm text-[#1D324D] font-medium flex items-center gap-2">
            Hasta:
            <input
              type="date"
              value={filtroFechaFin}
              onChange={e => setFiltroFechaFin(e.target.value)}
              className="px-3 py-2 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent"
            />
          </label>
        </div>
        
        {loading ? (
          <div className="text-[#7C4935] py-8 text-center">Cargando...</div>
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
                <table className="min-w-full bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-[#DFE4E4]/50 overflow-hidden">
                  <thead className="bg-gradient-to-r from-[#1D324D] to-[#457373]">
                    <tr>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">ID</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">Usuario</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">Fecha Inicio</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">Fecha Cierre</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">Total Ventas</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">Tickets</th>
                      <th className="px-4 py-4 text-left text-sm font-medium text-white">Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DFE4E4]/30">
                    {cierresFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-[#7C4935]/60 italic">Sin cierres registrados</td>
                      </tr>
                    ) : (
                      cierresPagina.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-[#F1EADC]/20 transition-colors">
                          <td className="px-4 py-3 font-mono text-sm text-[#457373]">{c.id}</td>
                          <td className="px-4 py-3 text-sm text-[#1D324D]">
                            <span className="font-medium text-[#1D324D]">{c.usuario_nombre}</span>
                            <span className="text-xs text-[#7C4935]/70 ml-1">({c.usuario_usuario})</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#7C4935]/70">{c.fecha_inicio}</td>
                          <td className="px-4 py-3 text-sm text-[#7C4935]/70">{c.fecha_cierre}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#457373]">${c.total_ventas.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-[#1D324D]">{c.cantidad_tickets}</td>
                          <td className="px-4 py-3 text-xs">
                            {c.detalle_tipos ? (
                              <ul className="space-y-1">
                                {c.detalle_tipos.split(' | ').map((detalle, i) => {
                                  const match = detalle.match(/^(.*?): (\d+) tickets, \$(\d+\.\d{2})$/);
                                  if (match) {
                                    const [, tipo, cantidad, total] = match;
                                    return (
                                      <li key={i} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#1D324D] bg-[#F1EADC]/30">
                                        <span className="font-medium text-[#1D324D]">{tipo}</span>
                                        <span className="text-[#7C4935]/60">×</span>
                                        <span className="font-semibold text-[#457373]">{cantidad}</span>
                                        <span className="text-[#7C4935]/60">=</span>
                                        <span className="font-semibold text-[#7C4935]">${total}</span>
                                      </li>
                                    );
                                  }
                                  return (
                                    <li key={i} className="text-[#1D324D]">{detalle}</li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <span className="text-[#7C4935]/60 italic">Sin ventas</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {/* Controles de paginación */}
                {cierresFiltrados.length > pageSize && (
                  <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                      className="px-4 py-2 rounded-xl border border-[#DFE4E4] text-sm text-[#1D324D] bg-white/70 hover:bg-[#F1EADC]/30 disabled:opacity-50 transition-colors"
                      onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-[#7C4935]">
                      Página {paginaActual} de {totalPages}
                    </span>
                    <button
                      className="px-4 py-2 rounded-xl border border-[#DFE4E4] text-sm text-[#1D324D] bg-white/70 hover:bg-[#F1EADC]/30 disabled:opacity-50 transition-colors"
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
