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
          <div className="space-y-6">
            {/* Header minimalista */}
            <div className="mb-8">
              <h2 className="text-2xl font-light text-[#1D324D] mb-2">Panel de Ventas</h2>
              <p className="text-sm text-[#1D324D]/60">Sistema de gestión de tickets</p>
            </div>

            {/* Grid de tarjetas simplificado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nueva Venta */}
              <button
                onClick={() => setCurrentView('nueva-venta')}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#457373] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#457373]/5 flex items-center justify-center group-hover:bg-[#457373] transition-colors duration-200">
                    <svg className="w-6 h-6 text-[#457373] group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#1D324D] mb-1">Nueva Venta</h3>
                    <p className="text-sm text-[#1D324D]/60">Vender tickets</p>
                  </div>
                </div>
              </button>

              {/* Ventas del Día */}
              <button
                onClick={() => setCurrentView('ventas-dia')}
                className="group bg-white rounded-xl p-6 border border-gray-200 hover:border-[#457373] hover:shadow-md transition-all duration-200 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#1D324D]/5 flex items-center justify-center group-hover:bg-[#1D324D] transition-colors duration-200">
                    <svg className="w-6 h-6 text-[#1D324D] group-hover:text-white transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium text-[#1D324D] mb-1">Ventas del Día</h3>
                    <p className="text-sm text-[#1D324D]/60">Resumen de ventas</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header minimalista */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-medium text-[#1D324D]">Ventas</h1>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm text-gray-600">{user.nombre}</span>
            </div>
            <div className="flex items-center gap-2">
              {currentView !== 'main' ? (
                <button
                  onClick={() => setCurrentView('main')}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-[#1D324D] hover:bg-gray-100 rounded-lg transition-colors duration-150 flex items-center gap-2"
                  title="Volver al inicio"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Regresar
                </button>
              ) : (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-[#1D324D] hover:bg-gray-100 rounded-lg transition-colors duration-150 flex items-center gap-2"
                  title="Cerrar sesión"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  Cerrar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-8 py-8 w-full">
        {renderContent()}
      </main>
    </div>
  );
};

export default VendedorDashboard;