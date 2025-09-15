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
  const [existeCierre, setExisteCierre] = useState(false);
  const [cierres, setCierres] = useState<CashClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [resumen, setResumen] = useState<{ total_ventas: number; cantidad_tickets: number; detalle_tipos: string }>({ total_ventas: 0, cantidad_tickets: 0, detalle_tipos: '' });

  useEffect(() => {
    fetchCierres();
    // Por defecto, fecha de hoy
    setFechaInicio(new Date().toISOString().slice(0, 10));
  }, []);

  const fetchCierres = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await window.electronAPI.getAllCashClosures();
      setCierres(data);
      // Verificar si existe cierre para la fecha y usuario actual
      const cierreHoy = data.find(c => {
        const fechaDb = new Date(c.fecha_inicio).toISOString().slice(0, 10);
        return fechaDb === fechaInicio && c.usuario_id === (userId || 1);
      });
      setExisteCierre(!!cierreHoy);
    } catch (err) {
      setError('Error al cargar cierres');
    } finally {
      setLoading(false);
    }
  };

  // Calcular resumen automático de tickets vendidos no anulados
  const fetchResumen = async (fecha: string) => {
    setError('');
    try {
      // Obtener ventas y tickets no anulados para la fecha seleccionada
      const ventas = await window.electronAPI.getAllDailySales();
      // Filtrar por fecha y no anulados
      const ventasFiltradas = ventas.filter(v => {
        const ventaDate = new Date(v.fecha_venta).toISOString().slice(0, 10);
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
  setFechaInicio(e.target.value);
  };

  const handleCreateClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const usuario_id = userId || 1;
      if (existeCierre) {
        await window.electronAPI.updateCashClosure({
          usuario_id,
          fecha_inicio: fechaInicio,
          total_ventas: resumen.total_ventas,
          cantidad_tickets: resumen.cantidad_tickets,
          detalle_tipos: resumen.detalle_tipos,
        });
      } else {
        await window.electronAPI.createCashClosure({
          usuario_id,
          fecha_inicio: fechaInicio,
          total_ventas: resumen.total_ventas,
          cantidad_tickets: resumen.cantidad_tickets,
          detalle_tipos: resumen.detalle_tipos,
        });
      }
      await fetchCierres();
    } catch (err) {
      setError('Error al crear cierre');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Cierres de Caja</h2>
      <form onSubmit={handleCreateClosure} className="mb-6 bg-white rounded-lg shadow p-4 flex flex-col gap-2 max-w-md">
        <label className="text-sm text-gray-700 font-medium">
          Fecha inicio:
          <input type="date" value={fechaInicio} onChange={handleInputChange} className="border rounded px-2 py-1 ml-2" required />
        </label>
        <div className="bg-gray-50 rounded p-3 mt-2">
          <div className="text-sm text-gray-700 font-semibold mb-1">Resumen automático:</div>
          <div className="text-sm text-gray-800">Total ventas: <span className="font-bold">${resumen.total_ventas.toFixed(2)}</span></div>
          <div className="text-sm text-gray-800">Cantidad tickets: <span className="font-bold">{resumen.cantidad_tickets}</span></div>
          <div className="text-sm text-gray-800">Detalle tipos: <span className="font-mono">{resumen.detalle_tipos || 'Sin ventas'}</span></div>
        </div>
        <button type="submit" className={`rounded px-4 py-2 mt-2 ${existeCierre ? 'bg-green-600' : 'bg-blue-600'} text-white`}>
          {existeCierre ? 'Actualizar cierre de caja' : 'Crear cierre de caja'}
        </button>
        {error && <div className="text-red-500">{error}</div>}
      </form>
      <h3 className="text-lg font-semibold mb-2">Historial de cierres</h3>
      {loading ? (
        <div>Cargando...</div>
      ) : (
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead>
            <tr>
              <th className="px-2 py-1">ID</th>
              <th className="px-2 py-1">Usuario</th>
              <th className="px-2 py-1">Fecha inicio</th>
              <th className="px-2 py-1">Fecha cierre</th>
              <th className="px-2 py-1">Total ventas</th>
              <th className="px-2 py-1">Tickets</th>
              <th className="px-2 py-1">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {cierres.map(c => (
              <tr key={c.id}>
                <td className="px-2 py-1">{c.id}</td>
                <td className="px-2 py-1">{c.usuario_nombre} ({c.usuario_usuario})</td>
                <td className="px-2 py-1">{c.fecha_inicio}</td>
                <td className="px-2 py-1">{c.fecha_cierre}</td>
                <td className="px-2 py-1">${c.total_ventas}</td>
                <td className="px-2 py-1">{c.cantidad_tickets}</td>
                <td className="px-2 py-1">{c.detalle_tipos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CashClosureAdmin;
