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
      const ventaDate = new Date(v.fecha_venta).toISOString().slice(0, 10);
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
    return ventasArr.sort((a, b) => {
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
  }, []);

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

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Ventas</h1>
        <div className="flex flex-wrap gap-2 items-center bg-white/80 rounded-xl shadow px-4 py-3 border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Fecha
            </span>
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm bg-white shadow-sm"
              style={{ minWidth: 120 }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-1 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Estado
            </span>
            <select
              value={filterEstado}
              onChange={e => setFilterEstado(e.target.value as 'todos'|'activa'|'anulada')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-200 text-sm bg-white shadow-sm"
              style={{ minWidth: 100 }}
            >
              <option value="todos">Todos</option>
              <option value="activa">Activa</option>
              <option value="anulada">Anulada</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm font-medium flex items-center">
              <svg className="w-4 h-4 mr-1 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" /></svg>
              Código Ticket
            </span>
            <input
              type="text"
              value={filterCodigo}
              onChange={e => setFilterCodigo(e.target.value)}
              placeholder="Buscar código..."
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 text-sm bg-white shadow-sm"
              style={{ minWidth: 120 }}
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        {loading ? (
          <div className="text-gray-500 p-6">Cargando ventas...</div>
        ) : error ? (
          <div className="text-red-500 p-6">{error}</div>
        ) : getSortedVentas().length === 0 ? (
          <div className="text-gray-500 p-6">No hay ventas para los filtros seleccionados.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left cursor-pointer select-none group" onClick={() => handleSort('fecha')}>
                  <span className="flex items-center gap-1">Fecha
                    {sortBy === 'fecha' && (
                      <svg className={`w-3 h-3 ml-1 ${sortDir === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    )}
                  </span>
                </th>
                <th className="px-4 py-2 text-left cursor-pointer select-none group" onClick={() => handleSort('usuario')}>
                  <span className="flex items-center gap-1">Usuario
                    {sortBy === 'usuario' && (
                      <svg className={`w-3 h-3 ml-1 ${sortDir === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    )}
                  </span>
                </th>
                <th className="px-4 py-2 text-left">Tickets</th>
                <th className="px-4 py-2 text-left cursor-pointer select-none group" onClick={() => handleSort('total')}>
                  <span className="flex items-center gap-1">Total
                    {sortBy === 'total' && (
                      <svg className={`w-3 h-3 ml-1 ${sortDir === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    )}
                  </span>
                </th>
                <th className="px-4 py-2 text-left cursor-pointer select-none group" onClick={() => handleSort('estado')}>
                  <span className="flex items-center gap-1">Estado
                    {sortBy === 'estado' && (
                      <svg className={`w-3 h-3 ml-1 ${sortDir === 'asc' ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                    )}
                  </span>
                </th>
                <th className="px-4 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {getSortedVentas().map((venta) => (
                <tr key={venta.venta_id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-700">{new Date(venta.fecha_venta).toLocaleString()}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-900 font-semibold">{venta.vendedor_usuario}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs">
                    <ul className="space-y-1">
                      {venta.tickets.map((t) => (
                        <li key={t.ticket_id} className="flex items-center space-x-2">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">{t.codigo_qr}</span>
                          <span className="text-gray-600 text-xs bg-gray-50 px-2 py-1 rounded">{t.tipo_ticket}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-900">${venta.total.toFixed(2)}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs">
                    {venta.anulada ? (
                      <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">Anulada</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">Activa</span>
                    )}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs">
                    {!venta.anulada && (
                      <button
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs flex items-center space-x-1 disabled:opacity-50"
                        onClick={() => handleAnular(venta.venta_id)}
                        disabled={anulando === venta.venta_id}
                        title="Anular venta"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        {anulando === venta.venta_id ? 'Anulando...' : 'Anular'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DailySalesAdmin;
