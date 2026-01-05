import React, { useState, useEffect, useCallback } from 'react';

interface VentaDiariaDetalle {
  tipo_ticket: string;
  cantidad_tickets: number;
  total_tipo: number;
}

interface VentaDiariaSummary {
  fecha: string;
  total_tickets: number;
  total_ventas: number;
  detalle_por_tipo: VentaDiariaDetalle[];
}

const VentasDiarias: React.FC = () => {
  const [ventasSummary, setVentasSummary] = useState<VentaDiariaSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [fechaConsulta, setFechaConsulta] = useState<string>(() => {
    // Fecha actual por defecto
    return new Date().toISOString().split('T')[0];
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargarVentasDiarias = useCallback(async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const data = await window.electronAPI.getVendedorDailySummary(fechaConsulta);
        setVentasSummary(data);
      }
    } catch (error) {
      console.error('Error cargando ventas diarias:', error);
      setVentasSummary(null);
    } finally {
      setLoading(false);
    }
  }, [fechaConsulta]);

  useEffect(() => {
    cargarVentasDiarias();
  }, [cargarVentasDiarias]);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD'
    }).format(precio);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Header ultra compacto */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-white/50 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-light text-[#1D324D]">Ventas del Día</h2>
          
          {/* Selector de fecha muy compacto */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fechaConsulta}
              onChange={(e) => setFechaConsulta(e.target.value)}
              className="px-2 py-1 text-xs border border-[#DFE4E4] rounded-md focus:ring-1 focus:ring-[#457373] focus:border-[#457373] transition-all duration-200"
            />
            <button
              onClick={cargarVentasDiarias}
              className="px-2 py-1 text-xs bg-gradient-to-r from-[#457373] to-[#7C4935] text-white rounded-md hover:shadow-md transition-all duration-200"
            >
              Ver
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-white/50 p-4">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#457373] border-t-transparent"></div>
            <span className="ml-2 text-[#1D324D] text-sm">Cargando...</span>
          </div>
        </div>
      ) : ventasSummary ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Columna izquierda - Resumen */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-white/50 p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-0.5 bg-[#7C4935] rounded-full"></div>
              <h3 className="text-xs font-medium text-[#1D324D]">Resumen</h3>
            </div>
            <p className="text-xs text-gray-600 mb-3">{formatearFecha(ventasSummary.fecha)}</p>
            
            <div className="space-y-2">
              <div className="bg-gradient-to-r from-[#457373]/10 to-[#7C4935]/10 rounded-lg p-2 text-center">
                <div className="text-base font-bold text-[#1D324D]">{ventasSummary.total_tickets}</div>
                <div className="text-xs text-gray-600">Tickets</div>
              </div>
              <div className="bg-gradient-to-r from-[#7C4935]/10 to-[#457373]/10 rounded-lg p-2 text-center">
                <div className="text-base font-bold text-[#1D324D]">
                  {formatearPrecio(ventasSummary.total_ventas)}
                </div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
            </div>
          </div>

          {/* Columna derecha - Detalle */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-white/50 p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-0.5 bg-[#457373] rounded-full"></div>
              <h3 className="text-xs font-medium text-[#1D324D]">Detalle por tipo</h3>
            </div>
            
            {ventasSummary.detalle_por_tipo.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ventasSummary.detalle_por_tipo.map((detalle, index) => (
                  <div key={index} className="bg-gradient-to-r from-white/80 to-[#F1EADC]/20 rounded-lg p-2 border border-[#DFE4E4]/50">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <h4 className="font-medium text-[#1D324D] text-xs leading-tight">{detalle.tipo_ticket}</h4>
                        <p className="text-xs text-gray-600">
                          {detalle.cantidad_tickets} ticket{detalle.cantidad_tickets !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <div className="font-bold text-[#1D324D] text-xs">
                          {formatearPrecio(detalle.total_tipo)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatearPrecio(detalle.total_tipo / detalle.cantidad_tickets)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Barra de progreso mini */}
                    <div className="mt-1">
                      <div className="bg-[#DFE4E4] rounded-full h-0.5">
                        <div 
                          className="bg-gradient-to-r from-[#457373] to-[#7C4935] h-0.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${(detalle.total_tipo / ventasSummary.total_ventas) * 100}%`
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {((detalle.total_tipo / ventasSummary.total_ventas) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 text-xs">Sin ventas</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-white/50 p-4 text-center">
          <p className="text-gray-500 text-sm">Error al cargar</p>
        </div>
      )}
    </div>
  );
};

export default VentasDiarias;