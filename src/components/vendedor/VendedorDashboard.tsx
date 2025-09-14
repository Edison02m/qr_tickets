import React, { useState, useEffect } from 'react';
import NuevaVenta from './NuevaVenta';

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
        return <div className="p-8 glass-card rounded-2xl shadow-xl border border-gray-200">Ventas del día (Próximamente)</div>;
      default:
        return (
          <div className="bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 glass-card rounded-2xl shadow-xl p-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Panel de Ventas</h2>
            <p className="text-gray-500 mb-6 text-base">Bienvenido, <span className="font-semibold text-gray-800">{user.nombre}</span>. Selecciona una opción para comenzar.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <button
                onClick={() => setCurrentView('nueva-venta')}
                className="p-6 glass-card rounded-xl flex flex-col items-center shadow group transition hover:shadow-lg border border-gray-100"
              >
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400 group-hover:text-blue-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Nueva Venta</h3>
                <p className="text-sm text-gray-500 text-center">Realizar una nueva venta de tickets</p>
              </button>

              <button
                onClick={() => setCurrentView('ventas-dia')}
                className="p-6 glass-card rounded-xl flex flex-col items-center shadow group transition hover:shadow-lg border border-gray-100"
              >
                <div className="mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-400 group-hover:text-green-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Ventas del Día</h3>
                <p className="text-sm text-gray-500 text-center">Ver el resumen de ventas del día</p>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex flex-col">
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Panel de Vendedor</h1>
              <p className="text-sm text-gray-500 mt-1">Bienvenido, <span className="font-medium text-gray-800">{user.nombre}</span></p>
            </div>
            <div className="flex items-center space-x-4">
              {currentView !== 'main' && (
                <button
                  onClick={() => setCurrentView('main')}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg shadow hover:bg-gray-200 transition-colors"
                >
                  Volver al Inicio
                </button>
              )}
              <button
                onClick={onLogout}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-800 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full h-full p-0 m-0 overflow-hidden">
        <div className="w-full h-full min-h-screen min-w-0 flex flex-col justify-start items-stretch">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default VendedorDashboard;