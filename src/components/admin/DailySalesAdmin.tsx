import React, { useEffect, useState } from 'react';

interface Venta {
  venta_id: number;
  fecha_venta: string;
  total: number;
  anulada: number;
  vendedor: string;
  vendedor_usuario: string;
  ticket_id: number;
  codigo_qr: string;
  ticket_precio: number;
  tipo_ticket: string;
}

const DailySalesAdmin: React.FC = () => {
  // ...existing code...
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  // Filtro por código de ticket
  const [filterCodigo, setFilterCodigo] = useState('');
  // Filtros de fecha y estado
  const [filterDate, setFilterDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [filterEstado, setFilterEstado] = useState<'todos'|'activa'|'anulada'>('todos');

  // Filtrar ventas por fecha y estado
  const getFilteredVentas = () => {
    let ventasArr = Object.values(ventasAgrupadas);
    ventasArr = ventasArr.filter(v => {
      // Comparar solo la parte de la fecha (sin hora)
      const ventaDate = v.fecha_venta.length >= 10 ? v.fecha_venta.slice(0, 10) : new Date(v.fecha_venta).toISOString().slice(0, 10);
      const matchDate = ventaDate === filterDate;
      const matchEstado = filterEstado === 'todos' || (filterEstado === 'activa' ? v.anulada === 0 : v.anulada === 1);
      // Si hay filtro de código, al menos uno de los tickets debe coincidir
      const matchCodigo = !filterCodigo.trim() || v.tickets.some(t => t.codigo_qr.toLowerCase().includes(filterCodigo.trim().toLowerCase()));
      return matchDate && matchEstado && matchCodigo;
    });
    return ventasArr;
  };
  // Estado para ordenamiento
  const [sortBy, setSortBy] = useState<'fecha'|'usuario'|'total'|'estado'>('fecha');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

  // Función para ordenar ventas
  // Función para ordenar ventas filtradas
  const getSortedVentas = () => {
    const ventasArr = getFilteredVentas();
    const sorted = ventasArr.sort((a, b) => {
      switch (sortBy) {
        case 'fecha':
          return sortDir === 'asc'
            ? new Date(a.fecha_venta).getTime() - new Date(b.fecha_venta).getTime()
            : new Date(b.fecha_venta).getTime() - new Date(a.fecha_venta).getTime();
        case 'usuario':
          return sortDir === 'asc'
            ? a.vendedor_usuario.localeCompare(b.vendedor_usuario)
            : b.vendedor_usuario.localeCompare(a.vendedor_usuario);
        case 'total':
          return sortDir === 'asc' ? a.total - b.total : b.total - a.total;
        case 'estado':
          return sortDir === 'asc' ? a.anulada - b.anulada : b.anulada - a.anulada;
        default:
          return 0;
      }
    });
    // Paginación
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sorted.slice(start, end);
  };

  // Handler para cambiar orden
  const handleSort = (col: 'fecha'|'usuario'|'total'|'estado') => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anulando, setAnulando] = useState<number | null>(null);

  useEffect(() => {
    fetchVentas();
    setCurrentPage(1); // Reiniciar página al cargar ventas
  }, []);
  // Reiniciar página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDate, filterEstado, filterCodigo]);

  const fetchVentas = async () => {
    setLoading(true);
    setError('');
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getAllDailySales();
        setVentas(data);
      }
    } catch (err) {
      setError('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  const handleAnular = async (ventaId: number) => {
    if (!window.confirm('¿Seguro que deseas anular esta venta?')) return;
    setAnulando(ventaId);
    try {
      await window.electronAPI.annulSale(ventaId);
      await fetchVentas();
    } catch (err) {
      setError('Error al anular la venta');
    } finally {
      setAnulando(null);
    }
  };

  // Agrupar ventas por venta_id
  const ventasAgrupadas = ventas.reduce((acc, v) => {
    if (!acc[v.venta_id]) acc[v.venta_id] = {
      venta_id: v.venta_id,
      fecha_venta: v.fecha_venta,
      total: v.total,
      anulada: v.anulada,
      vendedor: v.vendedor,
      vendedor_usuario: v.vendedor_usuario,
      tickets: [] as Venta[],
    };
    acc[v.venta_id].tickets.push(v);
    return acc;
  }, {} as Record<number, {
    venta_id: number;
    fecha_venta: string;
    total: number;
    anulada: number;
    vendedor: string;
    vendedor_usuario: string;
    tickets: Venta[];
  }>);

  // Calcular total de páginas (después de ventasAgrupadas y pageSize)
  const totalFiltered = Object.values(ventasAgrupadas).filter(v => {
    const ventaDate = v.fecha_venta.length >= 10 ? v.fecha_venta.slice(0, 10) : new Date(v.fecha_venta).toISOString().slice(0, 10);
    const matchDate = ventaDate === filterDate;
    const matchEstado = filterEstado === 'todos' || (filterEstado === 'activa' ? v.anulada === 0 : v.anulada === 1);
    const matchCodigo = !filterCodigo.trim() || v.tickets.some(t => t.codigo_qr.toLowerCase().includes(filterCodigo.trim().toLowerCase()));
    return matchDate && matchEstado && matchCodigo;
  });
  const totalPages = Math.max(1, Math.ceil(totalFiltered.length / pageSize));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="w-8 h-0.5 bg-[#457373] mb-3 rounded-full"></div>
          <h1 className="text-xl font-light text-[#1D324D] tracking-tight">Reportes de Ventas</h1>
          <p className="text-[#7C4935]/70 text-xs font-light mt-1">Consulta y gestiona las ventas diarias</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-6">
        <div className="flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[#1D324D] flex items-center">
              <svg className="w-4 h-4 mr-2 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Fecha
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="px-4 py-2 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[#1D324D] flex items-center">
              <svg className="w-4 h-4 mr-2 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Estado
            </label>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value as 'todos'|'activa'|'anulada')}
              className="px-4 py-2 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-xl text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 text-sm"
            >
              <option value="todos">Todos</option>
              <option value="activa">Activa</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-[#1D324D] flex items-center">
              <svg className="w-4 h-4 mr-2 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Código
            </label>
            <input
              type="text"
              value={filterCodigo}
              onChange={e => setFilterCodigo(e.target.value)}
              placeholder="Buscar código..."
              className="px-4 py-2 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-xl text-[#1D324D] placeholder-[#7C4935]/60 focus:outline-none focus:ring-2 focus:ring-[#457373] focus:border-transparent transition-all duration-300 text-sm"
            />
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
        {loading ? (
          <div className="text-[#7C4935] p-8 text-center">
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#457373]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cargando ventas...
            </div>
          </div>
        ) : error ? (
          <div className="text-red-600 p-8 text-center bg-red-50 rounded-3xl border border-red-200">
            <svg className="w-6 h-6 mx-auto mb-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        ) : getSortedVentas().length === 0 ? (
          <div className="text-[#7C4935]/80 p-8 text-center">
            <svg className="w-8 h-8 mx-auto mb-3 text-[#457373]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            No hay ventas para los filtros seleccionados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-[#F1EADC] to-[#DFE4E4]">
                <tr>
                  <th className="px-6 py-4 text-left cursor-pointer select-none group" onClick={() => handleSort('fecha')}>
                    <span className="flex items-center gap-2 text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                      Fecha
                      {sortBy === 'fecha' && (
                        <svg className={`w-4 h-4 text-[#457373] ${sortDir === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-4 text-left cursor-pointer select-none group" onClick={() => handleSort('usuario')}>
                    <span className="flex items-center gap-2 text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                      Usuario
                      {sortBy === 'usuario' && (
                        <svg className={`w-4 h-4 text-[#457373] ${sortDir === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Tickets</th>
                  <th className="px-6 py-4 text-left cursor-pointer select-none group" onClick={() => handleSort('total')}>
                    <span className="flex items-center gap-2 text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                      Total
                      {sortBy === 'total' && (
                        <svg className={`w-4 h-4 text-[#457373] ${sortDir === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-4 text-left cursor-pointer select-none group" onClick={() => handleSort('estado')}>
                    <span className="flex items-center gap-2 text-xs font-medium text-[#1D324D] uppercase tracking-wider">
                      Estado
                      {sortBy === 'estado' && (
                        <svg className={`w-4 h-4 text-[#457373] ${sortDir === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-[#1D324D] uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE4E4]/30">
                {getSortedVentas().map((venta) => (
                  <tr key={venta.venta_id} className="hover:bg-[#F1EADC]/20 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-[#1D324D]">{new Date(venta.fecha_venta).toLocaleDateString()}</div>
                      <div className="text-xs text-[#7C4935]/80">{new Date(venta.fecha_venta).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#1D324D]">{venta.vendedor_usuario}</div>
                      <div className="text-xs text-[#7C4935]/80">{venta.vendedor}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {venta.tickets.map((t) => (
                          <div key={t.ticket_id} className="flex items-center space-x-2">
                            <span className="font-mono text-xs bg-[#F1EADC]/50 text-[#1D324D] px-2 py-1 rounded-lg border border-[#DFE4E4]/50">
                              {t.codigo_qr}
                            </span>
                            <span className="text-xs text-[#7C4935] bg-[#DFE4E4]/30 px-2 py-1 rounded-lg">
                              {t.tipo_ticket}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-[#457373]">${venta.total.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {venta.anulada ? (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          Anulada
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Activa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!venta.anulada && (
                        <button
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-50"
                          onClick={() => handleAnular(venta.venta_id)}
                          disabled={anulando === venta.venta_id}
                          title="Anular venta"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {!loading && !error && getSortedVentas().length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all duration-300 font-medium text-sm ${
              currentPage === 1 
                ? 'bg-[#DFE4E4]/30 text-[#7C4935]/50 border-[#DFE4E4]/50 cursor-not-allowed' 
                : 'bg-white/80 text-[#1D324D] border-[#DFE4E4] hover:bg-[#F1EADC]/50 hover:scale-[1.02] shadow-lg'
            }`}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Anterior
          </button>
          <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#1D324D] to-[#457373] text-white font-bold text-sm shadow-lg">
            Página {currentPage} de {totalPages}
          </div>
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all duration-300 font-medium text-sm ${
              currentPage >= totalPages 
                ? 'bg-[#DFE4E4]/30 text-[#7C4935]/50 border-[#DFE4E4]/50 cursor-not-allowed' 
                : 'bg-white/80 text-[#1D324D] border-[#DFE4E4] hover:bg-[#F1EADC]/50 hover:scale-[1.02] shadow-lg'
            }`}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
          >
            Siguiente
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default DailySalesAdmin;
