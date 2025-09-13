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
        return <NuevaVenta />;
      case 'ventas-dia':
        return <div>Ventas del día (Próximamente)</div>;
      default:
        return (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Panel de Ventas
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <button
                onClick={() => setCurrentView('nueva-venta')}
                className="p-6 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">Nueva Venta</h3>
                  <p className="text-sm text-gray-600 text-center mt-2">
                    Realizar una nueva venta de tickets
                  </p>
                </div>
              </button>

              <button
                onClick={() => setCurrentView('ventas-dia')}
                className="p-6 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">Ventas del Día</h3>
                  <p className="text-sm text-gray-600 text-center mt-2">
                    Ver el resumen de ventas del día
                  </p>
                </div>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Panel de Vendedor</h1>
              <p className="text-sm text-gray-600 mt-1">Bienvenido, {user.nombre}</p>
            </div>
            <div className="flex items-center space-x-4">
              {currentView !== 'main' && (
                <button
                  onClick={() => setCurrentView('main')}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Volver al Inicio
                </button>
              )}
              <button
                onClick={onLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
};

export default VendedorDashboard;