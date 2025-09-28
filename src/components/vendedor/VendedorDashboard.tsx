import React, { useState, useEffect } from 'react';
import NuevaVenta from './NuevaVenta';
import VentasDiarias from './VentasDiarias';

interface VendedorDashboardProps {
  user: {
    id: number;
    nombre: string;
    usuario: string;
    rol: string;
  };
  onLogout: () => void;
}

const VendedorDashboard: React.FC<VendedorDashboardProps> = ({ user, onLogout }) => {
  const [currentView, setCurrentView] = useState<'main' | 'nueva-venta' | 'ventas-dia'>('main');

  useEffect(() => {
    const handleMenuAction = (event: CustomEvent<string>) => {
      switch (event.detail) {
        case 'new-sale':
          setCurrentView('nueva-venta');
          break;
        case 'daily-sales':
          setCurrentView('ventas-dia');
          break;
      }
    };

    window.addEventListener('menu-action', handleMenuAction as EventListener);
    return () => {
      window.removeEventListener('menu-action', handleMenuAction as EventListener);
    };
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'nueva-venta':
        return (
          <div className="w-full h-full">
            <NuevaVenta />
          </div>
        );
      case 'ventas-dia':
        return (
          <div className="w-full h-full">
            <VentasDiarias />
          </div>
        );
      default:
        return (
          <div className="p-8 space-y-8">
            {/* Header Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-0.5 bg-[#457373] rounded-full"></div>
                <h2 className="text-xl font-light text-[#1D324D] tracking-tight">Panel de Ventas</h2>
                <div className="w-8 h-0.5 bg-[#457373] rounded-full"></div>
              </div>
              <p className="text-[#7C4935]/70 text-sm font-light mb-8">
                Bienvenido, <span className="font-medium text-[#1D324D]">{user.nombre}</span>. Selecciona una opción para comenzar.
              </p>
              
              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => setCurrentView('nueva-venta')}
                  className="group relative overflow-hidden bg-gradient-to-br from-white/70 via-[#F1EADC]/20 to-[#DFE4E4]/30 backdrop-blur-sm rounded-2xl p-8 border border-[#DFE4E4]/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#457373]/5 to-[#1D324D]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#457373] to-[#1D324D] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-[#1D324D] mb-2">Nueva Venta</h3>
                    <p className="text-sm text-[#7C4935]/70 leading-relaxed">
                      Realizar una nueva venta de tickets de forma rápida y sencilla
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentView('ventas-dia')}
                  className="group relative overflow-hidden bg-gradient-to-br from-white/70 via-[#F1EADC]/20 to-[#DFE4E4]/30 backdrop-blur-sm rounded-2xl p-8 border border-[#DFE4E4]/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02]"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#7C4935]/5 to-[#457373]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#7C4935] to-[#457373] rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-[#1D324D] mb-2">Ventas del Día</h3>
                    <p className="text-sm text-[#7C4935]/70 leading-relaxed">
                      Consultar el resumen y detalle de todas las ventas realizadas
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F1EADC] to-[#DFE4E4] flex flex-col">
      <header className="bg-white/90 backdrop-blur-sm border-b border-[#DFE4E4]/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              <div className="w-1 h-12 bg-[#457373] rounded-full"></div>
              <div>
                <h1 className="text-2xl font-light text-[#1D324D] tracking-tight">Panel de Vendedor</h1>
                <p className="text-sm text-[#7C4935]/70 mt-1">Bienvenido, <span className="font-medium text-[#1D324D]">{user.nombre}</span></p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {currentView !== 'main' && (
                <button
                  onClick={() => setCurrentView('main')}
                  className="p-2.5 bg-[#F1EADC]/50 text-[#1D324D] rounded-xl hover:bg-[#F1EADC] hover:scale-[1.05] transition-all duration-300 border border-white/50 group"
                  title="Volver al inicio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                </button>
              )}
              <button
                onClick={onLogout}
                className="p-2.5 bg-gradient-to-r from-[#1D324D] to-[#457373] text-white rounded-xl hover:from-[#457373] hover:to-[#1D324D] hover:scale-[1.05] transition-all duration-300 shadow-lg group"
                title="Cerrar sesión"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full h-full">
        {renderContent()}
      </main>
    </div>
  );
};

export default VendedorDashboard;