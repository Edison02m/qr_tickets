import React, { useState, useEffect } from 'react';

// Note: don't redeclare `window.electronAPI` here because other type
// declarations in the project may already declare it. Instead access it
// at runtime and cast to `any` to avoid duplicate-declaration type errors.
const getAPI = () => (window as any).electronAPI || {};

interface ConfigLog {
  id: number;
  accion: 'crear' | 'modificar' | 'eliminar';
  tabla_afectada: 'puertas' | 'config_relay' | 'tipos_ticket' | 'botones_tickets';
  registro_id: number;
  descripcion: string;
  datos_anteriores: any; // JSON object
  datos_nuevos: any; // JSON object
  fecha_hora: string;
  ip_address?: string;
}

interface ConfigLogFiltros {
  limit?: number;
  offset?: number;
  tabla?: string;
  accion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

interface EstadisticaLog {
  tabla_afectada: string;
  accion: string;
  total: number;
}

const AdminConfigLogs: React.FC = () => {
  const [logs, setLogs] = useState<ConfigLog[]>([]);
  const [filtros, setFiltros] = useState<ConfigLogFiltros>({
    limit: 50,
    offset: 0
  });
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [estadisticas, setEstadisticas] = useState<EstadisticaLog[]>([]);

  // Estados para filtros
  const [tablaFiltro, setTablaFiltro] = useState<string>('');
  const [accionFiltro, setAccionFiltro] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  const [paginaActual, setPaginaActual] = useState<number>(1);
  const registrosPorPagina = 50;

  // Cargar logs
  const cargarLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const filtrosAplicados: ConfigLogFiltros = {
        limit: registrosPorPagina,
        offset: (paginaActual - 1) * registrosPorPagina
      };

      if (tablaFiltro) filtrosAplicados.tabla = tablaFiltro;
      if (accionFiltro) filtrosAplicados.accion = accionFiltro;
      if (fechaDesde) filtrosAplicados.fecha_desde = fechaDesde;
      if (fechaHasta) filtrosAplicados.fecha_hasta = fechaHasta;

      const api = getAPI();
      const [logsData, totalData] = await Promise.all([
        api.obtenerConfigLogs ? api.obtenerConfigLogs(filtrosAplicados) : Promise.resolve([]),
        api.contarConfigLogs ? api.contarConfigLogs(filtrosAplicados) : Promise.resolve(0)
      ]);

      setLogs(logsData);
      setTotal(totalData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los logs');
      console.error('Error cargando logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar estadísticas
  const cargarEstadisticas = async () => {
    try {
  const api = getAPI();
  const stats = api.obtenerEstadisticasLogs ? await api.obtenerEstadisticasLogs() : [];
      setEstadisticas(stats);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  // Cargar al montar el componente
  useEffect(() => {
    cargarLogs();
    cargarEstadisticas();
  }, [paginaActual]);

  // Aplicar filtros
  const aplicarFiltros = () => {
    setPaginaActual(1); // Reset a página 1
    cargarLogs();
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setTablaFiltro('');
    setAccionFiltro('');
    setFechaDesde('');
    setFechaHasta('');
    setPaginaActual(1);
    setFiltros({ limit: registrosPorPagina, offset: 0 });
  };

  // Formato de fecha/hora
  const formatearFechaHora = (fecha: string): string => {
    const d = new Date(fecha);
    return d.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Función para mostrar diferencias entre datos anteriores y nuevos
  const renderDiferencias = (log: ConfigLog) => {
    if (!log.datos_anteriores && !log.datos_nuevos) return null;

    const anterior = typeof log.datos_anteriores === 'string' 
      ? JSON.parse(log.datos_anteriores) 
      : log.datos_anteriores;
    
    const nuevo = typeof log.datos_nuevos === 'string' 
      ? JSON.parse(log.datos_nuevos) 
      : log.datos_nuevos;

    // Para acción crear, solo mostrar datos nuevos
    if (log.accion === 'crear' && nuevo) {
      return (
        <div className="text-xs mt-1 p-2 bg-green-50 border border-green-200 rounded">
          <div className="font-semibold text-green-700">Datos creados:</div>
          <pre className="text-green-800 mt-1">{JSON.stringify(nuevo, null, 2)}</pre>
        </div>
      );
    }

    // Para acción eliminar, solo mostrar datos anteriores
    if (log.accion === 'eliminar' && anterior) {
      return (
        <div className="text-xs mt-1 p-2 bg-red-50 border border-red-200 rounded">
          <div className="font-semibold text-red-700">Datos eliminados:</div>
          <pre className="text-red-800 mt-1">{JSON.stringify(anterior, null, 2)}</pre>
        </div>
      );
    }

    // Para acción modificar, mostrar comparación
    if (log.accion === 'modificar' && anterior && nuevo) {
      const cambios: { campo: string; anterior: any; nuevo: any }[] = [];
      
      Object.keys(nuevo).forEach(key => {
        if (JSON.stringify(anterior[key]) !== JSON.stringify(nuevo[key])) {
          cambios.push({
            campo: key,
            anterior: anterior[key],
            nuevo: nuevo[key]
          });
        }
      });

      if (cambios.length === 0) return null;

      return (
        <div className="text-xs mt-1 p-2 bg-blue-50 border border-blue-200 rounded">
          <div className="font-semibold text-blue-700 mb-1">Cambios realizados:</div>
          {cambios.map((cambio, idx) => (
            <div key={idx} className="mb-1">
              <span className="font-medium text-gray-700">{cambio.campo}:</span>
              <span className="text-red-600 line-through ml-2">{JSON.stringify(cambio.anterior)}</span>
              <span className="text-green-600 ml-2">→ {JSON.stringify(cambio.nuevo)}</span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  // Calcular número de páginas
  const totalPaginas = Math.ceil(total / registrosPorPagina);

  // Exportar a CSV
  const exportarCSV = () => {
    const headers = ['Fecha/Hora', 'Acción', 'Tabla', 'ID', 'Descripción'];
    const csvData = logs.map(log => [
      formatearFechaHora(log.fecha_hora),
      log.accion,
      log.tabla_afectada,
      log.registro_id,
      log.descripcion
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logs_configuracion_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Historial de Configuración</h1>

        {/* Estadísticas */}
        {estadisticas.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 p-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Resumen de Actividad</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {estadisticas.map((stat, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="text-xs text-gray-500 uppercase">{stat.tabla_afectada}</div>
                  <div className="text-sm font-medium text-gray-700">{stat.accion}</div>
                  <div className="text-2xl font-bold text-blue-600">{stat.total}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tabla</label>
              <select
                value={tablaFiltro}
                onChange={(e) => setTablaFiltro(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas</option>
                <option value="puertas">Puertas</option>
                <option value="config_relay">Config Relay</option>
                <option value="tipos_ticket">Tipos de Ticket</option>
                <option value="botones_tickets">Botones</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Acción</label>
              <select
                value={accionFiltro}
                onChange={(e) => setAccionFiltro(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todas</option>
                <option value="crear">Crear</option>
                <option value="modificar">Modificar</option>
                <option value="eliminar">Eliminar</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={aplicarFiltros}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Aplicar Filtros
            </button>
            <button
              onClick={limpiarFiltros}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition"
            >
              Limpiar
            </button>
            <button
              onClick={exportarCSV}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition ml-auto"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Tabla de Logs */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600 mt-2">Cargando logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron registros con los filtros aplicados
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acción
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tabla
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatearFechaHora(log.fecha_hora)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.accion === 'crear' ? 'bg-green-100 text-green-800' :
                            log.accion === 'modificar' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {log.accion}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.tabla_afectada}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.registro_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>{log.descripcion}</div>
                          {renderDiferencias(log)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{(paginaActual - 1) * registrosPorPagina + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(paginaActual * registrosPorPagina, total)}</span> de{' '}
                  <span className="font-medium">{total}</span> resultados
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    Página {paginaActual} de {totalPaginas}
                  </span>
                  <button
                    onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                    disabled={paginaActual === totalPaginas}
                    className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminConfigLogs;
