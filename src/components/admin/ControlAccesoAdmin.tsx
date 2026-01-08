import React, { useState, useEffect, useRef, useCallback } from 'react';
import { showConfirm, showError, showSuccess } from '../../utils/dialogs';

// Interfaces locales del componente
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

interface ServiceStatus {
  running: boolean;
  uptime?: number;
  lastCheck: Date;
}

interface ControlAccesoStats {
  totalAccesos: number;
  accesosPermitidos: number;
  accesosDenegados: number;
  errores: number;
}

type LogType = 'accesos' | 'errores';
type FilterLevel = 'all' | 'info' | 'warn' | 'error';

const ControlAccesoAdmin: React.FC = () => {
  // Estados
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [logType, setLogType] = useState<LogType>('accesos');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    running: false,
    lastCheck: new Date()
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [maxLines, setMaxLines] = useState(100);
  
  // Ref para scroll automático
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar logs
  const loadLogs = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const data = await window.electronAPI.getControlAccesoLogs(logType, maxLines);
        if (data && Array.isArray(data)) {
          setLogs(data);
        }
      }
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  }, [logType, maxLines]);

  // Verificar estado del servicio
  const checkServiceStatus = useCallback(async () => {
    try {
      if (window.electronAPI) {
        const status = await window.electronAPI.getControlAccesoStatus();
        setServiceStatus({
          running: status?.running || false,
          uptime: status?.uptime,
          lastCheck: new Date()
        });
      }
    } catch (error) {
      setServiceStatus({
        running: false,
        lastCheck: new Date()
      });
    }
  }, []);

  // Efecto inicial
  useEffect(() => {
    loadLogs();
    checkServiceStatus();
  }, [loadLogs, checkServiceStatus]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshIntervalRef.current = setInterval(() => {
        loadLogs();
        checkServiceStatus();
      }, 3000); // Cada 3 segundos
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, loadLogs, checkServiceStatus]);

  // Scroll automático cuando llegan nuevos logs
  useEffect(() => {
    if (logsContainerRef.current && autoRefresh) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoRefresh]);

  // Handlers
  const handleRefresh = () => {
    setLoading(true);
    loadLogs();
    checkServiceStatus();
  };

  const handleRestartService = async () => {
    const confirmacion = await showConfirm(
      '¿Deseas reiniciar el servicio de Control de Acceso?\n\nEsto interrumpirá temporalmente la lectura de QR.',
      'Reiniciar Servicio'
    );

    if (!confirmacion) return;

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.restartControlAccesoService();
        if (result?.success) {
          await showSuccess('Servicio reiniciado correctamente');
          checkServiceStatus();
        } else {
          await showError(result?.error || 'Error al reiniciar el servicio');
        }
      }
    } catch (error: any) {
      await showError(error.message || 'Error al reiniciar el servicio');
    }
  };

  const handleClearLogs = async () => {
    const confirmacion = await showConfirm(
      `¿Deseas limpiar el archivo de logs de ${logType === 'accesos' ? 'accesos' : 'errores'}?\n\nEsta acción no se puede deshacer.`,
      'Limpiar Logs'
    );

    if (!confirmacion) return;

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.clearControlAccesoLogs(logType);
        if (result?.success) {
          setLogs([]);
          await showSuccess('Logs limpiados correctamente');
        } else {
          await showError(result?.error || 'Error al limpiar los logs');
        }
      }
    } catch (error: any) {
      await showError(error.message || 'Error al limpiar los logs');
    }
  };

  // Filtrar logs
  const filteredLogs = logs.filter(log => {
    // Filtro por nivel
    if (filterLevel !== 'all') {
      if (filterLevel === 'info' && !log.level.toLowerCase().includes('info')) return false;
      if (filterLevel === 'warn' && !log.level.toLowerCase().includes('warn')) return false;
      if (filterLevel === 'error' && !log.level.toLowerCase().includes('error')) return false;
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return log.message.toLowerCase().includes(term) || 
             log.timestamp.toLowerCase().includes(term);
    }

    return true;
  });

  // Obtener color según nivel de log
  const getLevelColor = (level: string): string => {
    const lvl = level.toLowerCase();
    if (lvl.includes('error')) return 'text-red-600 bg-red-50';
    if (lvl.includes('warn')) return 'text-orange-600 bg-orange-50';
    if (lvl.includes('info')) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  // Obtener ícono según nivel
  const getLevelIcon = (level: string): React.ReactNode => {
    const lvl = level.toLowerCase();
    if (lvl.includes('error')) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (lvl.includes('warn')) {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="w-8 h-0.5 bg-[#457373] mb-3 rounded-full"></div>
          <h1 className="text-xl font-light text-[#1D324D] tracking-tight">Control de Acceso QR</h1>
          <p className="text-[#7C4935]/70 text-xs font-light mt-1">
            Monitor del servicio de control de acceso y lectores QR
          </p>
        </div>

        {/* Estado del Servicio */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
            serviceStatus.running 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${
              serviceStatus.running ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium">
              {serviceStatus.running ? 'Servicio Activo' : 'Servicio Detenido'}
            </span>
          </div>

          <button
            onClick={handleRestartService}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1D324D] to-[#457373] text-white rounded-xl hover:from-[#457373] hover:to-[#1D324D] transition-all duration-300 shadow-lg hover:shadow-xl text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reiniciar
          </button>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/50 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Selector de tipo de log */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#1D324D] font-medium">Archivo:</label>
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value as LogType)}
              className="px-3 py-2 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-lg text-sm text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373]"
            >
              <option value="accesos">accesos.log</option>
              <option value="errores">errores.log</option>
            </select>
          </div>

          {/* Filtro por nivel */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#1D324D] font-medium">Nivel:</label>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
              className="px-3 py-2 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-lg text-sm text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373]"
            >
              <option value="all">Todos</option>
              <option value="info">Info</option>
              <option value="warn">Advertencias</option>
              <option value="error">Errores</option>
            </select>
          </div>

          {/* Búsqueda */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar en logs..."
                className="w-full px-4 py-2 pl-10 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-lg text-sm text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373]"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-[#7C4935]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Líneas máximas */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#1D324D] font-medium">Líneas:</label>
            <select
              value={maxLines}
              onChange={(e) => setMaxLines(parseInt(e.target.value))}
              className="px-3 py-2 bg-[#F1EADC]/30 border border-[#DFE4E4] rounded-lg text-sm text-[#1D324D] focus:outline-none focus:ring-2 focus:ring-[#457373]"
            >
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
              <option value="500">500</option>
            </select>
          </div>

          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-[#DFE4E4] text-[#457373] focus:ring-[#457373]"
            />
            <span className="text-sm text-[#1D324D]">Auto-refresh</span>
          </label>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-[#457373] hover:bg-[#F1EADC]/50 rounded-lg transition-all duration-200 disabled:opacity-50"
              title="Refrescar"
            >
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <button
              onClick={handleClearLogs}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
              title="Limpiar logs"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Visor de Logs */}
      <div className="bg-[#1a1a2e] rounded-2xl shadow-2xl border border-[#2d2d44] overflow-hidden">
        {/* Barra de título estilo terminal */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d44] border-b border-[#3d3d54]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-xs text-gray-400 ml-2 font-mono">
              {logType === 'accesos' ? 'accesos.log' : 'errores.log'} - {filteredLogs.length} líneas
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Última actualización: {serviceStatus.lastCheck.toLocaleTimeString('es-ES')}
          </span>
        </div>

        {/* Contenido de logs */}
        <div
          ref={logsContainerRef}
          className="h-[400px] overflow-y-auto p-4 font-mono text-sm"
          style={{ backgroundColor: '#0d0d1a' }}
        >
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-3 text-gray-400">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando logs...
              </div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No hay logs para mostrar</p>
                {searchTerm && <p className="text-xs mt-1">Intenta con otro término de búsqueda</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 py-1 px-2 rounded hover:bg-white/5 transition-colors"
                >
                  <span className="text-gray-500 text-xs whitespace-nowrap">
                    {log.timestamp}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${getLevelColor(log.level)}`}>
                    {getLevelIcon(log.level)}
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-gray-300 flex-1 break-all">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-900 font-medium mb-1">Acerca del Control de Acceso</p>
            <p className="text-xs text-blue-700">
              El servicio de Control de Acceso QR se ejecuta en segundo plano y maneja la lectura de códigos QR 
              y la activación de los relés para abrir puertas. Los logs muestran todos los intentos de acceso, 
              tanto permitidos como denegados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlAccesoAdmin;
